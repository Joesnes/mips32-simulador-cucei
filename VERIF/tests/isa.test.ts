import { describe, expect, it } from 'vitest';
import { ALU_CTL, FUNCTS, OPCODES, wordToBytesBigEndian } from '../../SRC/core/isa';
import { DataMemory, InstructionMemory, MipsCpu } from '../../SRC/core/cpu';

/** Helper local para codificar palabras tipo R: opcode(6)|rs(5)|rt(5)|rd(5)|shamt(5)|funct(6). */
function encodeR(rs: number, rt: number, rd: number, funct: number, shamt = 0): number {
  return (
    ((OPCODES.R_TYPE & 0x3f) << 26) |
    ((rs & 0x1f) << 21) |
    ((rt & 0x1f) << 16) |
    ((rd & 0x1f) << 11) |
    ((shamt & 0x1f) << 6) |
    (funct & 0x3f)
  ) >>> 0;
}

/** Helper local para codificar palabras tipo I: opcode(6)|rs(5)|rt(5)|imm(16). */
function encodeI(opcode: number, rs: number, rt: number, imm: number): number {
  return (
    ((opcode & 0x3f) << 26) |
    ((rs & 0x1f) << 21) |
    ((rt & 0x1f) << 16) |
    (imm & 0xffff)
  ) >>> 0;
}

function wordsToBytes(words: number[]): number[] {
  return words.flatMap((w) => wordToBytesBigEndian(w));
}

