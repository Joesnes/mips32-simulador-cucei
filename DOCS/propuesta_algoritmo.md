# Propuesta de Algoritmo — Ordenamiento por Selección (Selection Sort)

> **Estado:** Listo para solicitud de aprobación en clase (Avance 1).
> El programa ensamblador definitivo (`SRC/programs/selection_sort.asm`) se entrega el Día 4; aquí se fija el diseño que ese programa debe respetar.

## 1. Justificación y Cumplimiento de Requisitos

El algoritmo **Ordenamiento por Selección (Selection Sort)** cumple todos los criterios de la consigna:
- **Ciclos:** Ciclo externo `i = 0 .. N-2` y ciclo interno `j = i+1 .. N-1` (saltos hacia atrás con `bne` y `j`).
- **Decisiones:** Comparación con signo `A[j] < A[minIdx]` mediante `slt` + `beq`, y decisión de intercambio `minIdx != i` mediante `sub` + `beq`.
- **Accesos a memoria:** Lecturas `lw` para obtener `N`, `A[j]`, `A[minIdx]`, `A[i]` y escrituras `sw` para intercambiar los elementos en memoria de datos.
- **Formatos usados:** Ejecuta instrucciones **R** (`add`, `sub`, `and`, `or`, `slt`), **I** (`addi`/`addiu`, `ori`, `lw`, `sw`, `beq`, `bne`) y **J** (`j`, incluyendo el punto final observable `fin: j fin`).
- **100% compatible con la ISA de 12 instrucciones** de `SRC/core/isa.ts`: no requiere multiplicación ni desplazamientos. `N*4` se obtiene con dos sumas (`N+N`, `2N+2N`) y los índices se manejan directamente como desplazamientos en bytes (`+4` por elemento).

## 2. Pseudocódigo

### 2.1 Pseudocódigo de alto nivel (por índices)

```text
N = Mem[0x0000]
base = 0x0004
for i = 0 to N - 2:
    minIdx = i
    for j = i + 1 to N - 1:
        if Mem[base + 4*j] < Mem[base + 4*minIdx]:   # comparacion CON SIGNO (slt)
            minIdx = j
    if minIdx != i:
        tmp = Mem[base + 4*i]
        Mem[base + 4*i] = Mem[base + 4*minIdx]
        Mem[base + 4*minIdx] = tmp
fin:
    goto fin   # autosalto observable con el arreglo ya ordenado en memoria
```

### 2.2 Pseudocódigo detallado (por desplazamientos en bytes, 1:1 con la ISA)

Para evitar multiplicaciones, `i`, `j` y `minIdx` se guardan como **desplazamientos en bytes** (`off = 4*indice`). El ciclo externo termina cuando `j_off = i_off + 4` alcanza `N*4`, es decir, cuando `i = N-1` (con `N = 1` termina de inmediato).

```text
s0 = 4                                # base del arreglo            (ori)
s1 = Mem[0]                           # N                           (lw)
s2 = s1 + s1 ; s2 = s2 + s2           # N*4                         (add, add)
t0 = 0                                # i_off = 0                   (and $t0,$zero,$zero)
outer:
    t2 = t0 + 4                       # j_off = i_off + 4           (addi)
    if t2 == s2: goto fin             # i == N-1 -> terminado       (beq)
    t1 = t0                           # min_off = i_off             (or ...,$zero)
inner:
    t4 = Mem[s0 + t2]                 # A[j]                        (add + lw)
    t3 = Mem[s0 + t1]                 # A[minIdx]                   (add + lw)
    t5 = (t4 < t3) ? 1 : 0            # con signo                   (slt)
    if t5 == 0: goto next             #                             (beq)
    t1 = t2                           # min_off = j_off             (or ...,$zero)
next:
    t2 = t2 + 4                       # j++                         (addi)
    if t2 != s2: goto inner           #                             (bne)
    t5 = t1 - t0                      #                             (sub)
    if t5 == 0: goto skip             # minIdx == i -> sin swap     (beq)
    t7 = s0 + t0 ; t6 = Mem[t7]       # tmp = A[i]                  (add + lw)
    t3 = s0 + t1 ; t4 = Mem[t3]       # A[minIdx]                   (add + lw)
    Mem[t7] = t4                      # A[i] = A[minIdx]            (sw)
    Mem[t3] = t6                      # A[minIdx] = tmp             (sw)
skip:
    t0 = t0 + 4                       # i++                         (addi)
    goto outer                        #                             (j)
fin:
    goto fin                          # autosalto final             (j)
```

