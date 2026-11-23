/**
 * PROPIETARIO: Integrante A (Dia 2-4)
 * Stub inicial de la CPU multiciclo (5 etapas) para compilacion desde Dia 1.
 */

import type { Byte, CpuSnapshot, MemoryWordInit } from '../types';

export class MipsCpu {
  private imem: Byte[] = [];
  private dmem: Byte[] = new Array<Byte>(256).fill(0);

  loadProgram(bytes: Byte[], initialData: MemoryWordInit[] = [], dataMemSize = 256): void {
    this.imem = [...bytes];
    this.dmem = new Array<Byte>(dataMemSize).fill(0);
    for (const entry of initialData) {
      const u = entry.value >>> 0;
      if (entry.address >= 0 && entry.address + 3 < dataMemSize && entry.address % 4 === 0) {
        this.dmem[entry.address] = (u >>> 24) & 0xff;
        this.dmem[entry.address + 1] = (u >>> 16) & 0xff;
        this.dmem[entry.address + 2] = (u >>> 8) & 0xff;
        this.dmem[entry.address + 3] = u & 0xff;
      }
    }
  }

  reset(): void {
    // TODO [Integrante A - Dia 2-3]: reiniciar PC, registros, buffers y contadores
  }

  stepStage(): CpuSnapshot {
    // TODO [Integrante A - Dia 2-4]: ejecutar una etapa IF -> ID -> EX -> MEM -> WB
    return this.getSnapshot();
  }

  stepInstruction(): CpuSnapshot {
    // TODO [Integrante A - Dia 2-4]: completar la instruccion actual (hasta WB o error)
    return this.getSnapshot();
  }

  getSnapshot(): CpuSnapshot {
    const emptyCtrl = {
      RegDst: 0 as const,
      ALUSrc: 0 as const,
      ExtOp: 'NONE' as const,
      MemToReg: 0 as const,
      RegWrite: 0 as const,
      MemRead: 0 as const,
      MemWrite: 0 as const,
      Branch: 0 as const,
      BranchNe: 0 as const,
      Jump: 0 as const,
      ALUOp: 0b00 as const,
      ALUctl: 0b0010 as const,
    };
    return {
      status: 'READY',
      cycle: 0,
      instructionsExecuted: 0,
      lastStage: null,
      nextStage: 'IF',
      pc: 0,
      registers: new Array(32).fill(0),
      instructionMemory: [...this.imem],
      dataMemory: [...this.dmem],
      buffers: {
        IF_ID: { valid: false, pc: 0, pcPlus4: 0, bytes: [0, 0, 0, 0], instruction: 0 },
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
          ctrl: emptyCtrl,
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
          ctrl: emptyCtrl,
        },
        MEM_WB: {
          valid: false,
          pc: 0,
          memReadData: 0,
          aluResult: 0,
          writeReg: 0,
          writeBackData: 0,
          nextPC: 0,
          ctrl: emptyCtrl,
        },
      },
      lastChange: null,
      error: null,
    };
  }
}
