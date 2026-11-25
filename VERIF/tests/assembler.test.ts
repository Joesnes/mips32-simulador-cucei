import { describe, expect, it } from 'vitest';
import { assemble } from '../../SRC/core/assembler';
import { tokenizeLine } from '../../SRC/core/assembler/lexer';

/** Ensambla y falla la prueba mostrando los diagnosticos si hubo errores. */
function assembleOk(source: string) {
  const result = assemble(source);
  expect(result.diagnostics).toEqual([]);
  expect(result.ok).toBe(true);
  return result;
}

describe('Ensamblador - codificacion tipo R', () => {
  it.each([
    ['add $t0, $t1, $t2', 0x012a4021],
    ['sub $s0, $s1, $s2', 0x02328023],
    ['and $t3, $t4, $t5', 0x018d5824],
    ['or $1, $2, $3', 0x00430825],
    ['slt $t5, $t4, $t3', 0x018b682a],
  ])('%s -> palabra esperada', (source, expected) => {
    const result = assembleOk(source);
    expect(result.instructions).toHaveLength(1);
    expect(result.instructions[0].word).toBe(expected);
    expect(result.instructions[0].format).toBe('R');
  });

  it('separa opcode, rs, rt, rd, shamt=0 y funct en el binario', () => {
    const [ins] = assembleOk('add $t0, $t1, $t2').instructions;
    expect(ins.binary).toBe('000000 01001 01010 01000 00000 100001');
    expect(ins.hex).toBe('0x012A4021');
  });

  it('genera los 4 bytes en big-endian (byte mas significativo primero)', () => {
    const result = assembleOk('add $t0, $t1, $t2\nslt $t5, $t4, $t3');
    expect(result.instructions[0].bytes).toEqual([0x01, 0x2a, 0x40, 0x21]);
    expect(result.bytes).toEqual([0x01, 0x2a, 0x40, 0x21, 0x01, 0x8b, 0x68, 0x2a]);
    expect(result.hexImage).toBe('01\n2A\n40\n21\n01\n8B\n68\n2A\n');
  });

  it('acepta registros numericos y alias por igual', () => {
    const numeric = assembleOk('add $8, $9, $10').instructions[0].word;
    const alias = assembleOk('add $t0, $t1, $t2').instructions[0].word;
    expect(numeric).toBe(alias);
    expect(assembleOk('add $zero, $ra, $t0').instructions[0].word).toBe(0x03e80021);
  });

  it('no distingue mayusculas en mnemonicos ni registros', () => {
    expect(assembleOk('ADD $T0, $T1, $T2').instructions[0].word).toBe(0x012a4021);
  });

  it('asigna direcciones consecutivas de 4 en 4 desde 0', () => {
    const result = assembleOk('add $t0, $t1, $t2\n\nsub $s0, $s1, $s2\nor $1, $2, $3');
    expect(result.instructions.map((i) => i.address)).toEqual([0, 4, 8]);
    expect(result.instructions.map((i) => i.line)).toEqual([1, 3, 4]);
  });
});

