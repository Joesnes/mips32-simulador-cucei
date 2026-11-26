/**
 * PROPIETARIO: Fares Khalifa (Dia 5)
 * Inspector de instruccion actual (32 bits por campo: opcode, rs, rt, rd, shamt, funct, imm, index)
 * y listado ensamblado (direccion, hex, binario, fuente).
 */
import type { AssembleResult, CpuSnapshot } from '@core/types';
import {
  REGISTER_NAMES,
  formatBin32,
  formatHex32,
  formatHexByte,
} from '@core/isa';
import { deriveDatapathView } from '../utils/datapathModel';

export interface InstructionInspectorProps {
  snapshot: CpuSnapshot;
  assembleResult: AssembleResult | null;
}

interface BitSegment {
  label: string;
  range: string;
  bits: string;
  meaning: string;
  tone: 'op' | 'rs' | 'rt' | 'rd' | 'shamt' | 'funct' | 'imm' | 'jump';
}

export function InstructionInspector({
  snapshot,
  assembleResult,
}: InstructionInspectorProps) {
  const view = deriveDatapathView(snapshot);
  const { IF_ID, ID_EX } = snapshot.buffers;

  const activeWord = view.irWord;
  const bin = activeWord !== null ? formatBin32(activeWord) : null;

  const activeInstr = assembleResult?.instructions.find(
    (ins) => ins.address === view.instructionPc,
  );
  const detectedFormat = ID_EX.valid
    ? ID_EX.fields.format
    : activeInstr?.format ?? (view.slices?.opcode === 0 ? 'R' : view.slices?.opcode === 2 ? 'J' : 'I');

  const segments: BitSegment[] = [];
  if (bin && view.slices) {
    if (detectedFormat === 'R') {
      segments.push(
        {
          label: 'opcode',
          range: '[31:26]',
          bits: bin.slice(0, 6),
          meaning: `0x${view.slices.opcode.toString(16).toUpperCase().padStart(2, '0')} (R-Type)`,
          tone: 'op',
        },
        {
          label: 'rs',
          range: '[25:21]',
          bits: bin.slice(6, 11),
          meaning: `${REGISTER_NAMES[view.slices.rs]} ($${view.slices.rs})`,
          tone: 'rs',
        },
        {
          label: 'rt',
          range: '[20:16]',
          bits: bin.slice(11, 16),
          meaning: `${REGISTER_NAMES[view.slices.rt]} ($${view.slices.rt})`,
          tone: 'rt',
        },
        {
          label: 'rd',
          range: '[15:11]',
          bits: bin.slice(16, 21),
          meaning: `${REGISTER_NAMES[view.slices.rd]} ($${view.slices.rd})`,
          tone: 'rd',
        },
        {
          label: 'shamt',
          range: '[10:6]',
          bits: bin.slice(21, 26),
          meaning: `${view.slices.shamt}`,
          tone: 'shamt',
        },
        {
          label: 'funct',
          range: '[5:0]',
          bits: bin.slice(26, 32),
          meaning: `0x${view.slices.funct.toString(16).toUpperCase().padStart(2, '0')}`,
          tone: 'funct',
        },
      );
    } else if (detectedFormat === 'J') {
      segments.push(
        {
          label: 'opcode',
          range: '[31:26]',
          bits: bin.slice(0, 6),
          meaning: `0x${view.slices.opcode.toString(16).toUpperCase().padStart(2, '0')} (J-Type)`,
          tone: 'op',
        },
        {
          label: 'jumpIndex',
          range: '[25:0]',
          bits: bin.slice(6, 32),
          meaning: `0x${view.slices.jumpIndex.toString(16).toUpperCase().padStart(7, '0')}`,
          tone: 'jump',
        },
      );
    } else {
      segments.push(
        {
          label: 'opcode',
          range: '[31:26]',
          bits: bin.slice(0, 6),
          meaning: `0x${view.slices.opcode.toString(16).toUpperCase().padStart(2, '0')} (I-Type)`,
          tone: 'op',
        },
        {
          label: 'rs',
          range: '[25:21]',
          bits: bin.slice(6, 11),
          meaning: `${REGISTER_NAMES[view.slices.rs]} ($${view.slices.rs})`,
          tone: 'rs',
        },
        {
          label: 'rt',
          range: '[20:16]',
          bits: bin.slice(11, 16),
          meaning: `${REGISTER_NAMES[view.slices.rt]} ($${view.slices.rt})`,
          tone: 'rt',
        },
        {
          label: 'imm16',
          range: '[15:0]',
          bits: bin.slice(16, 32),
          meaning: `0x${view.slices.imm16.toString(16).toUpperCase().padStart(4, '0')}`,
          tone: 'imm',
        },
      );
    }
  }

  return (
    <div className="inspector-panel">
      <div className="panel-title">
        <div>
          <h3>Inspector de Instrucción</h3>
          <p className="muted">
            PC activo: <code>{formatHex32(view.instructionPc)}</code> · IR:{' '}
            <code>{activeWord !== null ? formatHex32(activeWord) : 'Pendiente IF'}</code>
          </p>
        </div>
        <span className="badge">
          {ID_EX.valid
            ? `${ID_EX.fields.mnemonic} · Formato ${ID_EX.fields.format}`
            : IF_ID.valid
              ? `IR cargado (${detectedFormat})`
              : `${assembleResult?.instructions.length ?? 0} instr.`}
        </span>
      </div>

      {/* Big-Endian 4 bytes readout */}
      <div className="be-bytes-strip">
        <span className="be-strip-label">4 bytes Big-Endian (mem[PC..PC+3]):</span>
        <div className="be-strip-cells">
          {(view.bigEndianBytes ?? [null, null, null, null]).map((byteVal, idx) => (
            <span key={idx} className="be-byte-pill">
              <small>+{idx}</small>
              <code>{byteVal !== null ? formatHexByte(byteVal) : '--'}</code>
            </span>
          ))}
        </div>
      </div>

      {/* Color-coded 32-bit segments */}
      {segments.length > 0 ? (
        <div className="bitfields-strip" aria-label="Desglose de 32 bits por campo">
          {segments.map((seg) => (
            <div key={`${seg.label}-${seg.range}`} className={`bitfield-box tone-${seg.tone}`}>
              <div className="bitfield-meta">
                <span>{seg.label}</span>
                <small>{seg.range}</small>
              </div>
              <code className="bitfield-bits">{seg.bits}</code>
              <div className="bitfield-meaning">{seg.meaning}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-hint">
          Avanza a la etapa <strong>IF</strong> para ver los 32 bits de la instrucción actual
          desglosados por campo.
        </div>
      )}

      {/* Assembled Listing Table */}
      <div className="listing-section">
        <div className="listing-header">
          <h4>Listado Ensamblado</h4>
          <span className="muted">
            {assembleResult?.ok
              ? `${assembleResult.instructions.length} instrucciones en IMem`
              : 'Ensambla el programa para ver el listado'}
          </span>
        </div>

        {assembleResult?.ok && assembleResult.instructions.length > 0 ? (
          <div className="listing-table-wrap">
            <table className="listing-table">
              <thead>
                <tr>
                  <th>Dir.</th>
                  <th>Hex</th>
                  <th>Binario por campos</th>
                  <th>Fuente ASM</th>
                </tr>
              </thead>
              <tbody>
                {assembleResult.instructions.map((ins) => {
                  const isActive = ins.address === view.instructionPc;
                  return (
                    <tr key={ins.address} className={isActive ? 'is-active-pc' : ''}>
                      <td>
                        <code>{formatHex32(ins.address)}</code>
                      </td>
                      <td>
                        <code>{ins.hex}</code>
                      </td>
                      <td>
                        <code className="bin-col">{ins.binary}</code>
                      </td>
                      <td className="src-col">
                        {isActive && <span className="pc-dot" title="PC actual" />}
                        <code>{ins.source}</code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No hay instrucciones ensambladas válidas.</p>
        )}
      </div>
    </div>
  );
}
