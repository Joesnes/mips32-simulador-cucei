/**
 * PROPIETARIO: Fares Khalifa
 * Punto de entrada publico del ensamblador MIPS de 32 bits.
 * NO cambiar la firma exportada `assemble(source: string): AssembleResult`.
 *
 * Ensamblador de 2 pasadas:
 *   Pasada 1: separa cada linea (lexer), registra etiquetas con su direccion de byte
 *             (detecta duplicadas) y asigna direcciones consecutivas PC = 0, 4, 8, ...
 *   Pasada 2: valida mnemonico y operandos, codifica la palabra de 32 bits y arma
 *             la imagen big-endian (1 byte por direccion), el .hex y el listado.
 *
 * Soporte actual:
 *   R: add, sub, and, or, slt                       -> op $rd, $rs, $rt
 *   I: addi/addiu, ori                              -> op $rt, $rs, #imm   (el # es opcional)
 *      lw, sw                                       -> op $rt, #desp($rs)
 *      beq, bne                                     -> op $rs, $rt, #etiqueta
 *
 * Rangos validados (consigna pag. 5):
 *   addi/addiu/lw/sw: inmediato con signo en [-32768, 32767]
 *   ori:              inmediato sin signo en [0, 65535]
 *   beq/bne:          desplazamiento en palabras (destino - (PC + 4)) / 4 en [-32768, 32767],
 *                     etiqueta definida y destino alineado a 4
 */

import { ISA_TABLE, formatHex32, formatHexByte, parseRegister, wordToBytesBigEndian } from '../isa';
import type {
  AssembleResult,
  AssembledInstruction,
  AssemblerDiagnostic,
  Byte,
  InstructionFormat,
  Mnemonic,
  Word32,
} from '../types';
import { encodeI, encodeR, formatBinaryFields } from './encoder';
import { tokenizeSource, type SourceLine } from './lexer';

type DiagnosticCode = AssemblerDiagnostic['code'];

/** Error de una linea concreta; se convierte en diagnostico con numero de linea. */
class LineError extends Error {
  constructor(public readonly code: DiagnosticCode, message: string) {
    super(message);
  }
}

interface EncodedLine {
  word: Word32;
  format: InstructionFormat;
}

const R_MNEMONICS = new Set<string>(['add', 'sub', 'and', 'or', 'slt']);
const I_ARITH_MNEMONICS = new Set<string>(['addi', 'addiu', 'ori']);
const I_MEMORY_MNEMONICS = new Set<string>(['lw', 'sw']);
const I_BRANCH_MNEMONICS = new Set<string>(['beq', 'bne']);

const SIGNED_16 = { min: -32768, max: 32767 };
const UNSIGNED_16 = { min: 0, max: 65535 };
const LABEL_NAME_RE = /^[A-Za-z_.][A-Za-z0-9_.]*$/;
const NUMBER_RE = /^[+-]?(0x[0-9a-f]+|0b[01]+|\d+)$/i;
const MEMORY_OPERAND_RE = /^([^()]*)\(\s*([^()\s]+)\s*\)$/;

/** Contexto que la pasada 2 necesita para resolver etiquetas. */
interface EncodeContext {
  address: Word32;
  labels: Record<string, Word32>;
}

function isKnownMnemonic(mnemonic: string): mnemonic is Mnemonic {
  return Object.prototype.hasOwnProperty.call(ISA_TABLE, mnemonic);
}

function expectOperandCount(line: SourceLine, count: number, syntax: string): void {
  if (line.operands.length !== count) {
    throw new LineError(
      'INVALID_SYNTAX',
      `"${line.mnemonic}" espera ${count} operandos (${syntax}) y recibio ${line.operands.length}.`,
    );
  }
}

function readRegister(token: string): number {
  if (!token.startsWith('$')) {
    throw new LineError('INVALID_SYNTAX', `Se esperaba un registro (ej. $t0 o $8) y se encontro "${token}".`);
  }
  const index = parseRegister(token);
  if (index === null) {
    throw new LineError('INVALID_REGISTER', `Registro invalido "${token}" (validos: $0..$31 y alias como $zero, $t0..$t9, $s0..$s7).`);
  }
  return index;
}

