# Traza tipo R — `slt $t5, $t4, $t3`

Instrucción `slt $t5, $t4, $t3` real del programa (núcleo de comparación con signo de Selection Sort): compara `A[1] = 4` contra `A[0] = 25` con `ALUctl = 0111` (SLT con signo), produce `1` en `ALUOut` y escribe `$t5` en WB.

- **Programa:** `SRC/programs/selection_sort.asm` (línea 27).
- **Entrada:** Entrada 1 - Caso estándar (`datasets.json`, id `estandar`).
- **Momento:** primera vez que se ejecuta la instrucción en 0x00000030, después de 12 instrucciones (ciclo 60).
- **Cómo reproducir:** desde `SRC/`, `npx tsx ../VERIF/traces/generar_trazas.ts` regenera este archivo; `npm test` verifica que coincide con la CPU (`VERIF/tests/traces.test.ts`). En el simulador: cargar *Selection Sort*, elegir la misma entrada y avanzar por instrucción hasta este PC.

Listado: `0x00000030  0x018B682A  000000 01100 01011 01101 00000 101010  slt $t5, $t4, $t3`

## 1. Búsqueda: PC, bytes y palabra

| Dato | Valor |
|---|---|
| PC | 0x00000030 (48) |
| Bytes mem[PC..PC+3] (hex) | `01 8B 68 2A` |
| Bytes (binario) | `00000001 10001011 01101000 00101010` |
| Palabra (big-endian) | 0x018B682A = `00000001100010110110100000101010` |
| PC + 4 | 0x00000034 |

Los 4 bytes se leen de las direcciones 48, 49, 50 y 51 y se concatenan del más significativo al menos significativo.

## 2. Campos (formato R)

| Campo | Bits | Binario | Valor |
|---|---|---|---|
| opcode | [31:26] | `000000` | 0 (Tipo R) |
| rs | [25:21] | `01100` | 12 = $t4 |
| rt | [20:16] | `01011` | 11 = $t3 |
| rd | [15:11] | `01101` | 13 = $t5 |
| shamt | [10:6] | `00000` | 0 (siempre 0 en las 5 R) |
| funct | [5:0] | `101010` | 42 = 0x2A (slt) |

## 3. Señales de control

| Señal | Valor | Significado |
|---|---|---|
| RegDst | `1` | Destino de escritura: 1 = rd (R), 0 = rt (I) |
| ALUSrc | `0` | Operando B de la ALU: 1 = inmediato extendido, 0 = R[rt] |
| ExtOp | `NONE` | Extensión del inmediato de 16 bits |
| MemToReg | `0` | Dato a escribir: 1 = memoria de datos, 0 = ALU |
| RegWrite | `1` | Escribe en el banco de registros |
| MemRead | `0` | Lee la memoria de datos |
| MemWrite | `0` | Escribe la memoria de datos |
| Branch | `0` | Salto condicional si Zero = 1 (beq) |
| BranchNe | `0` | Salto condicional si Zero = 0 (bne) |
| Jump | `0` | Salto incondicional (j) |
| ALUOp | `10` | Control de 2 bits hacia ALUControl |
| ALUctl | `0111` | Operación de 4 bits de la ALU |

## 4. Etapa por etapa y buffers

### IF

Resumen de la CPU: `IF: PC=0x00000030 -> bytes [01 8B 68 2A] -> IR=0x018B682A`

| Campo de IF/ID | Valor |
|---|---|
| pc | 0x00000030 |
| pcPlus4 | 0x00000034 |
| bytes | `01 8B 68 2A` |
| instruction | 0x018B682A |

### ID

Resumen de la CPU: `ID: slt (R) · A=$t4(0x00000004), B=$t3(0x00000019)`

| Campo de ID/EX | Valor |
|---|---|
| A = R[rs] | 0x00000004 (4) |
| B = R[rt] | 0x00000019 (25) |
| immExt | 0x00000000 (0) |
| ctrl | ExtOp=NONE, ALUSrc=0, Jump=0 |

### EX

Resumen de la CPU: `EX: ALUOut=0x00000001, Zero=0, nextPC=0x00000034`

| Campo de EX/MEM | Valor |
|---|---|
| aluOperandA | 0x00000004 (4) |
| aluOperandB | 0x00000019 (25) |
| aluResult | 0x00000001 (1) |
| zero | 0 |
| writeReg | 13 |
| branchTarget | 0x0001A0DC |
| jumpTarget | 0x062DA0A8 |
| nextPC | 0x00000034 |

### MEM

Resumen de la CPU: `MEM: sin acceso a memoria (pasa ALUOut=0x00000001)`

| Campo de MEM/WB | Valor |
|---|---|
| memReadData (MDR) | 0x00000000 (0) |
| aluResult | 0x00000001 (1) |
| writeReg | 13 |
| writeBackData | 0x00000001 (1) |
| nextPC | 0x00000034 |

### WB

Resumen de la CPU: `WB: $t5 <- 0x00000001 · PC=0x00000034`

PC después de WB: 0x00000034.

## 5. Estado antes y después

| Dato | Antes | Después |
|---|---|---|
| PC | 0x00000030 | 0x00000034 |
| Ciclo | 60 | 65 |
| Instrucciones ejecutadas | 12 | 13 |

| Registro | Antes | Después |
|---|---|---|
| $t5 ($13) | 0x00000000 (0) | 0x00000001 (1) |

No cambia la memoria de datos.
