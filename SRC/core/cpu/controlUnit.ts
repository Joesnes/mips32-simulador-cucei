/**
 * PROPIETARIO: Alejandro Espinoza (Dia 2 Tipo R + Dia 3 Tipo I + Dia 4 Tipo J — 12/12 ISA)
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
  } else {
    switch (opcode) {
      case OPCODES.ADDI:
        format = 'I';
        mnemonic = 'addi';
        break;
      case OPCODES.ORI:
        format = 'I';
        mnemonic = 'ori';
        break;
      case OPCODES.LW:
        format = 'I';
        mnemonic = 'lw';
        break;
      case OPCODES.SW:
        format = 'I';
        mnemonic = 'sw';
        break;
      case OPCODES.BEQ:
        format = 'I';
        mnemonic = 'beq';
        break;
      case OPCODES.BNE:
        format = 'I';
        mnemonic = 'bne';
        break;
      case OPCODES.J:
        format = 'J';
        mnemonic = 'j';
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

  switch (fields.opcode) {
    case OPCODES.ADDI: // 0x09 (addi / addiu): suma modulo 2^32 con inmediato extendido con signo
      return {
        RegDst: 0,
        ALUSrc: 1,
        ExtOp: 'SIGN',
        MemToReg: 0,
        RegWrite: 1,
        MemRead: 0,
        MemWrite: 0,
        Branch: 0,
        BranchNe: 0,
        Jump: 0,
        ALUOp: 0b00,
        ALUctl: ALU_CTL.ADD,
      };

    case OPCODES.ORI: // 0x0D: OR con inmediato extendido con ceros
      return {
        RegDst: 0,
        ALUSrc: 1,
        ExtOp: 'ZERO',
        MemToReg: 0,
        RegWrite: 1,
        MemRead: 0,
        MemWrite: 0,
        Branch: 0,
        BranchNe: 0,
        Jump: 0,
        ALUOp: 0b11,
        ALUctl: ALU_CTL.OR,
      };

    case OPCODES.LW: // 0x23: carga palabra big-endian en rt desde R[rs] + signExt(imm16)
      return {
        RegDst: 0,
        ALUSrc: 1,
        ExtOp: 'SIGN',
        MemToReg: 1,
        RegWrite: 1,
        MemRead: 1,
        MemWrite: 0,
        Branch: 0,
        BranchNe: 0,
        Jump: 0,
        ALUOp: 0b00,
        ALUctl: ALU_CTL.ADD,
      };

    case OPCODES.SW: // 0x2B: guarda palabra de rt en R[rs] + signExt(imm16)
      return {
        RegDst: 0,
        ALUSrc: 1,
        ExtOp: 'SIGN',
        MemToReg: 0,
        RegWrite: 0,
        MemRead: 0,
        MemWrite: 1,
        Branch: 0,
        BranchNe: 0,
        Jump: 0,
        ALUOp: 0b00,
        ALUctl: ALU_CTL.ADD,
      };

    case OPCODES.BEQ: // 0x04: salta si rs == rt (ALU resta, Zero == 1)
      return {
        RegDst: 0,
        ALUSrc: 0,
        ExtOp: 'SIGN',
        MemToReg: 0,
        RegWrite: 0,
        MemRead: 0,
        MemWrite: 0,
        Branch: 1,
        BranchNe: 0,
        Jump: 0,
        ALUOp: 0b01,
        ALUctl: ALU_CTL.SUB,
      };

    case OPCODES.BNE: // 0x05: salta si rs != rt (ALU resta, Zero == 0)
      return {
        RegDst: 0,
        ALUSrc: 0,
        ExtOp: 'SIGN',
        MemToReg: 0,
        RegWrite: 0,
        MemRead: 0,
        MemWrite: 0,
        Branch: 0,
        BranchNe: 1,
        Jump: 0,
        ALUOp: 0b01,
        ALUctl: ALU_CTL.SUB,
      };

    case OPCODES.J: // 0x02: salto incondicional dentro de la region de 256 MiB de PC+4
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
        Jump: 1,
        ALUOp: 0b00,
        ALUctl: ALU_CTL.ADD,
      };

    default:
      return null;
  }
}