**Bosquejo de referencia** (28 instrucciones; el `.asm` definitivo del Día 4 puede variar, pero debe respetar este mapa de registros y memoria):

```asm
        ori   $s0, $zero, 4        # base = 4
        lw    $s1, 0($zero)        # N = Mem[0]
        add   $s2, $s1, $s1        # 2N
        add   $s2, $s2, $s2        # 4N (limite en bytes)
        and   $t0, $zero, $zero    # i_off = 0
outer:  addi  $t2, $t0, 4          # j_off = i_off + 4
        beq   $t2, $s2, fin        # i == N-1 -> fin
        or    $t1, $t0, $zero      # min_off = i_off
inner:  add   $t4, $s0, $t2        # &A[j]
        lw    $t4, 0($t4)          # A[j]
        add   $t3, $s0, $t1        # &A[minIdx]
        lw    $t3, 0($t3)          # A[minIdx]
        slt   $t5, $t4, $t3        # A[j] < A[minIdx] (con signo)
        beq   $t5, $zero, next
        or    $t1, $t2, $zero      # min_off = j_off
next:   addi  $t2, $t2, 4          # j++
        bne   $t2, $s2, inner
        sub   $t5, $t1, $t0        # minIdx - i
        beq   $t5, $zero, skip     # sin intercambio
        add   $t7, $s0, $t0        # &A[i]
        lw    $t6, 0($t7)          # tmp = A[i]
        add   $t3, $s0, $t1        # &A[minIdx]
        lw    $t4, 0($t3)          # A[minIdx]
        sw    $t4, 0($t7)          # A[i] = A[minIdx]
        sw    $t6, 0($t3)          # A[minIdx] = tmp
skip:   addi  $t0, $t0, 4          # i++
        j     outer
fin:    j     fin                  # autosalto observable
```

> Verificación previa: este bosquejo se ejecutó en un modelo de referencia (script de simulación independiente) con las 3 entradas de la sección 5 y produjo exactamente las salidas esperadas (Entradas 1 y 2: 138 instrucciones hasta llegar a `fin`; Entrada 3: 8 instrucciones). La verificación oficial se hará en `VERIF/tests/algorithm.test.ts` (Día 4) sobre `MipsCpu`.

## 3. Mapa de Memoria de Datos (Big-Endian, Palabras de 32 bits)

| Dirección (hex) | Contenido | Descripción |
|---|---|---|
| `0x0000` | `N` | Número de elementos del arreglo (entero, `N >= 1`) |
| `0x0004` | `A[0]` | Primer elemento del arreglo |
| `0x0008` | `A[1]` | Segundo elemento del arreglo |
| `...` | `...` | Elementos subsecuentes (cada uno ocupa 4 bytes big-endian) |
| `0x0004 + 4*(N-1)` | `A[N-1]` | Último elemento del arreglo |

- Cada palabra ocupa 4 direcciones (1 byte por dirección); el byte más significativo va en la dirección menor. Ejemplo: `A[0] = -3 = 0xFFFFFFFD` en `0x0004..0x0007` → bytes `[0xFF, 0xFF, 0xFF, 0xFD]`.
- El ordenamiento es **in situ**: el resultado queda en las mismas direcciones `0x0004..0x0004 + 4*(N-1)`; `N` en `0x0000` no se modifica.
- Todas las direcciones efectivas (`base + off`) son múltiplos de 4, por lo que `lw`/`sw` siempre están alineados.
- Restricción: `N >= 1`. Con `N = 0` la condición `j_off == N*4` nunca se cumpliría; no forma parte de las entradas de prueba.

## 4. Mapa de Registros

