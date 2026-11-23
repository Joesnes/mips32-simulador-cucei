# Carpeta RTL — Referencia de Hardware (Modalidad B)

Este proyecto se desarrolla bajo la **Modalidad B (Simulador Web Interactivo)**, por lo que el sistema ejecutable principal en navegador y el ensamblador se encuentran en [`SRC/`](../SRC/).

De acuerdo con la estructura obligatoria del repositorio solicitada en la consigna (`RTL`, `DOCS`, `VERIF`, `SRC`), esta carpeta conserva los módulos Verilog desarrollados previamente en clase dentro de [`RTL/referencia/`](./referencia/) como antecedente de diseño de la ruta de datos:

- `ALU.v` (`MIPSALU`): define la convención de señales `ALUctl` de 4 bits (`0000` AND, `0001` OR, `0010` ADD, `0110` SUB, `0111` SLT, `1100` NOR) y bandera `Zero` (`ZF`).
- `BR.v` (`BR`): define los puertos del Banco de Registros (`AR1`, `AR2`, `AW`, `Dw`, `we`, `DR1`, `DR2`).
- `BBVA.v`, `BR_TB.v`, `BBVA_TB.v`: interconexión previa y bancos de prueba de clase.

## Correcciones aplicadas al trasladar la arquitectura al simulador (`SRC/core/cpu/`)

1. **Protección de `$zero` (`$0`):** En `BR.v`, una escritura con `AW = 0` sobrescribía `mem[0]`. En `SRC/core/cpu/registerFile.ts`, `$0` siempre lee `0x00000000` y descarta cualquier escritura.
2. **Comparación con signo en `slt`:** En `ALU.v`, `A < B` evaluaba comparación sin signo. En `SRC/core/cpu/alu.ts`, `ALUctl = 0111` realiza comparación con signo de 32 bits (`(A | 0) < (B | 0)`) conforme a la tabla ISA del proyecto.
3. **Ruta completa de 32 bits y buffers multiciclo:** Se incorporan PC, Memoria de Instrucciones big-endian de 4 bytes por palabra, Unidad de Control, Extensor de signo/ceros, Memoria de Datos big-endian con validación de alineación/rango y registros intermedios `IF/ID`, `ID/EX`, `EX/MEM` y `MEM/WB`.
