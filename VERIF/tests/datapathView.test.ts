import { describe, expect, it } from 'vitest';
import { assemble } from '../../SRC/core/assembler';
import { MipsCpu } from '../../SRC/core/cpu';
import {
  DEFAULT_SOURCE,
  PROGRAM_PRESETS,
  SELECTION_SORT_DATASETS,
} from '../../SRC/simulator/src/data/presets';
import {
  buildStageExplanation,
  deriveControlSignalsView,
  deriveDatapathView,
  getBlockInspectorInfo,
} from '../../SRC/simulator/src/utils/datapathModel';

describe('Datapath View-Model & Explainer (datapathModel.ts)', () => {
  it('en estado READY y en etapa IF oculta señales pendientes usando ID_EX.valid=false', () => {
    const asm = assemble('addiu $t0, $zero, 5');
    expect(asm.ok).toBe(true);

    const cpu = new MipsCpu();
    cpu.loadProgram(asm.bytes);

    // READY (antes de IF)
    const readySnap = cpu.getSnapshot();
    const readyView = deriveDatapathView(readySnap);
    const readyCtrl = deriveControlSignalsView(readySnap);
    expect(readyView.activeStage).toBeNull();
    expect(readyView.nextStage).toBe('IF');
    expect(readyView.controlsValid).toBe(false);
    expect(readyCtrl.controlsValid).toBe(false);
    expect(readyCtrl.items).toHaveLength(12);
    expect(readyCtrl.items.every((item) => item.pending && item.displayValue === '—')).toBe(true);
    expect(buildStageExplanation(readySnap).tone).toBe('neutral');

    // Después de IF: activeStage debe ser 'IF' (lastStage), bigEndianBytes [24, 08, 00, 05], aún sin ID_EX.valid
    const ifSnap = cpu.stepStage();
    const ifView = deriveDatapathView(ifSnap);
    const ifCtrl = deriveControlSignalsView(ifSnap);
    expect(ifView.activeStage).toBe('IF');
    expect(ifView.nextStage).toBe('ID');
    expect(ifView.bigEndianBytes).toEqual([0x24, 0x08, 0x00, 0x05]);
    expect(ifView.irWord).toBe(0x24080005);
    expect(ifView.controlsValid).toBe(false);
    expect(ifCtrl.items.find((i) => i.key === 'ALUctl')?.displayValue).toBe('—');
    expect(ifView.activeBlocks.BIG_ENDIAN).toBe(true);
    expect(ifView.activeWires.IMEM_TO_BE).toBe(true);
    expect(buildStageExplanation(ifSnap).tone).toBe('if');
  });

  it('recorre las 5 etapas IF -> ID -> EX -> MEM -> WB con valores reales', () => {
    const asm = assemble('addiu $t0, $zero, 5');
    const cpu = new MipsCpu();
    cpu.loadProgram(asm.bytes);

    cpu.stepStage(); // IF
    const idSnap = cpu.stepStage(); // ID
    const idView = deriveDatapathView(idSnap);
    const idCtrl = deriveControlSignalsView(idSnap);
    expect(idView.activeStage).toBe('ID');
    expect(idView.controlsValid).toBe(true);
    expect(idView.mnemonic).toBe('addi');
    expect(idView.ar1).toBe(0);
    expect(idView.ar2).toBe(8);
    expect(idView.immExt).toBe(5);
    expect(idCtrl.items.find((i) => i.key === 'ALUSrc')?.displayValue).toBe('1');
    expect(idCtrl.items.find((i) => i.key === 'ALUctl')?.displayValue).toBe('0010 (ADD)');
    expect(buildStageExplanation(idSnap).tone).toBe('id');

    const exSnap = cpu.stepStage(); // EX
    const exView = deriveDatapathView(exSnap);
    expect(exView.activeStage).toBe('EX');
    expect(exView.aluA).toBe(0);
    expect(exView.aluB).toBe(5);
    expect(exView.aluOut).toBe(5);
    expect(exView.zeroFlag).toBe(false);
    expect(exView.aw).toBe(8);
    expect(exView.nextPC).toBe(4);
    expect(exView.activeBlocks.MIPSALU).toBe(true);
    expect(exView.activeWires.IDEX_TO_ALUSRC_IMM).toBe(true);
    expect(exView.activeWires.IDEX_TO_ALUSRC).toBe(false);
    expect(exView.activeWires.IDEX_TO_REGDST).toBe(true);
    expect(exView.activeWires.IDEX_RD_TO_REGDST).toBe(false);
    expect(exView.activeWires.IDEX_PC4_TO_PCSRC).toBe(true);
    expect(exView.activeWires.BR_ADDER_TO_PCSRC).toBe(false);
    expect(buildStageExplanation(exSnap).tone).toBe('ex');

    const memSnap = cpu.stepStage(); // MEM (bypass porque no es lw/sw)
    const memView = deriveDatapathView(memSnap);
    expect(memView.activeStage).toBe('MEM');
    expect(memView.dmemAction).toBe('BYPASS');
    expect(memView.activeWires.EXMEM_BYPASS_MEMWB).toBe(true);
    expect(memView.dw).toBe(5);
    expect(buildStageExplanation(memSnap).tone).toBe('mem');

    const wbSnap = cpu.stepStage(); // WB
    const wbView = deriveDatapathView(wbSnap);
    expect(wbView.activeStage).toBe('WB');
    expect(wbView.pc).toBe(4);
    expect(wbView.instructionPc).toBe(0);
    expect(wbView.pcUpdatedInWB).toBe(true);
    expect(wbView.activeWires.MEMTOREG_TO_BR_DW).toBe(true);
    expect(wbView.activeWires.MEMWB_NEXTPC_TO_PC).toBe(true);
    expect(buildStageExplanation(wbSnap).tone).toBe('wb');
  });

  it('detecta protección de $zero y RegWrite=0 correctamente', () => {
    const asm = assemble(`
      addi $zero, $zero, 99
      sw   $zero, 0($zero)
    `);
    expect(asm.ok).toBe(true);
    const cpu = new MipsCpu();
    cpu.loadProgram(asm.bytes);

    // Primera instrucción escribe en $zero -> writeDiscardedZero = true
    cpu.stepStage(); // IF
    const idZero = cpu.stepStage(); // ID
    const viewZero = deriveDatapathView(idZero);
    expect(viewZero.writeDiscardedZero).toBe(true);
    expect(viewZero.brStatusLabel).toContain('$zero');
    cpu.stepStage(); // EX
    cpu.stepStage(); // MEM
    cpu.stepStage(); // WB
    expect(cpu.getSnapshot().registers[0]).toBe(0);

    // Segunda instrucción es sw -> RegWrite = 0
    cpu.stepStage(); // IF
    const idSw = cpu.stepStage(); // ID
    const viewSw = deriveDatapathView(idSw);
    expect(viewSw.writeDisabledRegWrite).toBe(true);
    expect(viewSw.brStatusLabel).toContain('RegWrite=0');
  });

  it('modela lw/sw en etapa MEM con MemToReg y acción READ/WRITE', () => {
    const asm = assemble(`
      addi $t0, $zero, 42
      sw   $t0, 8($zero)
      lw   $t1, 8($zero)
    `);
    expect(asm.ok).toBe(true);
    const cpu = new MipsCpu();
    cpu.loadProgram(asm.bytes);
    cpu.stepInstruction(); // addi

    // sw -> IF, ID, EX, MEM
    cpu.stepStage();
    cpu.stepStage();
    cpu.stepStage();
    const swMem = cpu.stepStage();
    const swView = deriveDatapathView(swMem);
    expect(swView.dmemAction).toBe('WRITE');
    expect(swView.activeBlocks.DMEM).toBe(true);
    expect(swView.activeWires.EXMEM_TO_DMEM_DATA).toBe(true);
    cpu.stepStage(); // WB

    // lw -> IF, ID, EX, MEM
    cpu.stepStage();
    cpu.stepStage();
    cpu.stepStage();
    const lwMem = cpu.stepStage();
    const lwView = deriveDatapathView(lwMem);
    expect(lwView.dmemAction).toBe('READ');
    expect(lwView.mdr).toBe(42);
    expect(lwView.muxMemToRegSel).toBe(1);
    expect(lwView.dw).toBe(42);
    expect(lwView.activeWires.DMEM_TO_MEMWB).toBe(true);
  });

  it('modela beq/bne (Branch & Zero | BranchNe & !Zero) y HALTED_SELFLOOP', () => {
    const asm = assemble(`
      addi $t0, $zero, 1
      bne  $t0, $zero, salto
      addi $t1, $zero, 99
salto:
      beq  $zero, $zero, salto
    `);
    expect(asm.ok).toBe(true);
    const cpu = new MipsCpu();
    cpu.loadProgram(asm.bytes);
    cpu.stepInstruction(); // addi $t0, $zero, 1

    // bne en EX
    cpu.stepStage(); // IF
    cpu.stepStage(); // ID
    const bneEx = cpu.stepStage(); // EX
    const bneView = deriveDatapathView(bneEx);
    expect(bneView.zeroFlag).toBe(false);
    expect(bneView.branchTaken).toBe(true);
    expect(bneView.muxPCSrcSel).toBe(1);
    expect(bneView.nextPC).toBe(12);
    expect(bneView.activeBlocks.BRANCH_LOGIC).toBe(true);
    cpu.stepStage(); // MEM
    cpu.stepStage(); // WB

    // beq $zero, $zero, salto -> HALTED_SELFLOOP
    const halted = cpu.stepInstruction();
    expect(halted.status).toBe('HALTED_SELFLOOP');
    expect(buildStageExplanation(halted).tone).toBe('halted');
  });

  it('resalta bloque y explicación cuando ocurre un ERROR (DATA_UNALIGNED y PC_OUT_OF_RANGE)', () => {
    const asm = assemble('lw $t0, 2($zero)');
    expect(asm.ok).toBe(true);
    const cpu = new MipsCpu();
    cpu.loadProgram(asm.bytes);

    const errSnap = cpu.stepInstruction();
    const errView = deriveDatapathView(errSnap);
    expect(errSnap.status).toBe('ERROR');
    expect(errView.hasError).toBe(true);
    expect(errView.errorBlock).toBe('DMEM');
    expect(buildStageExplanation(errSnap).tone).toBe('error');

    const emptyCpu = new MipsCpu();
    const pcErr = emptyCpu.stepStage();
    const pcErrView = deriveDatapathView(pcErr);
    expect(pcErrView.errorBlock).toBe('IMEM');

    const info = getBlockInspectorInfo('BIG_ENDIAN', pcErrView, pcErr);
    expect(info.bitRanges.length).toBeGreaterThan(0);
    expect(info.inputs.length).toBeGreaterThan(0);
    expect(info.outputs.length).toBeGreaterThan(0);
  });

  it('evita peek-ahead entre etapas y usa exclusivamente binario y decimal (cero 0x)', () => {
    const asm = assemble('addi $t0, $zero, 12');
    expect(asm.ok).toBe(true);

    const cpu = new MipsCpu();
    cpu.loadProgram(asm.bytes);

    // READY: no muestra bytes ni valores adelantados
    const readySnap = cpu.getSnapshot();
    const readyView = deriveDatapathView(readySnap);
    expect(readyView.bigEndianBytes).toBeNull();
    expect(readyView.stageReached.IF).toBe(false);
    expect(readyView.ar1).toBeNull();
    expect(readyView.aluA).toBeNull();

    // IF: solo IF activo; BR y ALU aun en espera
    const ifSnap = cpu.stepStage();
    const ifView = deriveDatapathView(ifSnap);
    expect(ifView.stageReached.IF).toBe(true);
    expect(ifView.stageReached.ID).toBe(false);
    expect(ifView.ar1).toBeNull();
    expect(ifView.dr1).toBeNull();
    expect(ifView.aluA).toBeNull();
    expect(ifView.aluOut).toBeNull();

    // ID: campos y BR llenos, ALU aun en espera
    const idSnap = cpu.stepStage();
    const idView = deriveDatapathView(idSnap);
    expect(idView.stageReached.ID).toBe(true);
    expect(idView.stageReached.EX).toBe(false);
    expect(idView.dr1).toBe(0);
    expect(idView.aluA).toBeNull();
    expect(idView.aluOut).toBeNull();

    const exSnap = cpu.stepStage();
    const memSnap = cpu.stepStage();
    const wbSnap = cpu.stepStage();

    // Verifica que ni explicaciones, ni senales, ni el inspector de bloques tengan prefijos hex (0x)
    const blockIds = ['PC', 'IMEM', 'BIG_ENDIAN', 'FIELDS', 'CONTROL', 'BR', 'EXTENDER', 'MIPSALU', 'DMEM', 'MUX_MEMTOREG'] as const;
    for (const snap of [readySnap, ifSnap, idSnap, exSnap, memSnap, wbSnap]) {
      const view = deriveDatapathView(snap);
      const exp = buildStageExplanation(snap);
      const ctrl = deriveControlSignalsView(snap);
      expect(`${exp.title} ${exp.headline} ${exp.detail}`).not.toMatch(/0x[0-9a-f]+/i);
      expect(view.cycleSummary).not.toMatch(/0x[0-9a-f]+/i);
      for (const item of ctrl.items) {
        expect(`${item.displayValue} ${item.meaning}`).not.toMatch(/0x[0-9a-f]+/i);
      }
      for (const id of blockIds) {
        const info = getBlockInspectorInfo(id, view, snap);
        expect(info.inputs.length).toBeGreaterThan(0);
        expect(info.outputs.length).toBeGreaterThan(0);
        for (const p of [...info.inputs, ...info.outputs]) {
          expect(p.binary.length).toBeGreaterThan(0);
          expect(p.decimalMeaning.length).toBeGreaterThan(0);
          expect(`${p.binary} ${p.decimalMeaning}`).not.toMatch(/0x[0-9a-f]+/i);
        }
      }
    }
  });

  it('todos los presets integrados (incluyendo DEFAULT_SOURCE y Selection Sort) ensamblan sin errores', () => {
    expect(assemble(DEFAULT_SOURCE).ok).toBe(true);
    for (const preset of PROGRAM_PRESETS) {
      const res = assemble(preset.source);
      expect(res.ok).toBe(true);
    }
    expect(SELECTION_SORT_DATASETS).toHaveLength(3);
  });

  it('limpia estado derivado cuando ocurre PC_OUT_OF_RANGE en IF tras completar una instrucción', () => {
    const asm = assemble('addi $t0, $zero, 5');
    expect(asm.ok).toBe(true);

    const cpu = new MipsCpu();
    cpu.loadProgram(asm.bytes);
    cpu.stepInstruction(); // Completa instrucción 1 -> PC=4, buffers aún válidos

    const errSnap = cpu.stepStage(); // IF en pc=4 -> PC_OUT_OF_RANGE
    expect(errSnap.status).toBe('ERROR');
    expect(errSnap.error?.code).toBe('PC_OUT_OF_RANGE');
    expect(errSnap.error?.stage).toBe('IF');

    const errView = deriveDatapathView(errSnap);
    const errCtrl = deriveControlSignalsView(errSnap);

    expect(errView.instructionPc).toBe(4);
    expect(errView.bigEndianBytes).toBeNull();
    expect(errView.bigEndianReady).toBe(false);
    expect(errView.irWord).toBeNull();
    expect(errView.controlsValid).toBe(false);
    expect(errView.mnemonic).toBe('—');
    expect(errView.dmemAction).toBe('IDLE');
    expect(errView.errorBlock).toBe('IMEM');
    expect(errCtrl.controlsValid).toBe(false);
    expect(errCtrl.items.every((item) => item.pending && item.displayValue === '—')).toBe(true);
  });
});
