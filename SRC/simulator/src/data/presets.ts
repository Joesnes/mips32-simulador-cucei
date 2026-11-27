import type { AlgorithmDataset, ProgramPreset } from '@core/types';

export const DEFAULT_SOURCE = `# Ejemplo inicial MIPS32 (Modalidad B)
addiu $t0, $zero, 5
addi  $t1, $zero, 7
add   $t2, $t0, $t1
fin:
beq   $zero, $zero, fin
`;

export const SELECTION_SORT_DATASETS: AlgorithmDataset[] = [
  {
    id: 'estandar',
    name: 'Entrada 1 — Caso estándar (N=5)',
    description: 'N = 5 con enteros positivos desordenados [25, 4, 17, 1, 9].',
    isEdgeCase: false,
    initialMemory: [
      { address: 0, value: 5, label: 'N' },
      { address: 4, value: 25, label: 'A[0]' },
      { address: 8, value: 4, label: 'A[1]' },
      { address: 12, value: 17, label: 'A[2]' },
      { address: 16, value: 1, label: 'A[3]' },
      { address: 20, value: 9, label: 'A[4]' },
    ],
    expectedMemory: [
      { address: 0, value: 5, label: 'N' },
      { address: 4, value: 1, label: 'A[0]' },
      { address: 8, value: 4, label: 'A[1]' },
      { address: 12, value: 9, label: 'A[2]' },
      { address: 16, value: 17, label: 'A[3]' },
      { address: 20, value: 25, label: 'A[4]' },
    ],
    maxInstructions: 500,
  },
  {
    id: 'negativos-duplicados',
    name: 'Entrada 2 — Negativos y duplicados',
    description: 'N = 5 con negativos y repetidos [-3, 7, -3, 0, -10] (valida slt con signo).',
    isEdgeCase: false,
    initialMemory: [
      { address: 0, value: 5, label: 'N' },
      { address: 4, value: -3, label: 'A[0]' },
      { address: 8, value: 7, label: 'A[1]' },
      { address: 12, value: -3, label: 'A[2]' },
      { address: 16, value: 0, label: 'A[3]' },
      { address: 20, value: -10, label: 'A[4]' },
    ],
    expectedMemory: [
      { address: 0, value: 5, label: 'N' },
      { address: 4, value: -10, label: 'A[0]' },
      { address: 8, value: -3, label: 'A[1]' },
      { address: 12, value: -3, label: 'A[2]' },
      { address: 16, value: 0, label: 'A[3]' },
      { address: 20, value: 7, label: 'A[4]' },
    ],
    maxInstructions: 500,
  },
  {
    id: 'borde-un-elemento',
    name: 'Entrada 3 — Caso borde (N=1)',
    description: 'Un solo elemento [42]: termina de inmediato sin intercambios.',
    isEdgeCase: true,
    initialMemory: [
      { address: 0, value: 1, label: 'N' },
      { address: 4, value: 42, label: 'A[0]' },
    ],
    expectedMemory: [
      { address: 0, value: 1, label: 'N' },
      { address: 4, value: 42, label: 'A[0]' },
    ],
    maxInstructions: 50,
  },
];

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
    source: `# Ejemplo tipo R: add, sub, and, or, slt (shamt = 0)
        addi $t0, $zero, 12     # $t0 = 12
        addi $t1, $zero, -6     # $t1 = -6
        add  $t2, $t0, $t1      # $t2 = 12 + (-6) = 6
        sub  $t3, $t0, $t1      # $t3 = 12 - (-6) = 18
        and  $t4, $t0, $t1      # $t4 = 12 & -6 = 8
        or   $t5, $t0, $t1      # $t5 = 12 | -6 = -2
        slt  $t6, $t1, $t0      # $t6 = 1 (-6 < 12 con signo)
        slt  $t7, $t0, $t1      # $t7 = 0 (12 < -6 es falso)
        add  $zero, $t0, $t0    # escritura a $zero: se descarta, sigue en 0
fin:    beq  $zero, $zero, fin  # autosalto: punto final observable
`,
  },
  {
    id: 'tipo-i',
    title: 'Tipo I (lw, sw, ori, beq, bne)',
    category: 'I',
    description: 'Extensión con signo/ceros, acceso big-endian a DMem y ramas condicionales.',
    source: `# Ejemplo tipo I: addi/addiu, ori, lw, sw, beq, bne
        addiu $t0, $zero, 5       # ejemplo de la consigna -> $t0 = 5
        addi  $t1, $zero, -1      # extension con signo -> $t1 = -1
        ori   $t2, $zero, 65535   # extension con ceros -> $t2 = 65535
        sw    $t0, 0($zero)       # Mem[byte 0] = 5
        sw    $t1, 4($zero)       # Mem[byte 4] = -1
        lw    $t3, 4($zero)       # $t3 = Mem[byte 4] = -1
        beq   $t3, $t1, igual     # rama TOMADA ($t3 == $t1): salta la siguiente
        addi  $t4, $zero, 99      # no se ejecuta
igual:  bne   $t0, $t0, fin       # rama NO tomada ($t0 == $t0)
        addi  $t5, $zero, 3       # contador = 3
ciclo:  addi  $t5, $t5, -1        # rama hacia atras: se repite 3 veces
        bne   $t5, $zero, ciclo
fin:    beq   $zero, $zero, fin   # autosalto: punto final observable
`,
  },
  {
    id: 'tipo-j',
    title: 'Tipo J (Salto incondicional j)',
    category: 'J',
    description: 'Salto incondicional sin ranura de retardo hacia adelante y hacia atrás.',
    source: `# Ejemplo tipo J: salto incondicional j (sin ranura de retardo)
        addi  $t0, $zero, 1       # $t0 = 1
        j     salta               # j hacia adelante: omite la siguiente instruccion
        addi  $t0, $zero, 99      # no se ejecuta
salta:  addi  $t1, $zero, 2       # $t1 = 2
        addi  $t2, $zero, 3       # contador = 3
ciclo:  addi  $t2, $t2, -1        # contador--
        beq   $t2, $zero, fin     # al llegar a 0 sale del ciclo
        j     ciclo               # j hacia atras
fin:    j     fin                 # autosalto: punto final observable
`,
  },
  {
    id: 'selection-sort',
    title: 'Algoritmo: Selection Sort (28 instr.)',
    category: 'ALGORITHM',
    description: 'Ordenamiento por selección sobre DMem[0..N] con las 12 instrucciones oficiales.',
    datasets: SELECTION_SORT_DATASETS,
    source: `# Ordenamiento por seleccion (Selection Sort) - 12 instrucciones del proyecto
# Memoria de datos: byte 0 = N, byte 4 en adelante = A[0]..A[N-1]
        ori   $s0, $zero, 4        # base = 4
        lw    $s1, 0($zero)        # N = Mem[0]
        add   $s2, $s1, $s1        # 2N
        add   $s2, $s2, $s2        # 4N (limite en bytes)
        and   $t0, $zero, $zero    # i_off = 0
outer:  addi  $t2, $t0, 4          # j_off = i_off + 4
        beq   $t2, $s2, fin        # i == N-1 -> terminado
        or    $t1, $t0, $zero      # min_off = i_off
inner:  add   $t4, $s0, $t2        # &A[j]
        lw    $t4, 0($t4)          # A[j]
        add   $t3, $s0, $t1        # &A[minIdx]
        lw    $t3, 0($t3)          # A[minIdx]
        slt   $t5, $t4, $t3        # A[j] < A[minIdx] (con signo)
        beq   $t5, $zero, next     # si no es menor, sigue
        or    $t1, $t2, $zero      # min_off = j_off
next:   addi  $t2, $t2, 4          # j++
        bne   $t2, $s2, inner      # mientras j < N
        sub   $t5, $t1, $t0        # minIdx - i
        beq   $t5, $zero, skip     # si minIdx == i, no hay intercambio
        add   $t7, $s0, $t0        # &A[i]
        lw    $t6, 0($t7)          # tmp = A[i]
        add   $t3, $s0, $t1        # &A[minIdx]
        lw    $t4, 0($t3)          # A[minIdx]
        sw    $t4, 0($t7)          # A[i] = A[minIdx]
        sw    $t6, 0($t3)          # A[minIdx] = tmp
skip:   addi  $t0, $t0, 4          # i++
        j     outer                # siguiente pasada
fin:    j     fin                  # autosalto: arreglo ordenado
`,
  },
];
