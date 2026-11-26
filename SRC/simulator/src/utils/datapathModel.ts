import { ALU_CTL, REGISTER_NAMES } from '@core/isa';
import type {
  AluControlCode,
  Byte,
  ControlSignals,
  CpuSnapshot,
  Stage,
  Word32,
} from '@core/types';
import {
  fmtAddrDec,
  fmtBits,
  fmtByteBin,
  fmtByteDec,
  fmtSignedDec,
  fmtUnsignedDec,
  fmtWordBin32,
} from './numberFormat';

export type DatapathBlockId =
  | 'PC'
  | 'IMEM'
  | 'BIG_ENDIAN'
  | 'PC_PLUS_4'
  | 'IF_ID'
  | 'FIELDS'
  | 'CONTROL'
  | 'BR'
  | 'EXTENDER'
  | 'ID_EX'
  | 'MUX_REGDST'
  | 'MUX_ALUSRC'
  | 'ALU_CONTROL'
  | 'MIPSALU'
  | 'SHIFT_BRANCH'
  | 'BRANCH_ADDER'
  | 'BRANCH_LOGIC'
  | 'MUX_PCSRC'
  | 'JUMP_CONCAT'
  | 'MUX_JUMP'
  | 'EX_MEM'
  | 'DMEM'
  | 'MEM_WB'
  | 'MUX_MEMTOREG';

export type DatapathWireId =
  | 'PC_TO_IMEM'
  | 'PC_TO_ADD4'
  | 'ADD4_TO_IFID'
  | 'IMEM_TO_BE'
  | 'BE_TO_IFID'
  | 'IFID_TO_FIELDS'
  | 'FIELDS_TO_CTRL'
  | 'FIELDS_TO_BR'
  | 'FIELDS_TO_EXT'
  | 'FIELDS_TO_REGDST'
  | 'FIELDS_TO_ALUCTL'
  | 'FIELDS_TO_JUMP'
  | 'BR_TO_IDEX'
  | 'EXT_TO_IDEX'
  | 'CTRL_TO_IDEX'
  | 'IDEX_TO_ALU_A'
  | 'IDEX_TO_ALUSRC'
  | 'IDEX_TO_ALUSRC_IMM'
  | 'ALUSRC_TO_ALU_B'
  | 'IDEX_TO_REGDST'
  | 'IDEX_RD_TO_REGDST'
  | 'REGDST_TO_EXMEM'
  | 'IDEX_TO_ALUCTL'
  | 'ALUCTL_TO_ALU'
  | 'ALU_TO_EXMEM'
  | 'IDEX_TO_SHIFT'
  | 'SHIFT_TO_BR_ADDER'
  | 'IDEX_PC4_TO_PCSRC'
  | 'BR_ADDER_TO_PCSRC'
  | 'ALU_ZERO_TO_BRLOGIC'
  | 'BRLOGIC_TO_PCSRC'
  | 'PCSRC_TO_MUXJUMP'
  | 'JUMP_TO_MUXJUMP'
  | 'MUXJUMP_TO_EXMEM'
  | 'EXMEM_TO_DMEM_ADDR'
  | 'EXMEM_TO_DMEM_DATA'
  | 'DMEM_TO_MEMWB'
  | 'EXMEM_BYPASS_MEMWB'
  | 'MEMWB_TO_MEMTOREG'
  | 'MEMWB_MDR_TO_MEMTOREG'
  | 'MEMTOREG_TO_BR_DW'
  | 'MEMWB_TO_BR_AW'
  | 'MEMWB_NEXTPC_TO_PC';

export interface ControlSignalItem {
  key: keyof ControlSignals;
  label: string;
  sublabel: string;
  group: 'datapath' | 'memory' | 'flow';
  binaryBits: string;
  displayValue: string;
  meaning: string;
  isAsserted: boolean;
  pending: boolean;
}

export interface ControlSignalsViewModel {
  controlsValid: boolean;
  sourceStageLabel: string;
  items: ControlSignalItem[];
}

export interface RawInstructionSlices {
  raw: Word32;
  opcode: number;
  rs: number;
  rt: number;
  rd: number;
  shamt: number;
  funct: number;
  imm16: number;
  immSigned: number;
  jumpIndex: number;
}

export interface StageExplanation {
  title: string;
  badge: string;
  tone: 'neutral' | 'if' | 'id' | 'ex' | 'mem' | 'wb' | 'halted' | 'error';
  headline: string;
  detail: string;
  nextHint: string;
}

export interface InspectorPortSignal {
  name: string;
  binary: string;
  decimalMeaning: string;
}

export interface BlockInspectorInfo {
  id: DatapathBlockId;
  title: string;
  stageTag: string;
  bitRanges: string[];
  beginnerSummary: string;
  inputs: InspectorPortSignal[];
  outputs: InspectorPortSignal[];
  liveValues: Array<{ label: string; value: string }>;
}

export interface DatapathViewModel {
  activeStage: Stage | null;
  nextStage: Stage;
  stageReached: Record<Stage, boolean>;
  cycleSummary: string;
  isIdle: boolean;
  hasError: boolean;
  errorStage: Stage | null;
  errorBlock: DatapathBlockId | null;
  controlsValid: boolean;
  ctrl: ControlSignals | null;
  pc: Word32;
  instructionPc: Word32;
  pcPlus4: Word32;
  pcUpdatedInWB: boolean;
  bigEndianBytes: [Byte, Byte, Byte, Byte] | null;
  bigEndianReady: boolean;
  irWord: Word32 | null;
  slices: RawInstructionSlices | null;
  mnemonic: string;
  format: 'R' | 'I' | 'J' | 'UNKNOWN' | null;
  ar1: number | null;
  ar2: number | null;
  dr1: Word32 | null;
  dr2: Word32 | null;
  aw: number | null;
  dw: Word32 | null;
  regWriteEnabled: boolean;
  writeDiscardedZero: boolean;
  writeDisabledRegWrite: boolean;
  brStatusLabel: string;
  immExt: Word32 | null;
  extOpLabel: string;
  aluA: Word32 | null;
  aluB: Word32 | null;
  aluOut: Word32 | null;
  zeroFlag: boolean | null;
  aluCtlLabel: string;
  branchTarget: Word32 | null;
  jumpTarget: Word32 | null;
  branchTaken: boolean;
  nextPC: Word32 | null;
  mdr: Word32 | null;
  dmemAction: 'READ' | 'WRITE' | 'BYPASS' | 'IDLE';
  muxRegDstSel: 0 | 1 | null;
  muxALUSrcSel: 0 | 1 | null;
  muxMemToRegSel: 0 | 1 | null;
  muxPCSrcSel: 0 | 1 | null;
  muxJumpSel: 0 | 1 | null;
  activeBlocks: Record<DatapathBlockId, boolean>;
  activeWires: Record<DatapathWireId, boolean>;
}

export function formatAluCtlName(code: AluControlCode): string {
  switch (code) {
    case ALU_CTL.AND:
      return 'AND';
    case ALU_CTL.OR:
      return 'OR';
    case ALU_CTL.ADD:
      return 'ADD';
    case ALU_CTL.SUB:
      return 'SUB';
    case ALU_CTL.SLT:
      return 'SLT';
    case ALU_CTL.NOR:
      return 'NOR';
    default:
      return 'ALU';
  }
}

export function formatAluCtlBits(code: AluControlCode): string {
  return (code & 0b1111).toString(2).padStart(4, '0');
}

export function formatAluOpBits(op: ControlSignals['ALUOp']): string {
  return (op & 0b11).toString(2).padStart(2, '0');
}

export function formatAluOpMeaning(op: ControlSignals['ALUOp']): string {
  switch (op) {
    case 0b00:
      return '00 → Suma fija (ADD para addi/lw/sw)';
    case 0b01:
      return '01 → Resta fija (SUB para beq/bne)';
    case 0b10:
      return '10 → Depende del campo funct[5:0] (Tipo R)';
    case 0b11:
      return '11 → OR lógico fijo (para ori)';
  }
}

export function extractInstructionSlices(word: Word32): RawInstructionSlices {
  const u = word >>> 0;
  const imm16 = u & 0xffff;
  return {
    raw: u,
    opcode: (u >>> 26) & 0x3f,
    rs: (u >>> 21) & 0x1f,
    rt: (u >>> 16) & 0x1f,
    rd: (u >>> 11) & 0x1f,
    shamt: (u >>> 6) & 0x1f,
    funct: u & 0x3f,
    imm16,
    immSigned: (imm16 & 0x8000) !== 0 ? imm16 - 0x10000 : imm16,
    jumpIndex: u & 0x03ffffff,
  };
}

export function registerLabel(idx: number | null): string {
  if (idx === null || idx < 0 || idx > 31) return '—';
  return `${REGISTER_NAMES[idx]} ($${idx})`;
}

function createAllBlocks(initial = false): Record<DatapathBlockId, boolean> {
  return {
    PC: initial,
    IMEM: initial,
    BIG_ENDIAN: initial,
    PC_PLUS_4: initial,
    IF_ID: initial,
    FIELDS: initial,
    CONTROL: initial,
    BR: initial,
    EXTENDER: initial,
    ID_EX: initial,
    MUX_REGDST: initial,
    MUX_ALUSRC: initial,
    ALU_CONTROL: initial,
    MIPSALU: initial,
    SHIFT_BRANCH: initial,
    BRANCH_ADDER: initial,
    BRANCH_LOGIC: initial,
    MUX_PCSRC: initial,
    JUMP_CONCAT: initial,
    MUX_JUMP: initial,
    EX_MEM: initial,
    DMEM: initial,
    MEM_WB: initial,
    MUX_MEMTOREG: initial,
  };
}

