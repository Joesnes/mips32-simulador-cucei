/**
 * PROPIETARIO: Fares Khalifa (Dia 5)
 * Inspector de instruccion actual (32 bits por campo: opcode, rs, rt, rd, shamt, funct, imm, index)
 * y listado ensamblado (direccion, hex, binario, fuente).
 */
import type { AssembleResult, CpuSnapshot } from '@core/types';
import { formatHex32 } from '@core/isa';

export interface InstructionInspectorProps {
  snapshot: CpuSnapshot;
  assembleResult: AssembleResult | null;
}

export function InstructionInspector({ snapshot, assembleResult }: InstructionInspectorProps) {
  const ir = snapshot.buffers.IF_ID.instruction;
  return (
    <div className="inspector-panel">
      <h3>Inspector de Instrucción</h3>
      <p className="muted">
        IR: <code>{formatHex32(ir)}</code> · Instrucciones ensambladas:{' '}
        <strong>{assembleResult?.instructions.length ?? 0}</strong>
      </p>
      <p className="muted">Desglose de campos y listado pendiente (Fares Khalifa — Día 5).</p>
    </div>
  );
}
