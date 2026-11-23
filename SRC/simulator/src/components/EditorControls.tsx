/**
 * PROPIETARIO: Integrante B (Dia 5)
 * Editor de codigo ensamblador MIPS, selector de ejemplos/datasets y controles de ejecucion.
 * NO cambiar la interfaz `EditorControlsProps` sin acuerdo en PR.
 */
import type { AssembleResult, CpuSnapshot, MemoryWordInit } from '@core/types';

export interface EditorControlsProps {
  source: string;
  onSourceChange: (value: string) => void;
  assembleResult: AssembleResult | null;
  snapshot: CpuSnapshot;
  onAssemble: () => void;
  onReset: () => void;
  onStepStage: () => void;
  onStepInstruction: () => void;
  onLoadDataset: (data: MemoryWordInit[]) => void;
}

export function EditorControls({
  source,
  onSourceChange,
  assembleResult,
  snapshot,
  onAssemble,
  onReset,
  onStepStage,
  onStepInstruction,
}: EditorControlsProps) {
  return (
    <div className="editor-controls">
      <div className="panel-title">
        <h2>Editor ASM y Controles</h2>
        <span className="badge">{snapshot.status}</span>
      </div>
      <div className="button-row">
        <button type="button" onClick={onAssemble}>Ensamblar</button>
        <button type="button" onClick={onReset}>Reiniciar</button>
        <button type="button" onClick={onStepStage}>+ Etapa ({snapshot.nextStage})</button>
        <button type="button" onClick={onStepInstruction}>+ Instrucción</button>
      </div>
      <textarea
        className="asm-textarea"
        value={source}
        onChange={(e) => onSourceChange(e.target.value)}
        rows={14}
        spellCheck={false}
      />
      {assembleResult && !assembleResult.ok && (
        <ul className="diag-list">
          {assembleResult.diagnostics.map((d, idx) => (
            <li key={idx}>
              Línea {d.line} [{d.code}]: {d.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