function createAllWires(initial = false): Record<DatapathWireId, boolean> {
  return {
    PC_TO_IMEM: initial,
    PC_TO_ADD4: initial,
    ADD4_TO_IFID: initial,
    IMEM_TO_BE: initial,
    BE_TO_IFID: initial,
    IFID_TO_FIELDS: initial,
    FIELDS_TO_CTRL: initial,
    FIELDS_TO_BR: initial,
    FIELDS_TO_EXT: initial,
    FIELDS_TO_REGDST: initial,
    FIELDS_TO_ALUCTL: initial,
    FIELDS_TO_JUMP: initial,
    BR_TO_IDEX: initial,
    EXT_TO_IDEX: initial,
    CTRL_TO_IDEX: initial,
    IDEX_TO_ALU_A: initial,
    IDEX_TO_ALUSRC: initial,
    IDEX_TO_ALUSRC_IMM: initial,
    ALUSRC_TO_ALU_B: initial,
    IDEX_TO_REGDST: initial,
    IDEX_RD_TO_REGDST: initial,
    REGDST_TO_EXMEM: initial,
    IDEX_TO_ALUCTL: initial,
    ALUCTL_TO_ALU: initial,
    ALU_TO_EXMEM: initial,
    IDEX_TO_SHIFT: initial,
    SHIFT_TO_BR_ADDER: initial,
    IDEX_PC4_TO_PCSRC: initial,
    BR_ADDER_TO_PCSRC: initial,
    ALU_ZERO_TO_BRLOGIC: initial,
    BRLOGIC_TO_PCSRC: initial,
    PCSRC_TO_MUXJUMP: initial,
    JUMP_TO_MUXJUMP: initial,
    MUXJUMP_TO_EXMEM: initial,
    EXMEM_TO_DMEM_ADDR: initial,
    EXMEM_TO_DMEM_DATA: initial,
    DMEM_TO_MEMWB: initial,
    EXMEM_BYPASS_MEMWB: initial,
    MEMWB_TO_MEMTOREG: initial,
    MEMWB_MDR_TO_MEMTOREG: initial,
    MEMTOREG_TO_BR_DW: initial,
    MEMWB_TO_BR_AW: initial,
    MEMWB_NEXTPC_TO_PC: initial,
  };
}

export function deriveControlSignalsView(snapshot: CpuSnapshot): ControlSignalsViewModel {
  const { ID_EX, EX_MEM, MEM_WB } = snapshot.buffers;
  const controlsValid = ID_EX.valid && snapshot.error?.stage !== 'IF';
  const ctrl = ID_EX.ctrl;
  const sourceStageLabel = !controlsValid
    ? 'Pendiente de etapa ID'
    : MEM_WB.valid
      ? 'Activa desde ID → MEM/WB'
      : EX_MEM.valid
        ? 'Activa desde ID → EX/MEM'
        : 'Generada en ID/EX';

  const makeBinary = (
    key: keyof ControlSignals,
    label: string,
    sublabel: string,
    group: ControlSignalItem['group'],
    val: 0 | 1,
    meaning1: string,
    meaning0: string,
  ): ControlSignalItem => {
    if (!controlsValid) {
      return {
        key,
        label,
        sublabel,
        group,
        binaryBits: '—',
        displayValue: '—',
        meaning: 'Esperando decodificación en etapa ID.',
        isAsserted: false,
        pending: true,
      };
    }
    return {
      key,
      label,
      sublabel,
      group,
      binaryBits: String(val),
      displayValue: String(val),
      meaning: val === 1 ? meaning1 : meaning0,
      isAsserted: val === 1,
      pending: false,
    };
  };

  const items: ControlSignalItem[] = [
    makeBinary(
      'RegDst',
      'RegDst',
      'Destino BR (AW)',
      'datapath',
      ctrl.RegDst,
      '1 → Usa rd [15:11] (Tipo R)',
      '0 → Usa rt [20:16] (Tipo I)',
    ),
    makeBinary(
      'ALUSrc',
      'ALUSrc',
      'Operando B ALU',
      'datapath',
      ctrl.ALUSrc,
      '1 → Usa inmediato extendido',
      '0 → Usa registro DR2 (B)',
    ),
    {
      key: 'ExtOp',
      label: 'ExtOp',
      sublabel: 'Extensor 16→32b',
      group: 'datapath',
      binaryBits: !controlsValid ? '—' : ctrl.ExtOp,
      displayValue: !controlsValid ? '—' : ctrl.ExtOp,
      meaning: !controlsValid
        ? 'Esperando decodificación en etapa ID.'
        : ctrl.ExtOp === 'SIGN'
          ? 'SIGN → Extiende bit de signo [15]'
          : ctrl.ExtOp === 'ZERO'
            ? 'ZERO → Rellena con 16 ceros (ori)'
            : 'NONE → Sin extensión de inmediato',
      isAsserted: controlsValid && ctrl.ExtOp !== 'NONE',
      pending: !controlsValid,
    },
    makeBinary(
      'MemToReg',
      'MemToReg',
      'Fuente de Dw',
      'datapath',
      ctrl.MemToReg,
      '1 → Escribe dato leído de DMem (MDR)',
      '0 → Escribe resultado ALUOut',
    ),
    makeBinary(
      'RegWrite',
      'RegWrite',
      'we / en_BR',
      'memory',
      ctrl.RegWrite,
      '1 → Habilita escritura en BR[AW]',
      '0 → No modifica registros',
    ),
    makeBinary(
      'MemRead',
      'MemRead',
      'Lectura DMem',
      'memory',
      ctrl.MemRead,
      '1 → Lee 4 bytes big-endian (lw)',
      '0 → No lee memoria de datos',
    ),
    makeBinary(
      'MemWrite',
      'MemWrite',
      'Escritura DMem',
      'memory',
      ctrl.MemWrite,
      '1 → Escribe 4 bytes big-endian (sw)',
      '0 → No escribe memoria de datos',
    ),
    makeBinary(
      'Branch',
      'Branch',
      'Salto beq',
      'flow',
      ctrl.Branch,
      '1 → Salta si Zero == 1 (beq)',
      '0 → Sin salto por igualdad',
    ),
    makeBinary(
      'BranchNe',
      'BranchNe',
      'Salto bne',
      'flow',
      ctrl.BranchNe,
      '1 → Salta si Zero == 0 (bne)',
      '0 → Sin salto por desigualdad',
    ),
    makeBinary(
      'Jump',
      'Jump',
      'Salto incond. j',
      'flow',
      ctrl.Jump,
      '1 → Salta a jumpTarget (j)',
      '0 → Siguiente PC por PC+4 o Branch',
    ),
    {
      key: 'ALUOp',
      label: 'ALUOp',
      sublabel: '2 bits → ALU Ctrl',
      group: 'flow',
      binaryBits: !controlsValid ? '—' : formatAluOpBits(ctrl.ALUOp),
      displayValue: !controlsValid ? '—' : formatAluOpBits(ctrl.ALUOp),
      meaning: !controlsValid
        ? 'Esperando decodificación en etapa ID.'
        : formatAluOpMeaning(ctrl.ALUOp),
      isAsserted: controlsValid && ctrl.ALUOp !== 0b00,
      pending: !controlsValid,
    },
    {
      key: 'ALUctl',
      label: 'ALUctl',
      sublabel: '4 bits → MIPSALU',
      group: 'flow',
      binaryBits: !controlsValid ? '—' : formatAluCtlBits(ctrl.ALUctl),
      displayValue: !controlsValid
        ? '—'
        : `${formatAluCtlBits(ctrl.ALUctl)} (${formatAluCtlName(ctrl.ALUctl)})`,
      meaning: !controlsValid
        ? 'Esperando decodificación en etapa ID.'
        : `Operación seleccionada en ALU: ${formatAluCtlName(ctrl.ALUctl)}`,
      isAsserted: controlsValid,
      pending: !controlsValid,
    },
  ];

  return {
    controlsValid,
    sourceStageLabel,
    items,
  };
}

