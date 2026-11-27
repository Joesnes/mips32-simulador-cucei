# Traza tipo I — `lw $s1, 0($zero)`

Instrucción `lw` real del programa: carga `N` desde la memoria de datos. Usa extensión con signo del desplazamiento, calcula la dirección efectiva en la ALU, lee la memoria en MEM y escribe el registro en WB.

- **Programa:** `SRC/programs/selection_sort.asm` (línea 16).
- **Entrada:** Entrada 1 - Caso estándar (`datasets.json`, id `estandar`).
- **Momento:** primera vez que se ejecuta la instrucción en 0x00000004, después de 1 instrucción (ciclo 5).
- **Cómo reproducir:** desde `SRC/`, `npx tsx ../VERIF/traces/generar_trazas.ts` regenera este archivo; `npm test` verifica que coincide con la CPU (`VERIF/tests/traces.test.ts`). En el simulador: cargar *Selection Sort*, elegir la misma entrada y avanzar por instrucción hasta este PC.

Listado: `0x00000004  0x8C110000  100011 00000 10001 0000000000000000    lw $s1, 0($zero)`

## 1. Búsqueda: PC, bytes y palabra

| Dato | Valor |
|---|---|
| PC | 0x00000004 (4) |
| Bytes mem[PC..PC+3] (hex) | `8C 11 00 00` |
| Bytes (binario) | `10001100 00010001 00000000 00000000` |
| Palabra (big-endian) | 0x8C110000 = `10001100000100010000000000000000` |
| PC + 4 | 0x00000008 |

Los 4 bytes se leen de las direcciones 4, 5, 6 y 7 y se concatenan del más significativo al menos significativo.

## 2. Campos (formato I)

| Campo | Bits | Binario | Valor |
|---|---|---|---|
| opcode | [31:26] | `100011` | 35 (lw) |
| rs | [25:21] | `00000` | 0 = $zero |
| rt | [20:16] | `10001` | 17 = $s1 |
| inmediato | [15:0] | `0000000000000000` | 0 (con signo: 0) |

Dirección efectiva = R[rs] + extensión con signo(inmediato) = 0 + 0 = 0.

## 3. Señales de control

| Señal | Valor | Significado |
|---|---|---|
| RegDst | `0` | Destino de escritura: 1 = rd (R), 0 = rt (I) |
| ALUSrc | `1` | Operando B de la ALU: 1 = inmediato extendido, 0 = R[rt] |
| ExtOp | `SIGN` | Extensión del inmediato de 16 bits |
| MemToReg | `1` | Dato a escribir: 1 = memoria de datos, 0 = ALU |
| RegWrite | `1` | Escribe en el banco de registros |
| MemRead | `1` | Lee la memoria de datos |
| MemWrite | `0` | Escribe la memoria de datos |
| Branch | `0` | Salto condicional si Zero = 1 (beq) |
| BranchNe | `0` | Salto condicional si Zero = 0 (bne) |
| Jump | `0` | Salto incondicional (j) |
| ALUOp | `00` | Control de 2 bits hacia ALUControl |
| ALUctl | `0010` | Operación de 4 bits de la ALU |

## 4. Etapa por etapa y buffers

### IF

Resumen de la CPU: `IF: PC=0x00000004 -> bytes [8C 11 00 00] -> IR=0x8C110000`

| Campo de IF/ID | Valor |
|---|---|
| pc | 0x00000004 |
| pcPlus4 | 0x00000008 |
| bytes | `8C 11 00 00` |
| instruction | 0x8C110000 |

### ID

Resumen de la CPU: `ID: lw (I) · A=$zero(0x00000000), B=$s1(0x00000000), immExt=0x00000000 (SIGN)`

| Campo de ID/EX | Valor |
|---|---|
| A = R[rs] | 0x00000000 (0) |
| B = R[rt] | 0x00000000 (0) |
| immExt | 0x00000000 (0) |
| ctrl | ExtOp=SIGN, ALUSrc=1, Jump=0 |

### EX

Resumen de la CPU: `EX: ALUOut=0x00000000, Zero=1, nextPC=0x00000008`

| Campo de EX/MEM | Valor |
|---|---|
| aluOperandA | 0x00000000 (0) |
| aluOperandB | 0x00000000 (0) |
| aluResult | 0x00000000 (0) |
| zero | 1 |
| writeReg | 17 |
| branchTarget | 0x00000008 |
| jumpTarget | 0x00440000 |
| nextPC | 0x00000008 |

### MEM

Resumen de la CPU: `MEM: lw [0x00000000] -> MDR=0x00000005`

| Campo de MEM/WB | Valor |
|---|---|
| memReadData (MDR) | 0x00000005 (5) |
| aluResult | 0x00000000 (0) |
| writeReg | 17 |
| writeBackData | 0x00000005 (5) |
| nextPC | 0x00000008 |

### WB

Resumen de la CPU: `WB: $s1 <- 0x00000005 · PC=0x00000008`

PC después de WB: 0x00000008.

## 5. Estado antes y después

| Dato | Antes | Después |
|---|---|---|
| PC | 0x00000004 | 0x00000008 |
| Ciclo | 5 | 10 |
| Instrucciones ejecutadas | 1 | 2 |

| Registro | Antes | Después |
|---|---|---|
| $s1 ($17) | 0x00000000 (0) | 0x00000005 (5) |

No cambia la memoria de datos.
