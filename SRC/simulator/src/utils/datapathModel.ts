import {
  ALU_CTL,
  REGISTER_NAMES,
  formatHex32,
  formatHexByte,
  toInt32,
} from '@core/isa';
import type {
  AluControlCode,
  Byte,
  ControlSignals,
  CpuSnapshot,
  Stage,
  Word32,
} from '@core/types';

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

export interface BlockInspectorInfo {
  id: DatapathBlockId;
  title: string;
  stageTag: string;
  bitRanges: string[];
  beginnerSummary: string;
  liveValues: Array<{ label: string; value: string }>;
}

export interface DatapathViewModel {
  activeStage: Stage | null;
  nextStage: Stage;
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
  return {
    raw: u,
    opcode: (u >>> 26) & 0x3f,
    rs: (u >>> 21) & 0x1f,
    rt: (u >>> 16) & 0x1f,
    rd: (u >>> 11) & 0x1f,
    shamt: (u >>> 6) & 0x1f,
    funct: u & 0x3f,
    imm16: u & 0xffff,
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

  const controlsValid = idExValid;
  const ctrl = controlsValid ? ID_EX.ctrl : null;

  const pc = snapshot.pc;
  const instructionPc = ifIdValid ? IF_ID.pc : pc;
  const pcPlus4 = ifIdValid ? IF_ID.pcPlus4 : ((pc + 4) >>> 0);
  const pcUpdatedInWB = activeStage === 'WB' && memWbValid && !hasError;

  // Reunion big-endian de 4 bytes
  let bigEndianBytes: [Byte, Byte, Byte, Byte] | null = null;
  let bigEndianReady = false;
  if (!isIfFetchError) {
    if (ifIdValid) {
      bigEndianBytes = IF_ID.bytes;
      bigEndianReady = true;
    } else if ((pc & 0x3) === 0 && pc + 3 < snapshot.instructionMemory.length) {
      bigEndianBytes = [
        snapshot.instructionMemory[pc],
        snapshot.instructionMemory[pc + 1],
        snapshot.instructionMemory[pc + 2],
        snapshot.instructionMemory[pc + 3],
      ];
      bigEndianReady = true;
    }
  }

  const irWord = ifIdValid ? IF_ID.instruction : null;
  const slices = irWord !== null ? extractInstructionSlices(irWord) : null;

  const mnemonic = idExValid
    ? ID_EX.fields.mnemonic
    : ifIdValid
      ? 'Pendiente ID'
      : '—';
  const format = idExValid ? ID_EX.fields.format : null;

  const ar1 = idExValid ? ID_EX.fields.rs : slices ? slices.rs : null;
  const ar2 = idExValid ? ID_EX.fields.rt : slices ? slices.rt : null;
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

  let brStatusLabel = 'Inactivo';
  if (controlsValid && ctrl) {
    if (ctrl.RegWrite === 0) {
      brStatusLabel = 'Deshabilitado (RegWrite=0)';
    } else if (aw === 0) {
      brStatusLabel = '$zero inmutable (AW=$0)';
    } else if (aw !== null) {
      brStatusLabel = `Destino: ${REGISTER_NAMES[aw]}`;
    }
  }

  const immExt = idExValid ? ID_EX.immExt : null;
  const extOpLabel = controlsValid && ctrl ? ctrl.ExtOp : '—';

  const aluA = exMemValid ? EX_MEM.aluOperandA : idExValid ? ID_EX.A : null;
  const aluB = exMemValid
    ? EX_MEM.aluOperandB
    : idExValid && ctrl
      ? ctrl.ALUSrc === 1
        ? ID_EX.immExt
        : ID_EX.B
      : null;
  const aluOut = exMemValid ? EX_MEM.aluResult : null;
  const zeroFlag = exMemValid ? EX_MEM.zero : null;
  const aluCtlLabel =
    controlsValid && ctrl
      ? `${formatAluCtlBits(ctrl.ALUctl)} ${formatAluCtlName(ctrl.ALUctl)}`
      : '—';

  const branchTarget = exMemValid ? EX_MEM.branchTarget : null;
  const jumpTarget = exMemValid ? EX_MEM.jumpTarget : null;
  const branchTaken = exMemValid
    ? EX_MEM.branchTaken
    : Boolean(
        ctrl &&
          zeroFlag !== null &&
          ((ctrl.Branch === 1 && zeroFlag) || (ctrl.BranchNe === 1 && !zeroFlag)),
      );
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

  return {
    activeStage,
    nextStage: snapshot.nextStage,
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
      headline: `La instrucción "${loopInstr}" saltó sobre sí misma en PC = ${formatHex32(snapshot.pc)}.`,
      detail: `Se completaron ${snapshot.instructionsExecuted} instrucciones en ${snapshot.cycle} ciclos. Los resultados finales ya están en el Banco de Registros y la Memoria de Datos.`,
      nextHint: 'Inspecciona los valores finales o presiona "Reiniciar" para volver a ejecutar.',
    };
  }

