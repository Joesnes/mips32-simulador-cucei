/**
 * PROPIETARIO: Fares Khalifa
 * Codificacion de instrucciones a palabras de 32 bits y utilidades de formato.
 *
 * Campos (de mayor a menor peso), consigna pag. 2:
 *   R -> opcode(6) rs(5) rt(5) rd(5) shamt(5) funct(6)
 *   I -> opcode(6) rs(5) rt(5) inmediato(16)
 *   J -> opcode(6) indice(26)
 */

import { formatBin32 } from '../isa';
import type { InstructionFormat, Word32 } from '../types';

/** Codifica una instruccion tipo R (opcode 0). Para las 5 instrucciones del proyecto, shamt = 0. */
export function encodeR(funct: number, rd: number, rs: number, rt: number, shamt = 0): Word32 {
  return (
    ((rs & 0x1f) << 21) |
    ((rt & 0x1f) << 16) |
    ((rd & 0x1f) << 11) |
    ((shamt & 0x1f) << 6) |
    (funct & 0x3f)
  ) >>> 0;
}

/** Codifica una instruccion tipo I; el inmediato (con o sin signo) se guarda en sus 16 bits bajos. */
export function encodeI(opcode: number, rs: number, rt: number, imm: number): Word32 {
  return (
    ((opcode & 0x3f) << 26) |
    ((rs & 0x1f) << 21) |
    ((rt & 0x1f) << 16) |
    (imm & 0xffff)
  ) >>> 0;
}

/** Codifica una instruccion tipo J guardando los bits [27:2] del destino como indice de 26 bits. */
export function encodeJ(opcode: number, target: Word32): Word32 {
  return (((opcode & 0x3f) << 26) | ((target >>> 2) & 0x03ffffff)) >>> 0;
}

/** Binario de 32 bits separado por campos segun el formato (ej. R: `000000 01001 01010 01000 00000 100001`). */
export function formatBinaryFields(word: Word32, format: InstructionFormat): string {
  const bits = formatBin32(word);
  const widths = format === 'R' ? [6, 5, 5, 5, 5, 6] : format === 'I' ? [6, 5, 5, 16] : [6, 26];
  const groups: string[] = [];
  let offset = 0;
  for (const width of widths) {
    groups.push(bits.slice(offset, offset + width));
    offset += width;
  }
  return groups.join(' ');
}