describe('Ensamblador - comentarios y etiquetas', () => {
  it('ignora comentarios con # y lineas vacias', () => {
    const result = assembleOk([
      '# programa de prueba',
      '   ',
      'add $t0, $t1, $t2   # suma',
      '#sub $s0, $s1, $s2',
    ].join('\n'));
    expect(result.instructions).toHaveLength(1);
    expect(result.instructions[0].source).toBe('add $t0, $t1, $t2');
  });

  it('distingue el prefijo # de un operando del inicio de un comentario', () => {
    expect(tokenizeLine('addi $t0, $t1, #5  # comentario', 1).operands).toEqual(['$t0', '$t1', '#5']);
    expect(tokenizeLine('j #fin', 1).operands).toEqual(['#fin']);
    expect(tokenizeLine('add $t0, $t1, $t2 #comentario pegado', 1).operands).toEqual(['$t0', '$t1', '$t2']);
  });

  it('resuelve etiquetas hacia atras y hacia adelante con su direccion de byte', () => {
    const result = assembleOk([
      'inicio: add $t0, $t1, $t2',
      'medio:',
      '        sub $s0, $s1, $s2',
      'otra: final: or $1, $2, $3',
    ].join('\n'));
    expect(result.labels).toEqual({ inicio: 0, medio: 4, otra: 8, final: 8 });
  });

  it('incluye direccion, palabra, binario y fuente en el listado', () => {
    const result = assembleOk('inicio: add $t0, $t1, $t2');
    expect(result.listing).toContain('0x00000000  0x012A4021  000000 01001 01010 01000 00000 100001');
    expect(result.listing).toContain('inicio: add $t0, $t1, $t2');
  });

  it('acepta un programa vacio', () => {
    const result = assembleOk('# solo comentarios\n');
    expect(result.instructions).toEqual([]);
    expect(result.bytes).toEqual([]);
    expect(result.hexImage).toBe('');
  });
});

describe('Ensamblador - diagnosticos por linea', () => {
  it('reporta mnemonico invalido con su numero de linea', () => {
    const result = assemble('add $t0, $t1, $t2\nmul $t0, $t1, $t2');
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({ line: 2, code: 'INVALID_MNEMONIC', sourceLine: 'mul $t0, $t1, $t2' });
  });

  it.each([['$t10'], ['$32'], ['$foo']])('reporta registro invalido %s', (reg) => {
    const result = assemble(`add $t0, ${reg}, $t2`);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({ line: 1, code: 'INVALID_REGISTER' });
  });

  it.each([
    ['add $t0, $t1'],
    ['add $t0, $t1, $t2, $t3'],
    ['add $t0, $t1, 5'],
    ['add $t0 $t1 $t2'],
    ['add $t0, , $t2'],
  ])('reporta sintaxis incorrecta en "%s"', (source) => {
    const result = assemble(source);
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({ line: 1, code: 'INVALID_SYNTAX' });
  });

  it('reporta etiqueta duplicada en la linea donde se repite', () => {
    const result = assemble('ciclo: add $t0, $t1, $t2\nciclo: sub $s0, $s1, $s2');
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({ line: 2, code: 'DUPLICATE_LABEL' });
    expect(result.labels.ciclo).toBe(0);
  });

  it('reporta todos los errores en orden de linea y no genera imagen', () => {
    const result = assemble('foo $t0\nadd $t0, $t1, $t2\nadd $t0, $t99, $t2');
    expect(result.diagnostics.map((d) => [d.line, d.code])).toEqual([
      [1, 'INVALID_MNEMONIC'],
      [3, 'INVALID_REGISTER'],
    ]);
    expect(result.bytes).toEqual([]);
    expect(result.hexImage).toBe('');
    expect(result.listing).toBe('');
  });
});

