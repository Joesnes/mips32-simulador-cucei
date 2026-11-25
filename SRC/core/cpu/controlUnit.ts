/**
 * PROPIETARIO: Alejandro Espinoza (Dia 2 — Base Tipo R; se extendera a I en Dia 3 y J en Dia 4)
 * Decodificador de palabra de 32 bits, Unidad de Control principal y ALUControl.
 */

import { ALU_CTL, FUNCTS, OPCODES, toUint32 } from '../isa';
import type { AluControlCode, ControlSignals, DecodedFields, Word32 } from '../types';

/**
 * Extrae todos los campos MIPS de una palabra de 32 bits:
 *   R -> opcode(6), rs(5), rt(5), rd(5), shamt(5), funct(6)
 *   I -> opcode(6), rs(5), rt(5), inmediato(16)
 *   J -> opcode(6), indice(26)
 */
export function decodeInstruction(word: Word32): DecodedFields {
  const raw = toUint32(word);
  const opcode = (raw >>> 26) & 0x3f;
  const rs = (raw >>> 21) & 0x1f;
  const rt = (raw >>> 16) & 0x1f;
  const rd = (raw >>> 11) & 0x1f;
  const shamt = (raw >>> 6) & 0x1f;
  const funct = raw & 0x3f;
  const imm16 = raw & 0xffff;
  const immSigned = (imm16 & 0x8000) !== 0 ? imm16 - 0x10000 : imm16;
  const jumpIndex = raw & 0x03ffffff;

  let format: DecodedFields['format'] = 'UNKNOWN';
  let mnemonic = 'unknown';

  if (opcode === OPCODES.R_TYPE && shamt === 0) {
    switch (funct) {
      case FUNCTS.ADD:
        format = 'R';
        mnemonic = 'add';
        break;
      case FUNCTS.SUB:
        format = 'R';
        mnemonic = 'sub';
        break;
      case FUNCTS.AND:
        format = 'R';
        mnemonic = 'and';
        break;
      case FUNCTS.OR:
        format = 'R';
        mnemonic = 'or';
        break;
      case FUNCTS.SLT:
        format = 'R';
        mnemonic = 'slt';
        break;
      default:
        format = 'UNKNOWN';
        mnemonic = 'unknown';
    }
  }

  return {
    raw,
    format,
    mnemonic,
    opcode,
    rs,
    rt,
    rd,
    shamt,
    funct,
    imm16,
    immSigned,
    jumpIndex,
  };
}

/**
 * Modulo ALUControl: traduce ALUOp (2 bits) + funct (6 bits) a la senal ALUctl (4 bits)
 * compatible con RTL/referencia/ALU.v.
 */
export function resolveAluControl(
  aluOp: ControlSignals['ALUOp'],
  funct: number,
): AluControlCode | null {
  switch (aluOp) {
    case 0b00:
      return ALU_CTL.ADD;
    case 0b01:
      return ALU_CTL.SUB;
    case 0b11:
      return ALU_CTL.OR;
    case 0b10:
      switch (funct) {
        case FUNCTS.ADD:
          return ALU_CTL.ADD;
        case FUNCTS.SUB:
          return ALU_CTL.SUB;
        case FUNCTS.AND:
          return ALU_CTL.AND;
        case FUNCTS.OR:
          return ALU_CTL.OR;
        case FUNCTS.SLT:
          return ALU_CTL.SLT;
        default:
          return null;
      }
    default:
      return null;
  }
}

/**
 * Unidad de Control principal: convierte los campos decodificados en senales de control.
 * Retorna null si la instruccion no es valida o aun no esta soportada.
 */
export function generateControlSignals(fields: DecodedFields): ControlSignals | null {
  if (fields.opcode === OPCODES.R_TYPE) {
    if (fields.shamt !== 0) {
      return null;
    }
    const aluCtl = resolveAluControl(0b10, fields.funct);
    if (aluCtl === null) {
      return null;
    }
    return {
      RegDst: 1,
      ALUSrc: 0,
      ExtOp: 'NONE',
      MemToReg: 0,
      RegWrite: 1,
      MemRead: 0,
      MemWrite: 0,
      Branch: 0,
      BranchNe: 0,
      Jump: 0,
      ALUOp: 0b10,
      ALUctl: aluCtl,
    };
  }

  return null;
}