describe('ISA Tipo R y motor multiciclo de 5 etapas (Dia 2 - Alejandro Espinoza)', () => {
  it('recorre IF -> ID -> EX -> MEM -> WB y actualiza todos los buffers para add $t2, $t0, $t1', () => {
    const cpu = new MipsCpu();
    // add $t2 ($10), $t0 ($8), $t1 ($9) -> funct 0x21
    const word = encodeR(8, 9, 10, FUNCTS.ADD);
    const bytes = wordToBytesBigEndian(word);
    cpu.loadProgram(bytes, [], 256, { 8: 120, 9: 55 });

    // Etapa 1: IF
    const s1 = cpu.stepStage();
    expect(s1.lastStage).toBe('IF');
    expect(s1.nextStage).toBe('ID');
    expect(s1.cycle).toBe(1);
    expect(s1.buffers.IF_ID.valid).toBe(true);
    expect(s1.buffers.IF_ID.bytes).toEqual(bytes);
    expect(s1.buffers.IF_ID.instruction).toBe(word);
    expect(s1.buffers.IF_ID.pcPlus4).toBe(4);

    // Etapa 2: ID
    const s2 = cpu.stepStage();
    expect(s2.lastStage).toBe('ID');
    expect(s2.nextStage).toBe('EX');
    expect(s2.buffers.ID_EX.valid).toBe(true);
    expect(s2.buffers.ID_EX.fields.mnemonic).toBe('add');
    expect(s2.buffers.ID_EX.A).toBe(120);
    expect(s2.buffers.ID_EX.B).toBe(55);
    expect(s2.buffers.ID_EX.ctrl.RegDst).toBe(1);
    expect(s2.buffers.ID_EX.ctrl.RegWrite).toBe(1);
    expect(s2.buffers.ID_EX.ctrl.ALUctl).toBe(ALU_CTL.ADD);

    // Etapa 3: EX
    const s3 = cpu.stepStage();
    expect(s3.lastStage).toBe('EX');
    expect(s3.nextStage).toBe('MEM');
    expect(s3.buffers.EX_MEM.aluResult).toBe(175);
    expect(s3.buffers.EX_MEM.zero).toBe(false);
    expect(s3.buffers.EX_MEM.writeReg).toBe(10);
    expect(s3.buffers.EX_MEM.nextPC).toBe(4);

    // Etapa 4: MEM (paso directo en tipo R)
    const s4 = cpu.stepStage();
    expect(s4.lastStage).toBe('MEM');
    expect(s4.nextStage).toBe('WB');
    expect(s4.buffers.MEM_WB.writeBackData).toBe(175);

    // Etapa 5: WB
    const s5 = cpu.stepStage();
    expect(s5.lastStage).toBe('WB');
    expect(s5.nextStage).toBe('IF');
    expect(s5.pc).toBe(4);
    expect(s5.instructionsExecuted).toBe(1);
    expect(s5.registers[10]).toBe(175);
    expect(s5.lastChange?.registerChanged).toEqual({ index: 10, before: 0, after: 175 });
  });

  it('ejecuta add y sub con aritmetica modulo 2^32', () => {
    const cpu = new MipsCpu();
    const prog = wordsToBytes([
      encodeR(8, 9, 10, FUNCTS.ADD), // $t2 = 0xFFFFFFFF + 2 = 1
      encodeR(11, 12, 13, FUNCTS.SUB), // $t5 = 3 - 5 = 0xFFFFFFFE
    ]);
    cpu.loadProgram(prog, [], 256, {
      8: 0xffffffff,
      9: 2,
      11: 3,
      12: 5,
    });

    cpu.stepInstruction();
    const afterSub = cpu.stepInstruction();

    expect(afterSub.registers[10]).toBe(1);
    expect(afterSub.registers[13]).toBe(0xfffffffe);
    expect(afterSub.pc).toBe(8);
  });

  it('ejecuta and, or y slt (con signo) correctamente', () => {
    const cpu = new MipsCpu();
    const prog = wordsToBytes([
      encodeR(8, 9, 10, FUNCTS.AND),  // $t2 = 0xF0F00FF0 & 0x0FF0F0F0 = 0x00F000F0
      encodeR(8, 9, 11, FUNCTS.OR),   // $t3 = 0xF0F00FF0 | 0x0FF0F0F0 = 0xFFF0FFF0
      encodeR(12, 13, 14, FUNCTS.SLT), // $t6 = (-10 < 5) ? 1 : 0 -> 1
      encodeR(13, 12, 15, FUNCTS.SLT), // $t7 = (5 < -10) ? 1 : 0 -> 0
    ]);
    cpu.loadProgram(prog, [], 256, {
      8: 0xf0f00ff0,
      9: 0x0ff0f0f0,
      12: (-10) >>> 0,
      13: 5,
    });

    for (let i = 0; i < 4; i++) {
      cpu.stepInstruction();
    }
    const snap = cpu.getSnapshot();
    expect(snap.registers[10]).toBe(0x00f000f0);
    expect(snap.registers[11]).toBe(0xfff0fff0);
    expect(snap.registers[14]).toBe(1);
    expect(snap.registers[15]).toBe(0);
  });

  it('descarta escrituras hacia $zero ($0) en instrucciones tipo R', () => {
    const cpu = new MipsCpu();
    const prog = wordsToBytes([encodeR(8, 9, 0, FUNCTS.ADD)]); // add $zero, $t0, $t1
    cpu.loadProgram(prog, [], 256, { 8: 42, 9: 99 });

    const snap = cpu.stepInstruction();
    expect(snap.registers[0]).toBe(0);
    expect(snap.lastChange?.registerChanged).toBeUndefined();
    expect(snap.pc).toBe(4);
  });

  it('detiene de forma visible si PC sale del rango del programa o instruccion es invalida', () => {
    const cpu = new MipsCpu();
    const prog = wordsToBytes([encodeR(8, 9, 10, FUNCTS.ADD)]);
    cpu.loadProgram(prog, [], 256, { 8: 1, 9: 2 });

    cpu.stepInstruction(); // Ejecuta PC=0, ahora PC=4 (fuera de rango)
    const errSnap = cpu.stepStage();
    expect(errSnap.status).toBe('ERROR');
    expect(errSnap.error?.code).toBe('PC_OUT_OF_RANGE');
    expect(errSnap.registers[10]).toBe(3); // Estado previo preservado

    // Reset restaura todo limpiamente
    cpu.reset();
    const resetSnap = cpu.getSnapshot();
    expect(resetSnap.status).toBe('READY');
    expect(resetSnap.pc).toBe(0);
    expect(resetSnap.cycle).toBe(0);
    expect(resetSnap.registers[10]).toBe(0);
  });

  it('valida alineacion y rango big-endian en InstructionMemory y DataMemory', () => {
    const imem = new InstructionMemory();
    imem.load([0x24, 0x08, 0x00, 0x05]);
    expect(imem.fetchWord(0)).toEqual({
      ok: true,
      bytes: [0x24, 0x08, 0x00, 0x05],
      word: 0x24080005,
    });
    expect(imem.fetchWord(2)).toMatchObject({ ok: false, code: 'PC_UNALIGNED' });
    expect(imem.fetchWord(4)).toMatchObject({ ok: false, code: 'PC_OUT_OF_RANGE' });

    const dmem = new DataMemory(16);
    expect(dmem.writeWord(4, 0x11223344)).toEqual({ ok: true, before: 0, after: 0x11223344 });
    expect(dmem.snapshot().slice(4, 8)).toEqual([0x11, 0x22, 0x33, 0x44]);
    expect(dmem.readWord(4)).toEqual({
      ok: true,
      word: 0x11223344,
      bytes: [0x11, 0x22, 0x33, 0x44],
    });
    expect(dmem.writeWord(6, 0xdeadbeef)).toMatchObject({ ok: false, code: 'DATA_UNALIGNED' });
    expect(dmem.readWord(16)).toMatchObject({ ok: false, code: 'DATA_OUT_OF_RANGE' });
    // Confirma que el acceso invalido no modifico memoria
    expect(dmem.readWord(4)).toMatchObject({ ok: true, word: 0x11223344 });
  });
});

