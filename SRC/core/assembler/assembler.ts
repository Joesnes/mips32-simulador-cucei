/**
 * PROPIETARIO: Integrante B
 * Punto de entrada publico del ensamblador MIPS de 32 bits.
 * NO cambiar la firma exportada `assemble(source: string): AssembleResult`.
 */

import type { AssembleResult } from '../types';

export function assemble(_source: string): AssembleResult {
  // TODO [Integrante B - Dia 2 a Dia 4]:
  // Implementar ensamblador de 2 pasadas:
  //   Pasada 1: limpiar comentarios (#), registrar etiquetas (detectar duplicadas), asignar direcciones (PC += 4).
  //   Pasada 2: parsear mnemonicos, registros (numericos $0-$31 y alias $zero/$t0..$s7),
  //             validar rangos:
  //               - addi/addiu/lw/sw: [-32768, 32767]
  //               - ori: [0, 65535]
  //               - beq/bne: offset en palabras = (target - (pc + 4)) / 4 en [-32768, 32767], alineado a 4
  //               - j: target alineado a 4 y misma region 256 MiB de (pc + 4)
  //             generar palabra 32b big-endian, listado y hexImage (1 byte hex por linea).
  return {
    ok: false,
    instructions: [],
    bytes: [],
    hexImage: '',
    listing: '',
    labels: {},
    diagnostics: [
      {
        line: 1,
        severity: 'error',
        code: 'INVALID_SYNTAX',
        message: 'Ensamblador pendiente de implementacion por Integrante B (Dia 2).',
        sourceLine: '',
      },
    ],
  };
}
