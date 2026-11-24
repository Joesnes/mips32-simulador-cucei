/**
 * PROPIETARIO: Integrante A (Dia 2 — Motor multiciclo 5 etapas base Tipo R)
 *
 * Implementa la ruta de datos MIPS de 32 bits con ejecucion multiciclo de 5 etapas
 * (1 instruccion activa a la vez):
 *   IF  -> Reune 4 bytes big-endian desde IMem[PC..PC+3] -> carga IF/ID
 *   ID  -> Decodifica campos, Unidad de Control, lee BR (DR1/DR2) y extiende inmediato -> carga ID/EX
 *   EX  -> Ejecuta MIPSALU, selecciona destino AW y calcula siguiente PC -> carga EX/MEM
 *   MEM -> Acceso a memoria de datos (lw/sw) o paso directo -> carga MEM/WB
 *   WB  -> Escribe en Banco de Registros (si RegWrite=1 y AW!=0) y actualiza PC
 */

import {
  ALU_CTL,
  REGISTER_NAMES,
  formatHex32,
  formatHexByte,
  signExtend16,
  toUint32,
  zeroExtend16,
} from '../isa';
import type {
  Byte,
  ControlSignals,
  CpuError,
  CpuSnapshot,
  CpuStatus,
  MemoryWordInit,
  Stage,
  StageBuffers,
  StateChangeLog,
  Word32,
} from '../types';
import { executeAlu } from './alu';
import { decodeInstruction, generateControlSignals } from './controlUnit';
import { DataMemory, InstructionMemory } from './memory';
import { RegisterFile } from './registerFile';

function createEmptyControl(): ControlSignals {
  return {
    RegDst: 0,
    ALUSrc: 0,
    ExtOp: 'NONE',
    MemToReg: 0,
    RegWrite: 0,
    MemRead: 0,
    MemWrite: 0,
    Branch: 0,
    BranchNe: 0,
    Jump: 0,
    ALUOp: 0b00,
    ALUctl: ALU_CTL.ADD,
  };
}

function createEmptyBuffers(): StageBuffers {
  return {
    IF_ID: {
      valid: false,
      pc: 0,
      pcPlus4: 0,
      bytes: [0, 0, 0, 0],
      instruction: 0,
    },
    ID_EX: {
      valid: false,
      pc: 0,
      pcPlus4: 0,
      fields: {
        raw: 0,
        format: 'UNKNOWN',
        mnemonic: '—',
        opcode: 0,
        rs: 0,
        rt: 0,
        rd: 0,
        shamt: 0,
        funct: 0,
        imm16: 0,
        immSigned: 0,
        jumpIndex: 0,
      },
      A: 0,
      B: 0,
      immExt: 0,
      ctrl: createEmptyControl(),
    },
    EX_MEM: {
      valid: false,
      pc: 0,
      aluOperandA: 0,
      aluOperandB: 0,
      aluResult: 0,
      zero: false,
      writeData: 0,
      writeReg: 0,
      branchTarget: 0,
      jumpTarget: 0,
      branchTaken: false,
      nextPC: 0,
      ctrl: createEmptyControl(),
    },
    MEM_WB: {
      valid: false,
      pc: 0,
      memReadData: 0,
      aluResult: 0,
      writeReg: 0,
      writeBackData: 0,
      nextPC: 0,
      ctrl: createEmptyControl(),
    },
  };
}

export class MipsCpu {
  private readonly imem = new InstructionMemory();
  private readonly dmem = new DataMemory(256);
  private readonly regFile = new RegisterFile();

  private initialRegisters: Record<number, Word32> = {};
  private status: CpuStatus = 'READY';
  private cycle = 0;
  private instructionsExecuted = 0;
  private lastStage: Stage | null = null;
  private nextStage: Stage = 'IF';
  private pc: Word32 = 0;
  private buffers: StageBuffers = createEmptyBuffers();
  private lastChange: StateChangeLog | null = null;
  private error: CpuError | null = null;

