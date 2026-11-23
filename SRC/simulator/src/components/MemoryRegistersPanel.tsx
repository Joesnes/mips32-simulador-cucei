/**
 * PROPIETARIO: Integrante B (Dia 6)
 * Visualizador del Banco de Registros ($0-$31), Memoria de Instrucciones (bytes big-endian)
 * y Memoria de Datos (palabras/bytes big-endian) con resaltado de cambios.
 */
import type { CpuSnapshot } from '@core/types';
import { REGISTER_NAMES, formatHex32 } from '@core/isa';

export interface MemoryRegistersPanelProps {
  snapshot: CpuSnapshot;
}

export function MemoryRegistersPanel({ snapshot }: MemoryRegistersPanelProps) {
  return (
    <div className="memory-regs-panel">
      <h2>Banco de Registros y Memorias</h2>
      <div className="regs-preview">
        {snapshot.registers.slice(0, 12).map((val, idx) => (
          <div key={idx} className="reg-chip">
            <span>{REGISTER_NAMES[idx]}</span>
            <code>{formatHex32(val)}</code>
          </div>
        ))}
      </div>
      <p className="muted">Vista completa de 32 registros, IMem y DMem pendiente (Integrante B — Día 6).</p>
    </div>
  );
}
