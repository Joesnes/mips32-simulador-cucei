/**
 * PROPIETARIO: Alejandro Espinoza
 * Banco de Registros (BR): 32 registros de 32 bits.
 * Puertos equivalentes a RTL/referencia/BR.v: AR1, AR2, AW, Dw, we, DR1, DR2.
 * Correccion clave: $0 ($zero) siempre lee 0 y descarta escrituras.
 */

import { toUint32 } from '../isa';
import type { Word32 } from '../types';

export class RegisterFile {
  private regs: Word32[] = new Array<Word32>(32).fill(0);

  reset(): void {
    this.regs.fill(0);
  }

  read(index: number): Word32 {
    if (index <= 0 || index >= 32) return 0;
    return this.regs[index];
  }

  write(AW: number, Dw: Word32, we: boolean): { changed: boolean; before: Word32; after: Word32 } {
    if (!we || AW <= 0 || AW >= 32) {
      const current = this.read(AW);
      return { changed: false, before: current, after: current };
    }
    const before = this.regs[AW];
    const after = toUint32(Dw);
    this.regs[AW] = after;
    return { changed: before !== after, before, after };
  }

  snapshot(): Word32[] {
    return [...this.regs];
  }
}