describe('ISA Tipo I y accesos a memoria (Dia 3 - Alejandro Espinoza)', () => {
  it('reproduce el ejemplo exacto del PDF: addiu $t0, $zero, 5 -> 0x24080005 (bytes 24 08 00 05)', () => {
    const cpu = new MipsCpu();
    const word = encodeI(OPCODES.ADDI, 0, 8, 5);
    expect(word).toBe(0x24080005);
    cpu.loadProgram([0x24, 0x08, 0x00, 0x05]);

    const afterIF = cpu.stepStage();
    expect(afterIF.buffers.IF_ID.bytes).toEqual([0x24, 0x08, 0x00, 0x05]);
    expect(afterIF.buffers.IF_ID.instruction).toBe(0x24080005);

    const afterID = cpu.stepStage();
    expect(afterID.buffers.ID_EX.fields.mnemonic).toBe('addi');
    expect(afterID.buffers.ID_EX.immExt).toBe(5);
    expect(afterID.buffers.ID_EX.ctrl.ALUSrc).toBe(1);
    expect(afterID.buffers.ID_EX.ctrl.RegDst).toBe(0);
    expect(afterID.buffers.ID_EX.ctrl.ExtOp).toBe('SIGN');

    const afterWB = cpu.stepInstruction();
    expect(afterWB.registers[8]).toBe(5);
    expect(afterWB.pc).toBe(4);
  });

  it('extiende con signo en addi (negativos) y con ceros en ori (bit 15 en 1)', () => {
    const cpu = new MipsCpu();
    const prog = wordsToBytes([
      encodeI(OPCODES.ADDI, 0, 8, -10),       // $t0 = 0 + (-10) = 0xFFFFFFF6
      encodeI(OPCODES.ADDI, 8, 9, 15),        // $t1 = -10 + 15 = 5
      encodeI(OPCODES.ORI, 0, 10, 0x8005),    // $t2 = 0 | 0x00008005 (extension con CEROS)
      encodeI(OPCODES.ORI, 10, 11, 0x00f0),   // $t3 = 0x00008005 | 0x000000F0 = 0x000080F5
    ]);
    cpu.loadProgram(prog);

    cpu.stepInstruction();
    expect(cpu.getSnapshot().buffers.ID_EX.immExt).toBe(0xfffffff6);
    expect(cpu.getSnapshot().registers[8]).toBe(0xfffffff6);

    cpu.stepInstruction();
    expect(cpu.getSnapshot().registers[9]).toBe(5);

    cpu.stepInstruction();
    expect(cpu.getSnapshot().buffers.ID_EX.ctrl.ExtOp).toBe('ZERO');
    expect(cpu.getSnapshot().buffers.ID_EX.immExt).toBe(0x00008005);
    expect(cpu.getSnapshot().registers[10]).toBe(0x00008005);

    cpu.stepInstruction();
    expect(cpu.getSnapshot().registers[11]).toBe(0x000080f5);
  });

  it('ejecuta sw y lw en big-endian con desplazamientos positivos y negativos', () => {
    const cpu = new MipsCpu();
    const prog = wordsToBytes([
      encodeI(OPCODES.ORI, 0, 16, 0x0008),    // $s0 = 8 (base)
      encodeI(OPCODES.ADDI, 0, 8, -3),        // $t0 = -3 = 0xFFFFFFFD
      encodeI(OPCODES.SW, 16, 8, 4),          // Mem[8 + 4 = 12] = 0xFFFFFFFD
      encodeI(OPCODES.LW, 16, 9, 4),          // $t1 = Mem[12] = 0xFFFFFFFD
      encodeI(OPCODES.LW, 16, 10, -4),        // $t2 = Mem[8 - 4 = 4] (precargado 0x12345678)
    ]);
    cpu.loadProgram(prog, [{ address: 4, value: 0x12345678 }]);

    cpu.stepInstruction(); // ori
    cpu.stepInstruction(); // addi
    const afterSw = cpu.stepInstruction(); // sw
    expect(afterSw.dataMemory.slice(12, 16)).toEqual([0xff, 0xff, 0xff, 0xfd]);

    const afterLw1 = cpu.stepInstruction(); // lw $t1, 4($s0)
    expect(afterLw1.buffers.MEM_WB.memReadData).toBe(0xfffffffd);
    expect(afterLw1.registers[9]).toBe(0xfffffffd);

    const afterLw2 = cpu.stepInstruction(); // lw $t2, -4($s0)
    expect(afterLw2.registers[10]).toBe(0x12345678);
  });

  it('detiene lw/sw desalineado o fuera de rango sin modificar registros ni memoria', () => {
    const cpu = new MipsCpu();
    // Caso 1: lw desalineado en direccion 2 -> $t1 debe permanecer intacto (0xCAFEBABE)
    const progUnaligned = wordsToBytes([
      encodeI(OPCODES.LW, 0, 9, 2),
    ]);
    cpu.loadProgram(progUnaligned, [{ address: 0, value: 0x11223344 }], 64, { 9: 0xcafebabe });

    const errRead = cpu.stepInstruction();
    expect(errRead.status).toBe('ERROR');
    expect(errRead.error?.code).toBe('DATA_UNALIGNED');
    expect(errRead.error?.stage).toBe('MEM');
    expect(errRead.registers[9]).toBe(0xcafebabe);
    expect(errRead.pc).toBe(0);

    // Caso 2: sw fuera de rango (direccion 64 en memoria de 64 bytes)
    const progOutOfRange = wordsToBytes([
      encodeI(OPCODES.SW, 0, 8, 64),
    ]);
    cpu.loadProgram(progOutOfRange, [{ address: 0, value: 0x11223344 }], 64, { 8: 0xdeadbeef });

    const errWrite = cpu.stepInstruction();
    expect(errWrite.status).toBe('ERROR');
    expect(errWrite.error?.code).toBe('DATA_OUT_OF_RANGE');
    expect(errWrite.dataMemory.slice(0, 4)).toEqual([0x11, 0x22, 0x33, 0x44]);
  });

  it('ejecuta beq y bne (ramas tomadas, no tomadas y ciclo con rama hacia atras sin delay slot)', () => {
    const cpu = new MipsCpu();
    // Programa de prueba:
    // 0x00: addi $t0, $zero, 3      # contador = 3
    // 0x04: addi $t1, $zero, 0      # acumulador = 0
    // 0x08: beq  $t0, $zero, +3     # NO tomada inicialmente (salta a 0x18 si t0 == 0)
    // 0x0C: addi $t1, $t1, 10       # acumulador += 10
    // 0x10: addi $t0, $t0, -1       # contador--
    // 0x14: bne  $t0, $zero, -3     # rama hacia atras a 0x0C mientras t0 != 0 (0x18 + (-3*4) = 0x0C)
    // 0x18: beq  $t0, $zero, +1     # TOMADA (salta a 0x20 omitiendo 0x1C)
    // 0x1C: addi $t2, $zero, 99     # DEBE OMITIRSE
    // 0x20: addi $t3, $zero, 7      # destino final observable
    const prog = wordsToBytes([
      encodeI(OPCODES.ADDI, 0, 8, 3),
      encodeI(OPCODES.ADDI, 0, 9, 0),
      encodeI(OPCODES.BEQ, 8, 0, 3),
      encodeI(OPCODES.ADDI, 9, 9, 10),
      encodeI(OPCODES.ADDI, 8, 8, -1),
      encodeI(OPCODES.BNE, 8, 0, -3),
      encodeI(OPCODES.BEQ, 8, 0, 1),
      encodeI(OPCODES.ADDI, 0, 10, 99),
      encodeI(OPCODES.ADDI, 0, 11, 7),
    ]);
    cpu.loadProgram(prog);

    // Ejecuta hasta alcanzar PC = 0x24 (justo despues de 0x20)
    let safety = 0;
    while (cpu.getSnapshot().pc !== 0x24 && safety < 30) {
      cpu.stepInstruction();
      safety += 1;
    }

    const snap = cpu.getSnapshot();
    expect(snap.status).toBe('RUNNING');
    expect(snap.registers[8]).toBe(0);  // $t0 llego a 0
    expect(snap.registers[9]).toBe(30); // 3 iteraciones * 10 = 30
    expect(snap.registers[10]).toBe(0); // 0x1C fue omitida por beq tomada (sin delay slot)
    expect(snap.registers[11]).toBe(7); // 0x20 si se ejecuto
    expect(snap.instructionsExecuted).toBe(14); // 2 init + 1 beq(NT) + 3*3 loop + 1 beq(T) + 1 final
  });
});