  /**
   * Carga la imagen de programa (bytes big-endian), datos iniciales opcionales en DMem
   * y registros iniciales opcionales (util para pruebas unitarias aisladas de tipo R).
   */
  loadProgram(
    bytes: Byte[],
    initialData: MemoryWordInit[] = [],
    dataMemSize = 256,
    initialRegisters: Record<number, Word32> = {},
  ): void {
    this.imem.load(bytes);
    this.dmem.loadInitial(initialData, dataMemSize);
    this.initialRegisters = { ...initialRegisters };
    this.reset();
  }

  /** Reinicia PC, Banco de Registros, buffers y restaura DMem inicial. */
  reset(): void {
    this.regFile.reset();
    for (const [idxStr, val] of Object.entries(this.initialRegisters)) {
      const idx = Number(idxStr);
      if (Number.isInteger(idx) && idx > 0 && idx < 32) {
        this.regFile.write(idx, val, true);
      }
    }
    this.dmem.reset();
    this.status = 'READY';
    this.cycle = 0;
    this.instructionsExecuted = 0;
    this.lastStage = null;
    this.nextStage = 'IF';
    this.pc = 0;
    this.buffers = createEmptyBuffers();
    this.lastChange = null;
    this.error = null;
  }

  /** Ejecuta exactamente una etapa (IF -> ID -> EX -> MEM -> WB). */
  stepStage(): CpuSnapshot {
    if (this.status === 'ERROR') {
      return this.getSnapshot();
    }

    switch (this.nextStage) {
      case 'IF':
        this.runIF();
        break;
      case 'ID':
        this.runID();
        break;
      case 'EX':
        this.runEX();
        break;
      case 'MEM':
        this.runMEM();
        break;
      case 'WB':
        this.runWB();
        break;
    }

    return this.getSnapshot();
  }

  /** Completa la instruccion actual (avanza etapas hasta terminar WB o encontrar error). */
  stepInstruction(): CpuSnapshot {
    if (this.status === 'ERROR') {
      return this.getSnapshot();
    }
    let snap = this.stepStage();
    while (snap.nextStage !== 'IF' && snap.status !== 'ERROR') {
      snap = this.stepStage();
    }
    return snap;
  }

  private runIF(): void {
    const pcBefore = this.pc;
    const fetched = this.imem.fetchWord(this.pc);

    if (!fetched.ok) {
      this.status = 'ERROR';
      this.lastStage = 'IF';
      this.error = {
        code: fetched.code,
        message: fetched.message,
        pc: this.pc,
        address: this.pc,
        stage: 'IF',
      };
      this.lastChange = {
        cycle: this.cycle,
        stage: 'IF',
        pcBefore,
        pcAfter: this.pc,
        buffersUpdated: [],
        summary: `Error en IF: ${fetched.message}`,
      };
      return;
    }

    const pcPlus4 = toUint32(this.pc + 4);
    this.buffers = createEmptyBuffers();
    this.buffers.IF_ID = {
      valid: true,
      pc: this.pc,
      pcPlus4,
      bytes: fetched.bytes,
      instruction: fetched.word,
    };

    this.cycle += 1;
    this.status = 'RUNNING';
    this.lastStage = 'IF';
    this.nextStage = 'ID';
    const bytesHex = fetched.bytes.map(formatHexByte).join(' ');
    this.lastChange = {
      cycle: this.cycle,
      stage: 'IF',
      pcBefore,
      pcAfter: this.pc,
      buffersUpdated: ['IF_ID'],
      summary: `IF: PC=${formatHex32(this.pc)} -> bytes [${bytesHex}] -> IR=${formatHex32(fetched.word)}`,
    };
  }

