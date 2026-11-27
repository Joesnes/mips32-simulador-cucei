/**
 * PROPIETARIO: Fares Khalifa
 * Genera las trazas anotadas de una instruccion tipo I y una tipo J ejecutando
 * SRC/programs/selection_sort.asm en MipsCpu, etapa por etapa (IF, ID, EX, MEM, WB).
 *
 * Uso (desde SRC/):  npx tsx ../VERIF/traces/generar_trazas.ts
 * Reescribe VERIF/traces/traza_I.md y VERIF/traces/traza_J.md.
 * VERIF/tests/traces.test.ts comprueba que los archivos guardados coinciden con lo que genera este script.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assemble } from '../../SRC/core/assembler';
import { MipsCpu } from '../../SRC/core/cpu';
import { REGISTER_NAMES, formatBin32, formatHex32, formatHexByte } from '../../SRC/core/isa';
import type { AlgorithmDataset, ControlSignals, CpuSnapshot, DecodedFields, Word32 } from '../../SRC/core/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const programsDir = path.resolve(here, '../../SRC/programs');

export interface TraceSpec {
  file: string;
  title: string;
  /** Direccion de la instruccion a trazar (primera vez que se ejecuta). */
  address: Word32;
  datasetId: string;
  intro: string;
}

export const TRACE_SPECS: TraceSpec[] = [
  {
    file: 'traza_I.md',
    title: 'Traza tipo I',
    address: 0x04,
    datasetId: 'estandar',
    intro:
      'Instrucción `lw` real del programa: carga `N` desde la memoria de datos. Usa extensión con signo del ' +
      'desplazamiento, calcula la dirección efectiva en la ALU, lee la memoria en MEM y escribe el registro en WB.',
  },
  {
    file: 'traza_J.md',
    title: 'Traza tipo J',
    address: 0x68,
    datasetId: 'estandar',
    intro:
      'Instrucción `j outer` real del programa: al terminar la primera pasada del ciclo externo regresa a `outer` ' +
      '(salto hacia atrás). El destino se forma con los 4 bits altos de `PC + 4`, el índice de 26 bits y dos ceros; ' +
      'no escribe registros ni memoria.',
  },
];

const SIGNAL_MEANING: Record<keyof ControlSignals, string> = {
  RegDst: 'Destino de escritura: 1 = rd (R), 0 = rt (I)',
  ALUSrc: 'Operando B de la ALU: 1 = inmediato extendido, 0 = R[rt]',
  ExtOp: 'Extensión del inmediato de 16 bits',
  MemToReg: 'Dato a escribir: 1 = memoria de datos, 0 = ALU',
  RegWrite: 'Escribe en el banco de registros',
  MemRead: 'Lee la memoria de datos',
  MemWrite: 'Escribe la memoria de datos',
  Branch: 'Salto condicional si Zero = 1 (beq)',
  BranchNe: 'Salto condicional si Zero = 0 (bne)',
  Jump: 'Salto incondicional (j)',
  ALUOp: 'Control de 2 bits hacia ALUControl',
  ALUctl: 'Operación de 4 bits de la ALU',
};

const bin = (value: number, width: number) => (value >>> 0).toString(2).padStart(width, '0');
const hexBytes = (bytes: number[]) => bytes.map((b) => formatHexByte(b)).join(' ');
const binBytes = (bytes: number[]) => bytes.map((b) => bin(b, 8)).join(' ');
const reg = (index: number) => `${REGISTER_NAMES[index]} ($${index})`;
const word = (value: number) => `${formatHex32(value)} (${value | 0})`;

function fieldRows(fields: DecodedFields): string[] {
  if (fields.format === 'J') {
    return [
      `| opcode | [31:26] | \`${bin(fields.opcode, 6)}\` | ${fields.opcode} (j) |`,
      `| índice | [25:0] | \`${bin(fields.jumpIndex, 26)}\` | ${fields.jumpIndex} |`,
    ];
  }
  return [
    `| opcode | [31:26] | \`${bin(fields.opcode, 6)}\` | ${fields.opcode} (${fields.mnemonic}) |`,
    `| rs | [25:21] | \`${bin(fields.rs, 5)}\` | ${fields.rs} = ${REGISTER_NAMES[fields.rs]} |`,
    `| rt | [20:16] | \`${bin(fields.rt, 5)}\` | ${fields.rt} = ${REGISTER_NAMES[fields.rt]} |`,
    `| inmediato | [15:0] | \`${bin(fields.imm16, 16)}\` | ${fields.imm16} (con signo: ${fields.immSigned}) |`,
  ];
}

function signalValue(ctrl: ControlSignals, key: keyof ControlSignals): string {
  const value = ctrl[key];
  if (key === 'ALUOp') return `\`${bin(value as number, 2)}\``;
  if (key === 'ALUctl') return `\`${bin(value as number, 4)}\``;
  return `\`${value}\``;
}

