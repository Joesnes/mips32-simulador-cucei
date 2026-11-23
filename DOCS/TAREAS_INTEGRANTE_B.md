# Guía de Tareas y Contratos — Integrante B

Este documento describe **exactamente** qué archivos te pertenecen, qué contratos debes respetar y qué entregar cada día (del Día 1 al Día 8) para trabajar en paralelo con el **Integrante A** sin generar conflictos de Git.

---

## Si usas un asistente de IA (por ejemplo Claude)

> **IMPORTANTE (Regla de la consigna):** Usar IA está permitido, pero debemos registrar en `DOCS/declaracion_ia.md` qué herramienta se usó en cada módulo, qué se aceptó/descartó y cómo se comprobó con pruebas. Además, la **defensa individual (20 pts)** es **sin IA**, por lo que debes entender completamente tus módulos.

**Copia y pega este bloque de reglas al inicio de cualquier prompt que le pases a una IA:**

```text
REGLAS ESTRICTAS DEL REPOSITORIO (NO ROMPER):
1. Lee primero `SRC/core/types.ts` y `SRC/core/isa.ts`. Son CONTRATOS CONGELADOS: NO los modifiques.
2. NUNCA edites archivos del Integrante A (`SRC/core/cpu/*`, `SRC/simulator/src/components/DatapathSVG.tsx`, `SRC/simulator/src/components/ControlSignalsPanel.tsx`, `VERIF/tests/isa.test.ts`, `VERIF/tests/integration.test.ts`, `.github/*`).
3. Respeta EXACTAMENTE la tabla ISA del PDF definida en `SRC/core/isa.ts`:
   - R: add (00/21), sub (00/23), and (00/24), or (00/25), slt (00/2A), shamt=0.
   - I: addi y alias addiu (09), ori (0D), lw (23), sw (2B), beq (04), bne (05).
   - J: j (02).
4. La memoria de instrucciones y datos es BIG-ENDIAN (1 byte por direccion).
   Ejemplo de verificacion del PDF: `addiu $t0, $zero, 5` -> palabra `0x24080005` -> bytes `[0x24, 0x08, 0x00, 0x05]`.
5. No agregues dependencias npm externas sin acuerdo previo.
6. Antes de dar por terminada cualquier tarea, verifica que en `SRC/` pasen sin errores:
   `npm run typecheck`, `npm test` y `npm run build`.
```

---

## Mapa de Propiedad de Archivos (Anti-Conflictos)

### Archivos que SÍ te pertenecen (edítalos libremente en tus ramas)
- **Ensamblador:** `SRC/core/assembler/*` (`lexer.ts`, `encoder.ts`, `assembler.ts`, `cli.ts`) — respetando la firma `assemble(source: string): AssembleResult`.
- **Programas MIPS y Datasets:** `SRC/programs/*` (`selection_sort.asm`, `.hex`, `.lst`, `datasets.json`, `examples/tipo_r.asm`, `tipo_i.asm`, `tipo_j.asm`).
- **Componentes UI tuyos:**
  - `SRC/simulator/src/components/EditorControls.tsx` (manteniendo `EditorControlsProps`)
  - `SRC/simulator/src/components/InstructionInspector.tsx` (manteniendo `InstructionInspectorProps`)
  - `SRC/simulator/src/components/MemoryRegistersPanel.tsx` (manteniendo `MemoryRegistersPanelProps`)
- **Pruebas tuyas:** `VERIF/tests/assembler.test.ts`, `VERIF/tests/algorithm.test.ts`, `VERIF/traces/traza_I.md`, `VERIF/traces/traza_J.md`, `VERIF/results/test_report.md`.
- **Documentación y Reporte:** `DOCS/site/*` (excepto los SVG en `DOCS/site/assets/` que genera A), `DOCS/propuesta_algoritmo.md`, `DOCS/ficha_integrante_B.md`, y tus entradas en `DOCS/declaracion_ia.md` y `DOCS/acuerdos_y_problemas.md`.

### Archivos PROHIBIDOS (NO editar para evitar conflictos)
- `SRC/core/types.ts` y `SRC/core/isa.ts` (contratos congelados)
- `SRC/core/cpu/*` (propiedad de Integrante A)
- `SRC/simulator/src/App.tsx` (solo se modifica por acuerdo conjunto)
- `SRC/simulator/src/components/DatapathSVG.tsx` y `ControlSignalsPanel.tsx` (propiedad de Integrante A)
- `VERIF/tests/isa.test.ts`, `VERIF/tests/integration.test.ts`, `VERIF/traces/traza_R.md` (propiedad de Integrante A)
- `.github/workflows/*` (propiedad de Integrante A)

---

## Tareas Día por Día (Del 22 al 30)

### Día 1 (22) — Setup y Propuesta de Algoritmo (Avance 1)
- **Rama:** `docs/propuesta-algoritmo`
- **Entregable:**
  1. Clonar el repo, ejecutar `cd SRC && npm install && npm test`.
  2. Revisar y completar `DOCS/propuesta_algoritmo.md` con el pseudocódigo detallado de **Selection Sort**, mapa de registros (`$s0, $s1, $t0..$t7`), mapa de memoria (`0x0000 = N`, `0x0004+ = A[0..N-1]`) y las 3 entradas con salidas esperadas.
  3. Abrir PR hacia `main` y revisar el PR del Integrante A.

### Día 2 (23) — Ensamblador Base (Tipo R + Etiquetas)
- **Rama:** `feat/asm-tipo-r`
- **Entregable:**
  1. Implementar en `SRC/core/assembler/` el ensamblador de 2 pasadas para las 5 instrucciones R (`add`, `sub`, `and`, `or`, `slt`), soportando comentarios `#`, etiquetas adelante/atrás y registros numéricos (`$0`–`$31`) + alias (`$zero`, `$t0`–`$t9`, `$s0`–`$s7`, etc.).
  2. Emitir diagnósticos con número de línea para mnemónico inválido, registro inválido, sintaxis incorrecta y etiqueta duplicada.
  3. Crear `VERIF/tests/assembler.test.ts` probando codificación R y errores.

### Día 3 (24) — Ensamblador Completo Tipo I + CLI Exportador
- **Rama:** `feat/asm-tipo-i-cli`
- **Entregable:**
  1. Extender `SRC/core/assembler/` para soportar `addi`, `addiu`, `ori`, `lw`, `sw`, `beq`, `bne`.
  2. Validar rangos exigidos en la consigna:
     - `addi`, `addiu`, `lw`, `sw`: inmediato con signo en `[-32768, 32767]`.
     - `ori`: inmediato sin signo en `[0, 65535]`.
     - `beq`, `bne`: offset en palabras `(target - (pc + 4)) / 4` en `[-32768, 32767]`, etiqueta definida y destino alineado a 4.
  3. Generar `hexImage` (1 byte hex por línea en big-endian) y `listing` (dirección, hex, binario, ASM).
  4. Verificar el ejemplo del PDF en `assembler.test.ts`: `addiu $t0, $zero, 5` debe producir `0x24080005` y bytes `[0x24, 0x08, 0x00, 0x05]`.
  5. Verificar `npm run assemble -- programs/examples/tipo_r.asm`.

### Día 4 (25) — Instrucción J + Selection Sort ASM + Datasets
- **Rama:** `feat/asm-j-selection-sort`
- **Entregable:**
  1. Añadir soporte de `j #etiqueta` al ensamblador validando alineación a 4 y misma región de 256 MiB que `PC + 4`.
  2. Escribir `SRC/programs/selection_sort.asm` usando únicamente nuestras 12 instrucciones (ciclo, decisión, `lw`/`sw`, R/I/J y autosalto final `fin: j fin`), junto con `selection_sort.hex` y `selection_sort.lst` generados con `npm run assemble`.
  3. Crear `SRC/programs/examples/tipo_r.asm`, `tipo_i.asm`, `tipo_j.asm` y `SRC/programs/datasets.json` con las 3 entradas (estándar, negativos/duplicados, borde 1 elemento).
  4. Crear `VERIF/tests/algorithm.test.ts` que ensamble `selection_sort.asm`, cargue cada dataset en `MipsCpu` y compruebe que la memoria final coincide con la esperada.

### Día 5 (26) — UI: Editor, Presets e Inspector de Instrucción
- **Rama:** `feat/ui-editor-inspector`
- **Entregable:**
  1. Completar `EditorControls.tsx`: selector de ejemplos (`tipo_r`, `tipo_i`, `tipo_j`, `selection_sort`), selector de las 3 entradas de `datasets.json`, botón de exportar imagen `.hex` (descarga de archivo), botones de Play/Pausa con velocidad ajustable, y tabla clara de diagnósticos por línea.
  2. Completar `InstructionInspector.tsx`: mostrar los 32 bits de la instrucción actual desglosados por campos con colores según formato (R/I/J), los 4 bytes big-endian leídos y el listado ensamblado resaltando la fila del `PC` actual.

### Día 6 (27) — UI: Banco de Registros y Memorias con Resaltado
- **Rama:** `feat/ui-memory-registers`
- **Entregable:**
  1. Completar `MemoryRegistersPanel.tsx` con pestañas o columnas claras:
     - **32 Registros (`$0`–`$31`):** nombre, alias, hex y decimal con signo, resaltando el registro recién modificado (`snapshot.lastChange?.registerChanged`).
     - **Memoria de Instrucciones:** vista byte a byte (big-endian) resaltando los 4 bytes `[PC..PC+3]`.
     - **Memoria de Datos:** vista por palabras de 32 bits y por bytes big-endian, resaltando la dirección modificada (`sw`) y mostrando alerta visible si `snapshot.error` está activo.

### Día 7 (28) — Reporte Técnico Estático y Trazas I / J
- **Rama:** `docs/reporte-y-trazas`
- **Entregable:**
  1. Completar `DOCS/site/index.html` y `DOCS/site/styles.css` con todas las secciones obligatorias del reporte (introducción, objetivos, tabla de 12 instrucciones, pseudocódigo y mapa de Selection Sort, pruebas y tabla esperado vs observado de las 3 entradas, guía reproducible, referencias, declaración de IA, conclusiones y botón grande al simulador `./simulador/`).
  2. Redactar `VERIF/traces/traza_I.md`, `VERIF/traces/traza_J.md` y `VERIF/results/test_report.md`.

### Día 8 (29–30) — Evidencia Individual y Ensayo de Defensa
- **Rama:** `docs/ficha-integrante-b`
- **Entregable:**
  1. Completar `DOCS/ficha_integrante_B.md` (enlaces a tus PRs/commits, traza anotada reproducible propia y decisión/corrección propia).
  2. Actualizar tu sección en `DOCS/declaracion_ia.md` y tus conclusiones en `DOCS/site/index.html`.
  3. Ensayar la defensa individual (sin IA) junto con el Integrante A.