  private runID(): void {
    const { pc, pcPlus4, instruction } = this.buffers.IF_ID;
    const fields = decodeInstruction(instruction);
    const ctrl = generateControlSignals(fields);

    if (!ctrl) {
      this.status = 'ERROR';
      this.lastStage = 'ID';
      this.error = {
        code: 'UNKNOWN_INSTRUCTION',
        message: `Instruccion no reconocida o no soportada: ${formatHex32(instruction)} (opcode=0x${fields.opcode.toString(16).toUpperCase().padStart(2, '0')}, funct=0x${fields.funct.toString(16).toUpperCase().padStart(2, '0')}).`,
        pc,
        stage: 'ID',
      };
      this.lastChange = {
        cycle: this.cycle,
        stage: 'ID',
        pcBefore: this.pc,
        pcAfter: this.pc,
        buffersUpdated: [],
        summary: `Error en ID: ${this.error.message}`,
      };
      return;
    }

    const A = this.regFile.read(fields.rs);
    const B = this.regFile.read(fields.rt);
    const immExt =
      ctrl.ExtOp === 'SIGN'
        ? signExtend16(fields.imm16)
        : ctrl.ExtOp === 'ZERO'
          ? zeroExtend16(fields.imm16)
          : 0;

    this.buffers.ID_EX = {
      valid: true,
      pc,
      pcPlus4,
      fields,
      A,
      B,
      immExt,
      ctrl,
    };

    this.cycle += 1;
    this.lastStage = 'ID';
    this.nextStage = 'EX';
    this.lastChange = {
      cycle: this.cycle,
      stage: 'ID',
      pcBefore: this.pc,
      pcAfter: this.pc,
      buffersUpdated: ['ID_EX'],
      summary: `ID: ${fields.mnemonic} (${fields.format}) · A=${REGISTER_NAMES[fields.rs]}(${formatHex32(A)}), B=${REGISTER_NAMES[fields.rt]}(${formatHex32(B)})`,
    };
  }

  private runEX(): void {
    const { pc, pcPlus4, fields, A, B, immExt, ctrl } = this.buffers.ID_EX;
    const aluOperandA = A;
    const aluOperandB = ctrl.ALUSrc === 1 ? immExt : B;
    const { ALUOut, Zero } = executeAlu(ctrl.ALUctl, aluOperandA, aluOperandB);

    const writeReg = ctrl.RegDst === 1 ? fields.rd : fields.rt;
    const branchTarget = toUint32(pcPlus4 + (signExtend16(fields.imm16) << 2));
    const jumpTarget = toUint32((pcPlus4 & 0xf0000000) | ((fields.jumpIndex & 0x03ffffff) << 2));
    const branchTaken = (ctrl.Branch === 1 && Zero) || (ctrl.BranchNe === 1 && !Zero);
    const nextPC = ctrl.Jump === 1 ? jumpTarget : branchTaken ? branchTarget : pcPlus4;

    this.buffers.EX_MEM = {
      valid: true,
      pc,
      aluOperandA,
      aluOperandB,
      aluResult: ALUOut,
      zero: Zero,
      writeData: B,
      writeReg,
      branchTarget,
      jumpTarget,
      branchTaken,
      nextPC,
      ctrl,
    };

    this.cycle += 1;
    this.lastStage = 'EX';
    this.nextStage = 'MEM';
    this.lastChange = {
      cycle: this.cycle,
      stage: 'EX',
      pcBefore: this.pc,
      pcAfter: this.pc,
      buffersUpdated: ['EX_MEM'],
      summary: `EX: ALUOut=${formatHex32(ALUOut)}, Zero=${Zero ? 1 : 0}, nextPC=${formatHex32(nextPC)}`,
    };
  }