function registerDiff(before: CpuSnapshot, after: CpuSnapshot): string[] {
  const rows: string[] = [];
  for (let i = 0; i < 32; i++) {
    if (before.registers[i] !== after.registers[i]) {
      rows.push(`| ${reg(i)} | ${word(before.registers[i])} | ${word(after.registers[i])} |`);
    }
  }
  return rows;
}

function memoryDiff(before: CpuSnapshot, after: CpuSnapshot): string[] {
  const rows: string[] = [];
  for (let a = 0; a < before.dataMemory.length; a += 4) {
    const b = before.dataMemory.slice(a, a + 4);
    const c = after.dataMemory.slice(a, a + 4);
    if (b.join() !== c.join()) {
      rows.push(`| ${formatHex32(a)} | \`${hexBytes(b)}\` | \`${hexBytes(c)}\` |`);
    }
  }
  return rows;
}

function stageBlock(snapshot: CpuSnapshot): string[] {
  const stage = snapshot.lastStage;
  const b = snapshot.buffers;
  const lines = [`### ${stage}`, '', `Resumen de la CPU: \`${snapshot.lastChange?.summary ?? ''}\``, ''];
  if (stage === 'IF') {
    lines.push(
      '| Campo de IF/ID | Valor |',
      '|---|---|',
      `| pc | ${formatHex32(b.IF_ID.pc)} |`,
      `| pcPlus4 | ${formatHex32(b.IF_ID.pcPlus4)} |`,
      `| bytes | \`${hexBytes(b.IF_ID.bytes)}\` |`,
      `| instruction | ${formatHex32(b.IF_ID.instruction)} |`,
    );
  } else if (stage === 'ID') {
    lines.push(
      '| Campo de ID/EX | Valor |',
      '|---|---|',
      `| A = R[rs] | ${word(b.ID_EX.A)} |`,
      `| B = R[rt] | ${word(b.ID_EX.B)} |`,
      `| immExt | ${word(b.ID_EX.immExt)} |`,
      `| ctrl | ExtOp=${b.ID_EX.ctrl.ExtOp}, ALUSrc=${b.ID_EX.ctrl.ALUSrc}, Jump=${b.ID_EX.ctrl.Jump} |`,
    );
  } else if (stage === 'EX') {
    lines.push(
      '| Campo de EX/MEM | Valor |',
      '|---|---|',
      `| aluOperandA | ${word(b.EX_MEM.aluOperandA)} |`,
      `| aluOperandB | ${word(b.EX_MEM.aluOperandB)} |`,
      `| aluResult | ${word(b.EX_MEM.aluResult)} |`,
      `| zero | ${b.EX_MEM.zero ? 1 : 0} |`,
      `| writeReg | ${b.EX_MEM.writeReg} |`,
      `| branchTarget | ${formatHex32(b.EX_MEM.branchTarget)} |`,
      `| jumpTarget | ${formatHex32(b.EX_MEM.jumpTarget)} |`,
      `| nextPC | ${formatHex32(b.EX_MEM.nextPC)} |`,
    );
  } else if (stage === 'MEM') {
    lines.push(
      '| Campo de MEM/WB | Valor |',
      '|---|---|',
      `| memReadData (MDR) | ${word(b.MEM_WB.memReadData)} |`,
      `| aluResult | ${word(b.MEM_WB.aluResult)} |`,
      `| writeReg | ${b.MEM_WB.writeReg} |`,
      `| writeBackData | ${word(b.MEM_WB.writeBackData)} |`,
      `| nextPC | ${formatHex32(b.MEM_WB.nextPC)} |`,
    );
  } else {
    lines.push(`PC después de WB: ${formatHex32(snapshot.pc)}.`);
  }
  lines.push('');
  return lines;
}

