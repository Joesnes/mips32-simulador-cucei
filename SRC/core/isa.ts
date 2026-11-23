/**
 * ============================================================================
 * CONTRATO CONGELADO DE LA ISA MIPS (12 INSTRUCCIONES DEL PROYECTO)
 * ============================================================================
 * Basado exactamente en la Tabla de la pág. 2 + notas de págs. 3 y 5 del PDF:
 *   - R: add (00/21), sub (00/23), and (00/24), or (00/25), slt (00/2A)
 *   - I: addi/addiu (09), ori (0D), lw (23), sw (2B), beq (04), bne (05)
 *   - J: j (02)
 * ============================================================================
 */

import type { InstructionFormat, Mnemonic } from './types';

export interface InstructionSpec {
  mnemonic: Mnemonic;
  format: InstructionFormat;
  opcode: number; // 6 bits
  funct?: number; // 6 bits (solo tipo R)
  description: string;
}

export const OPCODES = {
  R_TYPE: 0x00,
  J: 0x02,
  BEQ: 0x04,
  BNE: 0x05,
  ADDI: 0x09,  // Tabla pag. 2: addi = 09 (equivale a addiu en MIPS32, suma mod 2^32)
  ADDIU: 0x09, // Alias aceptado (mencionado en pags. 3 y 5)
  ORI: 0x0d,
  LW: 0x23,
  SW: 0x2b,
} as const;

export const FUNCTS = {
  ADD: 0x21, // Tabla pag. 2: add = 00/21 (suma mod 2^32)
  SUB: 0x23, // Tabla pag. 2: sub = 00/23 (resta mod 2^32)
  AND: 0x24,
  OR: 0x25,
  SLT: 0x2a,
} as const;

export const ALU_CTL = {
  AND: 0b0000,
  OR: 0b0001,
  ADD: 0b0010,
  SUB: 0b0110,
  SLT: 0b0111,
  NOR: 0b1100,
} as const;

export const ISA_TABLE: Record<Mnemonic, InstructionSpec> = {
  add:   { mnemonic: 'add',   format: 'R', opcode: OPCODES.R_TYPE, funct: FUNCTS.ADD, description: 'Suma modulo 2^32: rd = rs + rt' },
  sub:   { mnemonic: 'sub',   format: 'R', opcode: OPCODES.R_TYPE, funct: FUNCTS.SUB, description: 'Resta modulo 2^32: rd = rs - rt' },
  and:   { mnemonic: 'and',   format: 'R', opcode: OPCODES.R_TYPE, funct: FUNCTS.AND, description: 'AND bit a bit: rd = rs & rt' },
  or:    { mnemonic: 'or',    format: 'R', opcode: OPCODES.R_TYPE, funct: FUNCTS.OR,  description: 'OR bit a bit: rd = rs | rt' },
  slt:   { mnemonic: 'slt',   format: 'R', opcode: OPCODES.R_TYPE, funct: FUNCTS.SLT, description: 'Set less than con signo: rd = (rs < rt) ? 1 : 0' },
  addi:  { mnemonic: 'addi',  format: 'I', opcode: OPCODES.ADDI,   description: 'Suma modulo 2^32 con inmediato extendido con signo' },
  addiu: { mnemonic: 'addiu', format: 'I', opcode: OPCODES.ADDIU,  description: 'Alias de addi (opcode 0x09, suma modulo 2^32)' },
  ori:   { mnemonic: 'ori',   format: 'I', opcode: OPCODES.ORI,    description: 'OR con inmediato extendido con ceros' },
  lw:    { mnemonic: 'lw',    format: 'I', opcode: OPCODES.LW,     description: 'Carga palabra de 32 bits big-endian en rt' },
  sw:    { mnemonic: 'sw',    format: 'I', opcode: OPCODES.SW,     description: 'Guarda palabra de 32 bits de rt en memoria big-endian' },
  beq:   { mnemonic: 'beq',   format: 'I', opcode: OPCODES.BEQ,    description: 'Salta si rs == rt' },
  bne:   { mnemonic: 'bne',   format: 'I', opcode: OPCODES.BNE,    description: 'Salta si rs != rt' },
  j:     { mnemonic: 'j',     format: 'J', opcode: OPCODES.J,      description: 'Salto incondicional dentro de la region de 256 MiB de PC+4' },
};

/** Nombres canonicos de los 32 registros MIPS ($0..$31). */
export const REGISTER_NAMES: readonly string[] = [
  '$zero', '$at', '$v0', '$v1',
  '$a0', '$a1', '$a2', '$a3',
  '$t0', '$t1', '$t2', '$t3', '$t4', '$t5', '$t6', '$t7',
  '$s0', '$s1', '$s2', '$s3', '$s4', '$s5', '$s6', '$s7',
  '$t8', '$t9', '$k0', '$k1',
  '$gp', '$sp', '$fp', '$ra',
] as const;

/** Mapa de alias y nombres numericos ($0..$31) a indice de registro 0..31. */
export const REGISTER_ALIASES: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (let i = 0; i < 32; i++) {
    map[`$${i}`] = i;
    map[REGISTER_NAMES[i]] = i;
  }
  map['$s8'] = 30; // alias estandar de $fp
  return map;
})();

/** Resuelve un nombre de registro (ej. "$t0", "$8", "$zero") a 0..31 o null si es invalido. */
export function parseRegister(token: string): number | null {
  const normalized = token.trim().toLowerCase();
  return normalized in REGISTER_ALIASES ? REGISTER_ALIASES[normalized] : null;
}

/** Utilidades de formato para 32 bits y bytes big-endian. */
export function toUint32(value: number): number {
  return value >>> 0;
}

export function toInt32(value: number): number {
  return value | 0;
}

export function signExtend16(imm16: number): number {
  const masked = imm16 & 0xffff;
  return ((masked & 0x8000) ? (masked | 0xffff0000) : masked) >>> 0;
}

export function zeroExtend16(imm16: number): number {
  return (imm16 & 0xffff) >>> 0;
}

export function formatHex32(value: number): string {
  return '0x' + (value >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

export function formatHexByte(byte: number): string {
  return (byte & 0xff).toString(16).toUpperCase().padStart(2, '0');
}

export function formatBin32(value: number): string {
  return (value >>> 0).toString(2).padStart(32, '0');
}

export function wordToBytesBigEndian(word: number): [number, number, number, number] {
  const u = word >>> 0;
  return [
    (u >>> 24) & 0xff,
    (u >>> 16) & 0xff,
    (u >>> 8) & 0xff,
    u & 0xff,
  ];
}

export function bytesToWordBigEndian(b0: number, b1: number, b2: number, b3: number): number {
  return (((b0 & 0xff) << 24) | ((b1 & 0xff) << 16) | ((b2 & 0xff) << 8) | (b3 & 0xff)) >>> 0;
}
