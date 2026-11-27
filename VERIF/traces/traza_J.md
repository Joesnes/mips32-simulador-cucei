# Traza tipo J — `j outer`

Instrucción `j outer` real del programa: al terminar la primera pasada del ciclo externo regresa a `outer` (salto hacia atrás). El destino se forma con los 4 bits altos de `PC + 4`, el índice de 26 bits y dos ceros; no escribe registros ni memoria.

- **Programa:** `SRC/programs/selection_sort.asm` (línea 41).
- **Entrada:** Entrada 1 - Caso estándar (`datasets.json`, id `estandar`).
- **Momento:** primera vez que se ejecuta la instrucción en 0x00000068, después de 51 instrucciones (ciclo 255).
- **Cómo reproducir:** desde `SRC/`, `npx tsx ../VERIF/traces/generar_trazas.ts` regenera este archivo; `npm test` verifica que coincide con la CPU (`VERIF/tests/traces.test.ts`). En el simulador: cargar *Selection Sort*, elegir la misma entrada y avanzar por instrucción hasta este PC.

Listado: `0x00000068  0x08000005  000010 00000000000000000000000101      j outer`

## 1. Búsqueda: PC, bytes y palabra

| Dato | Valor |
|---|---|
| PC | 0x00000068 (104) |
| Bytes mem[PC..PC+3] (hex) | `08 00 00 05` |
| Bytes (binario) | `00001000 00000000 00000000 00000101` |
| Palabra (big-endian) | 0x08000005 = `00001000000000000000000000000101` |
| PC + 4 | 0x0000006C |

Los 4 bytes se leen de las direcciones 104, 105, 106 y 107 y se concatenan del más significativo al menos significativo.

## 2. Campos (formato J)

| Campo | Bits | Binario | Valor |
|---|---|---|---|
| opcode | [31:26] | `000010` | 2 (j) |
| índice | [25:0] | `00000000000000000000000101` | 5 |

Destino = PC+4[31:28] · índice · 00 = `0000` · `00000000000000000000000101` · `00` = 0x00000014 (etiqueta `outer`).

## 3. Señales de control

| Señal | Valor | Significado |
|---|---|---|
| RegDst | `0` | Destino de escritura: 1 = rd (R), 0 = rt (I) |
| ALUSrc | `0` | Operando B de la ALU: 1 = inmediato extendido, 0 = R[rt] |
| ExtOp | `NONE` | Extensión del inmediato de 16 bits |
| MemToReg | `0` | Dato a escribir: 1 = memoria de datos, 0 = ALU |
| RegWrite | `0` | Escribe en el banco de registros |
| MemRead | `0` | Lee la memoria de datos |
| MemWrite | `0` | Escribe la memoria de datos |
| Branch | `0` | Salto condicional si Zero = 1 (beq) |
| BranchNe | `0` | Salto condicional si Zero = 0 (bne) |
| Jump | `1` | Salto incondicional (j) |
| ALUOp | `00` | Control de 2 bits hacia ALUControl |
| ALUctl | `0010` | Operación de 4 bits de la ALU |

## 4. Etapa por etapa y buffers

### IF

Resumen de la CPU: `IF: PC=0x00000068 -> bytes [08 00 00 05] -> IR=0x08000005`

| Campo de IF/ID | Valor |
|---|---|
| pc | 0x00000068 |
| pcPlus4 | 0x0000006C |
| bytes | `08 00 00 05` |
| instruction | 0x08000005 |

### ID

Resumen de la CPU: `ID: j (J) · indice26=0x0000005`

| Campo de ID/EX | Valor |
|---|---|
| A = R[rs] | 0x00000000 (0) |
| B = R[rt] | 0x00000000 (0) |
| immExt | 0x00000000 (0) |
| ctrl | ExtOp=NONE, ALUSrc=0, Jump=1 |

### EX

Resumen de la CPU: `EX: j -> jumpTarget=0x00000014, nextPC=0x00000014`

| Campo de EX/MEM | Valor |
|---|---|
| aluOperandA | 0x00000000 (0) |
| aluOperandB | 0x00000000 (0) |
| aluResult | 0x00000000 (0) |
| zero | 1 |
| writeReg | 0 |
| branchTarget | 0x00000080 |
| jumpTarget | 0x00000014 |
| nextPC | 0x00000014 |

### MEM

Resumen de la CPU: `MEM: sin acceso a memoria (pasa ALUOut=0x00000000)`

| Campo de MEM/WB | Valor |
|---|---|
| memReadData (MDR) | 0x00000000 (0) |
| aluResult | 0x00000000 (0) |
| writeReg | 0 |
| writeBackData | 0x00000000 (0) |
| nextPC | 0x00000014 |

### WB

Resumen de la CPU: `WB: sin escritura en BR · PC=0x00000014`

PC después de WB: 0x00000014.

## 5. Estado antes y después

| Dato | Antes | Después |
|---|---|---|
| PC | 0x00000068 | 0x00000014 |
| Ciclo | 255 | 260 |
| Instrucciones ejecutadas | 51 | 52 |

No cambia ningún registro.

No cambia la memoria de datos.