export function buildTrace(spec: TraceSpec): string {
  const source = fs.readFileSync(path.join(programsDir, 'selection_sort.asm'), 'utf-8');
  const datasets: AlgorithmDataset[] = JSON.parse(fs.readFileSync(path.join(programsDir, 'datasets.json'), 'utf-8'));
  const dataset = datasets.find((d) => d.id === spec.datasetId);
  if (!dataset) throw new Error(`Dataset ${spec.datasetId} no encontrado`);
  const program = assemble(source);
  if (!program.ok) throw new Error('selection_sort.asm no ensambla');
  const instruction = program.instructions.find((i) => i.address === spec.address);
  if (!instruction) throw new Error(`No hay instruccion en ${formatHex32(spec.address)}`);

  const cpu = new MipsCpu();
  cpu.loadProgram(program.bytes, dataset.initialMemory, 256);
  let before = cpu.getSnapshot();
  while (before.pc !== spec.address || before.nextStage !== 'IF') {
    before = cpu.stepInstruction();
    if (before.status === 'ERROR' || before.instructionsExecuted > 1000) throw new Error('No se alcanzo la instruccion');
  }

  const stages: CpuSnapshot[] = [];
  for (let i = 0; i < 5; i++) stages.push(cpu.stepStage());
  const after = stages[4];
  const fields = after.buffers.ID_EX.fields;
  const ctrl = after.buffers.ID_EX.ctrl;
  const sourceLine = program.listing.split('\n').find((l) => l.startsWith(formatHex32(spec.address))) ?? '';
  const regRows = registerDiff(before, after);
  const memRows = memoryDiff(before, after);

  return [
    `# ${spec.title} — \`${instruction.source}\``,
    '',
    spec.intro,
    '',
    `- **Programa:** \`SRC/programs/selection_sort.asm\` (línea ${instruction.line}).`,
    `- **Entrada:** ${dataset.name} (\`datasets.json\`, id \`${dataset.id}\`).`,
    `- **Momento:** primera vez que se ejecuta la instrucción en ${formatHex32(spec.address)}, después de ${before.instructionsExecuted} ${before.instructionsExecuted === 1 ? 'instrucción' : 'instrucciones'} (ciclo ${before.cycle}).`,
    '- **Cómo reproducir:** desde `SRC/`, `npx tsx ../VERIF/traces/generar_trazas.ts` regenera este archivo; `npm test` verifica que coincide con la CPU (`VERIF/tests/traces.test.ts`). En el simulador: cargar *Selection Sort*, elegir la misma entrada y avanzar por instrucción hasta este PC.',
    '',
    `Listado: \`${sourceLine.trim()}\``,
    '',
    '## 1. Búsqueda: PC, bytes y palabra',
    '',
    '| Dato | Valor |',
    '|---|---|',
    `| PC | ${formatHex32(spec.address)} (${spec.address}) |`,
    `| Bytes mem[PC..PC+3] (hex) | \`${hexBytes(instruction.bytes)}\` |`,
    `| Bytes (binario) | \`${binBytes(instruction.bytes)}\` |`,
    `| Palabra (big-endian) | ${formatHex32(instruction.word)} = \`${formatBin32(instruction.word)}\` |`,
    `| PC + 4 | ${formatHex32(spec.address + 4)} |`,
    '',
    `Los 4 bytes se leen de las direcciones ${spec.address}, ${spec.address + 1}, ${spec.address + 2} y ${spec.address + 3} y se concatenan del más significativo al menos significativo.`,
    '',
    `## 2. Campos (formato ${fields.format})`,
    '',
    '| Campo | Bits | Binario | Valor |',
    '|---|---|---|---|',
    ...fieldRows(fields),
    '',
    ...(fields.format === 'J'
      ? [
          `Destino = PC+4[31:28] · índice · 00 = \`${bin((spec.address + 4) >>> 28, 4)}\` · \`${bin(fields.jumpIndex, 26)}\` · \`00\` = ${formatHex32(after.pc)}` +
            ` (etiqueta \`${Object.keys(program.labels).find((k) => program.labels[k] === after.pc) ?? '?'}\`).`,
          '',
        ]
      : fields.format === 'I' && ctrl.MemRead === 1
        ? [`Dirección efectiva = R[rs] + extensión con signo(inmediato) = ${before.registers[fields.rs] | 0} + ${fields.immSigned} = ${(before.registers[fields.rs] | 0) + fields.immSigned}.`, '']
        : []),
    '## 3. Señales de control',
    '',
    '| Señal | Valor | Significado |',
    '|---|---|---|',
    ...(Object.keys(SIGNAL_MEANING) as Array<keyof ControlSignals>).map(
      (key) => `| ${key} | ${signalValue(ctrl, key)} | ${SIGNAL_MEANING[key]} |`,
    ),
    '',
    '## 4. Etapa por etapa y buffers',
    '',
    ...stages.flatMap(stageBlock),
    '## 5. Estado antes y después',
    '',
    '| Dato | Antes | Después |',
    '|---|---|---|',
    `| PC | ${formatHex32(before.pc)} | ${formatHex32(after.pc)} |`,
    `| Ciclo | ${before.cycle} | ${after.cycle} |`,
    `| Instrucciones ejecutadas | ${before.instructionsExecuted} | ${after.instructionsExecuted} |`,
    '',
    regRows.length > 0
      ? ['| Registro | Antes | Después |', '|---|---|---|', ...regRows].join('\n')
      : 'No cambia ningún registro.',
    '',
    memRows.length > 0
      ? ['| Dirección | Antes | Después |', '|---|---|---|', ...memRows].join('\n')
      : 'No cambia la memoria de datos.',
    '',
  ].join('\n');
}

const isMain = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  for (const spec of TRACE_SPECS) {
    fs.writeFileSync(path.join(here, spec.file), buildTrace(spec), 'utf-8');
    console.log(`Escrito VERIF/traces/${spec.file}`);
  }
}