/** Lee un numero decimal, hexadecimal (0x) o binario (0b), con signo y `#` opcionales. */
function readNumber(token: string, what: string): number {
  const text = token.startsWith('#') ? token.slice(1) : token;
  if (!NUMBER_RE.test(text)) {
    throw new LineError('INVALID_SYNTAX', `Se esperaba ${what} numerico y se encontro "${token}".`);
  }
  const negative = text.startsWith('-');
  const digits = text.replace(/^[+-]/, '').toLowerCase();
  const magnitude = digits.startsWith('0x')
    ? parseInt(digits.slice(2), 16)
    : digits.startsWith('0b')
      ? parseInt(digits.slice(2), 2)
      : parseInt(digits, 10);
  return negative ? -magnitude : magnitude;
}

function checkRange(value: number, range: { min: number; max: number }, mnemonic: string): number {
  if (value < range.min || value > range.max) {
    throw new LineError(
      'IMMEDIATE_OUT_OF_RANGE',
      `El inmediato ${value} de "${mnemonic}" esta fuera de rango [${range.min}, ${range.max}].`,
    );
  }
  return value;
}

/** Calcula el desplazamiento en palabras de beq/bne: (destino - (PC + 4)) / 4. */
function branchOffset(token: string, mnemonic: string, ctx: EncodeContext): number {
  const name = token.startsWith('#') ? token.slice(1) : token;
  if (!LABEL_NAME_RE.test(name)) {
    throw new LineError('INVALID_SYNTAX', `"${mnemonic}" espera una etiqueta como destino y se encontro "${token}".`);
  }
  if (!Object.prototype.hasOwnProperty.call(ctx.labels, name)) {
    throw new LineError('UNDEFINED_LABEL', `La etiqueta "${name}" no esta definida.`);
  }
  const target = ctx.labels[name];
  if ((target & 0x3) !== 0) {
    throw new LineError('UNALIGNED_TARGET', `El destino ${formatHex32(target)} de "${name}" no esta alineado a 4.`);
  }
  const offset = (target - (ctx.address + 4)) / 4;
  if (offset < SIGNED_16.min || offset > SIGNED_16.max) {
    throw new LineError(
      'BRANCH_OUT_OF_RANGE',
      `El salto a "${name}" requiere ${offset} palabras y no cabe en 16 bits con signo [-32768, 32767].`,
    );
  }
  return offset;
}

function encodeLine(line: SourceLine, ctx: EncodeContext): EncodedLine {
  const mnemonic = line.mnemonic as string;
  const spec = isKnownMnemonic(mnemonic) ? ISA_TABLE[mnemonic] : null;

  if (spec && R_MNEMONICS.has(mnemonic)) {
    expectOperandCount(line, 3, `${mnemonic} $rd, $rs, $rt`);
    const [rd, rs, rt] = line.operands.map(readRegister);
    return { word: encodeR(spec.funct as number, rd, rs, rt), format: 'R' };
  }

  if (spec && I_ARITH_MNEMONICS.has(mnemonic)) {
    expectOperandCount(line, 3, `${mnemonic} $rt, $rs, #imm`);
    const rt = readRegister(line.operands[0]);
    const rs = readRegister(line.operands[1]);
    const range = mnemonic === 'ori' ? UNSIGNED_16 : SIGNED_16;
    const imm = checkRange(readNumber(line.operands[2], 'un inmediato'), range, mnemonic);
    return { word: encodeI(spec.opcode, rs, rt, imm), format: 'I' };
  }

  if (spec && I_MEMORY_MNEMONICS.has(mnemonic)) {
    expectOperandCount(line, 2, `${mnemonic} $rt, #desp($rs)`);
    const rt = readRegister(line.operands[0]);
    const match = MEMORY_OPERAND_RE.exec(line.operands[1]);
    if (!match) {
      throw new LineError('INVALID_SYNTAX', `"${mnemonic}" espera un operando de memoria como 4($s0) y se encontro "${line.operands[1]}".`);
    }
    const offsetText = match[1].trim();
    const offset = offsetText === '' || offsetText === '#' ? 0 : readNumber(offsetText, 'un desplazamiento');
    const rs = readRegister(match[2]);
    return { word: encodeI(spec.opcode, rs, rt, checkRange(offset, SIGNED_16, mnemonic)), format: 'I' };
  }

  if (spec && I_BRANCH_MNEMONICS.has(mnemonic)) {
    expectOperandCount(line, 3, `${mnemonic} $rs, $rt, #etiqueta`);
    const rs = readRegister(line.operands[0]);
    const rt = readRegister(line.operands[1]);
    const offset = branchOffset(line.operands[2], mnemonic, ctx);
    return { word: encodeI(spec.opcode, rs, rt, offset), format: 'I' };
  }

  if (isKnownMnemonic(mnemonic)) {
    throw new LineError('INVALID_MNEMONIC', `La instruccion "${mnemonic}" aun no esta soportada por el ensamblador.`);
  }
  throw new LineError('INVALID_MNEMONIC', `Mnemonico desconocido "${mnemonic}".`);
}

