/**
 * PROPIETARIO: Integrante A
 * Modulo MIPSALU (alineado a RTL/referencia/ALU.v con correccion de SLT con signo).
 */

import { ALU_CTL, toInt32, toUint32 } from '../isa';
import type { AluControlCode, Word32 } from '../types';

export interface AluResult {
  ALUOut: Word32;
  Zero: boolean;
}

export function executeAlu(ALUctl: AluControlCode, A: Word32, B: Word32): AluResult {
  let out = 0;
  switch (ALUctl) {
    case ALU_CTL.AND:
      out = toUint32(A & B);
      break;
    case ALU_CTL.OR:
      out = toUint32(A | B);
      break;
    case ALU_CTL.ADD:
      out = toUint32(A + B);
      break;
    case ALU_CTL.SUB:
      out = toUint32(A - B);
      break;
    case ALU_CTL.SLT:
      out = toInt32(A) < toInt32(B) ? 1 : 0;
      break;
    case ALU_CTL.NOR:
      out = toUint32(~(A | B));
      break;
    default:
      out = 0;
  }
  return { ALUOut: out, Zero: out === 0 };
}
