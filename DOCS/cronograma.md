# Cronograma de Trabajo (8 Días — 22 al 30)

| Día | Fecha | Hito | Alejandro Espinoza | Fares Khalifa | Estado |
|---|---|---|---|---|---|
| 1 | 22 | Setup + Avance 1 | Estructura repo, contratos `types.ts`/`isa.ts`, CI, `alu.ts`, `registerFile.ts`, `RTL/referencia/` | Revisión y entrega de `propuesta_algoritmo.md`, setup local, PR inicial (#2) | **Completado** |
| 2 | 23 | Base Tipo R | `controlUnit.ts` (R), `memory.ts` (big-endian 4B), `cpu.ts` (IF-WB tipo R), `isa.test.ts` (R) — PR #3 | Ensamblador 2 pasadas tipo R + etiquetas + `assembler.test.ts` — PR #4 | **Completado** |
| 3 | 24 | Tipo I + Memoria | Extensión `cpu.ts` y `controlUnit.ts` para `addi/addiu`, `ori`, `lw`, `sw`, `beq`, `bne` y validación de accesos — PR #6 | Ensamblador tipo I, rangos, `hexImage` 1B/dir, listado y CLI `assemble` — PR #7 | **Completado** |
| 4 | 25 | Tipo J + Algoritmo (Avance 2) | Instrucción `j`, parada por PC inválido, `isa.test.ts` (12/12) e `integration.test.ts` — PR #8 | Instrucción `j`, `selection_sort.asm`, ejemplos R/I/J, `datasets.json`, `algorithm.test.ts` — PR #9 | **Completado** |
| 5–6 | 26–27 | UI Simulador + Trazas I/J | Simulador completo unificado en tema oscuro estilo Apple, 100% Binario/Decimal (`DatapathSVG`, `ControlSignalsPanel`, `GuideModal`, paneles unificados y `datapathView.test.ts`) — PR #10 | Trazas reproducibles `VERIF/traces/traza_I.md`, `traza_J.md`, `VERIF/results/test_report.md` y completar sus filas en `DOCS/declaracion_ia.md` | **En curso** |
| 7 | 28 | Reporte Técnico y Traza R | Diagramas SVG de arquitectura en `DOCS/site/assets/`, `VERIF/traces/traza_R.md` y sección arquitectura en reporte | Reporte estático completo `DOCS/site/index.html` y `styles.css` (estética oscura unificada y enlace a `./simulador/`) | Pendiente |
| 8 | 29–30 | Cierre y Defensa (Avance 3) | `ficha_alejandro_espinoza.md`, `README.md` final, QA E2E en GitHub Pages, tag `v1.0.0` | `ficha_fares_khalifa.md`, conclusiones individuales, verificación final y ensayo de defensa sin IA | Pendiente |
