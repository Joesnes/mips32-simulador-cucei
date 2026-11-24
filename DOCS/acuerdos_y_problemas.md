# Registro de Acuerdos, Decisiones y Problemas

| Fecha | Tipo | Descripción | Responsable | Resolución / Evidencia |
|---|---|---|---|---|
| Día 1 | Acuerdo | Modalidad elegida: **Modalidad B (Simulador Web Interactivo)** con arquitectura multiciclo de 5 etapas (1 instrucción activa a la vez) y buffers `IF/ID`, `ID/EX`, `EX/MEM`, `MEM/WB`. | Equipo | Definido en `SRC/core/types.ts`. |
| Día 1 | Acuerdo | Conjunto de instrucciones: las 11 filas de la tabla (pág. 2) + `bne` (`05`) = **12 instrucciones**, aceptando `addiu` como alias de `addi` (`09`). | Equipo | Congelado en `SRC/core/isa.ts`. |
| Día 1 | Corrección | Al analizar `RTL/referencia/BR.v` y `ALU.v`, se detectó que `$0` no estaba protegido contra escritura y `slt` usaba comparación sin signo. Se corrige ambos en `SRC/core/cpu/`. | Integrante A | Verificado en `VERIF/tests/smoke.test.ts`. |
| Día 1 | Acuerdo | División 50/50 vertical: Integrante A (CPU/Datapath, SVG, Control/Buffers, Tests ISA/Integración); Integrante B (Ensamblador, Selection Sort ASM, Editor/Memorias UI, Reporte HTML). Todo cambio entra por PR revisado por el compañero. | Equipo | Documentado en `DOCS/GUIA_EQUIPO_Y_GITHUB.md` y `DOCS/TAREAS_INTEGRANTE_B.md`. |
| Día 1 | Avance | Integrante B completó la propuesta de Selection Sort (28 instrucciones usando las 12 de la ISA y 3 entradas en hex big-endian) en PR #2; Integrante A revisó, aprobó y mezcló a `main`. | Equipo | PR #2 mezclado (`c00556c`). |
| Día 2 | Diseño | Se añade parámetro opcional `initialRegisters` en `MipsCpu.loadProgram()` para permitir pruebas unitarias aisladas de instrucciones Tipo R antes de integrar `addi`/`lw` en el Día 3, manteniendo compatibilidad total con la UI. | Integrante A | `SRC/core/cpu/cpu.ts` y `VERIF/tests/isa.test.ts`. |
