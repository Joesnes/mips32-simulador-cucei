# Cronograma de Trabajo (8 Días — 22 al 30)

| Día | Fecha | Hito | Integrante A | Integrante B | Estado |
|---|---|---|---|---|---|
| 1 | 22 | Setup + Avance 1 | Estructura repo, contratos `types.ts`/`isa.ts`, CI, `alu.ts`, `registerFile.ts`, `RTL/referencia/` | Revisión y entrega de `propuesta_algoritmo.md`, setup local, PR inicial | En curso |
| 2 | 23 | Base Tipo R | `controlUnit.ts` (R), `memory.ts` (big-endian 4B), `cpu.ts` (IF-WB tipo R) | Ensamblador 2 pasadas tipo R + etiquetas + `assembler.test.ts` | Pendiente |
| 3 | 24 | Tipo I + Memoria | Extensión `cpu.ts` y `controlUnit.ts` para `addi/addiu`, `ori`, `lw`, `sw`, `beq`, `bne` y validación de accesos | Ensamblador tipo I, rangos, `hexImage` 1B/dir, listado y CLI `assemble` | Pendiente |
| 4 | 25 | Tipo J + Algoritmo (Avance 2) | Instrucción `j`, parada por PC inválido, `isa.test.ts` (12) e `integration.test.ts` | Instrucción `j`, `selection_sort.asm`, ejemplos R/I/J, `datasets.json`, `algorithm.test.ts` | Pendiente |
| 5 | 26 | UI Parte 1 | `DatapathSVG.tsx` interactivo estilo MIPS 101 | `EditorControls.tsx` + `InstructionInspector.tsx` | Pendiente |
| 6 | 27 | UI Parte 2 + Deploy | `ControlSignalsPanel.tsx` + `deploy-pages.yml` en GitHub Pages | `MemoryRegistersPanel.tsx` (32 registros, IMem, DMem, diffs) | Pendiente |
| 7 | 28 | Reporte y Trazas | Diagramas SVG en `DOCS/site/assets/`, `traza_R.md`, sección arquitectura en reporte | Reporte estático completo `DOCS/site/`, `traza_I.md`, `traza_J.md`, `test_report.md` | Pendiente |
| 8 | 29–30 | Cierre y Defensa (Avance 3) | `ficha_integrante_A.md`, `declaracion_ia.md`, QA E2E, tag `v1.0.0` | `ficha_integrante_B.md`, `declaracion_ia.md`, conclusiones, ensayo defensa sin IA | Pendiente |