export function deriveDatapathView(snapshot: CpuSnapshot): DatapathViewModel {
  const { IF_ID, ID_EX, EX_MEM, MEM_WB } = snapshot.buffers;
  const activeStage = snapshot.lastStage;
  const hasError = snapshot.status === 'ERROR' || snapshot.error !== null;
  const errorStage = snapshot.error?.stage ?? null;
  const isIfFetchError = snapshot.error?.stage === 'IF';

  const ifIdValid = !isIfFetchError && IF_ID.valid;
  const idExValid = !isIfFetchError && ID_EX.valid;
  const exMemValid = !isIfFetchError && EX_MEM.valid;
  const memWbValid = !isIfFetchError && MEM_WB.valid;
  const pcUpdatedInWB = activeStage === 'WB' && memWbValid && !hasError;

  const stageReached: Record<Stage, boolean> = {
    IF: ifIdValid,
    ID: idExValid,
    EX: exMemValid,
    MEM: memWbValid,
    WB: pcUpdatedInWB,
  };

  const controlsValid = idExValid;
  const ctrl = controlsValid ? ID_EX.ctrl : null;

  const pc = snapshot.pc;
  const instructionPc = ifIdValid ? IF_ID.pc : pc;
  const pcPlus4 = ifIdValid ? IF_ID.pcPlus4 : ((pc + 4) >>> 0);

  // Sin "peek-ahead": en READY (antes de IF) los bytes permanecen ocultos hasta que corra IF.
  const bigEndianBytes: [Byte, Byte, Byte, Byte] | null = ifIdValid ? IF_ID.bytes : null;
  const bigEndianReady = ifIdValid;

  const irWord = ifIdValid ? IF_ID.instruction : null;
  const slices = irWord !== null ? extractInstructionSlices(irWord) : null;

  const mnemonic = idExValid
    ? ID_EX.fields.mnemonic
    : ifIdValid
      ? 'Pendiente ID'
      : '—';
  const format = idExValid ? ID_EX.fields.format : null;

  // Sin "peek-ahead": BR solo lee sus entradas cuando ID ya se ejecutó.
  const ar1 = idExValid ? ID_EX.fields.rs : null;
  const ar2 = idExValid ? ID_EX.fields.rt : null;
  const dr1 = idExValid ? ID_EX.A : null;
  const dr2 = idExValid ? ID_EX.B : null;

  const aw = memWbValid
    ? MEM_WB.writeReg
    : exMemValid
      ? EX_MEM.writeReg
      : idExValid && ctrl
        ? ctrl.RegDst === 1
          ? ID_EX.fields.rd
          : ID_EX.fields.rt
        : null;

  const dw = memWbValid ? MEM_WB.writeBackData : null;

  const regWriteEnabled = Boolean(ctrl && ctrl.RegWrite === 1);
  const writeDiscardedZero = Boolean(ctrl && ctrl.RegWrite === 1 && aw === 0);
  const writeDisabledRegWrite = Boolean(ctrl && ctrl.RegWrite === 0);

  let brStatusLabel = 'En espera de ID';
  if (controlsValid && ctrl) {
    if (ctrl.RegWrite === 0) {
      brStatusLabel = 'Sin escritura (RegWrite=0)';
    } else if (aw === 0) {
      brStatusLabel = '$zero inmutable (AW=$0)';
    } else if (aw !== null) {
      brStatusLabel = pcUpdatedInWB
        ? `Escrito en ${REGISTER_NAMES[aw]}`
        : `Destino: ${REGISTER_NAMES[aw]}`;
    }
  }

  const immExt = idExValid ? ID_EX.immExt : null;
  const extOpLabel = controlsValid && ctrl ? ctrl.ExtOp : '—';

  // Sin "peek-ahead": la ALU solo muestra operandos/salida cuando EX ya se ejecutó.
  const aluA = exMemValid ? EX_MEM.aluOperandA : null;
  const aluB = exMemValid ? EX_MEM.aluOperandB : null;
  const aluOut = exMemValid ? EX_MEM.aluResult : null;
  const zeroFlag = exMemValid ? EX_MEM.zero : null;
  const aluCtlLabel =
    controlsValid && ctrl
      ? `${formatAluCtlBits(ctrl.ALUctl)} ${formatAluCtlName(ctrl.ALUctl)}`
      : '—';

  const branchTarget = exMemValid ? EX_MEM.branchTarget : null;
  const jumpTarget = exMemValid ? EX_MEM.jumpTarget : null;
  const branchTaken = exMemValid ? EX_MEM.branchTaken : false;
  const nextPC = memWbValid
    ? MEM_WB.nextPC
    : exMemValid
      ? EX_MEM.nextPC
      : null;

  const mdr = memWbValid && ctrl?.MemRead === 1 ? MEM_WB.memReadData : null;
  const dmemAction: DatapathViewModel['dmemAction'] = !exMemValid || !ctrl
    ? 'IDLE'
    : ctrl.MemRead === 1
      ? 'READ'
      : ctrl.MemWrite === 1
        ? 'WRITE'
        : 'BYPASS';

  const muxRegDstSel = controlsValid && ctrl ? ctrl.RegDst : null;
  const muxALUSrcSel = controlsValid && ctrl ? ctrl.ALUSrc : null;
  const muxMemToRegSel = controlsValid && ctrl ? ctrl.MemToReg : null;
  const muxPCSrcSel: 0 | 1 | null = exMemValid ? (EX_MEM.branchTaken ? 1 : 0) : null;
  const muxJumpSel = controlsValid && ctrl ? ctrl.Jump : null;

  const activeBlocks = createAllBlocks(false);
  const activeWires = createAllWires(false);

  let errorBlock: DatapathBlockId | null = null;
  if (hasError && snapshot.error) {
    if (snapshot.error.code === 'PC_UNALIGNED' || snapshot.error.code === 'PC_OUT_OF_RANGE') {
      errorBlock = 'IMEM';
      activeBlocks.PC = true;
      activeBlocks.IMEM = true;
      activeWires.PC_TO_IMEM = true;
    } else if (snapshot.error.code === 'UNKNOWN_INSTRUCTION') {
      errorBlock = 'CONTROL';
      activeBlocks.IF_ID = true;
      activeBlocks.FIELDS = true;
      activeBlocks.CONTROL = true;
      activeWires.IFID_TO_FIELDS = true;
      activeWires.FIELDS_TO_CTRL = true;
    } else if (
      snapshot.error.code === 'DATA_UNALIGNED' ||
      snapshot.error.code === 'DATA_OUT_OF_RANGE'
    ) {
      errorBlock = 'DMEM';
      activeBlocks.EX_MEM = true;
      activeBlocks.DMEM = true;
      activeWires.EXMEM_TO_DMEM_ADDR = true;
    }
  } else if (activeStage === 'IF') {
    activeBlocks.PC = true;
    activeBlocks.IMEM = true;
    activeBlocks.BIG_ENDIAN = true;
    activeBlocks.PC_PLUS_4 = true;
    activeBlocks.IF_ID = true;
    activeWires.PC_TO_IMEM = true;
    activeWires.PC_TO_ADD4 = true;
    activeWires.ADD4_TO_IFID = true;
    activeWires.IMEM_TO_BE = true;
    activeWires.BE_TO_IFID = true;
  } else if (activeStage === 'ID') {
    activeBlocks.IF_ID = true;
    activeBlocks.FIELDS = true;
    activeBlocks.CONTROL = true;
    activeBlocks.BR = true;
    activeBlocks.ID_EX = true;
    activeWires.IFID_TO_FIELDS = true;
    activeWires.FIELDS_TO_CTRL = true;
    activeWires.FIELDS_TO_BR = true;
    activeWires.BR_TO_IDEX = true;
    activeWires.CTRL_TO_IDEX = true;

    if (ctrl && ctrl.ExtOp !== 'NONE') {
      activeBlocks.EXTENDER = true;
      activeWires.FIELDS_TO_EXT = true;
      activeWires.EXT_TO_IDEX = true;
    }
    if (format === 'J') {
      activeWires.FIELDS_TO_JUMP = true;
    }
    if (format === 'R') {
      activeWires.FIELDS_TO_REGDST = true;
      activeWires.FIELDS_TO_ALUCTL = true;
    }
  } else if (activeStage === 'EX') {
    activeBlocks.ID_EX = true;
    activeBlocks.MUX_REGDST = true;
    activeBlocks.MUX_ALUSRC = true;
    activeBlocks.ALU_CONTROL = true;
    activeBlocks.MIPSALU = true;
    activeBlocks.MUX_PCSRC = true;
    activeBlocks.MUX_JUMP = true;
    activeBlocks.EX_MEM = true;

    activeWires.IDEX_TO_ALU_A = true;
    if (muxALUSrcSel === 1) {
      activeWires.IDEX_TO_ALUSRC_IMM = true;
    } else {
      activeWires.IDEX_TO_ALUSRC = true;
    }
    activeWires.ALUSRC_TO_ALU_B = true;
    if (muxRegDstSel === 1) {
      activeWires.IDEX_RD_TO_REGDST = true;
    } else {
      activeWires.IDEX_TO_REGDST = true;
    }
    activeWires.REGDST_TO_EXMEM = true;
    activeWires.IDEX_TO_ALUCTL = true;
    activeWires.ALUCTL_TO_ALU = true;
    activeWires.ALU_TO_EXMEM = true;
    activeWires.MUXJUMP_TO_EXMEM = true;

    if (ctrl && ctrl.Jump === 1) {
      activeBlocks.JUMP_CONCAT = true;
      activeWires.FIELDS_TO_JUMP = true;
      activeWires.JUMP_TO_MUXJUMP = true;
    } else {
      activeWires.PCSRC_TO_MUXJUMP = true;
      if (branchTaken) {
        activeWires.BR_ADDER_TO_PCSRC = true;
      } else {
        activeWires.IDEX_PC4_TO_PCSRC = true;
      }
    }

    if (ctrl && (ctrl.Branch === 1 || ctrl.BranchNe === 1)) {
      activeBlocks.SHIFT_BRANCH = true;
      activeBlocks.BRANCH_ADDER = true;
      activeBlocks.BRANCH_LOGIC = true;
      activeWires.IDEX_TO_SHIFT = true;
      activeWires.SHIFT_TO_BR_ADDER = true;
      activeWires.ALU_ZERO_TO_BRLOGIC = true;
      activeWires.BRLOGIC_TO_PCSRC = true;
    }
  } else if (activeStage === 'MEM') {
    activeBlocks.EX_MEM = true;
    activeBlocks.MEM_WB = true;
    if (dmemAction === 'READ') {
      activeBlocks.DMEM = true;
      activeWires.EXMEM_TO_DMEM_ADDR = true;
      activeWires.DMEM_TO_MEMWB = true;
    } else if (dmemAction === 'WRITE') {
      activeBlocks.DMEM = true;
      activeWires.EXMEM_TO_DMEM_ADDR = true;
      activeWires.EXMEM_TO_DMEM_DATA = true;
    } else {
      activeWires.EXMEM_BYPASS_MEMWB = true;
    }
  } else if (activeStage === 'WB') {
    activeBlocks.MEM_WB = true;
    activeBlocks.MUX_MEMTOREG = true;
    activeBlocks.PC = true;
    if (muxMemToRegSel === 1) {
      activeWires.MEMWB_MDR_TO_MEMTOREG = true;
    } else {
      activeWires.MEMWB_TO_MEMTOREG = true;
    }
    activeWires.MEMWB_NEXTPC_TO_PC = true;
    if (regWriteEnabled) {
      activeBlocks.BR = true;
      activeWires.MEMTOREG_TO_BR_DW = true;
      activeWires.MEMWB_TO_BR_AW = true;
    }
  }

  let cycleSummary = `Ciclo 0 · Procesador listo en ${fmtAddrDec(pc)}. Pulsa "+ Etapa (IF)" para iniciar.`;
  if (hasError && snapshot.error) {
    cycleSummary = `Error en etapa ${snapshot.error.stage} (${snapshot.error.code}): ${snapshot.error.message}`;
  } else if (activeStage === 'IF' && bigEndianBytes) {
    cycleSummary = `Ciclo ${snapshot.cycle} · IF: Leyó 4 bytes [${bigEndianBytes.map(fmtByteDec).join(', ')}] en ${fmtAddrDec(instructionPc)} → IR armado`;
  } else if (activeStage === 'ID' && idExValid) {
    cycleSummary = `Ciclo ${snapshot.cycle} · ID: Decodificó ${ID_EX.fields.mnemonic} (${ID_EX.fields.format}) · DR1=${fmtSignedDec(ID_EX.A)}, DR2=${fmtSignedDec(ID_EX.B)}`;
  } else if (activeStage === 'EX' && exMemValid) {
    cycleSummary = `Ciclo ${snapshot.cycle} · EX: MIPSALU (${formatAluCtlName(EX_MEM.ctrl.ALUctl)}) → ${fmtSignedDec(EX_MEM.aluOperandA)} y ${fmtSignedDec(EX_MEM.aluOperandB)} = ${fmtSignedDec(EX_MEM.aluResult)} · nextPC=${fmtAddrDec(EX_MEM.nextPC)}`;
  } else if (activeStage === 'MEM' && memWbValid) {
    cycleSummary =
      dmemAction === 'READ'
        ? `Ciclo ${snapshot.cycle} · MEM: lw leyó ${fmtSignedDec(MEM_WB.memReadData)} desde DMem[${fmtUnsignedDec(MEM_WB.aluResult)}]`
        : dmemAction === 'WRITE'
          ? `Ciclo ${snapshot.cycle} · MEM: sw escribió ${fmtSignedDec(EX_MEM.writeData)} en DMem[${fmtUnsignedDec(EX_MEM.aluResult)}]`
          : `Ciclo ${snapshot.cycle} · MEM: Sin acceso a DMem → pasa Dw = ${fmtSignedDec(MEM_WB.writeBackData)}`;
  } else if (activeStage === 'WB' && memWbValid) {
    const regTxt =
      MEM_WB.ctrl.RegWrite === 0
        ? 'Sin escritura en BR'
        : MEM_WB.writeReg === 0
          ? '$zero protegido (0)'
          : `${REGISTER_NAMES[MEM_WB.writeReg]} = ${fmtSignedDec(MEM_WB.writeBackData)}`;
    cycleSummary = `Ciclo ${snapshot.cycle} · WB: ${regTxt} · Nuevo PC = ${fmtAddrDec(pc)}`;
  }

  return {
    activeStage,
    nextStage: snapshot.nextStage,
    stageReached,
    cycleSummary,
    isIdle: activeStage === null && snapshot.status === 'READY',
    hasError,
    errorStage,
    errorBlock,
    controlsValid,
    ctrl,
    pc,
    instructionPc,
    pcPlus4,
    pcUpdatedInWB,
    bigEndianBytes,
    bigEndianReady,
    irWord,
    slices,
    mnemonic,
    format,
    ar1,
    ar2,
    dr1,
    dr2,
    aw,
    dw,
    regWriteEnabled,
    writeDiscardedZero,
    writeDisabledRegWrite,
    brStatusLabel,
    immExt,
    extOpLabel,
    aluA,
    aluB,
    aluOut,
    zeroFlag,
    aluCtlLabel,
    branchTarget,
    jumpTarget,
    branchTaken,
    nextPC,
    mdr,
    dmemAction,
    muxRegDstSel,
    muxALUSrcSel,
    muxMemToRegSel,
    muxPCSrcSel,
    muxJumpSel,
    activeBlocks,
    activeWires,
  };
}

