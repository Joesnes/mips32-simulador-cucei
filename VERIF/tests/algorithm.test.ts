import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { assemble } from '../../SRC/core/assembler';
import { bytesToWordBigEndian, formatHexByte } from '../../SRC/core/isa';
import { MipsCpu } from '../../SRC/core/cpu';
import type { AlgorithmDataset } from '../../SRC/core/types';

const programsDir = path.resolve(__dirname, '../../SRC/programs');
const source = fs.readFileSync(path.join(programsDir, 'selection_sort.asm'), 'utf-8');
const datasets: AlgorithmDataset[] = JSON.parse(fs.readFileSync(path.join(programsDir, 'datasets.json'), 'utf-8'));

/** Lee una palabra de 32 bits con signo de la memoria de datos (big-endian). */
function readWord(memory: number[], address: number): number {
  return bytesToWordBigEndian(memory[address], memory[address + 1], memory[address + 2], memory[address + 3]) | 0;
}

/** Ejecuta instruccion por instruccion hasta el autosalto final, un error o el limite. */
function runDataset(dataset: AlgorithmDataset) {
  const program = assemble(source);
  expect(program.diagnostics).toEqual([]);
  const cpu = new MipsCpu();
  cpu.loadProgram(program.bytes, dataset.initialMemory, 256);
  let snapshot = cpu.getSnapshot();
  const limit = dataset.maxInstructions ?? 1000;
  while (snapshot.status !== 'HALTED_SELFLOOP' && snapshot.status !== 'ERROR' && snapshot.instructionsExecuted < limit) {
    snapshot = cpu.stepInstruction();
  }
  return snapshot;
}

describe('Selection Sort - programa', () => {
  it('ensambla sin errores usando R, I y J', () => {
    const program = assemble(source);
    expect(program.ok).toBe(true);
    expect(program.instructions).toHaveLength(28);
    expect(new Set(program.instructions.map((i) => i.format))).toEqual(new Set(['R', 'I', 'J']));
  });

  it('usa ciclo, decision y accesos lw/sw, y termina con "fin: j fin"', () => {
    const program = assemble(source);
    const mnemonics = new Set(program.instructions.map((i) => i.mnemonic));
    for (const m of ['lw', 'sw', 'slt', 'beq', 'bne', 'j']) {
      expect(mnemonics.has(m)).toBe(true);
    }
    const last = program.instructions[program.instructions.length - 1];
    expect(last.mnemonic).toBe('j');
    expect(program.labels.fin).toBe(last.address);
  });

  it('la imagen .hex guardada en el repositorio coincide con la que genera el ensamblador', () => {
    for (const file of ['selection_sort', 'examples/tipo_r', 'examples/tipo_i', 'examples/tipo_j']) {
      const result = assemble(fs.readFileSync(path.join(programsDir, `${file}.asm`), 'utf-8'));
      const saved = fs.readFileSync(path.join(programsDir, `${file}.hex`), 'utf-8').replace(/\r\n/g, '\n');
      expect(saved).toBe(result.hexImage);
      expect(result.bytes.map(formatHexByte).join('\n') + '\n').toBe(saved);
    }
  });
});

describe('Selection Sort - tres entradas (esperado vs observado)', () => {
  it('define las 3 entradas, una de ellas de borde', () => {
    expect(datasets).toHaveLength(3);
    expect(datasets.filter((d) => d.isEdgeCase)).toHaveLength(1);
  });

  it.each(datasets.map((d) => [d.name, d] as const))('%s', (_name, dataset) => {
    const snapshot = runDataset(dataset);
    expect(snapshot.error).toBeNull();
    expect(snapshot.status).toBe('HALTED_SELFLOOP');
    const observed = dataset.expectedMemory.map((w) => ({ ...w, value: readWord(snapshot.dataMemory, w.address) }));
    expect(observed).toEqual(dataset.expectedMemory);
  });

  it('cantidad de instrucciones ejecutadas hasta "fin" coincide con la propuesta', () => {
    expect(runDataset(datasets[0]).instructionsExecuted).toBe(138);
    expect(runDataset(datasets[1]).instructionsExecuted).toBe(138);
    expect(runDataset(datasets[2]).instructionsExecuted).toBe(8);
  });
});

describe('Ejemplo tipo J', () => {
  it('j hacia adelante omite una instruccion y j hacia atras cierra el ciclo', () => {
    const program = assemble(fs.readFileSync(path.join(programsDir, 'examples/tipo_j.asm'), 'utf-8'));
    expect(program.ok).toBe(true);
    const cpu = new MipsCpu();
    cpu.loadProgram(program.bytes);
    let snapshot = cpu.getSnapshot();
    while (snapshot.status === 'READY' || snapshot.status === 'RUNNING') {
      if (snapshot.instructionsExecuted > 50) break;
      snapshot = cpu.stepInstruction();
    }
    expect(snapshot.status).toBe('HALTED_SELFLOOP');
    expect(snapshot.registers[8]).toBe(1); // $t0: el addi 99 fue omitido
    expect(snapshot.registers[9]).toBe(2); // $t1
    expect(snapshot.registers[10]).toBe(0); // $t2: ciclo terminado
    expect(snapshot.pc).toBe(program.labels.fin);
  });
});
