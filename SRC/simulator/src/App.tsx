import { useEffect, useMemo, useState } from 'react';
import { assemble } from '@core/assembler';
import { MipsCpu } from '@core/cpu';
import type { AssembleResult, CpuSnapshot, MemoryWordInit } from '@core/types';
import { ControlSignalsPanel } from './components/ControlSignalsPanel';
import { DatapathSVG } from './components/DatapathSVG';
import { EditorControls } from './components/EditorControls';
import { GuideModal } from './components/GuideModal';
import { InstructionInspector } from './components/InstructionInspector';
import { MemoryRegistersPanel } from './components/MemoryRegistersPanel';
import { DEFAULT_SOURCE } from './data/presets';
import { buildStageExplanation } from './utils/datapathModel';

type PlaySpeedKey = 'slow' | 'normal' | 'fast' | 'turbo';

const PLAY_SPEEDS: Record<PlaySpeedKey, { label: string; ms: number }> = {
  slow: { label: 'Lento (1.4s)', ms: 1400 },
  normal: { label: 'Normal (0.8s)', ms: 800 },
  fast: { label: 'Rápido (0.4s)', ms: 400 },
  turbo: { label: 'Turbo (0.15s)', ms: 150 },
};

export function App() {
  const { cpu, initialAssemble, initialSnapshot } = useMemo(() => {
    const instance = new MipsCpu();
    const firstAsm = assemble(DEFAULT_SOURCE);
    if (firstAsm.ok) {
      instance.loadProgram(firstAsm.bytes, []);
    }
    return {
      cpu: instance,
      initialAssemble: firstAsm,
      initialSnapshot: instance.getSnapshot(),
    };
  }, []);

  const [source, setSource] = useState<string>(DEFAULT_SOURCE);
  const [assembleResult, setAssembleResult] = useState<AssembleResult | null>(
    initialAssemble,
  );
  const [snapshot, setSnapshot] = useState<CpuSnapshot>(initialSnapshot);
  const [initialData, setInitialData] = useState<MemoryWordInit[]>([]);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedKey, setSpeedKey] = useState<PlaySpeedKey>('normal');
  const [guideOpen, setGuideOpen] = useState<boolean>(false);

  const stageExplanation = buildStageExplanation(snapshot);
  const canStep =
    snapshot.status !== 'ERROR' && snapshot.status !== 'HALTED_SELFLOOP';

  useEffect(() => {
    if (!isPlaying) return;
    if (snapshot.status === 'HALTED_SELFLOOP' || snapshot.status === 'ERROR') {
      setIsPlaying(false);
      return;
    }

    const timer = window.setInterval(() => {
      const nextSnap = cpu.stepStage();
      setSnapshot(nextSnap);
      if (nextSnap.status === 'HALTED_SELFLOOP' || nextSnap.status === 'ERROR') {
        setIsPlaying(false);
      }
    }, PLAY_SPEEDS[speedKey].ms);

    return () => window.clearInterval(timer);
  }, [isPlaying, speedKey, snapshot.status, cpu]);

  const handleAssemble = (code = source, data = initialData) => {
    setIsPlaying(false);
    const result = assemble(code);
    setAssembleResult(result);
    if (result.ok) {
      cpu.loadProgram(result.bytes, data);
      setSnapshot(cpu.getSnapshot());
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    cpu.reset();
    setSnapshot(cpu.getSnapshot());
  };

  const handleStepStage = () => {
    setIsPlaying(false);
    setSnapshot(cpu.stepStage());
  };

  const handleStepInstruction = () => {
    setIsPlaying(false);
    setSnapshot(cpu.stepInstruction());
  };

  const handleLoadDataset = (data: MemoryWordInit[]) => {
    setIsPlaying(false);
    setInitialData(data);
    if (assembleResult?.ok) {
      cpu.loadProgram(assembleResult.bytes, data);
      setSnapshot(cpu.getSnapshot());
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (snapshot.status === 'ERROR') return;
    if (snapshot.status === 'HALTED_SELFLOOP') {
      cpu.reset();
      setSnapshot(cpu.getSnapshot());
    }
    setIsPlaying(true);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-kicker">UdeG / CUCEI · Modalidad B · Multiciclo 5 Etapas</div>
          <h1>Simulador Visual MIPS 32 bits</h1>
        </div>

        <div className="header-actions">
          <div className="header-stats">
            <span className="stat-pill">
              Ciclo <strong>{snapshot.cycle}</strong>
            </span>
            <span className="stat-pill">
              Instrucciones <strong>{snapshot.instructionsExecuted}</strong>
            </span>
          </div>
          <button
            type="button"
            className="btn-guide"
            onClick={() => setGuideOpen(true)}
          >
            ? Cómo usar y cómo funciona
          </button>
          <a className="report-link" href="../">
            ← Reporte Técnico
          </a>
        </div>
      </header>

      {/* Transport + Live Contextual Stage Explainer */}
      <section className="stage-banner-bar" aria-live="polite">
        <div className={`live-stage-banner tone-${stageExplanation.tone}`}>
          <div className="live-banner-top">
            <span className="badge">{stageExplanation.badge}</span>
            <h3>{stageExplanation.title}</h3>
          </div>
          <p className="live-banner-headline">{stageExplanation.headline}</p>
          <p className="live-banner-detail">
            {stageExplanation.detail} <em>{stageExplanation.nextHint}</em>
          </p>
        </div>

        <div className="transport-dock" aria-label="Controles de reproducción">
          <div className="transport-buttons">
            <button
              type="button"
              className={`btn-play ${isPlaying ? 'is-playing' : ''}`}
              onClick={handleTogglePlay}
              disabled={snapshot.status === 'ERROR'}
            >
              {isPlaying ? '❚❚ Pausar' : '▶ Play'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleStepStage}
              disabled={snapshot.status === 'ERROR'}
            >
              + Etapa ({snapshot.nextStage})
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleStepInstruction}
              disabled={snapshot.status === 'ERROR'}
            >
              + Instrucción
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => handleAssemble()}
            >
              Ensamblar
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleReset}
            >
              Reiniciar
            </button>
          </div>
          <div className="speed-control">
            <label htmlFor="play-speed-select">Velocidad</label>
            <select
              id="play-speed-select"
              className="apple-select apple-select--compact"
              value={speedKey}
              onChange={(e) => setSpeedKey(e.target.value as PlaySpeedKey)}
              aria-label="Velocidad de reproducción automática"
            >
              {Object.entries(PLAY_SPEEDS).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
            {!canStep && (
              <span className="transport-note">
                {snapshot.status === 'HALTED_SELFLOOP'
                  ? 'Fin del programa'
                  : 'Detenido por error'}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Main Workspace Grid */}
      <main className="app-grid">
        <section className="panel panel-datapath">
          <DatapathSVG snapshot={snapshot} />
        </section>

        <aside className="panel panel-editor">
          <EditorControls
            source={source}
            onSourceChange={(val) => {
              setIsPlaying(false);
              setSource(val);
            }}
            assembleResult={assembleResult}
            snapshot={snapshot}
            onAssemble={() => handleAssemble()}
            onReset={handleReset}
            onStepStage={handleStepStage}
            onStepInstruction={handleStepInstruction}
            onLoadDataset={handleLoadDataset}
          />
        </aside>

        <section className="panel panel-controls">
          <ControlSignalsPanel snapshot={snapshot} />
        </section>

        <section className="panel panel-inspector">
          <InstructionInspector
            snapshot={snapshot}
            assembleResult={assembleResult}
          />
        </section>

        <section className="panel panel-memory">
          <MemoryRegistersPanel snapshot={snapshot} />
        </section>
      </main>

      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