| Registro | Alias | Uso en Selection Sort |
|---|---|---|
| `$0` | `$zero` | Constante `0` (fuente para `ori`, `and`, `or` como "move" y comparaciones con `beq`) |
| `$16` | `$s0` | Dirección base del arreglo (`0x0004`) |
| `$17` | `$s1` | `N` (longitud del arreglo, leída de `0x0000`) |
| `$18` | `$s2` | `N * 4` (límite de los desplazamientos en bytes) |
| `$8` | `$t0` | `i_off` = desplazamiento en bytes de `i` (`0, 4, 8, ...`) |
| `$9` | `$t1` | `min_off` = desplazamiento en bytes de `minIdx` |
| `$10` | `$t2` | `j_off` = desplazamiento en bytes de `j` |
| `$11` | `$t3` | Dirección efectiva `base + min_off` → luego valor `A[minIdx]` |
| `$12` | `$t4` | Dirección efectiva `base + j_off` → luego valor `A[j]` (en el swap: valor `A[minIdx]`) |
| `$13` | `$t5` | Bandera de `slt` y resultado de `min_off - i_off` |
| `$14` | `$t6` | Temporal del intercambio (`tmp = A[i]`) |
| `$15` | `$t7` | Dirección efectiva `base + i_off` |

## 5. Tres Entradas y Salidas Previstas

| Caso | Tipo | Memoria inicial (`0x0000`: `N`, `0x0004+`: `A`) | Memoria esperada al llegar a `fin` |
|---|---|---|---|
| **Entrada 1** | Caso estándar | `N = 5`, `[25, 4, 17, 1, 9]` | `[1, 4, 9, 17, 25]` |
| **Entrada 2** | Negativos y duplicados (valida `slt` con signo) | `N = 5`, `[-3, 7, -3, 0, -10]` | `[-10, -3, -3, 0, 7]` |
| **Entrada 3** | Caso borde (`N = 1`) | `N = 1`, `[42]` | `[42]` (sin intercambios, salta directo a `fin`) |

### 5.1 Memoria de datos en hexadecimal (palabras big-endian)

| Dirección | Entrada 1 inicial → final | Entrada 2 inicial → final | Entrada 3 inicial → final |
|---|---|---|---|
| `0x0000` | `0x00000005` → `0x00000005` | `0x00000005` → `0x00000005` | `0x00000001` → `0x00000001` |
| `0x0004` | `0x00000019` → `0x00000001` | `0xFFFFFFFD` → `0xFFFFFFF6` | `0x0000002A` → `0x0000002A` |
| `0x0008` | `0x00000004` → `0x00000004` | `0x00000007` → `0xFFFFFFFD` | — |
| `0x000C` | `0x00000011` → `0x00000009` | `0xFFFFFFFD` → `0xFFFFFFFD` | — |
| `0x0010` | `0x00000001` → `0x00000011` | `0x00000000` → `0x00000000` | — |
| `0x0014` | `0x00000009` → `0x00000019` | `0xFFFFFFF6` → `0x00000007` | — |

### 5.2 Evolución esperada por pasada del ciclo externo

**Entrada 1** `[25, 4, 17, 1, 9]`:

| `i` | `minIdx` | ¿Intercambio? | Arreglo al terminar la pasada |
|---|---|---|---|
| 0 | 3 (`1`) | Sí | `[1, 4, 17, 25, 9]` |
| 1 | 1 (`4`) | No | `[1, 4, 17, 25, 9]` |
| 2 | 4 (`9`) | Sí | `[1, 4, 9, 25, 17]` |
| 3 | 4 (`17`) | Sí | `[1, 4, 9, 17, 25]` |

**Entrada 2** `[-3, 7, -3, 0, -10]` (con comparación sin signo, `-10 = 0xFFFFFFF6` se tomaría como el mayor y el resultado sería incorrecto; por eso `slt` debe ser con signo):

| `i` | `minIdx` | ¿Intercambio? | Arreglo al terminar la pasada |
|---|---|---|---|
| 0 | 4 (`-10`) | Sí | `[-10, 7, -3, 0, -3]` |
| 1 | 2 (`-3`) | Sí | `[-10, -3, 7, 0, -3]` |
| 2 | 4 (`-3`) | Sí | `[-10, -3, -3, 0, 7]` |
| 3 | 3 (`0`) | No | `[-10, -3, -3, 0, 7]` |

Nota: como la comparación es estricta (`<`), ante duplicados se conserva el primer mínimo encontrado.

**Entrada 3** `[42]`: en la primera visita a `outer`, `j_off = 4 = N*4`, así que `beq` salta directo a `fin` sin leer ni escribir el arreglo.
