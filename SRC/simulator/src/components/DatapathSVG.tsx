/**
 * PROPIETARIO: Alejandro Espinoza (Dia 5)
 * Diagrama SVG interactivo del Datapath MIPS32 inspirado en MIPS 101 + Patterson & Hennessy.
 */
import type { CpuSnapshot } from '@core/types';
import { formatHex32 } from '@core/isa';

interface DatapathSVGProps {
  snapshot: CpuSnapshot;
}

export function DatapathSVG({ snapshot }: DatapathSVGProps) {
  return (
    <div className="datapath-container">
      <div className="panel-title">
        <h2>Ruta de Datos MIPS32 (Datapath + Buffers)</h2>
        <span className="badge">
          Ciclo {snapshot.cycle} · Siguiente etapa: {snapshot.nextStage} · PC: {formatHex32(snapshot.pc)}
        </span>
      </div>
      <div className="placeholder-box">
        SVG interactivo del Datapath en construcción (Alejandro Espinoza — Día 5).
      </div>
    </div>
  );
}