export function buildStageExplanation(snapshot: CpuSnapshot): StageExplanation {
  const { IF_ID, ID_EX, EX_MEM, MEM_WB } = snapshot.buffers;

  if (snapshot.status === 'ERROR' && snapshot.error) {
    return {
      title: `Detención por error en etapa ${snapshot.error.stage}`,
      badge: snapshot.error.code,
      tone: 'error',
      headline: snapshot.error.message,
      detail:
        'La CPU detuvo la ejecución de forma segura sin corromper registros ni memoria de datos.',
      nextHint: 'Corrige el programa o el acceso a memoria y presiona "Reiniciar" o "Ensamblar".',
    };
  }

  if (snapshot.status === 'HALTED_SELFLOOP') {
    const loopInstr = ID_EX.valid ? ID_EX.fields.mnemonic : 'salto';
    return {
      title: 'Programa terminado (Autosalto detectado)',
      badge: 'HALTED_SELFLOOP',
      tone: 'halted',
      headline: `La instrucción "${loopInstr}" saltó sobre sí misma en PC = ${fmtAddrDec(snapshot.pc)}.`,
      detail: `Se completaron ${snapshot.instructionsExecuted} instrucciones en ${snapshot.cycle} ciclos. Los resultados finales ya están en el Banco de Registros y la Memoria de Datos.`,
      nextHint: 'Inspecciona los valores finales o presiona "Reiniciar" para volver a ejecutar.',
    };
  }

  if (snapshot.lastStage === null) {
    return {
      title: 'Procesador listo para iniciar',
      badge: 'READY · Ciclo 0',
      tone: 'neutral',
      headline: `PC apunta al ${fmtAddrDec(snapshot.pc)}. Los 4 buffers intermedios están vacíos.`,
      detail:
        'En el diseño multiciclo, cada instrucción recorre 5 etapas consecutivas (IF → ID → EX → MEM → WB) antes de pasar a la siguiente.',
      nextHint: 'Pulsa "+ Etapa (IF)", "+ Instrucción" o "Play" para ver viajar los datos.',
    };
  }

  switch (snapshot.lastStage) {
    case 'IF': {
      const bytesDec = IF_ID.bytes.map(fmtByteDec).join(', ');
      return {
        title: 'Etapa 1 — IF (Búsqueda de Instrucción)',
        badge: 'IF completada · Cargó IF/ID',
        tone: 'if',
        headline: `IMem leyó 4 bytes Big-Endian [${bytesDec}] desde ${fmtAddrDec(IF_ID.pc)} y formó la instrucción de 32 bits.`,
        detail: `Al mismo tiempo, el sumador calculó PC + 4 = ${fmtAddrDec(IF_ID.pcPlus4)}. Todo quedó guardado en el buffer IF/ID.`,
        nextHint: 'Siguiente paso: ID decodificará estos 32 bits y leerá los registros.',
      };
    }
    case 'ID': {
      const f = ID_EX.fields;
      const extText =
        ID_EX.ctrl.ExtOp === 'NONE'
          ? 'No requiere extensión de inmediato.'
          : `El extensor (${ID_EX.ctrl.ExtOp}) convirtió los 16 bits (${fmtBits(f.imm16, 16)}) al valor decimal ${fmtSignedDec(ID_EX.immExt)}.`;
      return {
        title: 'Etapa 2 — ID (Decodificación y Lectura de Registros)',
        badge: 'ID completada · Cargó ID/EX',
        tone: 'id',
        headline: `Instrucción "${f.mnemonic}" (Formato ${f.format}). La Unidad de Control activó las 12 señales.`,
        detail: `El Banco de Registros entregó DR1 (${REGISTER_NAMES[f.rs]} = ${fmtSignedDec(ID_EX.A)}) y DR2 (${REGISTER_NAMES[f.rt]} = ${fmtSignedDec(ID_EX.B)}). ${extText}`,
        nextHint: 'Siguiente paso: EX operará en la MIPSALU y decidirá el próximo PC.',
      };
    }
    case 'EX': {
      const opName = formatAluCtlName(EX_MEM.ctrl.ALUctl);
      const flowText =
        EX_MEM.ctrl.Jump === 1
          ? `Jump activo → nextPC = ${fmtAddrDec(EX_MEM.nextPC)}.`
          : EX_MEM.ctrl.Branch === 1 || EX_MEM.ctrl.BranchNe === 1
            ? `Salto condicional ${EX_MEM.branchTaken ? 'TOMADO' : 'NO tomado'} (Zero=${EX_MEM.zero ? 1 : 0}) → nextPC = ${fmtAddrDec(EX_MEM.nextPC)}.`
            : `Flujo secuencial → nextPC = ${fmtAddrDec(EX_MEM.nextPC)}.`;
      return {
        title: 'Etapa 3 — EX (Ejecución en ALU y Cálculo de Siguiente PC)',
        badge: 'EX completada · Cargó EX/MEM',
        tone: 'ex',
        headline: `MIPSALU (${opName}) recibió A=${fmtSignedDec(EX_MEM.aluOperandA)} y B=${fmtSignedDec(EX_MEM.aluOperandB)} → ALUOut=${fmtSignedDec(EX_MEM.aluResult)} (Zero=${EX_MEM.zero ? 1 : 0}).`,
        detail: `Mux RegDst eligió AW=${REGISTER_NAMES[EX_MEM.writeReg]}. ${flowText}`,
        nextHint: 'Siguiente paso: MEM leerá/escribirá DMem si la instrucción es lw o sw.',
      };
    }
    case 'MEM': {
      const { ctrl, aluResult, memReadData, writeBackData } = MEM_WB;
      const memText =
        ctrl.MemRead === 1
          ? `lw leyó 4 bytes Big-Endian en DMem[byte ${fmtUnsignedDec(aluResult)}] → MDR = ${fmtSignedDec(memReadData)}.`
          : ctrl.MemWrite === 1
            ? `sw guardó DR2 = ${fmtSignedDec(EX_MEM.writeData)} en DMem[byte ${fmtUnsignedDec(aluResult)}] (Big-Endian).`
            : `Sin acceso a DMem (MemRead=0, MemWrite=0); ALUOut = ${fmtSignedDec(aluResult)} pasa directo.`;
      return {
        title: 'Etapa 4 — MEM (Acceso a Memoria de Datos)',
        badge: 'MEM completada · Cargó MEM/WB',
        tone: 'mem',
        headline: memText,
        detail: `Mux MemToReg preparó el valor final Dw = ${fmtSignedDec(writeBackData)} dentro del buffer MEM/WB.`,
        nextHint: 'Siguiente paso: WB guardará Dw en el Banco de Registros (si RegWrite=1) y actualizará PC.',
      };
    }
    case 'WB': {
      const { ctrl, writeReg, writeBackData, nextPC } = MEM_WB;
      const writeText =
        ctrl.RegWrite === 0
          ? 'RegWrite=0, así que ningún registro del BR fue modificado.'
          : writeReg === 0
            ? 'El destino era $zero ($0), pero el hardware descarta escrituras en $0 para mantenerlo en 0.'
            : `Se escribió el valor decimal ${fmtSignedDec(writeBackData)} en ${REGISTER_NAMES[writeReg]}.`;
      return {
        title: 'Etapa 5 — WB (Escritura en Registros y Actualización de PC)',
        badge: 'WB completada · Instrucción finalizada',
        tone: 'wb',
        headline: `${writeText} PC avanzó al ${fmtAddrDec(nextPC)}.`,
        detail: `Total ejecutado: ${snapshot.instructionsExecuted} instrucción(es) en ${snapshot.cycle} ciclos.`,
        nextHint: 'Siguiente paso: IF buscará la nueva instrucción en el PC actualizado.',
      };
    }
  }
}

