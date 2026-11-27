/**
 * Utilidades de formato exclusivamente en BINARIO y DECIMAL para toda la interfaz.
 */
import { toInt32 } from '@core/isa';
import type { Byte, Word32 } from '@core/types';

export function fmtBits(value: number, width: number): string {
  const mask = width >= 32 ? 0xffffffff : (1 << width) - 1;
  return ((value >>> 0) & mask).toString(2).padStart(width, '0');
}

export function fmtByteBin(byte: Byte): string {
  return (byte & 0xff).toString(2).padStart(8, '0');
}

export function fmtByteDec(byte: Byte): string {
  return String(byte & 0xff);
}

export function fmtWordBin32(word: Word32): string {
  const bits = (word >>> 0).toString(2).padStart(32, '0');
  return `${bits.slice(0, 8)} ${bits.slice(8, 16)} ${bits.slice(16, 24)} ${bits.slice(24, 32)}`;
}

export function fmtSignedDec(word: Word32): string {
  return String(toInt32(word));
}

export function fmtUnsignedDec(word: Word32): string {
  return String(word >>> 0);
}

export function fmtAddrDec(word: Word32): string {
  return `byte ${word >>> 0}`;
}

export function fmtBinDec32(
  word: Word32,
  kind: 'signed' | 'address' = 'signed',
): { bin: string; dec: string; inline: string } {
  const bin = fmtWordBin32(word);
  if (kind === 'address') {
    const u = fmtUnsignedDec(word);
    return {
      bin,
      dec: `byte ${u}`,
      inline: `byte ${u} (${bin})`,
    };
  }
  const s = fmtSignedDec(word);
  return {
    bin,
    dec: s,
    inline: `${s} (${bin})`,
  };
}
