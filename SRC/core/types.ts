/**
 * ============================================================================
 * CONTRATO CONGELADO DE TIPOS — PROYECTO FINAL ARQUITECTURA DE COMPUTADORAS
 * ============================================================================
 * ADVERTENCIA DE EQUIPO:
 * Este archivo define las interfaces compartidas entre:
 *   - Alejandro Espinoza: CPU/Datapath (SRC/core/cpu/), DatapathSVG, ControlSignalsPanel
 *   - Fares Khalifa: Ensamblador (SRC/core/assembler/), EditorControls,
 *                   MemoryRegistersPanel, InstructionInspector, Programas ASM
 *
 * NO MODIFICAR firmas existentes sin acuerdo previo en PR revisado por ambos.
 * ============================================================================
 */

/** Entero sin signo de 32 bits (siempre normalizado con `>>> 0`). */
export type Word32 = number;

/** Byte sin signo (0..255). */
export type Byte = number;

/** Formato de instruccion MIPS. */
export type InstructionFormat = 'R' | 'I' | 'J';

/** Mnemónicos oficiales soportados (12 instrucciones + alias addiu). */
export type Mnemonic =
  | 'add'
  | 'sub'
  | 'and'
  | 'or'
  | 'slt'
  | 'addi'
  | 'addiu'
  | 'ori'
  | 'lw'
  | 'sw'
  | 'beq'
  | 'bne'
  | 'j';

/** Etapas de la maquina multiciclo (1 instruccion activa a la vez). */
export type Stage = 'IF' | 'ID' | 'EX' | 'MEM' | 'WB';

/** Estado global de ejecucion de la CPU. */
export type CpuStatus = 'READY' | 'RUNNING' | 'HALTED_SELFLOOP' | 'ERROR';

/** Codigo de operacion de la ALU de 4 bits (alineado a ALU.v de clase). */
export type AluControlCode =
  | 0b0000 // AND
  | 0b0001 // OR
  | 0b0010 // ADD (mod 2^32)
  | 0b0110 // SUB (mod 2^32)
  | 0b0111 // SLT (con signo 32 bits)
  | 0b1100; // NOR (referencia ALU.v)

/** Tipo de extension del inmediato de 16 bits. */
export type ExtOp = 'SIGN' | 'ZERO' | 'NONE';

/** Senales de la Unidad de Control (nombres de Figura 1 y 2 + ALU.v/BR.v). */
export interface ControlSignals {
  /** 1 -> destino es rd (R), 0 -> destino es rt (I) */
  RegDst: 0 | 1;
  /** 1 -> operando B de ALU es inmediato extendido, 0 -> DR2 */
  ALUSrc: 0 | 1;
  /** Extension de inmediato: SIGN (addi/lw/sw/beq/bne), ZERO (ori) */
  ExtOp: ExtOp;
  /** 1 -> dato a escribir en BR proviene de Memoria de Datos (lw), 0 -> ALUOut */
  MemToReg: 0 | 1;
  /** Habilitacion de escritura en Banco de Registros (equiv. `we` / `en_BR`) */
  RegWrite: 0 | 1;
  /** Habilitacion de lectura en Memoria de Datos (lw) */
  MemRead: 0 | 1;
  /** Habilitacion de escritura en Memoria de Datos (sw) */
  MemWrite: 0 | 1;
  /** Salto condicional si Zero == 1 (beq) */
  Branch: 0 | 1;
  /** Salto condicional si Zero == 0 (bne) */
  BranchNe: 0 | 1;
  /** Salto incondicional (j) */
  Jump: 0 | 1;
  /** Control de 2 bits hacia ALUControl: 00=ADD, 01=SUB, 10=R-funct, 11=OR */
  ALUOp: 0b00 | 0b01 | 0b10 | 0b11;
  /** Senal de 4 bits resultante hacia MIPSALU */
  ALUctl: AluControlCode;
}

/** Campos decodificados de una palabra de instruccion de 32 bits. */
export interface DecodedFields {
  raw: Word32;
  format: InstructionFormat | 'UNKNOWN';
  mnemonic: string;
  opcode: number;    // bits [31:26] (6b)
  rs: number;        // bits [25:21] (5b)
  rt: number;        // bits [20:16] (5b)
  rd: number;        // bits [15:11] (5b)
  shamt: number;     // bits [10:6]  (5b)
  funct: number;     // bits [5:0]   (6b)
  imm16: number;     // bits [15:0]  (16b sin signo)
  immSigned: number; // bits [15:0] extendido con signo (-32768..32767)
  jumpIndex: number; // bits [25:0]  (26b)
}

/** Buffer intermedio IF/ID: conserva PC, los 4 bytes reunidos y la palabra IR. */
export interface IfIdBuffer {
  valid: boolean;
  pc: Word32;
  pcPlus4: Word32;
  bytes: [Byte, Byte, Byte, Byte]; // Big-endian: [mem[PC], mem[PC+1], mem[PC+2], mem[PC+3]]
  instruction: Word32;
}

/** Buffer intermedio ID/EX: campos, operandos A/B (DR1/DR2), inmediato extendido y control. */
export interface IdExBuffer {
  valid: boolean;
  pc: Word32;
  pcPlus4: Word32;
  fields: DecodedFields;
  A: Word32; // DR1 = R[rs]
  B: Word32; // DR2 = R[rt]
  immExt: Word32;
  ctrl: ControlSignals;
}

