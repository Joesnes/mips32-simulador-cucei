import { useMemo, useState } from 'react';
import { assemble } from '@core/assembler';
import { MipsCpu } from '@core/cpu';
import type { AssembleResult, CpuSnapshot, MemoryWordInit } from '@core/types';
import { DatapathSVG } from './components/DatapathSVG';
import { ControlSignalsPanel } from './components/ControlSignalsPanel';
import { EditorControls } from './components/EditorControls';
import { InstructionInspector } from './components/InstructionInspector';
import { MemoryRegistersPanel } from './components/MemoryRegistersPanel';

const DEFAULT_SOURCE = `# Ejemplo inicial MIPS32 (Modalidad B)
addiu $t0, $zero, 5
addi  $t1, $zero, 7
add   $t2, $t0, $t1
fin:
j fin
`;

export function App() {
  const cpu = useMemo(() => new MipsCpu(), []);
  const [source, setSource] = useState<string>(DEFAULT_SOURCE);
  const [assembleResult, setAssembleResult] = useState<AssembleResult | null>(null);
  const [snapshot, setSnapshot] = useState<CpuSnapshot>(() => cpu.getSnapshot());
  const [initialData, setInitialData] = useState<MemoryWordInit[]>([]);

  const handleAssemble = (code = source, data = initialData) => {
    const result = assemble(code);
    setAssembleResult(result);
    if (result.ok) {
      cpu.loadProgram(result.bytes, data);
      setSnapshot(cpu.getSnapshot());
    }
  };

  const handleReset = () => {
    cpu.reset();
    setSnapshot(cpu.getSnapshot());
  };

  const handleStepStage = () => {
    setSnapshot(cpu.stepStage());
  };

  const handleStepInstruction = () => {
    setSnapshot(cpu.stepInstruction());
  };

  const handleLoadDataset = (data: MemoryWordInit[]) => {
    setInitialData(data);
    if (assembleResult?.ok) {
      cpu.loadProgram(assembleResult.bytes, data);
      setSnapshot(cpu.getSnapshot());
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Simulador Interactivo MIPS 32 bits</h1>
          <p className="subtitle">
            Arquitectura de Computadoras — UdeG / CUCEI · Modalidad B (Multiciclo 5 etapas)
          </p>
        </div>
        <a className="report-link" href="../">
          ← Ver Reporte Técnico
        </a>
      </header>

      <main className="app-grid">
        <section className="panel panel-editor">
          <EditorControls
            source={source}
            onSourceChange={setSource}
            assembleResult={assembleResult}
            snapshot={snapshot}
            onAssemble={() => handleAssemble()}
            onReset={handleReset}
            onStepStage={handleStepStage}
            onStepInstruction={handleStepInstruction}
            onLoadDataset={handleLoadDataset}
          />
        </section>

        <section className="panel panel-datapath">
          <DatapathSVG snapshot={snapshot} />
        </section>

        <section className="panel panel-inspector">
          <InstructionInspector snapshot={snapshot} assembleResult={assembleResult} />
          <ControlSignalsPanel snapshot={snapshot} />
        </section>

        <section className="panel panel-memory">
          <MemoryRegistersPanel snapshot={snapshot} />
        </section>
      </main>
    </div>
  );
}
