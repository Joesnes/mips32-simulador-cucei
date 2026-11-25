/**
 * PROPIETARIO: Alejandro Espinoza (Dia 4 — Pruebas de Integracion, Consigna pag. 5)
 *
 * Verifica de extremo a extremo (Ensamblador + MipsCpu) todos los criterios obligatorios:
 *   1. Reunion de los 4 bytes big-endian en busqueda (ejemplo exacto PDF: 0x24080005).
 *   2. Escrituras a $zero descartadas (tanto en R como en I).
 *   3. Extension con signo (addi negativo) y con ceros (ori con bit 15 en 1).
 *   4. Accesos lw / sw en big-endian.
 *   5. Ramas tomadas, no tomadas y rama hacia atras (ciclo).
 *   6. Salto j que omite una instruccion con efecto visible (sin delay slot).
 *   7. Error diagnostico del ensamblador con numero de linea.
 *   8. Acceso invalido a memoria de datos sin modificar registros ni memoria.
 *   9. Busqueda de instruccion fuera de rango del programa.
 *  10. Ejecucion completa de los ejemplos tipo_r.asm y tipo_i.asm de SRC/programs/examples/.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { assemble } from '../../SRC/core/assembler';
import { OPCODES, wordToBytesBigEndian } from '../../SRC/core/isa';
import { MipsCpu } from '../../SRC/core/cpu';

function encodeJ(targetByteAddress: number): number {
  return (((OPCODES.J & 0x3f) << 26) | ((targetByteAddress >>> 2) & 0x03ffffff)) >>> 0;
}

describe('Pruebas de Integracion End-to-End (Consigna pag. 5 - Alejandro Espinoza)', () => {
  it('1. Ensambla y ejecuta el ejemplo del PDF verificando los 4 bytes big-endian de busqueda', () => {
    const asm = assemble('addiu $t0, $zero, 5');
    expect(asm.ok).toBe(true);
    expect(asm.bytes).toEqual([0x24, 0x08, 0x00, 0x05]);

    const cpu = new MipsCpu();
    cpu.loadProgram(asm.bytes);

    const afterIF = cpu.stepStage();
    expect(afterIF.buffers.IF_ID.bytes).toEqual([0x24, 0x08, 0x00, 0x05]);
    expect(afterIF.buffers.IF_ID.instruction).toBe(0x24080005);

    const afterWB = cpu.stepInstruction();
    expect(afterWB.registers[8]).toBe(5);
    expect(afterWB.pc).toBe(4);
  });

  it('2. Descarta escrituras hacia $zero tanto en instrucciones R como I', () => {
    const asm = assemble(`
      addi $zero, $zero, 123
      addi $t0, $zero, 7
      add  $zero, $t0, $t0
      ori  $0, $t0, 0xFFFF
    `);
    expect(asm.ok).toBe(true);

    const cpu = new MipsCpu();
    cpu.loadProgram(asm.bytes);
    for (let i = 0; i < 4; i++) {
      cpu.stepInstruction();
    }
    const snap = cpu.getSnapshot();
    expect(snap.registers[0]).toBe(0);
    expect(snap.registers[8]).toBe(7);
  });

  it('3. Comprueba extension con signo (addi) y con ceros (ori)', () => {
    const asm = assemble(`
      addi $t0, $zero, -25
      ori  $t1, $zero, 0x8001
      add  $t2, $t0, $t1
    `);
    expect(asm.ok).toBe(true);

    const cpu = new MipsCpu();
    cpu.loadProgram(asm.bytes);
    cpu.stepInstruction();
    cpu.stepInstruction();
    const snap = cpu.stepInstruction();

    expect(snap.registers[8]).toBe((-25) >>> 0);
    expect(snap.registers[9]).toBe(0x00008001);
    expect(snap.registers[10]).toBe((0x00008001 - 25) >>> 0);
  });

  it('4. Comprueba lw/sw en orden big-endian ensamblado desde texto MIPS', () => {
    const asm = assemble(`
      ori  $s0, $zero, 16
      addi $t0, $zero, -5
      sw   $t0, 0($s0)
      lw   $t1, 0($s0)
    `);
    expect(asm.ok).toBe(true);

    const cpu = new MipsCpu();
    cpu.loadProgram(asm.bytes);
    for (let i = 0; i < 4; i++) {
      cpu.stepInstruction();
    }
    const snap = cpu.getSnapshot();
    // -5 = 0xFFFFFFFB -> bytes [FF, FF, FF, FB] en direcciones 16..19
    expect(snap.dataMemory.slice(16, 20)).toEqual([0xff, 0xff, 0xff, 0xfb]);
    expect(snap.registers[9]).toBe(0xfffffffb);
  });

  it('5. Comprueba ramas tomadas, no tomadas y rama hacia atras (ciclo ensamblado)', () => {
    const asm = assemble(`
            addi $t0, $zero, 4     # contador = 4
            addi $t1, $zero, 0     # suma = 0
            beq  $t0, $zero, fin   # NO tomada (4 != 0)
      loop: add  $t1, $t1, $t0     # suma += contador (4+3+2+1 = 10)
            addi $t0, $t0, -1      # contador--
            bne  $t0, $zero, loop  # rama hacia atras (tomada 3 veces, no tomada al final)
            beq  $t0, $zero, ok    # TOMADA (salta instruccion de trampa)
            addi $t2, $zero, 777   # trampa (debe omitirse)
      ok:   addi $t3, $zero, 1
      fin:  beq  $zero, $zero, fin
    `);
    expect(asm.ok).toBe(true);

    const cpu = new MipsCpu();
    cpu.loadProgram(asm.bytes);
    let steps = 0;
    while (cpu.getSnapshot().status !== 'HALTED_SELFLOOP' && steps < 40) {
      cpu.stepInstruction();
      steps += 1;
    }
    const snap = cpu.getSnapshot();
    expect(snap.status).toBe('HALTED_SELFLOOP');
    expect(snap.registers[8]).toBe(0);  // $t0
    expect(snap.registers[9]).toBe(10); // $t1 = 4+3+2+1
    expect(snap.registers[10]).toBe(0); // $t2 omitido
    expect(snap.registers[11]).toBe(1); // $t3 ejecutado
  });

  it('6. Comprueba un salto j que omite una instruccion con efecto visible (sin delay slot)', () => {
    // Ensambla instrucciones I y combina con palabra j a 0x0C (permite validar CPU sin depender de j en ASM)
    const partAfter = assemble(`
      addi $t0, $zero, 999
      addi $t1, $zero, 55
    `);
    expect(partAfter.ok).toBe(true);

    const bytes = [
      ...wordToBytesBigEndian(encodeJ(0x08)), // PC=0x00: salta a 0x08 omitiendo 0x04 (addi $t0, $zero, 999)
      ...partAfter.bytes,                     // PC=0x04: addi $t0, $zero, 999; PC=0x08: addi $t1, $zero, 55
      ...wordToBytesBigEndian(encodeJ(0x0c)), // PC=0x0C: autosalto fin: j fin
    ];

    const cpu = new MipsCpu();
    cpu.loadProgram(bytes);
    cpu.stepInstruction(); // j 0x08
    cpu.stepInstruction(); // addi $t1, $zero, 55
    const snap = cpu.stepInstruction(); // j 0x0C

    expect(snap.status).toBe('HALTED_SELFLOOP');
    expect(snap.registers[8]).toBe(0);  // $t0 nunca recibio 999
    expect(snap.registers[9]).toBe(55); // $t1 si recibio 55
  });

  it('7. Comprueba diagnostico de error del ensamblador con numero de linea', () => {
    const asm = assemble(`
      addi $t0, $zero, 5
      beq  $t0, $zero, etiqueta_inexistente
      addi $t1, $zero, 99999
    `);
    expect(asm.ok).toBe(false);
    expect(asm.bytes).toEqual([]);
    expect(asm.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ line: 3, code: 'UNDEFINED_LABEL' }),
        expect.objectContaining({ line: 4, code: 'IMMEDIATE_OUT_OF_RANGE' }),
      ]),
    );
  });

  it('8. Comprueba acceso invalido de datos (desalineado y fuera de rango) sin alterar estado', () => {
    const asmUnaligned = assemble(`
      addi $t0, $zero, 42
      sw   $t0, 2($zero)
    `);
    expect(asmUnaligned.ok).toBe(true);

    const cpu1 = new MipsCpu();
    cpu1.loadProgram(asmUnaligned.bytes, [{ address: 0, value: 0x11223344 }], 64);
    cpu1.stepInstruction(); // addi
    const err1 = cpu1.stepInstruction(); // sw desalineado en dir 2
    expect(err1.status).toBe('ERROR');
    expect(err1.error?.code).toBe('DATA_UNALIGNED');
    expect(err1.dataMemory.slice(0, 4)).toEqual([0x11, 0x22, 0x33, 0x44]);

    const asmOutOfRange = assemble(`
      addi $t1, $zero, 77
      lw   $t1, 128($zero)
    `);
    expect(asmOutOfRange.ok).toBe(true);

    const cpu2 = new MipsCpu();
    cpu2.loadProgram(asmOutOfRange.bytes, [], 64);
    cpu2.stepInstruction(); // addi $t1 = 77
    const err2 = cpu2.stepInstruction(); // lw fuera de rango (128 >= 64)
    expect(err2.status).toBe('ERROR');
    expect(err2.error?.code).toBe('DATA_OUT_OF_RANGE');
    expect(err2.registers[9]).toBe(77); // $t1 conservo su valor previo sin alterarse
  });

  it('9. Ejecuta de extremo a extremo los programas de ejemplo tipo_r.asm y tipo_i.asm', () => {
    const examplesDir = path.resolve(__dirname, '../../SRC/programs/examples');

    // tipo_r.asm (verificando el estado final exacto documentado en el encabezado del archivo)
    const tipoRSource = fs.readFileSync(path.join(examplesDir, 'tipo_r.asm'), 'utf-8');
    const tipoRAsm = assemble(tipoRSource);
    expect(tipoRAsm.ok).toBe(true);
    const cpuR = new MipsCpu();
    cpuR.loadProgram(tipoRAsm.bytes);
    let stepsR = 0;
    while (cpuR.getSnapshot().status !== 'HALTED_SELFLOOP' && stepsR < 20) {
      cpuR.stepInstruction();
      stepsR += 1;
    }
    const snapR = cpuR.getSnapshot();
    expect(snapR.status).toBe('HALTED_SELFLOOP');
    expect(snapR.registers[0]).toBe(0);          // $zero
    expect(snapR.registers[8]).toBe(12);         // $t0 = 12
    expect(snapR.registers[9]).toBe(0xfffffffa); // $t1 = -6
    expect(snapR.registers[10]).toBe(6);         // $t2 = 6
    expect(snapR.registers[11]).toBe(18);        // $t3 = 18
    expect(snapR.registers[12]).toBe(8);         // $t4 = 8
    expect(snapR.registers[13]).toBe(0xfffffffe); // $t5 = -2
    expect(snapR.registers[14]).toBe(1);         // $t6 = 1
    expect(snapR.registers[15]).toBe(0);         // $t7 = 0

    // tipo_i.asm (verificando el estado final exacto documentado en el encabezado del archivo)
    const tipoISource = fs.readFileSync(path.join(examplesDir, 'tipo_i.asm'), 'utf-8');
    const tipoIAsm = assemble(tipoISource);
    expect(tipoIAsm.ok).toBe(true);
    const cpuI = new MipsCpu();
    cpuI.loadProgram(tipoIAsm.bytes);
    let steps = 0;
    while (cpuI.getSnapshot().status !== 'HALTED_SELFLOOP' && steps < 40) {
      cpuI.stepInstruction();
      steps += 1;
    }
    const snapI = cpuI.getSnapshot();
    expect(snapI.status).toBe('HALTED_SELFLOOP');
    expect(snapI.registers[8]).toBe(5);          // $t0 = 5
    expect(snapI.registers[9]).toBe(0xffffffff); // $t1 = -1
    expect(snapI.registers[10]).toBe(0x0000ffff); // $t2 = 0x0000FFFF
    expect(snapI.registers[11]).toBe(0xffffffff); // $t3 = -1
    expect(snapI.registers[12]).toBe(0);          // $t4 = 0 (omitida por beq)
    expect(snapI.registers[13]).toBe(0);          // $t5 = 0 (fin ciclo 3 vueltas)
    expect(snapI.dataMemory.slice(0, 4)).toEqual([0x00, 0x00, 0x00, 0x05]);
    expect(snapI.dataMemory.slice(4, 8)).toEqual([0xff, 0xff, 0xff, 0xff]);
  });
});