function pendingSignal(name: string, stageHint: string): InspectorPortSignal {
  return {
    name,
    binary: 'En espera',
    decimalMeaning: `Se activa en etapa ${stageHint}`,
  };
}

export function getBlockInspectorInfo(
  blockId: DatapathBlockId,
  view: DatapathViewModel,
  snapshot: CpuSnapshot,
): BlockInspectorInfo {
  const { IF_ID, ID_EX, EX_MEM, MEM_WB } = snapshot.buffers;
  const isIfErr = view.errorStage === 'IF';
  const ifIdValid = !isIfErr && IF_ID.valid;
  const idExValid = !isIfErr && ID_EX.valid;
  const exMemValid = !isIfErr && EX_MEM.valid;
  const memWbValid = !isIfErr && MEM_WB.valid;
  const f = idExValid ? ID_EX.fields : null;

  switch (blockId) {
    case 'PC':
      return {
        id: blockId,
        title: 'PC — Contador de Programa',
        stageTag: 'IF / WB',
        bitRanges: ['PC[31:0] (32 bits, múltiplo de 4)'],
        beginnerSummary:
          'Es como el marcador de página del procesador: guarda la dirección exacta del byte donde empieza la instrucción que toca leer. Se actualiza al cerrar la etapa WB.',
        inputs: [
          view.nextPC !== null
            ? {
                name: 'nextPC (desde WB)',
                binary: fmtWordBin32(view.nextPC),
                decimalMeaning: `Dirección ${fmtAddrDec(view.nextPC)}`,
              }
            : pendingSignal('nextPC', 'EX / WB'),
        ],
        outputs: [
          {
            name: 'PC[31:0] actual',
            binary: fmtWordBin32(view.pc),
            decimalMeaning: `Dirección ${fmtAddrDec(view.pc)}`,
          },
        ],
        liveValues: [
          { label: 'PC actual', value: fmtAddrDec(view.pc) },
          { label: 'nextPC entrante', value: view.nextPC !== null ? fmtAddrDec(view.nextPC) : '—' },
        ],
      };

    case 'IMEM':
      return {
        id: blockId,
        title: 'Memoria de Instrucciones (IMem)',
        stageTag: 'IF',
        bitRanges: ['Dirección: PC[31:0]', 'Salida: 4 × 8 bits (mem[PC..PC+3])'],
        beginnerSummary:
          'Almacena el programa ensamblado byte por byte. Cada dirección guarda 8 bits, por eso se leen 4 direcciones seguidas para obtener una instrucción completa.',
        inputs: [
          {
            name: 'Dirección PC',
            binary: fmtWordBin32(view.instructionPc),
            decimalMeaning: `Leer desde ${fmtAddrDec(view.instructionPc)}`,
          },
        ],
        outputs: [
          view.bigEndianBytes
            ? {
                name: '4 bytes [b0, b1, b2, b3]',
                binary: view.bigEndianBytes.map(fmtByteBin).join(' '),
                decimalMeaning: `Bytes decimales: [${view.bigEndianBytes.map(fmtByteDec).join(', ')}]`,
              }
            : pendingSignal('mem[PC..PC+3]', 'IF'),
        ],
        liveValues: [
          { label: 'Dirección PC', value: fmtAddrDec(view.instructionPc) },
          { label: 'Tamaño cargado', value: `${snapshot.instructionMemory.length} bytes` },
        ],
      };

    case 'BIG_ENDIAN':
      return {
        id: blockId,
        title: 'Reunión Big-Endian (4 Bytes → 32 bits)',
        stageTag: 'IF (obligatorio antes de ID)',
        bitRanges: ['b0=mem[PC] → [31:24]', 'b1 → [23:16]', 'b2 → [15:8]', 'b3=mem[PC+3] → [7:0]'],
        beginnerSummary:
          'En Big-Endian el byte más significativo (b0) llega primero en la dirección menor (PC). Este bloque une los 4 bytes de 8 bits en la palabra de 32 bits antes de decodificar.',
        inputs: view.bigEndianBytes
          ? view.bigEndianBytes.map((b, i) => ({
              name: `Byte +${i} (mem[PC+${i}])`,
              binary: fmtByteBin(b),
              decimalMeaning: `Byte sin signo: ${fmtByteDec(b)}`,
            }))
          : [pendingSignal('4 bytes [b0..b3]', 'IF')],
        outputs: [
          view.irWord !== null
            ? {
                name: 'IR[31:0] reunido',
                binary: fmtWordBin32(view.irWord),
                decimalMeaning: `Palabra 32b sin signo: ${fmtUnsignedDec(view.irWord)}`,
              }
            : pendingSignal('IR[31:0]', 'IF'),
        ],
        liveValues: [
          {
            label: '[b0, b1, b2, b3]',
            value: view.bigEndianBytes
              ? `[${view.bigEndianBytes.map(fmtByteDec).join(', ')}]`
              : '—',
          },
        ],
      };

    case 'PC_PLUS_4':
      return {
        id: blockId,
        title: 'Sumador PC + 4',
        stageTag: 'IF',
        bitRanges: ['Entrada A: PC[31:0]', 'Entrada B: 4', 'Salida: PC+4[31:0]'],
        beginnerSummary:
          'Como cada instrucción ocupa 4 bytes en memoria, este sumador calcula automáticamente la dirección de la siguiente instrucción secuencial (PC + 4).',
        inputs: [
          {
            name: 'PC[31:0]',
            binary: fmtWordBin32(view.instructionPc),
            decimalMeaning: fmtAddrDec(view.instructionPc),
          },
          {
            name: 'Constante +4',
            binary: fmtWordBin32(4),
            decimalMeaning: 'Decimal: 4 bytes',
          },
        ],
        outputs: [
          ifIdValid
            ? {
                name: 'PC + 4',
                binary: fmtWordBin32(view.pcPlus4),
                decimalMeaning: `Siguiente secuencia: ${fmtAddrDec(view.pcPlus4)}`,
              }
            : pendingSignal('PC + 4', 'IF'),
        ],
        liveValues: [
          { label: 'PC entrada', value: fmtAddrDec(view.instructionPc) },
          { label: 'PC + 4', value: ifIdValid ? fmtAddrDec(view.pcPlus4) : '—' },
        ],
      };

    case 'IF_ID':
      return {
        id: blockId,
        title: 'Buffer Intermedio IF/ID',
        stageTag: 'Se carga al final de IF',
        bitRanges: ['pc[31:0]', 'pcPlus4[31:0]', 'bytes[4×8]', 'instruction[31:0]'],
        beginnerSummary:
          'Memoria temporal que congela los 32 bits recién leídos y su PC+4 al terminar IF para que la etapa ID pueda analizarlos.',
        inputs: ifIdValid
          ? [
              {
                name: '4 bytes reunidos',
                binary: IF_ID.bytes.map(fmtByteBin).join(' '),
                decimalMeaning: `Bytes: [${IF_ID.bytes.map(fmtByteDec).join(', ')}]`,
              },
            ]
          : [pendingSignal('IR[31:0] y PC+4', 'IF')],
        outputs: ifIdValid
          ? [
              {
                name: 'instruction (IR)',
                binary: fmtWordBin32(IF_ID.instruction),
                decimalMeaning: `Instrucción en ${fmtAddrDec(IF_ID.pc)}`,
              },
              {
                name: 'pcPlus4',
                binary: fmtWordBin32(IF_ID.pcPlus4),
                decimalMeaning: fmtAddrDec(IF_ID.pcPlus4),
              },
            ]
          : [pendingSignal('Salida hacia ID', 'IF')],
        liveValues: [{ label: 'Estado', value: ifIdValid ? 'Válido' : 'Vacío' }],
      };

    case 'FIELDS':
      return {
        id: blockId,
        title: 'Divisor de Campos de Instrucción',
        stageTag: 'ID',
        bitRanges: [
          '[31:26] opcode (6b)',
          '[25:21] rs (5b)',
          '[20:16] rt (5b)',
          '[15:11] rd (5b)',
          '[10:6] shamt (5b)',
          '[5:0] funct (6b)',
          '[15:0] imm16 (16b)',
          '[25:0] index (26b)',
        ],
        beginnerSummary:
          'Parte la instrucción de 32 bits en grupos de bits: qué operación hacer (opcode/funct), qué registros usar (rs/rt/rd) y qué constante trae (imm16/index).',
        inputs: ifIdValid
          ? [
              {
                name: 'IR[31:0] (desde IF/ID)',
                binary: fmtWordBin32(IF_ID.instruction),
                decimalMeaning: `Palabra completa de 32 bits (${fmtUnsignedDec(IF_ID.instruction)})`,
              },
            ]
          : [pendingSignal('IR[31:0]', 'IF')],
        outputs: idExValid && f
          ? [
              {
                name: 'opcode [31:26]',
                binary: fmtBits(f.opcode, 6),
                decimalMeaning: `Decimal ${f.opcode} → ${f.mnemonic} (Tipo ${f.format})`,
              },
              {
                name: 'rs [25:21] / rt [20:16]',
                binary: `${fmtBits(f.rs, 5)} / ${fmtBits(f.rt, 5)}`,
                decimalMeaning: `${registerLabel(f.rs)} / ${registerLabel(f.rt)}`,
              },
              ...(f.format === 'R'
                ? [
                    {
                      name: 'rd [15:11] / funct [5:0]',
                      binary: `${fmtBits(f.rd, 5)} / ${fmtBits(f.funct, 6)}`,
                      decimalMeaning: `${registerLabel(f.rd)} / funct = ${f.funct}`,
                    },
                  ]
                : f.format === 'J'
                  ? [
                      {
                        name: 'index [25:0]',
                        binary: fmtBits(f.jumpIndex, 26),
                        decimalMeaning: `Índice palabra ${f.jumpIndex} (byte ${f.jumpIndex * 4})`,
                      },
                    ]
                  : [
                      {
                        name: 'imm16 [15:0]',
                        binary: fmtBits(f.imm16, 16),
                        decimalMeaning: `Con signo: ${f.immSigned} (sin signo: ${f.imm16})`,
                      },
                    ]),
            ]
          : [pendingSignal('Campos decodificados', 'ID')],
        liveValues: [{ label: 'Formato', value: f ? `${f.mnemonic} (${f.format})` : 'En espera' }],
      };

    case 'CONTROL':
      return {
        id: blockId,
        title: 'Unidad de Control',
        stageTag: 'ID',
        bitRanges: ['Entradas: opcode[31:26], funct[5:0]', 'Salidas: 12 señales de control'],
        beginnerSummary:
          'Lee el código binario de la instrucción y activa o desactiva las 12 señales que le indican a los multiplexores, ALU, memoria y registros qué hacer.',
        inputs: idExValid && f
          ? [
              {
                name: 'opcode [31:26]',
                binary: fmtBits(f.opcode, 6),
                decimalMeaning: `Decimal ${f.opcode} (${f.mnemonic})`,
              },
              ...(f.format === 'R'
                ? [
                    {
                      name: 'funct [5:0]',
                      binary: fmtBits(f.funct, 6),
                      decimalMeaning: `Decimal ${f.funct} (${f.mnemonic})`,
                    },
                  ]
                : []),
            ]
          : [pendingSignal('opcode / funct', 'ID')],
        outputs: view.controlsValid && view.ctrl
          ? [
              {
                name: 'RegWrite / MemRead / MemWrite',
                binary: `${view.ctrl.RegWrite} / ${view.ctrl.MemRead} / ${view.ctrl.MemWrite}`,
                decimalMeaning: `BR=${view.ctrl.RegWrite === 1 ? 'Escribe' : 'No'}, LeerMem=${view.ctrl.MemRead}, EscribirMem=${view.ctrl.MemWrite}`,
              },
              {
                name: 'RegDst / ALUSrc / MemToReg',
                binary: `${view.ctrl.RegDst} / ${view.ctrl.ALUSrc} / ${view.ctrl.MemToReg}`,
                decimalMeaning: `Destino=${view.ctrl.RegDst === 1 ? 'rd' : 'rt'}, B=${view.ctrl.ALUSrc === 1 ? 'Imm' : 'DR2'}, Dw=${view.ctrl.MemToReg === 1 ? 'Mem' : 'ALU'}`,
              },
              {
                name: 'Branch / BranchNe / Jump / ALUOp',
                binary: `${view.ctrl.Branch} / ${view.ctrl.BranchNe} / ${view.ctrl.Jump} / ${formatAluOpBits(view.ctrl.ALUOp)}`,
                decimalMeaning: `ALUOp=${formatAluOpBits(view.ctrl.ALUOp)} (${formatAluCtlName(view.ctrl.ALUctl)})`,
              },
            ]
          : [pendingSignal('12 señales de control', 'ID')],
        liveValues: [{ label: 'Instrucción', value: f ? `${f.mnemonic} (Tipo ${f.format})` : '—' }],
      };

    case 'BR':
      return {
        id: blockId,
        title: 'Banco de Registros (BR — 32 × 32 bits)',
        stageTag: 'Lectura en ID · Escritura en WB',
        bitRanges: ['AR1[4:0]', 'AR2[4:0]', 'AW[4:0]', 'Dw[31:0]', 'we (1b)', 'DR1, DR2'],
        beginnerSummary:
          'Contiene los 32 registros rápidos ($0 a $31). En ID entrega DR1 y DR2 en 32 bits; en WB guarda el resultado Dw en AW si RegWrite=1 y AW no es $zero.',
        inputs: [
          view.ar1 !== null
            ? {
                name: 'AR1 (registro rs)',
                binary: fmtBits(view.ar1, 5),
                decimalMeaning: `Lee registro ${registerLabel(view.ar1)}`,
              }
            : pendingSignal('AR1', 'ID'),
          view.ar2 !== null
            ? {
                name: 'AR2 (registro rt)',
                binary: fmtBits(view.ar2, 5),
                decimalMeaning: `Lee registro ${registerLabel(view.ar2)}`,
              }
            : pendingSignal('AR2', 'ID'),
          view.aw !== null && view.dw !== null
            ? {
                name: 'AW / Dw / we (en WB)',
                binary: `${fmtBits(view.aw, 5)} / ${fmtWordBin32(view.dw)} / ${view.ctrl?.RegWrite ?? 0}`,
                decimalMeaning: `${view.brStatusLabel}: ${fmtSignedDec(view.dw)}`,
              }
            : pendingSignal('AW / Dw (escritura)', 'MEM / WB'),
        ],
        outputs:
          view.dr1 !== null && view.dr2 !== null
            ? [
                {
                  name: 'DR1 (valor de rs)',
                  binary: fmtWordBin32(view.dr1),
                  decimalMeaning: `Decimal: ${fmtSignedDec(view.dr1)}`,
                },
                {
                  name: 'DR2 (valor de rt)',
                  binary: fmtWordBin32(view.dr2),
                  decimalMeaning: `Decimal: ${fmtSignedDec(view.dr2)}`,
                },
              ]
            : [pendingSignal('DR1 / DR2', 'ID')],
        liveValues: [{ label: 'Estado', value: view.brStatusLabel }],
      };

    case 'EXTENDER':
      return {
        id: blockId,
        title: 'Extensor de Inmediato (16 bits → 32 bits)',
        stageTag: 'ID',
        bitRanges: ['Entrada: imm16[15:0]', 'Control: ExtOp', 'Salida: immExt[31:0]'],
        beginnerSummary:
          'Adapta constantes de 16 bits a palabras de 32 bits para la ALU. En SIGN copia el bit de signo [15] para conservar negativos; en ZERO rellena con ceros.',
        inputs: idExValid && f
          ? [
              {
                name: 'imm16 [15:0]',
                binary: fmtBits(f.imm16, 16),
                decimalMeaning:
                  view.extOpLabel === 'ZERO'
                    ? `Sin signo: ${f.imm16} (ExtOp=ZERO)`
                    : `Con signo: ${f.immSigned} (ExtOp=${view.extOpLabel})`,
              },
            ]
          : [pendingSignal('imm16 [15:0]', 'ID')],
        outputs: view.immExt !== null
          ? [
              {
                name: 'immExt [31:0]',
                binary: fmtWordBin32(view.immExt),
                decimalMeaning:
                  view.extOpLabel === 'ZERO'
                    ? `Decimal sin signo: ${fmtUnsignedDec(view.immExt)}`
                    : `Decimal con signo: ${fmtSignedDec(view.immExt)}`,
              },
            ]
          : [pendingSignal('immExt [31:0]', 'ID')],
        liveValues: [{ label: 'ExtOp', value: view.extOpLabel }],
      };

    case 'ID_EX':
      return {
        id: blockId,
        title: 'Buffer Intermedio ID/EX',
        stageTag: 'Se carga al final de ID',
        bitRanges: ['A (DR1)', 'B (DR2)', 'immExt', 'ctrl (12 señales)'],
        beginnerSummary:
          'Guarda los operandos A y B leídos del Banco de Registros, el inmediato extendido y las 12 señales para la etapa EX.',
        inputs: idExValid
          ? [
              {
                name: 'A (DR1) / B (DR2)',
                binary: `${fmtWordBin32(ID_EX.A)}`,
                decimalMeaning: `A = ${fmtSignedDec(ID_EX.A)}, B = ${fmtSignedDec(ID_EX.B)}`,
              },
            ]
          : [pendingSignal('Operandos y control', 'ID')],
        outputs: idExValid
          ? [
              {
                name: 'Salida hacia EX (A, B, immExt)',
                binary: fmtWordBin32(ID_EX.immExt),
                decimalMeaning: `A=${fmtSignedDec(ID_EX.A)}, B=${fmtSignedDec(ID_EX.B)}, immExt=${fmtSignedDec(ID_EX.immExt)}`,
              },
            ]
          : [pendingSignal('Hacia etapa EX', 'ID')],
        liveValues: [{ label: 'Estado', value: idExValid ? 'Válido' : 'Vacío' }],
      };

    case 'MUX_REGDST':
      return {
        id: blockId,
        title: 'Mux RegDst (Elige Registro Destino AW)',
        stageTag: 'EX',
        bitRanges: ['0: rt[20:16]', '1: rd[15:11]', 'Selector: RegDst (1b)'],
        beginnerSummary:
          'Elige qué campo trae el número del registro destino: en instrucciones tipo I viene en rt (selector 0); en tipo R viene en rd (selector 1).',
        inputs: idExValid && f
          ? [
              {
                name: 'Entrada 0 (rt)',
                binary: fmtBits(f.rt, 5),
                decimalMeaning: registerLabel(f.rt),
              },
              {
                name: 'Entrada 1 (rd)',
                binary: fmtBits(f.rd, 5),
                decimalMeaning: registerLabel(f.rd),
              },
            ]
          : [pendingSignal('rt / rd', 'ID / EX')],
        outputs: exMemValid && view.aw !== null
          ? [
              {
                name: `Salida AW (sel=${view.muxRegDstSel})`,
                binary: fmtBits(view.aw, 5),
                decimalMeaning: `Registro destino: ${registerLabel(view.aw)}`,
              },
            ]
          : [pendingSignal('AW [4:0]', 'EX')],
        liveValues: [{ label: 'Selector RegDst', value: view.muxRegDstSel !== null ? String(view.muxRegDstSel) : '—' }],
      };

    case 'MUX_ALUSRC':
      return {
        id: blockId,
        title: 'Mux ALUSrc (Elige Operando B de la ALU)',
        stageTag: 'EX',
        bitRanges: ['0: B (DR2)', '1: immExt[31:0]', 'Selector: ALUSrc (1b)'],
        beginnerSummary:
          'Decide si el segundo operando que entra a la ALU viene de un registro (0, como add/beq) o de la constante extendida (1, como addi/lw/sw).',
        inputs: idExValid
          ? [
              {
                name: 'Entrada 0 (DR2)',
                binary: fmtWordBin32(ID_EX.B),
                decimalMeaning: `Decimal: ${fmtSignedDec(ID_EX.B)}`,
              },
              {
                name: 'Entrada 1 (immExt)',
                binary: fmtWordBin32(ID_EX.immExt),
                decimalMeaning: `Decimal: ${fmtSignedDec(ID_EX.immExt)}`,
              },
            ]
          : [pendingSignal('DR2 / immExt', 'ID / EX')],
        outputs: view.aluB !== null
          ? [
              {
                name: `Salida ALU.B (sel=${view.muxALUSrcSel})`,
                binary: fmtWordBin32(view.aluB),
                decimalMeaning: `Entra a ALU.B = ${fmtSignedDec(view.aluB)}`,
              },
            ]
          : [pendingSignal('ALU.B [31:0]', 'EX')],
        liveValues: [{ label: 'Selector ALUSrc', value: view.muxALUSrcSel !== null ? String(view.muxALUSrcSel) : '—' }],
      };

    case 'ALU_CONTROL':
      return {
        id: blockId,
        title: 'ALU Control',
        stageTag: 'EX',
        bitRanges: ['Entradas: ALUOp[1:0], funct[5:0]', 'Salida: ALUctl[3:0]'],
        beginnerSummary:
          'Traduce ALUOp (2 bits) y el campo funct (en tipo R) al código binario de 4 bits que le indica a MIPSALU qué operación realizar.',
        inputs: idExValid && f && view.ctrl
          ? [
              {
                name: 'ALUOp [1:0]',
                binary: formatAluOpBits(view.ctrl.ALUOp),
                decimalMeaning: formatAluOpMeaning(view.ctrl.ALUOp),
              },
              ...(f.format === 'R'
                ? [
                    {
                      name: 'funct [5:0]',
                      binary: fmtBits(f.funct, 6),
                      decimalMeaning: `Decimal ${f.funct} (${f.mnemonic})`,
                    },
                  ]
                : []),
            ]
          : [pendingSignal('ALUOp / funct', 'ID / EX')],
        outputs: exMemValid && view.ctrl
          ? [
              {
                name: 'ALUctl [3:0]',
                binary: formatAluCtlBits(view.ctrl.ALUctl),
                decimalMeaning: `Operación: ${formatAluCtlName(view.ctrl.ALUctl)} (decimal ${view.ctrl.ALUctl})`,
              },
            ]
          : [pendingSignal('ALUctl [3:0]', 'EX')],
        liveValues: [{ label: 'ALUctl', value: view.aluCtlLabel }],
      };

    case 'MIPSALU':
      return {
        id: blockId,
        title: 'MIPSALU (Unidad Aritmético-Lógica)',
        stageTag: 'EX',
        bitRanges: ['A[31:0]', 'B[31:0]', 'ALUctl[3:0]', 'ALUOut[31:0]', 'Zero (1b)'],
        beginnerSummary:
          'Realiza el cálculo matemático o lógico sobre A y B. También calcula direcciones de memoria (para lw/sw) y verifica igualdad restando (para beq/bne).',
        inputs:
          view.aluA !== null && view.aluB !== null && view.ctrl
            ? [
                {
                  name: 'Operando A',
                  binary: fmtWordBin32(view.aluA),
                  decimalMeaning: `Decimal: ${fmtSignedDec(view.aluA)}`,
                },
                {
                  name: 'Operando B',
                  binary: fmtWordBin32(view.aluB),
                  decimalMeaning: `Decimal: ${fmtSignedDec(view.aluB)}`,
                },
                {
                  name: 'ALUctl',
                  binary: formatAluCtlBits(view.ctrl.ALUctl),
                  decimalMeaning: `Operación ${formatAluCtlName(view.ctrl.ALUctl)}`,
                },
              ]
            : [pendingSignal('A, B y ALUctl', 'EX')],
        outputs:
          view.aluOut !== null && view.zeroFlag !== null
            ? [
                {
                  name: 'ALUOut [31:0]',
                  binary: fmtWordBin32(view.aluOut),
                  decimalMeaning: `Resultado decimal: ${fmtSignedDec(view.aluOut)}`,
                },
                {
                  name: 'Bandera Zero',
                  binary: view.zeroFlag ? '1' : '0',
                  decimalMeaning: view.zeroFlag ? '1 → Resultado fue 0 (iguales)' : '0 → Resultado distinto de 0',
                },
              ]
            : [pendingSignal('ALUOut y Zero', 'EX')],
        liveValues: [
          { label: 'ALUOut', value: view.aluOut !== null ? fmtSignedDec(view.aluOut) : '—' },
        ],
      };

    case 'SHIFT_BRANCH':
      return {
        id: blockId,
        title: 'Shift Left 2 (Desplazamiento de Salto)',
        stageTag: 'EX',
        bitRanges: ['Entrada: immExt[31:0]', 'Operación: << 2 (×4 bytes)'],
        beginnerSummary:
          'Multiplica por 4 el desplazamiento (desplaza 2 bits a la izquierda) para convertir palabras en direcciones de byte.',
        inputs: idExValid && f
          ? [
              {
                name: 'immExt [31:0]',
                binary: fmtWordBin32(ID_EX.immExt),
                decimalMeaning: `${f.immSigned} instrucciones`,
              },
            ]
          : [pendingSignal('immExt', 'ID / EX')],
        outputs: exMemValid && f
          ? [
              {
                name: 'immExt << 2',
                binary: fmtWordBin32((ID_EX.immExt << 2) >>> 0),
                decimalMeaning: `${f.immSigned * 4} bytes de salto`,
              },
            ]
          : [pendingSignal('Desplazamiento ×4', 'EX')],
        liveValues: [{ label: 'Desplazamiento', value: f ? `${f.immSigned * 4} bytes` : '—' }],
      };

    case 'BRANCH_ADDER':
      return {
        id: blockId,
        title: 'Sumador de Dirección de Branch',
        stageTag: 'EX',
        bitRanges: ['PC+4 + (immExt << 2)', 'Salida: branchTarget[31:0]'],
        beginnerSummary:
          'Suma PC+4 más el desplazamiento en bytes para obtener la dirección exacta adonde saltará beq o bne si se cumple la condición.',
        inputs: exMemValid && f
          ? [
              {
                name: 'PC + 4',
                binary: fmtWordBin32(ID_EX.pcPlus4),
                decimalMeaning: fmtAddrDec(ID_EX.pcPlus4),
              },
              {
                name: 'Desplazamiento (×4)',
                binary: fmtWordBin32((ID_EX.immExt << 2) >>> 0),
                decimalMeaning: `${f.immSigned * 4} bytes`,
              },
            ]
          : [pendingSignal('PC+4 y offset', 'EX')],
        outputs: view.branchTarget !== null
          ? [
              {
                name: 'branchTarget [31:0]',
                binary: fmtWordBin32(view.branchTarget),
                decimalMeaning: `Destino: ${fmtAddrDec(view.branchTarget)}`,
              },
            ]
          : [pendingSignal('branchTarget', 'EX')],
        liveValues: [
          { label: 'branchTarget', value: view.branchTarget !== null ? fmtAddrDec(view.branchTarget) : '—' },
        ],
      };

    case 'BRANCH_LOGIC':
      return {
        id: blockId,
        title: 'Lógica de Salto Condicional (BEQ / BNE)',
        stageTag: 'EX',
        bitRanges: ['branchTaken = (Branch & Zero) | (BranchNe & !Zero)'],
        beginnerSummary:
          'Combina la señal de control (Branch o BranchNe) con la bandera Zero de la ALU para decidir si el salto condicional se toma (1) o no (0).',
        inputs: exMemValid && view.ctrl
          ? [
              {
                name: 'Branch / BranchNe',
                binary: `${view.ctrl.Branch} / ${view.ctrl.BranchNe}`,
                decimalMeaning: view.ctrl.Branch === 1 ? 'beq activo' : view.ctrl.BranchNe === 1 ? 'bne activo' : 'No es salto cond.',
              },
              {
                name: 'Zero (desde ALU)',
                binary: EX_MEM.zero ? '1' : '0',
                decimalMeaning: EX_MEM.zero ? 'Operandos iguales (Zero=1)' : 'Operandos distintos (Zero=0)',
              },
            ]
          : [pendingSignal('Branch, BranchNe, Zero', 'EX')],
        outputs: exMemValid
          ? [
              {
                name: 'branchTaken',
                binary: view.branchTaken ? '1' : '0',
                decimalMeaning: view.branchTaken ? '1 → Salto TOMADO' : '0 → No salta (sigue PC+4)',
              },
            ]
          : [pendingSignal('branchTaken', 'EX')],
        liveValues: [{ label: 'branchTaken', value: exMemValid ? (view.branchTaken ? '1 (Sí)' : '0 (No)') : '—' }],
      };

    case 'MUX_PCSRC':
      return {
        id: blockId,
        title: 'Mux PCSrc (PC+4 vs Branch)',
        stageTag: 'EX',
        bitRanges: ['0: PC+4', '1: branchTarget', 'Selector: branchTaken'],
        beginnerSummary:
          'Elige entre continuar a la siguiente instrucción (PC+4) o saltar a branchTarget si se cumplió beq/bne.',
        inputs: exMemValid
          ? [
              {
                name: 'Entrada 0 (PC + 4)',
                binary: fmtWordBin32(ID_EX.pcPlus4),
                decimalMeaning: fmtAddrDec(ID_EX.pcPlus4),
              },
              {
                name: 'Entrada 1 (branchTarget)',
                binary: fmtWordBin32(EX_MEM.branchTarget),
                decimalMeaning: fmtAddrDec(EX_MEM.branchTarget),
              },
            ]
          : [pendingSignal('PC+4 / branchTarget', 'EX')],
        outputs: exMemValid
          ? [
              {
                name: `Salida (sel=${view.muxPCSrcSel})`,
                binary: fmtWordBin32(EX_MEM.branchTaken ? EX_MEM.branchTarget : ID_EX.pcPlus4),
                decimalMeaning: fmtAddrDec(EX_MEM.branchTaken ? EX_MEM.branchTarget : ID_EX.pcPlus4),
              },
            ]
          : [pendingSignal('Salida PCSrc', 'EX')],
        liveValues: [{ label: 'Selector', value: view.muxPCSrcSel !== null ? String(view.muxPCSrcSel) : '—' }],
      };

    case 'JUMP_CONCAT':
      return {
        id: blockId,
        title: 'Cálculo Jump Target (j)',
        stageTag: 'EX',
        bitRanges: ['(PC+4)[31:28] || (index[25:0] << 2)'],
        beginnerSummary:
          'Para la instrucción j, desplaza 2 bits a la izquierda el índice de 26 bits (×4 bytes) y lo une con los 4 bits superiores de PC+4.',
        inputs: idExValid && f
          ? [
              {
                name: 'index [25:0]',
                binary: fmtBits(f.jumpIndex, 26),
                decimalMeaning: `Palabra ${f.jumpIndex} (×4 = ${fmtAddrDec(f.jumpIndex * 4)})`,
              },
            ]
          : [pendingSignal('index [25:0]', 'ID / EX')],
        outputs: view.jumpTarget !== null
          ? [
              {
                name: 'jumpTarget [31:0]',
                binary: fmtWordBin32(view.jumpTarget),
                decimalMeaning: `Destino salto: ${fmtAddrDec(view.jumpTarget)}`,
              },
            ]
          : [pendingSignal('jumpTarget', 'EX')],
        liveValues: [
          { label: 'jumpTarget', value: view.jumpTarget !== null ? fmtAddrDec(view.jumpTarget) : '—' },
        ],
      };

    case 'MUX_JUMP':
      return {
        id: blockId,
        title: 'Mux Jump (Selector Final de nextPC)',
        stageTag: 'EX',
        bitRanges: ['0: salida Mux PCSrc', '1: jumpTarget', 'Selector: Jump (1b)'],
        beginnerSummary:
          'Decisión final del siguiente PC: si Jump=1 toma jumpTarget; de lo contrario mantiene el resultado de Mux PCSrc.',
        inputs: exMemValid
          ? [
              {
                name: 'Entrada 0 (Mux PCSrc)',
                binary: fmtWordBin32(EX_MEM.branchTaken ? EX_MEM.branchTarget : ID_EX.pcPlus4),
                decimalMeaning: fmtAddrDec(EX_MEM.branchTaken ? EX_MEM.branchTarget : ID_EX.pcPlus4),
              },
              {
                name: 'Entrada 1 (jumpTarget)',
                binary: fmtWordBin32(EX_MEM.jumpTarget),
                decimalMeaning: fmtAddrDec(EX_MEM.jumpTarget),
              },
            ]
          : [pendingSignal('PCSrc / jumpTarget', 'EX')],
        outputs: view.nextPC !== null
          ? [
              {
                name: `nextPC final (sel=${view.muxJumpSel})`,
                binary: fmtWordBin32(view.nextPC),
                decimalMeaning: `Próximo PC: ${fmtAddrDec(view.nextPC)}`,
              },
            ]
          : [pendingSignal('nextPC', 'EX')],
        liveValues: [{ label: 'nextPC', value: view.nextPC !== null ? fmtAddrDec(view.nextPC) : '—' }],
      };

    case 'EX_MEM':
      return {
        id: blockId,
        title: 'Buffer Intermedio EX/MEM',
        stageTag: 'Se carga al final de EX',
        bitRanges: ['aluResult', 'zero', 'writeData (DR2)', 'writeReg (AW)', 'nextPC'],
        beginnerSummary:
          'Conserva el resultado de la ALU, el registro destino y el próximo PC calculado al terminar la etapa EX.',
        inputs: exMemValid
          ? [
              {
                name: 'ALUOut / Zero',
                binary: fmtWordBin32(EX_MEM.aluResult),
                decimalMeaning: `Decimal: ${fmtSignedDec(EX_MEM.aluResult)} (Zero=${EX_MEM.zero ? 1 : 0})`,
              },
            ]
          : [pendingSignal('Resultados de EX', 'EX')],
        outputs: exMemValid
          ? [
              {
                name: 'Hacia MEM (ALUOut / nextPC)',
                binary: fmtWordBin32(EX_MEM.nextPC),
                decimalMeaning: `ALUOut=${fmtSignedDec(EX_MEM.aluResult)}, nextPC=${fmtAddrDec(EX_MEM.nextPC)}`,
              },
            ]
          : [pendingSignal('Hacia etapa MEM', 'EX')],
        liveValues: [{ label: 'Estado', value: exMemValid ? 'Válido' : 'Vacío' }],
      };

    case 'DMEM':
      return {
        id: blockId,
        title: 'Memoria de Datos (DMem — Big-Endian)',
        stageTag: 'MEM',
        bitRanges: ['Address: ALUOut[31:0]', 'WriteData: DR2[31:0]', 'Salida: MDR[31:0]'],
        beginnerSummary:
          'Almacena arreglos y variables del programa en Big-Endian (4 bytes por palabra). Solo actúa en lw (MemRead=1) o sw (MemWrite=1) sobre direcciones múltiplos de 4.',
        inputs: exMemValid
          ? [
              {
                name: 'Address (ALUOut)',
                binary: fmtWordBin32(EX_MEM.aluResult),
                decimalMeaning: fmtAddrDec(EX_MEM.aluResult),
              },
              {
                name: 'WriteData (DR2)',
                binary: fmtWordBin32(EX_MEM.writeData),
                decimalMeaning: `Decimal: ${fmtSignedDec(EX_MEM.writeData)}`,
              },
            ]
          : [pendingSignal('Address / WriteData', 'EX / MEM')],
        outputs: memWbValid
          ? [
              {
                name: `MDR (${view.dmemAction})`,
                binary: fmtWordBin32(MEM_WB.memReadData),
                decimalMeaning:
                  view.mdr !== null
                    ? `Leído de memoria: ${fmtSignedDec(view.mdr)}`
                    : view.dmemAction === 'WRITE'
                      ? `Escrito en DMem[${fmtUnsignedDec(EX_MEM.aluResult)}]`
                      : 'Sin lectura (bypass)',
              },
            ]
          : [pendingSignal('MDR (dato leído)', 'MEM')],
        liveValues: [{ label: 'Acción', value: view.dmemAction }],
      };

    case 'MEM_WB':
      return {
        id: blockId,
        title: 'Buffer Intermedio MEM/WB',
        stageTag: 'Se carga al final de MEM',
        bitRanges: ['memReadData (MDR)', 'aluResult', 'writeReg (AW)', 'writeBackData (Dw)', 'nextPC'],
        beginnerSummary:
          'Guarda el valor final Dw listo para escribirse en el Banco de Registros y el nextPC que actualizará al PC en WB.',
        inputs: memWbValid
          ? [
              {
                name: 'Dw (writeBackData)',
                binary: fmtWordBin32(MEM_WB.writeBackData),
                decimalMeaning: `Decimal: ${fmtSignedDec(MEM_WB.writeBackData)} → ${registerLabel(MEM_WB.writeReg)}`,
              },
            ]
          : [pendingSignal('MDR / ALUOut', 'MEM')],
        outputs: memWbValid
          ? [
              {
                name: 'Hacia WB (Dw y nextPC)',
                binary: fmtWordBin32(MEM_WB.nextPC),
                decimalMeaning: `Dw=${fmtSignedDec(MEM_WB.writeBackData)}, nextPC=${fmtAddrDec(MEM_WB.nextPC)}`,
              },
            ]
          : [pendingSignal('Hacia etapa WB', 'MEM')],
        liveValues: [{ label: 'Estado', value: memWbValid ? 'Válido' : 'Vacío' }],
      };

    case 'MUX_MEMTOREG':
      return {
        id: blockId,
        title: 'Mux MemToReg (Elige Dato Final Dw)',
        stageTag: 'MEM → WB',
        bitRanges: ['0: ALUOut[31:0]', '1: MDR[31:0]', 'Selector: MemToReg (1b)'],
        beginnerSummary:
          'Elige si el dato final que se guardará en el Banco de Registros viene del cálculo de la ALU (0) o de la Memoria de Datos (1, en lw).',
        inputs: memWbValid
          ? [
              {
                name: 'Entrada 0 (ALUOut)',
                binary: fmtWordBin32(MEM_WB.aluResult),
                decimalMeaning: `Decimal: ${fmtSignedDec(MEM_WB.aluResult)}`,
              },
              {
                name: 'Entrada 1 (MDR)',
                binary: fmtWordBin32(MEM_WB.memReadData),
                decimalMeaning: `Decimal: ${fmtSignedDec(MEM_WB.memReadData)}`,
              },
            ]
          : [pendingSignal('ALUOut / MDR', 'MEM / WB')],
        outputs: view.dw !== null
          ? [
              {
                name: `Salida Dw (sel=${view.muxMemToRegSel})`,
                binary: fmtWordBin32(view.dw),
                decimalMeaning: `Valor final: ${fmtSignedDec(view.dw)}`,
              },
            ]
          : [pendingSignal('Dw [31:0]', 'MEM / WB')],
        liveValues: [{ label: 'Salida Dw', value: view.dw !== null ? fmtSignedDec(view.dw) : '—' }],
      };
  }
}