/** Buffer intermedio EX/MEM: resultado ALU, bandera Zero, destino de salto y dato a guardar. */
export interface ExMemBuffer {
  valid: boolean;
  pc: Word32;
  aluOperandA: Word32;
  aluOperandB: Word32;
  aluResult: Word32;
  zero: boolean;
  writeData: Word32;    // DR2 para sw
  writeReg: number;     // AW (rd o rt)
  branchTarget: Word32; // pcPlus4 + (signExt(imm16) << 2)
  jumpTarget: Word32;   // (pcPlus4 & 0xF0000000) | (jumpIndex << 2)
  branchTaken: boolean;
  nextPC: Word32;
  ctrl: ControlSignals;
}

/** Buffer intermedio MEM/WB: dato leido de memoria (MDR), dato final Dw y proximo PC. */
export interface MemWbBuffer {
  valid: boolean;
  pc: Word32;
  memReadData: Word32;   // MDR
  aluResult: Word32;
  writeReg: number;      // AW
  writeBackData: Word32; // Dw (salida de Mux MemToReg)
  nextPC: Word32;
  ctrl: ControlSignals;
}

export interface StageBuffers {
  IF_ID: IfIdBuffer;
  ID_EX: IdExBuffer;
  EX_MEM: ExMemBuffer;
  MEM_WB: MemWbBuffer;
}

/** Registro de cambio en el ultimo ciclo/etapa para resaltar en UI. */
export interface StateChangeLog {
  cycle: number;
  stage: Stage;
  pcBefore: Word32;
  pcAfter: Word32;
  registerChanged?: { index: number; before: Word32; after: Word32 };
  memoryChanged?: { address: Word32; before: Word32; after: Word32 };
  buffersUpdated: Array<'IF_ID' | 'ID_EX' | 'EX_MEM' | 'MEM_WB'>;
  summary: string;
}

/** Error de ejecucion de la CPU (detencion visible sin corromper estado). */
export interface CpuError {
  code:
    | 'PC_OUT_OF_RANGE'
    | 'PC_UNALIGNED'
    | 'DATA_OUT_OF_RANGE'
    | 'DATA_UNALIGNED'
    | 'UNKNOWN_INSTRUCTION';
  message: string;
  pc: Word32;
  address?: Word32;
  stage: Stage;
}

/** Foto inmutable completa del estado del procesador para renderizar la UI y generar trazas. */
export interface CpuSnapshot {
  status: CpuStatus;
  cycle: number;
  instructionsExecuted: number;
  /** Etapa que acaba de completarse (null justo tras reset). */
  lastStage: Stage | null;
  /** Siguiente etapa a ejecutar al pulsar "Avanzar etapa". */
  nextStage: Stage;
  pc: Word32;
  registers: Word32[]; // 32 palabras de 32 bits ($0..$31)
  instructionMemory: Byte[]; // Big-endian, 1 byte por direccion
  dataMemory: Byte[];        // Big-endian, 1 byte por direccion
  buffers: StageBuffers;
  lastChange: StateChangeLog | null;
  error: CpuError | null;
}

/* ============================================================================
 * CONTRATO DEL ENSAMBLADOR (Fares Khalifa implementa, Alejandro Espinoza y UI consumen)
 * ============================================================================ */

export interface AssemblerDiagnostic {
  line: number; // 1-based
  severity: 'error' | 'warning';
  code:
    | 'INVALID_MNEMONIC'
    | 'INVALID_REGISTER'
    | 'INVALID_SYNTAX'
    | 'DUPLICATE_LABEL'
    | 'UNDEFINED_LABEL'
    | 'IMMEDIATE_OUT_OF_RANGE'
    | 'BRANCH_OUT_OF_RANGE'
    | 'JUMP_OUT_OF_REGION'
    | 'UNALIGNED_TARGET';
  message: string;
  sourceLine: string;
}

export interface AssembledInstruction {
  address: Word32; // Direccion de byte alineada a 4 (0, 4, 8, ...)
  line: number;    // Linea original en el archivo .asm (1-based)
  source: string;  // Texto limpio de la instruccion
  word: Word32;    // Palabra de 32 bits
  hex: string;     // Ej. "0x24080005"
  binary: string;  // 32 bits agrupados o continuos
  bytes: [Byte, Byte, Byte, Byte]; // Big-endian [b3, b2, b1, b0]
  format: InstructionFormat;
  mnemonic: string;
}

export interface AssembleResult {
  ok: boolean;
  instructions: AssembledInstruction[];
  /** Imagen cargable en memoria de instrucciones (1 byte por direccion, big-endian). */
  bytes: Byte[];
  /** Imagen de texto lista para exportar (.hex con 1 byte hex por linea). */
  hexImage: string;
  /** Listado legible: direccion | palabra hex | binario | fuente ASM. */
  listing: string;
  /** Tabla de simbolos resuelta: etiqueta -> direccion de byte. */
  labels: Record<string, Word32>;
  diagnostics: AssemblerDiagnostic[];
}

/* ============================================================================
 * CONTRATO DE DATASETS Y PROGRAMAS DE EJEMPLO (Fares Khalifa)
 * ============================================================================ */

export interface MemoryWordInit {
  /** Direccion de byte alineada a 4 (ej. 0, 4, 8, ...). */
  address: Word32;
  /** Valor entero de 32 bits (puede ser negativo; se guarda en complemento a 2). */
  value: number;
  label?: string;
}

export interface AlgorithmDataset {
  id: string;
  name: string;
  description: string;
  isEdgeCase: boolean;
  initialMemory: MemoryWordInit[];
  expectedMemory: MemoryWordInit[];
  maxInstructions?: number;
}

export interface ProgramPreset {
  id: string;
  title: string;
  category: 'R' | 'I' | 'J' | 'ALGORITHM';
  description: string;
  source: string;
  datasets?: AlgorithmDataset[];
}
