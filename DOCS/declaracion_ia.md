# Declaración de Uso de Inteligencia Artificial

Conforme a la consigna del proyecto (pág. 7), se documenta por módulo la herramienta utilizada, el propósito, los aportes incorporados o descartados y el mecanismo de verificación.

| Módulo | Responsable | Herramienta de IA | Propósito | Qué se incorporó / descartó | Cómo se comprobó |
|---|---|---|---|---|---|
| Arquitectura inicial, contratos `types.ts`/`isa.ts`, CI/CD y guías de equipo | Integrante A | Antigravity (Gemini) | Diseño de arquitectura modular, verificación de discrepancias en consigna y andamiaje TypeScript/Vite/Vitest | Se incorporó estructura `RTL/DOCS/VERIF/SRC`, contratos de 12 instrucciones y correcciones de `$zero` y `slt` con signo respecto a `BR.v`/`ALU.v`. | `npm run typecheck`, `npm test` (`smoke.test.ts`) y `npm run build`. |
| Propuesta de algoritmo (`DOCS/propuesta_algoritmo.md`) | Integrante B | Claude (Anthropic) | Revisar y completar el borrador: pseudocódigo detallado por desplazamientos en bytes, bosquejo ASM con las 12 instrucciones, tablas de memoria en hex y evolución por pasada | Se incorporó el pseudocódigo detallado, el bosquejo de referencia y las tablas; se mantuvieron sin cambio el mapa de memoria y las 3 entradas del borrador. El `.asm` definitivo se escribirá y verificará el Día 4. | Simulación del bosquejo con las 3 entradas en un modelo de referencia independiente (salidas iguales a las esperadas) y revisión manual de las pasadas. |
| *(Completar conforme avancen los módulos del Día 2 al Día 8)* | Integrante A / B | — | — | — | — |
