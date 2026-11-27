# Reporte de Pruebas

Resumen reproducible de las pruebas automatizadas del proyecto y comparación **esperado vs observado** del algoritmo Selection Sort.

## 1. Cómo ejecutar

Desde la carpeta `SRC/`:

```bash
npm ci            # una sola vez: instala dependencias
npm test          # corre todas las suites de VERIF/tests
npm run typecheck # verifica tipos de TypeScript
npm run build     # compila el simulador web
```

Las mismas tres verificaciones corren automáticamente en GitHub Actions en cada Pull Request (`.github/workflows/ci.yml`).

## 2. Resultado por suite

Ejecución sobre `main` + la rama `docs/trazas-y-resultados`: **101/101 pruebas en verde**, `typecheck` sin errores y `build` correcto.

| Archivo (`VERIF/tests/`) | Qué verifica | Pruebas | Resultado |
|---|---|---|---|
| `smoke.test.ts` | Contratos de la ISA (opcodes/functs del PDF), big-endian, registros y alias, extensión de inmediatos, `$zero` y `slt` con signo | 6 | ✅ |
| `assembler.test.ts` | Codificación de las 12 instrucciones, etiquetas adelante/atrás, comentarios, `.hex`/listado y diagnósticos por línea (mnemónico, registro, sintaxis, etiqueta duplicada/indefinida, rangos de inmediatos, ramas, alineación y región de `j`) | 61 | ✅ |
| `isa.test.ts` | Ejecución de cada instrucción en `MipsCpu` etapa por etapa (IF→ID→EX→MEM→WB), buffers, memorias y errores de PC | 13 | ✅ |
| `integration.test.ts` | Casos de integración de la consigna (pág. 5), ensamblados desde texto y ejecutados en la CPU | 9 | ✅ |
| `algorithm.test.ts` | Selection Sort con las 3 entradas, instrucciones ejecutadas hasta `fin`, imágenes `.hex` actualizadas y ejemplo `tipo_j` | 9 | ✅ |
| `traces.test.ts` | Las trazas `traza_I.md` y `traza_J.md` coinciden con la ejecución real en `MipsCpu` | 3 | ✅ |
| **Total** | | **101** | **✅** |

## 3. Cobertura de lo que pide la consigna (pág. 5)

| Requisito | Dónde se prueba |
|---|---|
| Al menos un caso por instrucción mínima (12) | `assembler.test.ts` (codificación R, I y J) e `isa.test.ts` (ejecución) |
| Los cuatro bytes de búsqueda | `integration.test.ts` caso 1 (`addiu $t0, $zero, 5` → `24 08 00 05`) y sección 1 de cada traza |
| Escrituras a `$zero` | `integration.test.ts` caso 2, `isa.test.ts` y `examples/tipo_r.asm` |
| Extensión con signo y con ceros | `integration.test.ts` caso 3 (`addi` negativo, `ori 0xFFFF`) y `examples/tipo_i.asm` |
| `lw`/`sw` | `integration.test.ts` caso 4 y `traza_I.md` |
| Ramas tomadas y no tomadas | `integration.test.ts` caso 5 y `examples/tipo_i.asm` |
| Rama hacia atrás | `integration.test.ts` caso 5 y `bne ... inner` de Selection Sort |
| `j` que omite una instrucción con efecto visible | `integration.test.ts` caso 6 y `examples/tipo_j.asm` (`$t0` queda en 1, no en 99) |
| Error del ensamblador | `integration.test.ts` caso 7 y la sección de diagnósticos de `assembler.test.ts` |
| Acceso de datos inválido | `integration.test.ts` caso 8 (desalineado y fuera de rango, sin alterar registros ni memoria) |
| Algoritmo con tres entradas, incluida una de borde | `algorithm.test.ts` (sección 4 de este reporte) |
| Traza por formato con PC, bytes, palabra, campos, controles, buffers y estado antes/después | `VERIF/traces/traza_I.md`, `VERIF/traces/traza_J.md` (la de tipo R, `traza_R.md`, la agrega Alejandro el Día 7) |

## 4. Selection Sort: esperado vs observado

Programa: `SRC/programs/selection_sort.asm`. Entradas: `SRC/programs/datasets.json`. Memoria de datos: `N` en `0x0000` y `A[0..N-1]` desde `0x0004` (big-endian).

| Entrada | Memoria inicial | Esperado | Observado en `MipsCpu` | Estado final | Instrucciones | Ciclos | Resultado |
|---|---|---|---|---|---|---|---|
| 1 — Caso estándar | `N = 5`, `[25, 4, 17, 1, 9]` | `[1, 4, 9, 17, 25]` | `[1, 4, 9, 17, 25]` | `HALTED_SELFLOOP` en `fin` (`0x6C`) | 138 | 690 | ✅ |
| 2 — Negativos y duplicados | `N = 5`, `[-3, 7, -3, 0, -10]` | `[-10, -3, -3, 0, 7]` | `[-10, -3, -3, 0, 7]` | `HALTED_SELFLOOP` en `fin` (`0x6C`) | 138 | 690 | ✅ |
| 3 — Borde (`N = 1`) | `N = 1`, `[42]` | `[42]` | `[42]` | `HALTED_SELFLOOP` en `fin` (`0x6C`) | 8 | 40 | ✅ |

- Cada instrucción toma 5 ciclos (multiciclo IF, ID, EX, MEM, WB), por eso ciclos = 5 × instrucciones.
- La cantidad de instrucciones (138, 138 y 8) coincide con la prevista en `DOCS/propuesta_algoritmo.md`.
- La Entrada 2 confirma que `slt` compara con signo: con comparación sin signo, `-10 = 0xFFFFFFF6` quedaría al final.

## 5. Cómo reproducir cada prueba

| Prueba | Comando (desde `SRC/`) |
|---|---|
| Una suite completa | `npx vitest run assembler` (o `isa`, `integration`, `algorithm`, `traces`, `smoke`) |
| Una prueba por nombre | `npx vitest run algorithm -t "Negativos"` |
| Regenerar las imágenes `.hex`/`.lst` | `npm run assemble -- programs/selection_sort.asm` (ver `SRC/programs/README.md`) |
| Regenerar las trazas I y J | `npx tsx ../VERIF/traces/generar_trazas.ts` |
| Verlo en el simulador | `npm run dev`, cargar *Selection Sort*, elegir la entrada y avanzar por etapa o por instrucción hasta `fin` |

## 6. Correcciones registradas durante las pruebas

| Problema | Corrección | Verificación |
|---|---|---|
| El `#` de la sintaxis de la consigna (`addi $t0, $t1, #5`, `j #fin`) chocaba con el `#` de comentario | El analizador toma `#` como prefijo solo cuando va pegado al inicio de un operando; en cualquier otra posición es comentario | `assembler.test.ts`: "distingue el prefijo # de un operando del inicio de un comentario" |
| Los ejemplos `tipo_r`/`tipo_i` terminaban con `beq $zero, $zero, fin` porque `j` aún no existía (Día 3) | Al agregar `j` (Día 4) se cambió el cierre a `fin: j fin` y se regeneraron sus `.hex` | `algorithm.test.ts`: "la imagen .hex guardada coincide con la que genera el ensamblador" |
