# Declaración de Uso de Inteligencia Artificial

Conforme a la consigna del proyecto (pág. 7), se documenta por módulo la herramienta utilizada, el propósito, los aportes incorporados o descartados y el mecanismo de verificación.

| Módulo | Responsable | Herramienta de IA | Propósito | Qué se incorporó / descartó | Cómo se comprobó |
|---|---|---|---|---|---|
| Arquitectura inicial, contratos `types.ts`/`isa.ts`, CI/CD y guías de equipo | Integrante A | Antigravity (Gemini) | Diseño de arquitectura modular, verificación de discrepancias en consigna y andamiaje TypeScript/Vite/Vitest | Se incorporó estructura `RTL/DOCS/VERIF/SRC`, contratos de 12 instrucciones y correcciones de `$zero` y `slt` con signo respecto a `BR.v`/`ALU.v`. | `npm run typecheck`, `npm test` (`smoke.test.ts`) y `npm run build`. |
| *(Completar conforme avancen los módulos del Día 2 al Día 8)* | Integrante A / B | — | — | — | — |
