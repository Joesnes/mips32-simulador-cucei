# Propuesta de Algoritmo — Ordenamiento por Selección (Selection Sort)

> **Estado:** Borrador listo para revisión del Integrante B y solicitud de aprobación en clase (Avance 1).

## 1. Justificación y Cumplimiento de Requisitos

El algoritmo **Ordenamiento por Selección (Selection Sort)** cumple todos los criterios de la consigna:
- **Ciclos:** Ciclo externo `i = 0 .. N-2` y ciclo interno `j = i+1 .. N-1` (ramas hacia atrás con `bne`/`beq` y `j`).
- **Decisiones:** Comparación con signo `A[j] < A[minIdx]` mediante `slt` + `beq`/`bne` y salto condicional de intercambio.
- **Accesos a memoria:** Lecturas `lw` para obtener `N`, `A[j]`, `A[minIdx]`, `A[i]` y escrituras `sw` para intercambiar los elementos en memoria de datos.
- **Formatos usados:** Ejecuta instrucciones **R** (`add`, `sub`, `slt`, `and`, `or`), **I** (`addi`/`addiu`, `ori`, `lw`, `sw`, `beq`, `bne`) y **J** (`j`, incluyendo punto final observable `fin: j fin`).
- **100% compatible con la ISA de 12 instrucciones** (sin requerir multiplicaciones ni desplazamientos extra).

## 2. Pseudocódigo

```text
N = Mem[0]
base = 4
for i = 0 to N - 2:
    minIdx = i
    for j = i + 1 to N - 1:
        if Mem[base + 4*j] < Mem[base + 4*minIdx]:   # comparacion con signo (slt)
            minIdx = j
    if minIdx != i:
        tmp = Mem[base + 4*i]
        Mem[base + 4*i] = Mem[base + 4*minIdx]
        Mem[base + 4*minIdx] = tmp
fin:
    goto fin   # autosalto observable con el arreglo ya ordenado en memoria
```

## 3. Mapa de Memoria de Datos (Big-Endian, Palabras de 32 bits)

| Dirección (hex) | Contenido | Descripción |
|---|---|---|
| `0x0000` | `N` | Número de elementos del arreglo (entero positivo) |
| `0x0004` | `A[0]` | Primer elemento del arreglo |
| `0x0008` | `A[1]` | Segundo elemento del arreglo |
| `...` | `...` | Elementos subsecuentes (cada uno ocupa 4 bytes big-endian) |
| `0x0004 + 4*(N-1)` | `A[N-1]` | Último elemento del arreglo |

## 4. Mapa de Registros

| Registro | Alias | Uso en Selection Sort |
|---|---|---|
| `$0` | `$zero` | Constante `0` |
| `$16` | `$s0` | Dirección base del arreglo (`4`) |
| `$17` | `$s1` | `N` (longitud del arreglo) |
| `$18` | `$s2` | `N * 4` (límite en desplazamiento de bytes) |
| `$8` | `$t0` | Desplazamiento en bytes de `i` (`0, 4, 8, ...`) |
| `$9` | `$t1` | Desplazamiento en bytes de `minIdx` |
| `$10` | `$t2` | Desplazamiento en bytes de `j` |
| `$11` | `$t3` | Dirección efectiva `base + minIdx` / valor `A[minIdx]` |
| `$12` | `$t4` | Dirección efectiva `base + j` / valor `A[j]` |
| `$13` | `$t5` | Resultado temporal de `slt` (bandera de comparación con signo) |
| `$14` | `$t6` | Temporal para intercambio (`A[i]`) |
| `$15` | `$t7` | Dirección efectiva `base + i` |

## 5. Tres Entradas y Salidas Previstas

| Caso | Tipo | Memoria inicial (`0x0000`: `N`, `0x0004+`: `A`) | Memoria esperada al llegar a `fin` |
|---|---|---|---|
| **Entrada 1** | Caso estándar | `N = 5`, `[25, 4, 17, 1, 9]` | `[1, 4, 9, 17, 25]` |
| **Entrada 2** | Negativos y duplicados (valida `slt` con signo) | `N = 5`, `[-3, 7, -3, 0, -10]` | `[-10, -3, -3, 0, 7]` |
| **Entrada 3** | Caso borde (`N = 1`) | `N = 1`, `[42]` | `[42]` (sin intercambios, salta directo a `fin`) |
