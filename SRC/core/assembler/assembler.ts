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
 * Soporte actual: instrucciones tipo R (add, sub, and, or, slt).
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
import { encodeR, formatBinaryFields } from './encoder';
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

function encodeLine(line: SourceLine): EncodedLine {
  const mnemonic = line.mnemonic as string;

  if (R_MNEMONICS.has(mnemonic)) {
    const spec = ISA_TABLE[mnemonic as Mnemonic];
    expectOperandCount(line, 3, `${mnemonic} $rd, $rs, $rt`);
    const [rd, rs, rt] = line.operands.map(readRegister);
    return { word: encodeR(spec.funct as number, rd, rs, rt), format: 'R' };
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
      const { word, format } = encodeLine(line);
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
