# Proyecto Final — Simulador Web Interactivo MIPS 32 bits (Modalidad B)

**Universidad de Guadalajara / CUCEI — Arquitectura de Computadoras**

Sistema educativo MIPS de 32 bits que ensambla código ensamblador MIPS (12 instrucciones, codificación big-endian de 1 byte por dirección), carga la imagen en memoria y permite visualizar paso a paso (**por etapa/ciclo** y **por instrucción**) el PC, los 4 bytes de búsqueda, los campos de instrucción, las señales de control, las rutas activas con sus valores, los buffers intermedios (`IF/ID`, `ID/EX`, `EX/MEM`, `MEM/WB`), el banco de registros y la memoria de datos.

## Estructura del Repositorio

- `RTL/`: Referencia de los módulos Verilog desarrollados en clase (`ALU.v`, `BR.v`, `BBVA.v`) y documentación de las correcciones aplicadas en la Modalidad B.
- `SRC/`: Código fuente del ensamblador (`SRC/core/assembler/`), motor CPU multiciclo (`SRC/core/cpu/`), programas MIPS y datasets (`SRC/programs/`) y simulador web React + TypeScript + Vite (`SRC/simulator/`).
- `VERIF/`: Pruebas automatizadas con Vitest (`VERIF/tests/`), trazas por formato R/I/J (`VERIF/traces/`) y reportes de resultados (`VERIF/results/`).
- `DOCS/`: Reporte técnico estático (`DOCS/site/`), cronograma, acuerdos, declaración de uso de IA, propuesta del algoritmo, guías de trabajo y fichas individuales.

## Requisitos y Ejecución Reproducible

Requiere **Node.js 20+** y **Git**.

```bash
# 1. Instalar dependencias
cd SRC
npm install

# 2. Verificar tipos y correr todas las pruebas automatizadas (VERIF/)
npm run typecheck
npm test

# 3. Regenerar imagen cargable (.hex 1 byte/dir) y listado (.lst) desde un .asm
npm run assemble -- programs/selection_sort.asm

# 4. Ejecutar el simulador web en local
npm run dev

# 5. Compilar la versión de producción (genera SRC/simulator/dist/)
npm run build
```

## Guías del Equipo

- [Guía paso a paso de Git y GitHub](DOCS/GUIA_EQUIPO_Y_GITHUB.md)
- [Guía de tareas y contratos para Fares Khalifa](DOCS/TAREAS_FARES_KHALIFA.md)
- [Propuesta del algoritmo Selection Sort](DOCS/propuesta_algoritmo.md)
- [Cronograma de 8 días](DOCS/cronograma.md)