  private runMEM(): void {
    const { pc, aluResult, writeData, writeReg, nextPC, ctrl } = this.buffers.EX_MEM;
    let memReadData: Word32 = 0;
    let memoryChanged: StateChangeLog['memoryChanged'];

    if (ctrl.MemRead === 1) {
      const readRes = this.dmem.readWord(aluResult);
      if (!readRes.ok) {
        this.status = 'ERROR';
        this.lastStage = 'MEM';
        this.error = {
          code: readRes.code,
          message: readRes.message,
          pc,
          address: aluResult,
          stage: 'MEM',
        };
        this.lastChange = {
          cycle: this.cycle,
          stage: 'MEM',
          pcBefore: this.pc,
          pcAfter: this.pc,
          buffersUpdated: [],
          summary: `Error en MEM: ${readRes.message}`,
        };
        return;
      }
      memReadData = readRes.word;
    } else if (ctrl.MemWrite === 1) {
      const writeRes = this.dmem.writeWord(aluResult, writeData);
      if (!writeRes.ok) {
        this.status = 'ERROR';
        this.lastStage = 'MEM';
        this.error = {
          code: writeRes.code,
          message: writeRes.message,
          pc,
          address: aluResult,
          stage: 'MEM',
        };
        this.lastChange = {
          cycle: this.cycle,
          stage: 'MEM',
          pcBefore: this.pc,
          pcAfter: this.pc,
          buffersUpdated: [],
          summary: `Error en MEM: ${writeRes.message}`,
        };
        return;
      }
      memoryChanged = {
        address: aluResult,
        before: writeRes.before,
        after: writeRes.after,
      };
    }

    const writeBackData = ctrl.MemToReg === 1 ? memReadData : aluResult;

    this.buffers.MEM_WB = {
      valid: true,
      pc,
      memReadData,
      aluResult,
      writeReg,
      writeBackData,
      nextPC,
      ctrl,
    };

    this.cycle += 1;
    this.lastStage = 'MEM';
    this.nextStage = 'WB';
    this.lastChange = {
      cycle: this.cycle,
      stage: 'MEM',
      pcBefore: this.pc,
      pcAfter: this.pc,
      memoryChanged,
      buffersUpdated: ['MEM_WB'],
      summary:
        ctrl.MemRead === 1
          ? `MEM: lw [${formatHex32(aluResult)}] -> MDR=${formatHex32(memReadData)}`
          : ctrl.MemWrite === 1
            ? `MEM: sw [${formatHex32(aluResult)}] <- ${formatHex32(writeData)}`
            : `MEM: sin acceso a memoria (pasa ALUOut=${formatHex32(aluResult)})`,
    };
  }

  private runWB(): void {
    const { pc, writeReg, writeBackData, nextPC, ctrl } = this.buffers.MEM_WB;
    const pcBefore = this.pc;
    let registerChanged: StateChangeLog['registerChanged'];

    if (ctrl.RegWrite === 1) {
      const res = this.regFile.write(writeReg, writeBackData, true);
      if (res.changed) {
        registerChanged = {
          index: writeReg,
          before: res.before,
          after: res.after,
        };
      }
    }

    this.pc = nextPC;
    this.instructionsExecuted += 1;
    this.cycle += 1;
    this.lastStage = 'WB';
    this.nextStage = 'IF';

    if (ctrl.Jump === 1 && nextPC === pc) {
      this.status = 'HALTED_SELFLOOP';
    }

    const wbDetail =
      ctrl.RegWrite === 1
        ? writeReg === 0
          ? 'escritura a $zero descartada'
          : `${REGISTER_NAMES[writeReg]} <- ${formatHex32(writeBackData)}`
        : 'sin escritura en BR';

    this.lastChange = {
      cycle: this.cycle,
      stage: 'WB',
      pcBefore,
      pcAfter: this.pc,
      registerChanged,
      buffersUpdated: [],
      summary: `WB: ${wbDetail} · PC=${formatHex32(this.pc)}`,
    };
  }

  getSnapshot(): CpuSnapshot {
    return {
      status: this.status,
      cycle: this.cycle,
      instructionsExecuted: this.instructionsExecuted,
      lastStage: this.lastStage,
      nextStage: this.nextStage,
      pc: this.pc,
      registers: this.regFile.snapshot(),
      instructionMemory: this.imem.snapshot(),
      dataMemory: this.dmem.snapshot(),
      buffers: {
        IF_ID: { ...this.buffers.IF_ID, bytes: [...this.buffers.IF_ID.bytes] as [Byte, Byte, Byte, Byte] },
        ID_EX: {
          ...this.buffers.ID_EX,
          fields: { ...this.buffers.ID_EX.fields },
          ctrl: { ...this.buffers.ID_EX.ctrl },
        },
        EX_MEM: {
          ...this.buffers.EX_MEM,
          ctrl: { ...this.buffers.EX_MEM.ctrl },
        },
        MEM_WB: {
          ...this.buffers.MEM_WB,
          ctrl: { ...this.buffers.MEM_WB.ctrl },
        },
      },
      lastChange: this.lastChange ? { ...this.lastChange, buffersUpdated: [...this.lastChange.buffersUpdated] } : null,
      error: this.error ? { ...this.error } : null,
    };
  }
}
