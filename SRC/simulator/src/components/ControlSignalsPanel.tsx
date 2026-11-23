/**
 * PROPIETARIO: Integrante A (Dia 6)
 * Panel de senales de la Unidad de Control y registros intermedios (IF/ID, ID/EX, EX/MEM, MEM/WB).
 */
import type { CpuSnapshot } from '@core/types';

interface ControlSignalsPanelProps {
  snapshot: CpuSnapshot;
}

export function ControlSignalsPanel({ snapshot }: ControlSignalsPanelProps) {
  return (
    <div className="control-panel">
      <h3>Señales de Control y Buffers Intermedios</h3>
      <p className="muted">
        Estado CPU: <strong>{snapshot.status}</strong> · Última etapa:{' '}
        <strong>{snapshot.lastStage ?? 'Ninguna (Reset)'}</strong>
      </p>
      <p className="muted">Panel detallado de señales y buffers pendiente (Integrante A — Día 6).</p>
    </div>
  );
}
