# Declaración de Uso de Inteligencia Artificial y Autoría

Conforme a las reglas del proyecto (consigna pág. 7), este documento presenta un **resumen general por módulo** del uso de herramientas de Inteligencia Artificial, qué aportes se incorporaron o descartaron, y cómo se validó cada componente de forma reproducible.

---

## 1. Resumen General por Módulo

| Módulo del sistema | Responsable | Herramienta(s) de IA | Propósito general | Aportes incorporados y criterios de descarte | Mecanismo de comprobación |
|---|---|---|---|---|---|
| **Arquitectura, contratos ISA y CI/CD** (`SRC/core/types.ts`, `isa.ts`, `.github/workflows/`, `RTL/README.md`) | Alejandro Espinoza | Antigravity (Gemini) | Planificación modular, configuración de TypeScript/Vite/Vitest/GitHub Actions y revisión de la consigna | **Incorporado:** contratos estrictos para las 12 instrucciones (respetando opcodes/functs exactos del PDF y big-endian) y despliegue automático en GitHub Pages. **Descartado:** arquitectura de pipeline con hazards (se eligió multiciclo de 5 etapas con 1 instrucción activa a la vez, acorde a la consigna). | `npm run typecheck`, `VERIF/tests/smoke.test.ts` y ejecución de workflows de CI y Pages en GitHub. |
| **Núcleo CPU, Memorias y Pruebas de Integración** (`SRC/core/cpu/*`, `VERIF/tests/isa.test.ts`, `integration.test.ts`) | Alejandro Espinoza | Antigravity (Gemini) | Apoyo en el diseño e implementación de `MIPSALU`, `RegisterFile`, memorias big-endian, Unidad de Control, máquina multiciclo de 5 etapas y casos de prueba | **Incorporado:** protección de `$zero`, comparación con signo en `slt`, reunión de 4 bytes en fetch, validación de alineación/rango sin corromper estado y buffers `IF/ID..MEM/WB`. **Descartado:** comparaciones sin signo heredadas de `RTL/referencia/ALU.v` y escrituras sin guarda en `$0` de `BR.v`. | Suite automatizada Vitest (`npm test`) verificando etapa por etapa, casos límite y revisión cruzada en Pull Requests. |
| **Visualizador SVG del Datapath y Panel de Control/Buffers** (`DatapathSVG.tsx`, `ControlSignalsPanel.tsx`, diagramas en `DOCS/site/assets/`) | Alejandro Espinoza | Antigravity (Gemini) | Asistencia en el diseño del diagrama interactivo inspirado en *MIPS 101* y visualización de rutas activas, señales y buffers | *(Resumen por completar al integrar los componentes de visualización.)* | Compilación (`npm run build`) y verificación visual paso a paso en navegador contra trazas manuales. |
| **Ensamblador MIPS y CLI de Imágenes** (`SRC/core/assembler/*`, `VERIF/tests/assembler.test.ts`) | Fares Khalifa | *(Pendiente de completar por Fares Khalifa)* | *(Pendiente de completar por Fares Khalifa)* | *(Pendiente de completar por Fares Khalifa)* | `VERIF/tests/assembler.test.ts`, `npm run assemble` y revisión cruzada en Pull Requests. |
| **Algoritmo Selection Sort, Ejemplos y Datasets** (`SRC/programs/*`, `DOCS/propuesta_algoritmo.md`, `VERIF/tests/algorithm.test.ts`) | Fares Khalifa | *(Pendiente de completar por Fares Khalifa)* | *(Pendiente de completar por Fares Khalifa)* | *(Pendiente de completar por Fares Khalifa)* | `VERIF/tests/algorithm.test.ts` con las 3 entradas previstas y revisión cruzada en Pull Requests. |
| **Interfaz de Editor, Inspector, Memorias y Reporte Técnico** (`EditorControls.tsx`, `InstructionInspector.tsx`, `MemoryRegistersPanel.tsx`, `DOCS/site/`) | Fares Khalifa | *(Pendiente de completar por Fares Khalifa)* | *(Pendiente de completar por Fares Khalifa)* | *(Pendiente de completar por Fares Khalifa)* | Compilación (`npm run build`), verificación en GitHub Pages y revisión de equipo. |

---

## 2. Materiales Externos, Referencias y Licencias

- **MIPS 101** — Nanyang Technological University (referencia conceptual y didáctica para la visualización paso a paso de la ruta de datos).
- **David A. Patterson y John L. Hennessy** — *Computer Organization and Design*, 5.ª edición, capítulo 4 (esquemas de referencia del datapath y señales de control).
- **MIPS Technologies** — *MIPS32 Architecture for Programmers*, volumen II (codificación de instrucciones y formatos).
- **Módulos de clase (`RTL/referencia/`):** `ALU.v`, `BR.v`, `BBVA.v` y testbenches elaborados previamente en el curso de Arquitectura de Computadoras (UdeG / CUCEI).
- **Dependencias de software libre:** React (MIT), TypeScript (Apache-2.0), Vite (MIT), Vitest (MIT), tsx (MIT).
