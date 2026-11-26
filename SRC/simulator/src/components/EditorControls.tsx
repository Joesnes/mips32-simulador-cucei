/**
 * PROPIETARIO: Fares Khalifa (Dia 5)
 * Editor de codigo ensamblador MIPS, selector de ejemplos/datasets y controles de ejecucion.
 * NO cambiar la interfaz `EditorControlsProps` sin acuerdo en PR.
 */
import { useState } from 'react';
import type { AssembleResult, CpuSnapshot, MemoryWordInit } from '@core/types';
import { PROGRAM_PRESETS, SELECTION_SORT_DATASETS } from '../data/presets';

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
  onLoadDataset,
}: EditorControlsProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('base');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(
    SELECTION_SORT_DATASETS[0].id,
  );

  const selectedPreset = PROGRAM_PRESETS.find((p) => p.id === selectedPresetId);
  const selectedDataset = SELECTION_SORT_DATASETS.find(
    (d) => d.id === selectedDatasetId,
  );

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = PROGRAM_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onSourceChange(preset.source);
    if (preset.datasets && preset.datasets.length > 0) {
      setSelectedDatasetId(preset.datasets[0].id);
      onLoadDataset(preset.datasets[0].initialMemory);
    }
  };

  const handleDatasetChange = (datasetId: string) => {
    setSelectedDatasetId(datasetId);
    const ds = SELECTION_SORT_DATASETS.find((d) => d.id === datasetId);
    if (ds) {
      onLoadDataset(ds.initialMemory);
    }
  };

  const handleExportHex = () => {
    if (!assembleResult?.ok || !assembleResult.hexImage) return;
    const blob = new Blob([assembleResult.hexImage], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${selectedPresetId || 'programa_mips'}.hex`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const isError = snapshot.status === 'ERROR';
  const isHalted = snapshot.status === 'HALTED_SELFLOOP';

  return (
    <div className="editor-controls">
      <div className="panel-title">
        <div>
          <h2>Editor ASM y Controles</h2>
          <p className="muted">
            {assembleResult?.ok
              ? `${assembleResult.instructions.length} instr. · ${assembleResult.bytes.length} B`
              : 'Sin imagen válida en IMem'}
          </p>
        </div>
        <span
          className={`badge ${
            isError ? 'badge-error' : isHalted ? 'badge-ok' : 'badge-accent'
          }`}
        >
          {snapshot.status}
        </span>
      </div>

      {/* Preset & Dataset Selectors */}
      <div className="preset-box">
        <label className="field-label" htmlFor="preset-select">
          Programa de ejemplo
        </label>
        <div className="preset-row">
          <select
            id="preset-select"
            className="apple-select"
            value={selectedPresetId}
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            {PROGRAM_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                [{preset.category}] {preset.title}
              </option>
            ))}
          </select>
        </div>
        {selectedPreset && (
          <p className="preset-desc">{selectedPreset.description}</p>
        )}

        {selectedPreset?.datasets && (
          <div className="dataset-picker">
            <label className="field-label" htmlFor="dataset-select">
              Datos iniciales en DMem (Selection Sort)
            </label>
            <div className="dataset-row">
              <select
                id="dataset-select"
                className="apple-select"
                value={selectedDatasetId}
                onChange={(e) => handleDatasetChange(e.target.value)}
              >
                {SELECTION_SORT_DATASETS.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() =>
                  selectedDataset && onLoadDataset(selectedDataset.initialMemory)
                }
              >
                Cargar datos
              </button>
            </div>
            {selectedDataset && (
              <p className="preset-desc">{selectedDataset.description}</p>
            )}
          </div>
        )}
      </div>

      {/* Execution & Export Buttons */}
      <div className="button-row">
        <button type="button" className="btn-primary" onClick={onAssemble}>
          Ensamblar
        </button>
        <button type="button" className="btn-secondary" onClick={onReset}>
          Reiniciar
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={onStepStage}
          disabled={isError}
        >
          + Etapa ({snapshot.nextStage})
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={onStepInstruction}
          disabled={isError}
        >
          + Instrucción
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={handleExportHex}
          disabled={!assembleResult?.ok}
          title="Descargar archivo .hex (1 byte por línea)"
        >
          ↓ .hex
        </button>
      </div>

      <textarea
        className="asm-textarea"
        aria-label="Código ensamblador MIPS"
        value={source}
        onChange={(e) => onSourceChange(e.target.value)}
        rows={13}
        spellCheck={false}
      />

      {assembleResult && !assembleResult.ok && (
        <div className="diag-box" role="alert">
          <div className="diag-title">
            Errores de ensamblado ({assembleResult.diagnostics.length})
          </div>
          <ul className="diag-list">
            {assembleResult.diagnostics.map((d, idx) => (
              <li key={idx}>
                <span className="diag-line">Línea {d.line}</span>{' '}
                <code className="diag-code">[{d.code}]</code>: {d.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