describe('Ensamblador - codificacion tipo I', () => {
  it('ejemplo de la consigna: addiu $t0, $zero, 5 -> 0x24080005 y bytes 24 08 00 05', () => {
    const result = assembleOk('addiu $t0, $zero, 5');
    expect(result.instructions[0].word).toBe(0x24080005);
    expect(result.instructions[0].bytes).toEqual([0x24, 0x08, 0x00, 0x05]);
    expect(result.hexImage).toBe('24\n08\n00\n05\n');
    expect(result.instructions[0].binary).toBe('001001 00000 01000 0000000000000101');
  });

  it.each([
    ['addi $t1, $t0, -1', 0x2509ffff],
    ['addi $s0, $s0, 32767', 0x26107fff],
    ['addi $s0, $s0, -32768', 0x26108000],
    ['addi $t1, $t0, #-1', 0x2509ffff],
    ['ori $t2, $zero, 0xFFFF', 0x340affff],
    ['ori $t2, $zero, 65535', 0x340affff],
    ['lw $s1, 0($zero)', 0x8c110000],
    ['lw $s1, ($zero)', 0x8c110000],
    ['sw $t4, -4($s0)', 0xae0cfffc],
    ['lw $t0, #8($s0)', 0x8e080008],
  ])('%s -> palabra esperada', (source, expected) => {
    const [ins] = assembleOk(source).instructions;
    expect(ins.word).toBe(expected);
    expect(ins.format).toBe('I');
  });

  it('addi y addiu generan la misma palabra (opcode 0x09)', () => {
    expect(assembleOk('addi $t0, $zero, 5').instructions[0].word).toBe(0x24080005);
  });

  it('calcula el desplazamiento de beq/bne en palabras, hacia atras y hacia adelante', () => {
    const result = assembleOk([
      'loop: addi $t0, $t0, -1',
      '      bne  $t0, $zero, loop   # atras: (0 - 8) / 4 = -2',
      '      beq  $zero, $zero, #fin # adelante: (16 - 12) / 4 = 1',
      '      add  $t1, $t1, $t1',
      'fin:  add  $t2, $t2, $t2',
    ].join('\n'));
    expect(result.instructions[1].word).toBe(0x1500fffe);
    expect(result.instructions[2].word).toBe(0x10000001);
  });

  it('un beq a si mismo tiene desplazamiento -1', () => {
    expect(assembleOk('self: beq $t0, $t1, self').instructions[0].word).toBe(0x1109ffff);
  });
});

describe('Ensamblador - rangos y errores tipo I', () => {
  it.each([
    ['addi $t0, $t0, 32768'],
    ['addi $t0, $t0, -32769'],
    ['addiu $t0, $t0, 0x10000'],
    ['ori $t0, $t0, -1'],
    ['ori $t0, $t0, 65536'],
    ['lw $t0, 32768($s0)'],
    ['sw $t0, -32769($s0)'],
  ])('rechaza inmediato fuera de rango en "%s"', (source) => {
    const result = assemble(source);
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({ line: 1, code: 'IMMEDIATE_OUT_OF_RANGE' });
  });

  it.each([
    ['addi $t0, $t0, abc'],
    ['addi $t0, $t0'],
    ['lw $t0, $s0'],
    ['lw $t0, 4'],
    ['sw $t0, 4($s0), 8'],
    ['beq $t0, $t1, 8'],
  ])('rechaza sintaxis incorrecta en "%s"', (source) => {
    const result = assemble(source);
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({ line: 1, code: 'INVALID_SYNTAX' });
  });

  it('rechaza registro base invalido en lw/sw', () => {
    expect(assemble('lw $t0, 4($t99)').diagnostics[0]).toMatchObject({ code: 'INVALID_REGISTER' });
  });

  it('reporta etiqueta indefinida en beq/bne con su linea', () => {
    const result = assemble('add $t0, $t1, $t2\nbne $t0, $zero, nada');
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({ line: 2, code: 'UNDEFINED_LABEL' });
  });

  it('rechaza un salto condicional que no cabe en 16 bits con signo', () => {
    const relleno = Array.from({ length: 32768 }, () => 'add $t0, $t0, $t0');
    const ok = assemble(['beq $zero, $zero, lejos', ...relleno.slice(1), 'lejos: add $t1, $t1, $t1'].join('\n'));
    expect(ok.ok).toBe(true);
    expect(ok.instructions[0].word & 0xffff).toBe(0x7fff);
    const fuera = assemble(['beq $zero, $zero, lejos', ...relleno, 'lejos: add $t1, $t1, $t1'].join('\n'));
    expect(fuera.diagnostics[0]).toMatchObject({ line: 1, code: 'BRANCH_OUT_OF_RANGE' });
  });

  it('todavia no acepta j (se agrega con el formato J)', () => {
    expect(assemble('fin: j fin').diagnostics[0]).toMatchObject({ code: 'INVALID_MNEMONIC' });
  });
});
