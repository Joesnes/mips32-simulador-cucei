/**
 * PROPIETARIO: Integrante A (Dia 2)
 * Memorias de Instrucciones (IMem) y de Datos (DMem) direccionables por byte en formato BIG-ENDIAN.
 *
 * Reglas de la consigna (pag. 3):
 * - IMem: cada posicion guarda 1 byte. La busqueda reune mem[PC], mem[PC+1], mem[PC+2] y mem[PC+3]
 *   del byte mas significativo al menos significativo. Rechaza PC desalineado o fuera de programa.
 * - DMem: lw/sw operan sobre palabras de 32 bits big-endian. Exige rango valido y alineacion a 4.
 *   En accesos invalidos detiene sin modificar memoria ni registros.
 */

import { bytesToWordBigEndian, formatHex32, toUint32, wordToBytesBigEndian } from '../isa';
import type { Byte, MemoryWordInit, Word32 } from '../types';

export type FetchResult =
  | { ok: true; bytes: [Byte, Byte, Byte, Byte]; word: Word32 }
  | { ok: false; code: 'PC_UNALIGNED' | 'PC_OUT_OF_RANGE'; message: string };

export type DataReadResult =
  | { ok: true; word: Word32; bytes: [Byte, Byte, Byte, Byte] }
  | { ok: false; code: 'DATA_UNALIGNED' | 'DATA_OUT_OF_RANGE'; message: string };

export type DataWriteResult =
  | { ok: true; before: Word32; after: Word32 }
  | { ok: false; code: 'DATA_UNALIGNED' | 'DATA_OUT_OF_RANGE'; message: string };

export class InstructionMemory {
  private bytes: Byte[] = [];

  load(bytes: Byte[]): void {
    this.bytes = bytes.map((b) => b & 0xff);
  }

  get size(): number {
    return this.bytes.length;
  }

  /** Reune los 4 bytes big-endian a partir de PC tras validar alineacion a 4 y rango. */
  fetchWord(pc: Word32): FetchResult {
    const addr = toUint32(pc);
    if ((addr & 0x3) !== 0) {
      return {
        ok: false,
        code: 'PC_UNALIGNED',
        message: `PC desalineado en ${formatHex32(addr)} (debe ser multiplo de 4).`,
      };
    }
    if (this.bytes.length === 0 || addr + 3 >= this.bytes.length) {
      return {
        ok: false,
        code: 'PC_OUT_OF_RANGE',
        message: `PC fuera de rango del programa en ${formatHex32(addr)} (tamano IMem: ${this.bytes.length} bytes).`,
      };
    }
    const b0 = this.bytes[addr];
    const b1 = this.bytes[addr + 1];
    const b2 = this.bytes[addr + 2];
    const b3 = this.bytes[addr + 3];
    return {
      ok: true,
      bytes: [b0, b1, b2, b3],
      word: bytesToWordBigEndian(b0, b1, b2, b3),
    };
  }

  snapshot(): Byte[] {
    return [...this.bytes];
  }
}

export class DataMemory {
  private bytes: Byte[];
  private initialBytes: Byte[];

  constructor(sizeBytes = 256) {
    this.bytes = new Array<Byte>(sizeBytes).fill(0);
    this.initialBytes = [...this.bytes];
  }

  get size(): number {
    return this.bytes.length;
  }

  /** Precarga palabras de 32 bits big-endian y guarda copia inicial para poder reiniciar. */
  loadInitial(entries: MemoryWordInit[] = [], sizeBytes = 256): void {
    this.bytes = new Array<Byte>(sizeBytes).fill(0);
    for (const entry of entries) {
      const addr = toUint32(entry.address);
      if ((addr & 0x3) !== 0 || addr + 3 >= sizeBytes) {
        continue;
      }
      const [b0, b1, b2, b3] = wordToBytesBigEndian(entry.value);
      this.bytes[addr] = b0;
      this.bytes[addr + 1] = b1;
      this.bytes[addr + 2] = b2;
      this.bytes[addr + 3] = b3;
    }
    this.initialBytes = [...this.bytes];
  }

  /** Restaura la memoria de datos a su estado inicial precargado. */
  reset(): void {
    this.bytes = [...this.initialBytes];
  }

  readWord(address: Word32): DataReadResult {
    const addr = toUint32(address);
    if ((addr & 0x3) !== 0) {
      return {
        ok: false,
        code: 'DATA_UNALIGNED',
        message: `Lectura lw desalineada en ${formatHex32(addr)} (debe ser multiplo de 4).`,
      };
    }
    if (addr + 3 >= this.bytes.length) {
      return {
        ok: false,
        code: 'DATA_OUT_OF_RANGE',
        message: `Lectura lw fuera de rango en ${formatHex32(addr)} (tamano DMem: ${this.bytes.length} bytes).`,
      };
    }
    const b0 = this.bytes[addr];
    const b1 = this.bytes[addr + 1];
    const b2 = this.bytes[addr + 2];
    const b3 = this.bytes[addr + 3];
    return {
      ok: true,
      bytes: [b0, b1, b2, b3],
      word: bytesToWordBigEndian(b0, b1, b2, b3),
    };
  }

  writeWord(address: Word32, value: Word32): DataWriteResult {
    const addr = toUint32(address);
    if ((addr & 0x3) !== 0) {
      return {
        ok: false,
        code: 'DATA_UNALIGNED',
        message: `Escritura sw desalineada en ${formatHex32(addr)} (debe ser multiplo de 4).`,
      };
    }
    if (addr + 3 >= this.bytes.length) {
      return {
        ok: false,
        code: 'DATA_OUT_OF_RANGE',
        message: `Escritura sw fuera de rango en ${formatHex32(addr)} (tamano DMem: ${this.bytes.length} bytes).`,
      };
    }
    const before = bytesToWordBigEndian(
      this.bytes[addr],
      this.bytes[addr + 1],
      this.bytes[addr + 2],
      this.bytes[addr + 3],
    );
    const after = toUint32(value);
    const [b0, b1, b2, b3] = wordToBytesBigEndian(after);
    this.bytes[addr] = b0;
    this.bytes[addr + 1] = b1;
    this.bytes[addr + 2] = b2;
    this.bytes[addr + 3] = b3;
    return { ok: true, before, after };
  }

  snapshot(): Byte[] {
    return [...this.bytes];
  }
}
