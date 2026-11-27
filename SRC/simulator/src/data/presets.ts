import type { AlgorithmDataset, ProgramPreset } from '@core/types';
import datasetsJson from '@programs/datasets.json';
import tipoRSource from '@programs/examples/tipo_r.asm?raw';
import tipoISource from '@programs/examples/tipo_i.asm?raw';
import tipoJSource from '@programs/examples/tipo_j.asm?raw';
import selectionSortSource from '@programs/selection_sort.asm?raw';

export const DEFAULT_SOURCE = `# Ejemplo inicial MIPS32 (Modalidad B)
addiu $t0, $zero, 5
addi  $t1, $zero, 7
add   $t2, $t0, $t1
fin:
j fin
`;

export const SELECTION_SORT_DATASETS: AlgorithmDataset[] =
  datasetsJson as AlgorithmDataset[];

export const PROGRAM_PRESETS: ProgramPreset[] = [
  {
    id: 'base',
    title: 'Ejemplo Inicial (Suma básica)',
    category: 'I',
    description: 'Carga 5 en $t0, 7 en $t1, suma en $t2 y termina con autosalto.',
    source: DEFAULT_SOURCE,
  },
  {
    id: 'tipo-r',
    title: 'Tipo R (add, sub, and, or, slt)',
    category: 'R',
    description: 'Prueba todas las instrucciones aritméticas/lógicas tipo R y protección de $zero.',
    source: tipoRSource,
  },
  {
    id: 'tipo-i',
    title: 'Tipo I (lw, sw, ori, beq, bne)',
    category: 'I',
    description: 'Extensión con signo/ceros, acceso big-endian a DMem y ramas condicionales.',
    source: tipoISource,
  },
  {
    id: 'tipo-j',
    title: 'Tipo J (Salto incondicional j)',
    category: 'J',
    description: 'Salto incondicional sin ranura de retardo hacia adelante y hacia atrás.',
    source: tipoJSource,
  },
  {
    id: 'selection-sort',
    title: 'Algoritmo: Selection Sort (28 instr.)',
    category: 'ALGORITHM',
    description: 'Ordenamiento por selección sobre DMem[0..N] con las 12 instrucciones oficiales.',
    datasets: SELECTION_SORT_DATASETS,
    source: selectionSortSource,
  },
];