  if (snapshot.lastStage === null) {
    return {
      title: 'Procesador listo para iniciar',
      badge: 'READY · Ciclo 0',
      tone: 'neutral',
      headline: `PC apunta a ${formatHex32(snapshot.pc)}. Los 4 buffers intermedios están vacíos.`,
      detail:
        'En el diseño multiciclo, cada instrucción recorre 5 etapas consecutivas (IF → ID → EX → MEM → WB) antes de pasar a la siguiente.',
      nextHint: 'Pulsa "+ Etapa (IF)", "+ Instrucción" o "Play" para ver viajar los datos.',
    };
  }

  switch (snapshot.lastStage) {
    case 'IF': {
      const bytesStr = IF_ID.bytes.map(formatHexByte).join(' ');
      return {
        title: 'Etapa 1 — IF (Búsqueda de Instrucción)',
        badge: 'IF completada · Cargó IF/ID',
        tone: 'if',
        headline: `IMem leyó 4 bytes big-endian [${bytesStr}] desde ${formatHex32(IF_ID.pc)} y formó IR = ${formatHex32(IF_ID.instruction)}.`,
        detail: `Al mismo tiempo, el sumador calculó PC + 4 = ${formatHex32(IF_ID.pcPlus4)}. Todo quedó guardado en el buffer IF/ID.`,
        nextHint: 'Siguiente paso: ID decodificará estos 32 bits y leerá los registros.',
      };
    }
    case 'ID': {
      const f = ID_EX.fields;
      const extText =
        ID_EX.ctrl.ExtOp === 'NONE'
          ? 'No requiere extensión de inmediato.'
          : `El extensor (${ID_EX.ctrl.ExtOp}) convirtió imm16=0x${f.imm16.toString(16).toUpperCase().padStart(4, '0')} en ${formatHex32(ID_EX.immExt)}.`;
      return {
        title: 'Etapa 2 — ID (Decodificación y Lectura de Registros)',
        badge: 'ID completada · Cargó ID/EX',
        tone: 'id',
        headline: `Instrucción "${f.mnemonic}" (Formato ${f.format}). La Unidad de Control activó las 12 señales.`,
        detail: `El Banco de Registros entregó DR1 (${REGISTER_NAMES[f.rs]} = ${formatHex32(ID_EX.A)}) y DR2 (${REGISTER_NAMES[f.rt]} = ${formatHex32(ID_EX.B)}). ${extText}`,
        nextHint: 'Siguiente paso: EX operará en la MIPSALU y decidirá el próximo PC.',
      };
    }
    case 'EX': {
      const opName = formatAluCtlName(EX_MEM.ctrl.ALUctl);
      const flowText =
        EX_MEM.ctrl.Jump === 1
          ? `Jump activo → nextPC = ${formatHex32(EX_MEM.nextPC)}.`
          : EX_MEM.ctrl.Branch === 1 || EX_MEM.ctrl.BranchNe === 1
            ? `Salto condicional ${EX_MEM.branchTaken ? 'TOMADO' : 'NO tomado'} (Zero=${EX_MEM.zero ? 1 : 0}) → nextPC = ${formatHex32(EX_MEM.nextPC)}.`
            : `Flujo secuencial → nextPC = ${formatHex32(EX_MEM.nextPC)}.`;
      return {
        title: 'Etapa 3 — EX (Ejecución en ALU y Cálculo de Siguiente PC)',
        badge: 'EX completada · Cargó EX/MEM',
        tone: 'ex',
        headline: `MIPSALU (${opName}) recibió A=${formatHex32(EX_MEM.aluOperandA)} y B=${formatHex32(EX_MEM.aluOperandB)} → ALUOut=${formatHex32(EX_MEM.aluResult)} (Zero=${EX_MEM.zero ? 1 : 0}).`,
        detail: `Mux RegDst eligió AW=${REGISTER_NAMES[EX_MEM.writeReg]}. ${flowText}`,
        nextHint: 'Siguiente paso: MEM leerá/escribirá DMem si la instrucción es lw o sw.',
      };
    }
    case 'MEM': {
      const { ctrl, aluResult, memReadData, writeBackData } = MEM_WB;
      const memText =
        ctrl.MemRead === 1
          ? `lw leyó 4 bytes big-endian en DMem[${formatHex32(aluResult)}] → MDR = ${formatHex32(memReadData)}.`
          : ctrl.MemWrite === 1
            ? `sw guardó DR2 = ${formatHex32(EX_MEM.writeData)} en DMem[${formatHex32(aluResult)}] (big-endian).`
            : `Sin acceso a DMem (MemRead=0, MemWrite=0); ALUOut = ${formatHex32(aluResult)} pasa directo.`;
      return {
        title: 'Etapa 4 — MEM (Acceso a Memoria de Datos)',
        badge: 'MEM completada · Cargó MEM/WB',
        tone: 'mem',
        headline: memText,
        detail: `Mux MemToReg preparó el valor final Dw = ${formatHex32(writeBackData)} dentro del buffer MEM/WB.`,
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
            : `Se escribió ${formatHex32(writeBackData)} (${toInt32(writeBackData)}) en ${REGISTER_NAMES[writeReg]}.`;
      return {
        title: 'Etapa 5 — WB (Escritura en Registros y Actualización de PC)',
        badge: 'WB completada · Instrucción finalizada',
        tone: 'wb',
        headline: `${writeText} PC avanzó a ${formatHex32(nextPC)}.`,
        detail: `Total ejecutado: ${snapshot.instructionsExecuted} instrucción(es) en ${snapshot.cycle} ciclos.`,
        nextHint: 'Siguiente paso: IF buscará la nueva instrucción en el PC actualizado.',
      };
    }
  }
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
          'Es como el marcador de página del procesador: guarda la dirección exacta de la instrucción que toca leer en Memoria de Instrucciones. Se actualiza al cerrar la etapa WB.',
        liveValues: [
          { label: 'PC actual', value: formatHex32(view.pc) },
          { label: 'nextPC entrante', value: view.nextPC !== null ? formatHex32(view.nextPC) : '—' },
          { label: 'Actualizado en WB', value: view.pcUpdatedInWB ? 'Sí' : 'No (en curso)' },
        ],
      };
    case 'IMEM':
      return {
        id: blockId,
        title: 'Memoria de Instrucciones (IMem)',
        stageTag: 'IF',
        bitRanges: ['Dirección: PC[31:0]', 'Salida: 4 × 8 bits (mem[PC..PC+3])'],
        beginnerSummary:
          'Almacena el programa ensamblado byte por byte. Cada dirección contiene 1 byte (8 bits), por eso se leen 4 direcciones seguidas para obtener una instrucción.',
        liveValues: [
          { label: 'Dirección PC', value: formatHex32(view.instructionPc) },
          { label: 'Tamaño cargado', value: `${snapshot.instructionMemory.length} bytes` },
          {
            label: 'Bytes leídos',
            value: view.bigEndianBytes
              ? view.bigEndianBytes.map(formatHexByte).join(' ')
              : 'Fuera de rango',
          },
        ],
      };
    case 'BIG_ENDIAN':
      return {
        id: blockId,
        title: 'Reunión Big-Endian (4 Bytes → 32 bits)',
        stageTag: 'IF (obligatorio antes de ID)',
        bitRanges: ['b0=mem[PC] → [31:24]', 'b1 → [23:16]', 'b2 → [15:8]', 'b3=mem[PC+3] → [7:0]'],
        beginnerSummary:
          'En Big-Endian el byte más significativo (b0) llega primero en la dirección menor (PC). Este bloque reúne los 4 bytes sueltos en la palabra IR de 32 bits antes de decodificar.',
        liveValues: [
          {
            label: '[b0, b1, b2, b3]',
            value: view.bigEndianBytes
              ? `[${view.bigEndianBytes.map(formatHexByte).join(', ')}]`
              : '—',
          },
          { label: 'IR (32 bits)', value: view.irWord !== null ? formatHex32(view.irWord) : '—' },
        ],
      };
    case 'PC_PLUS_4':
      return {
        id: blockId,
        title: 'Sumador PC + 4',
        stageTag: 'IF',
        bitRanges: ['Entrada A: PC[31:0]', 'Entrada B: 4', 'Salida: PC+4[31:0]'],
        beginnerSummary:
          'Como cada instrucción ocupa 4 bytes en memoria, este sumador calcula automáticamente la dirección de la instrucción siguiente (PC + 4).',
        liveValues: [
          { label: 'PC entrada', value: formatHex32(view.instructionPc) },
          { label: 'PC + 4', value: formatHex32(view.pcPlus4) },
        ],
      };
    case 'IF_ID':
      return {
        id: blockId,
        title: 'Buffer Intermedio IF/ID',
        stageTag: 'Se carga al final de IF',
        bitRanges: ['pc[31:0]', 'pcPlus4[31:0]', 'bytes[4×8]', 'instruction[31:0]'],
        beginnerSummary:
          'Registro intermedio que congela la instrucción recién leída y su PC+4 para que la etapa ID pueda analizarlos en el siguiente ciclo.',
        liveValues: [
          { label: 'Estado', value: ifIdValid ? 'Válido' : 'Vacío' },
          { label: 'IR', value: ifIdValid ? formatHex32(IF_ID.instruction) : '—' },
          { label: 'PC+4', value: ifIdValid ? formatHex32(IF_ID.pcPlus4) : '—' },
        ],
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
          'Separa los 32 bits de la instrucción en subgrupos fijos de bits: qué operación hacer (opcode/funct), qué registros usar (rs/rt/rd) y qué constante o dirección trae (imm16/index).',
        liveValues: view.slices
          ? [
              { label: 'opcode [31:26]', value: `0x${view.slices.opcode.toString(16).toUpperCase().padStart(2, '0')}` },
              { label: 'rs [25:21] / rt [20:16]', value: `${registerLabel(view.slices.rs)} / ${registerLabel(view.slices.rt)}` },
              { label: 'rd [15:11] / funct [5:0]', value: `${registerLabel(view.slices.rd)} / 0x${view.slices.funct.toString(16).toUpperCase().padStart(2, '0')}` },
              { label: 'imm16 [15:0]', value: `0x${view.slices.imm16.toString(16).toUpperCase().padStart(4, '0')}` },
            ]
          : [{ label: 'IR', value: 'Pendiente de IF' }],
      };
    case 'CONTROL':
      return {
        id: blockId,
        title: 'Unidad de Control',
        stageTag: 'ID',
        bitRanges: ['Entradas: opcode[31:26], funct[5:0]', 'Salidas: 12 señales de control'],
        beginnerSummary:
          'Es el director de orquesta: lee el código de la instrucción y enciende o apaga las 12 señales que indican a multiplexores, ALU, memoria y registros qué deben hacer.',
        liveValues: view.controlsValid && view.ctrl
          ? [
              { label: 'Instrucción', value: `${view.mnemonic} (Tipo ${view.format})` },
              { label: 'RegWrite / MemRead / MemWrite', value: `${view.ctrl.RegWrite} / ${view.ctrl.MemRead} / ${view.ctrl.MemWrite}` },
              { label: 'RegDst / ALUSrc / MemToReg', value: `${view.ctrl.RegDst} / ${view.ctrl.ALUSrc} / ${view.ctrl.MemToReg}` },
              { label: 'Branch / BranchNe / Jump', value: `${view.ctrl.Branch} / ${view.ctrl.BranchNe} / ${view.ctrl.Jump}` },
            ]
          : [{ label: 'Estado', value: 'Pendiente de etapa ID' }],
      };
    case 'BR':
      return {
        id: blockId,
        title: 'Banco de Registros (BR — 32 × 32 bits)',
        stageTag: 'Lectura en ID · Escritura en WB',
        bitRanges: [
          'AR1[4:0] (rs)',
          'AR2[4:0] (rt)',
          'AW[4:0] (destino)',
          'Dw[31:0] (dato a escribir)',
          'we (RegWrite, 1b)',
          'DR1[31:0], DR2[31:0]',
        ],
        beginnerSummary:
          'Son 32 casillas ultra rápidas dentro de la CPU ($0 a $31). En ID entrega DR1 y DR2; en WB guarda Dw en AW si RegWrite=1 y AW≠$zero ($0 siempre vale 0).',
        liveValues: [
          { label: 'AR1 → DR1', value: `${registerLabel(view.ar1)} → ${view.dr1 !== null ? formatHex32(view.dr1) : '—'}` },
          { label: 'AR2 → DR2', value: `${registerLabel(view.ar2)} → ${view.dr2 !== null ? formatHex32(view.dr2) : '—'}` },
          { label: 'AW / Dw / we', value: `${registerLabel(view.aw)} / ${view.dw !== null ? formatHex32(view.dw) : '—'} / we=${view.controlsValid && view.ctrl ? view.ctrl.RegWrite : '—'}` },
          { label: 'Estado escritura', value: view.brStatusLabel },
        ],
      };
    case 'EXTENDER':
      return {
        id: blockId,
        title: 'Extensor de Inmediato (Sign / Zero Ext)',
        stageTag: 'ID',
        bitRanges: ['Entrada: imm16[15:0]', 'Control: ExtOp (SIGN|ZERO|NONE)', 'Salida: immExt[31:0]'],
        beginnerSummary:
          'Convierte constantes de 16 bits en palabras de 32 bits para que la ALU pueda sumarlas o compararlas. Usa signo (copia bit 15) para números con signo, o ceros para ori.',
        liveValues: [
          { label: 'ExtOp', value: view.extOpLabel },
          { label: 'imm16', value: f ? `0x${f.imm16.toString(16).toUpperCase().padStart(4, '0')} (${f.immSigned})` : '—' },
          { label: 'immExt (32b)', value: view.immExt !== null ? formatHex32(view.immExt) : '—' },
        ],
      };
    case 'ID_EX':
      return {
        id: blockId,
        title: 'Buffer Intermedio ID/EX',
        stageTag: 'Se carga al final de ID',
        bitRanges: ['pc, pcPlus4', 'fields', 'A (DR1), B (DR2)', 'immExt', 'ctrl (12 señales)'],
        beginnerSummary:
          'Guarda los operandos leídos del Banco de Registros, el inmediato extendido y todas las señales de control listas para usarse en EX, MEM y WB.',
        liveValues: [
          { label: 'Estado', value: idExValid ? 'Válido' : 'Vacío' },
          { label: 'A / B', value: idExValid ? `${formatHex32(ID_EX.A)} / ${formatHex32(ID_EX.B)}` : '—' },
          { label: 'immExt', value: idExValid ? formatHex32(ID_EX.immExt) : '—' },
        ],
      };
    case 'MUX_REGDST':
      return {
        id: blockId,
        title: 'Mux RegDst (Selector de Registro Destino AW)',
        stageTag: 'EX',
        bitRanges: ['0: rt[20:16]', '1: rd[15:11]', 'Selector: RegDst (1b)', 'Salida: AW[4:0]'],
        beginnerSummary:
          'Elige en qué campo viene escrito el registro destino: en instrucciones tipo I viene en rt (0), mientras que en tipo R viene en rd (1).',
        liveValues: [
          { label: 'Selector RegDst', value: view.muxRegDstSel !== null ? String(view.muxRegDstSel) : '—' },
          { label: '0=rt / 1=rd', value: f ? `${registerLabel(f.rt)} / ${registerLabel(f.rd)}` : '—' },
          { label: 'Salida AW', value: registerLabel(view.aw) },
        ],
      };
    case 'MUX_ALUSRC':
      return {
        id: blockId,
        title: 'Mux ALUSrc (Selector del Operando B)',
        stageTag: 'EX',
        bitRanges: ['0: DR2 (B[31:0])', '1: immExt[31:0]', 'Selector: ALUSrc (1b)', 'Salida: ALU.B[31:0]'],
        beginnerSummary:
          'Decide si el segundo número que entra a la ALU proviene de un registro (0, como en add o beq) o de un inmediato de la instrucción (1, como en addi, lw, sw).',
        liveValues: [
          { label: 'Selector ALUSrc', value: view.muxALUSrcSel !== null ? String(view.muxALUSrcSel) : '—' },
          { label: 'Salida ALU.B', value: view.aluB !== null ? formatHex32(view.aluB) : '—' },
        ],
      };
    case 'ALU_CONTROL':
      return {
        id: blockId,
        title: 'ALU Control (Decodificador de ALU)',
        stageTag: 'EX',
        bitRanges: ['Entradas: ALUOp[1:0], funct[5:0]', 'Salida: ALUctl[3:0] (4 bits)'],
        beginnerSummary:
          'Traduce la orden general ALUOp y el campo funct (en tipo R) en el código exacto de 4 bits que entiende la MIPSALU (AND, OR, ADD, SUB, SLT).',
        liveValues: [
          { label: 'ALUOp', value: view.controlsValid && view.ctrl ? formatAluOpBits(view.ctrl.ALUOp) : '—' },
          { label: 'funct [5:0]', value: f ? `0x${f.funct.toString(16).toUpperCase().padStart(2, '0')}` : '—' },
          { label: 'ALUctl', value: view.aluCtlLabel },
        ],
      };
    case 'MIPSALU':
      return {
        id: blockId,
        title: 'MIPSALU (Unidad Aritmético-Lógica)',
        stageTag: 'EX',
        bitRanges: ['A[31:0]', 'B[31:0]', 'ALUctl[3:0]', 'ALUOut[31:0]', 'Zero (1b)'],
        beginnerSummary:
          'Es la calculadora del procesador: suma, resta, compara (slt) o hace AND/OR con A y B. También calcula direcciones de memoria para lw/sw y compara registros en beq/bne.',
        liveValues: [
          { label: 'A / B', value: view.aluA !== null && view.aluB !== null ? `${formatHex32(view.aluA)} / ${formatHex32(view.aluB)}` : '—' },
          { label: 'ALUOut', value: view.aluOut !== null ? formatHex32(view.aluOut) : '—' },
          { label: 'Zero', value: view.zeroFlag !== null ? (view.zeroFlag ? '1 (true)' : '0 (false)') : '—' },
        ],
      };
    case 'SHIFT_BRANCH':
      return {
        id: blockId,
        title: 'Shift Left 2 (Desplazamiento de Salto)',
        stageTag: 'EX',
        bitRanges: ['Entrada: immExt[31:0]', 'Operación: << 2 (×4 bytes)', 'Salida: offset[31:0]'],
        beginnerSummary:
          'En MIPS el desplazamiento de beq/bne se mide en palabras de 4 bytes. Multiplicar por 4 (desplazar 2 bits a la izquierda) lo convierte en dirección de bytes.',
        liveValues: [
          { label: 'immSigned', value: f ? String(f.immSigned) : '—' },
          { label: 'Desplazamiento (bytes)', value: f ? `${f.immSigned * 4}` : '—' },
        ],
      };
    case 'BRANCH_ADDER':
      return {
        id: blockId,
        title: 'Sumador de Dirección de Branch',
        stageTag: 'EX',
        bitRanges: ['PC+4[31:0] + (immExt << 2)', 'Salida: branchTarget[31:0]'],
        beginnerSummary:
          'Calcula a qué dirección saltaría el programa si se cumple la condición de beq o bne.',
        liveValues: [
          { label: 'PC + 4', value: formatHex32(view.pcPlus4) },
          { label: 'branchTarget', value: view.branchTarget !== null ? formatHex32(view.branchTarget) : '—' },
        ],
      };
    case 'BRANCH_LOGIC':
      return {
        id: blockId,
        title: 'Compuerta de Decisión Branch (BEQ / BNE)',
        stageTag: 'EX',
        bitRanges: ['branchTaken = (Branch & Zero) | (BranchNe & !Zero)'],
        beginnerSummary:
          'Combina las señales Branch (beq) y BranchNe (bne) con la bandera Zero de la ALU para decidir si el salto condicional se toma o no.',
        liveValues: [
          { label: 'Branch / BranchNe', value: view.controlsValid && view.ctrl ? `${view.ctrl.Branch} / ${view.ctrl.BranchNe}` : '—' },
          { label: 'Zero', value: view.zeroFlag !== null ? (view.zeroFlag ? '1' : '0') : '—' },
          { label: 'branchTaken', value: exMemValid ? (view.branchTaken ? '1 (Tomado)' : '0 (No tomado)') : '—' },
        ],
      };
    case 'MUX_PCSRC':
      return {
        id: blockId,
        title: 'Mux PCSrc / Branch',
        stageTag: 'EX',
        bitRanges: ['0: PC+4', '1: branchTarget', 'Selector: branchTaken'],
        beginnerSummary:
          'Elige entre avanzar secuencialmente (PC+4) o saltar a branchTarget si se cumplió beq/bne.',
        liveValues: [
          { label: 'Selector branchTaken', value: view.muxPCSrcSel !== null ? String(view.muxPCSrcSel) : '—' },
          { label: 'Salida', value: exMemValid ? formatHex32(view.branchTaken ? EX_MEM.branchTarget : view.pcPlus4) : '—' },
        ],
      };
    case 'JUMP_CONCAT':
      return {
        id: blockId,
        title: 'Cálculo Jump Target (Shift << 2 + Concat)',
        stageTag: 'EX',
        bitRanges: ['(PC+4)[31:28] || (index[25:0] << 2)', 'Salida: jumpTarget[31:0]'],
        beginnerSummary:
          'Para la instrucción j, desplaza 2 bits el índice de 26 bits y lo une con los 4 bits más altos de PC+4 para formar una dirección de 32 bits.',
        liveValues: [
          { label: 'index [25:0]', value: view.slices ? `0x${view.slices.jumpIndex.toString(16).toUpperCase().padStart(7, '0')}` : '—' },
          { label: 'jumpTarget', value: view.jumpTarget !== null ? formatHex32(view.jumpTarget) : '—' },
        ],
      };
    case 'MUX_JUMP':
      return {
        id: blockId,
        title: 'Mux Jump (Selector Final de nextPC)',
        stageTag: 'EX',
        bitRanges: ['0: salida Mux PCSrc', '1: jumpTarget', 'Selector: Jump (1b)', 'Salida: nextPC[31:0]'],
        beginnerSummary:
          'Decisión final del siguiente PC: si Jump=1 (instrucción j) toma jumpTarget; si no, conserva la salida del Mux de Branch.',
        liveValues: [
          { label: 'Selector Jump', value: view.muxJumpSel !== null ? String(view.muxJumpSel) : '—' },
          { label: 'nextPC final', value: view.nextPC !== null ? formatHex32(view.nextPC) : '—' },
        ],
      };
    case 'EX_MEM':
      return {
        id: blockId,
        title: 'Buffer Intermedio EX/MEM',
        stageTag: 'Se carga al final de EX',
        bitRanges: ['aluResult, zero', 'writeData (DR2)', 'writeReg (AW)', 'nextPC', 'ctrl'],
        beginnerSummary:
          'Conserva el resultado de la ALU (que puede ser un dato o una dirección de memoria), el registro destino y el nextPC calculado.',
        liveValues: [
          { label: 'Estado', value: exMemValid ? 'Válido' : 'Vacío' },
          { label: 'ALUOut / Zero', value: exMemValid ? `${formatHex32(EX_MEM.aluResult)} / ${EX_MEM.zero ? 1 : 0}` : '—' },
          { label: 'nextPC', value: exMemValid ? formatHex32(EX_MEM.nextPC) : '—' },
        ],
      };
    case 'DMEM':
      return {
        id: blockId,
        title: 'Memoria de Datos (DMem — Big-Endian)',
        stageTag: 'MEM',
        bitRanges: ['Address: ALUOut[31:0]', 'WriteData: DR2[31:0]', 'MemRead, MemWrite', 'Salida: MDR[31:0]'],
        beginnerSummary:
          'Guarda los arreglos y variables del programa en orden big-endian (4 bytes por palabra). Solo trabaja en lw (MemRead=1) o sw (MemWrite=1); exige direcciones múltiplos de 4.',
        liveValues: [
          { label: 'Acción', value: view.dmemAction },
          { label: 'Address (ALUOut)', value: exMemValid ? formatHex32(EX_MEM.aluResult) : '—' },
          { label: 'WriteData / MDR', value: exMemValid ? `${formatHex32(EX_MEM.writeData)} / ${view.mdr !== null ? formatHex32(view.mdr) : '—'}` : '—' },
        ],
      };
    case 'MEM_WB':
      return {
        id: blockId,
        title: 'Buffer Intermedio MEM/WB',
        stageTag: 'Se carga al final de MEM',
        bitRanges: ['memReadData (MDR)', 'aluResult', 'writeReg (AW)', 'writeBackData (Dw)', 'nextPC'],
        beginnerSummary:
          'Guarda el valor final Dw listo para escribirse en el Banco de Registros y el nextPC que actualizará al Contador de Programa en WB.',
        liveValues: [
          { label: 'Estado', value: memWbValid ? 'Válido' : 'Vacío' },
          { label: 'Dw (writeBackData)', value: memWbValid ? formatHex32(MEM_WB.writeBackData) : '—' },
          { label: 'AW / nextPC', value: memWbValid ? `${registerLabel(MEM_WB.writeReg)} / ${formatHex32(MEM_WB.nextPC)}` : '—' },
        ],
      };
    case 'MUX_MEMTOREG':
      return {
        id: blockId,
        title: 'Mux MemToReg (Selector de Dato Dw)',
        stageTag: 'MEM → WB',
        bitRanges: ['0: ALUOut[31:0]', '1: MDR[31:0]', 'Selector: MemToReg (1b)', 'Salida: Dw[31:0]'],
        beginnerSummary:
          'Elige si el resultado que se escribirá en el Banco de Registros viene de la ALU (0, operaciones aritméticas) o de la Memoria de Datos (1, instrucción lw).',
        liveValues: [
          { label: 'Selector MemToReg', value: view.muxMemToRegSel !== null ? String(view.muxMemToRegSel) : '—' },
          { label: 'Salida Dw', value: view.dw !== null ? formatHex32(view.dw) : '—' },
        ],
      };
  }
}