function buildListing(instructions: AssembledInstruction[], labelsByAddress: Map<Word32, string[]>): string {
  const header = [
    '; Direccion   Palabra     Binario (por campos)                   Fuente',
    '; ----------  ----------  -------------------------------------  ------',
  ];
  const rows = instructions.map((ins) => {
    const labels = labelsByAddress.get(ins.address);
    const prefix = labels ? `${labels.join(': ')}: ` : '';
    return `${formatHex32(ins.address)}  ${ins.hex}  ${ins.binary.padEnd(37)}  ${prefix}${ins.source}`;
  });
  return [...header, ...rows].join('\n') + '\n';
}

export function assemble(source: string): AssembleResult {
  const lines = tokenizeSource(source);
  const diagnostics: AssemblerDiagnostic[] = [];
  const labels: Record<string, Word32> = {};
  const labelsByAddress = new Map<Word32, string[]>();
  const report = (line: SourceLine, code: DiagnosticCode, message: string) => {
    diagnostics.push({ line: line.line, severity: 'error', code, message, sourceLine: line.raw.trim() });
  };

  // Pasada 1: etiquetas y direcciones.
  const addressOf = new Map<SourceLine, Word32>();
  let pc: Word32 = 0;
  for (const line of lines) {
    for (const label of line.labels) {
      if (Object.prototype.hasOwnProperty.call(labels, label.name)) {
        report(line, 'DUPLICATE_LABEL', `La etiqueta "${label.name}" ya fue definida en ${formatHex32(labels[label.name])}.`);
        continue;
      }
      labels[label.name] = pc;
      labelsByAddress.set(pc, [...(labelsByAddress.get(pc) ?? []), label.name]);
    }
    if (line.mnemonic !== null || line.syntaxError !== null) {
      addressOf.set(line, pc);
      pc = (pc + 4) >>> 0;
    }
  }

  // Pasada 2: codificacion.
  const instructions: AssembledInstruction[] = [];
  for (const line of lines) {
    const address = addressOf.get(line);
    if (address === undefined) {
      continue;
    }
    if (line.syntaxError !== null) {
      report(line, 'INVALID_SYNTAX', line.syntaxError);
      continue;
    }
    try {
      const { word, format } = encodeLine(line, { address, labels });
      instructions.push({
        address,
        line: line.line,
        source: line.text,
        word,
        hex: formatHex32(word),
        binary: formatBinaryFields(word, format),
        bytes: wordToBytesBigEndian(word),
        format,
        mnemonic: line.mnemonic as string,
      });
    } catch (error) {
      if (error instanceof LineError) {
        report(line, error.code, error.message);
      } else {
        throw error;
      }
    }
  }

  diagnostics.sort((a, b) => a.line - b.line);
  const ok = diagnostics.length === 0;
  const bytes: Byte[] = ok ? instructions.flatMap((ins) => ins.bytes) : [];

  return {
    ok,
    instructions,
    bytes,
    hexImage: ok ? bytes.map((b) => formatHexByte(b)).join('\n') + (bytes.length > 0 ? '\n' : '') : '',
    listing: ok ? buildListing(instructions, labelsByAddress) : '',
    labels,
    diagnostics,
  };
}
