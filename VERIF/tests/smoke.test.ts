import { describe, expect, it } from 'vitest';
import {
  ALU_CTL,
  FUNCTS,
  ISA_TABLE,
  OPCODES,
  bytesToWordBigEndian,
  parseRegister,
  signExtend16,
  wordToBytesBigEndian,
  zeroExtend16,
} from '../../SRC/core/isa';
import { RegisterFile, executeAlu } from '../../SRC/core/cpu';

describe('Smoke test de contratos ISA y modulos base (Dia 1)', () => {
  it('define exactamente las 12 instrucciones (+ alias addiu) con opcodes/functs del PDF', () => {
    expect(ISA_TABLE.add.opcode).toBe(0x00);
    expect(ISA_TABLE.add.funct).toBe(0x21);
    expect(ISA_TABLE.sub.funct).toBe(0x23);
    expect(ISA_TABLE.and.funct).toBe(0x24);
    expect(ISA_TABLE.or.funct).toBe(0x25);
    expect(ISA_TABLE.slt.funct).toBe(0x2a);
    expect(ISA_TABLE.addi.opcode).toBe(0x09);
    expect(ISA_TABLE.addiu.opcode).toBe(0x09);
    expect(ISA_TABLE.ori.opcode).toBe(0x0d);
    expect(ISA_TABLE.lw.opcode).toBe(0x23);
    expect(ISA_TABLE.sw.opcode).toBe(0x2b);
    expect(ISA_TABLE.beq.opcode).toBe(0x04);
    expect(ISA_TABLE.bne.opcode).toBe(0x05);
    expect(ISA_TABLE.j.opcode).toBe(0x02);
    expect(OPCODES.ADDI).toBe(0x09);
    expect(FUNCTS.ADD).toBe(0x21);
  });

  it('convierte palabras de 32 bits a bytes big-endian (ejemplo PDF: 0x24080005)', () => {
    const bytes = wordToBytesBigEndian(0x24080005);
    expect(bytes).toEqual([0x24, 0x08, 0x00, 0x05]);
    expect(bytesToWordBigEndian(...bytes)).toBe(0x24080005);
  });

  it('resuelve registros numericos y alias correctamente', () => {
    expect(parseRegister('$zero')).toBe(0);
    expect(parseRegister('$0')).toBe(0);
    expect(parseRegister('$t0')).toBe(8);
    expect(parseRegister('$s0')).toBe(16);
    expect(parseRegister('$ra')).toBe(31);
    expect(parseRegister('$32')).toBeNull();
  });

  it('extiende inmediatos con signo y con ceros correctamente', () => {
    expect(signExtend16(0xffff)).toBe(0xffffffff);
    expect(signExtend16(0x0005)).toBe(0x00000005);
    expect(zeroExtend16(0x8000)).toBe(0x00008000);
  });

  it('protege $zero contra escritura en RegisterFile', () => {
    const br = new RegisterFile();
    const res = br.write(0, 0x12345678, true);
    expect(res.changed).toBe(false);
    expect(br.read(0)).toBe(0);
  });

  it('ejecuta SLT con signo en MIPSALU (-5 < 2 debe dar 1)', () => {
    const neg5 = (-5) >>> 0;
    const res = executeAlu(ALU_CTL.SLT, neg5, 2);
    expect(res.ALUOut).toBe(1);
    expect(res.Zero).toBe(false);
  });
});
