/**
 * PROPIETARIO: Fares Khalifa (Dia 5)
 * Inspector de instruccion actual (32 bits por campo: opcode, rs, rt, rd, shamt, funct, imm, index)
 * y listado ensamblado en Binario y Decimal.
 */
import type { AssembleResult, CpuSnapshot } from '@core/types';
import { REGISTER_NAMES, formatBin32 } from '@core/isa';
import { deriveDatapathView } from '../utils/datapathModel';
import { fmtAddrDec, fmtByteBin, fmtByteDec } from '../utils/numberFormat';

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
  const detectedFormat = view.controlsValid && ID_EX.valid
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
          meaning: `Decimal: ${view.slices.opcode} (Tipo R)`,
          tone: 'op',
        },
        {
          label: 'rs',
          range: '[25:21]',
          bits: bin.slice(6, 11),
          meaning: `Reg ${view.slices.rs} (${REGISTER_NAMES[view.slices.rs]})`,
          tone: 'rs',
        },
        {
          label: 'rt',
          range: '[20:16]',
          bits: bin.slice(11, 16),
          meaning: `Reg ${view.slices.rt} (${REGISTER_NAMES[view.slices.rt]})`,
          tone: 'rt',
        },
        {
          label: 'rd',
          range: '[15:11]',
          bits: bin.slice(16, 21),
          meaning: `Reg ${view.slices.rd} (${REGISTER_NAMES[view.slices.rd]})`,
          tone: 'rd',
        },
        {
          label: 'shamt',
          range: '[10:6]',
          bits: bin.slice(21, 26),
          meaning: `Decimal: ${view.slices.shamt}`,
          tone: 'shamt',
        },
        {
          label: 'funct',
          range: '[5:0]',
          bits: bin.slice(26, 32),
          meaning: `Decimal: ${view.slices.funct}`,
          tone: 'funct',
        },
      );
    } else if (detectedFormat === 'J') {
      segments.push(
        {
          label: 'opcode',
          range: '[31:26]',
          bits: bin.slice(0, 6),
          meaning: `Decimal: ${view.slices.opcode} (Tipo J)`,
          tone: 'op',
        },
        {
          label: 'jumpIndex',
          range: '[25:0]',
          bits: bin.slice(6, 32),
          meaning: `Índice palabra: ${view.slices.jumpIndex} (byte ${view.slices.jumpIndex * 4})`,
          tone: 'jump',
        },
      );
    } else {
      segments.push(
        {
          label: 'opcode',
          range: '[31:26]',
          bits: bin.slice(0, 6),
          meaning: `Decimal: ${view.slices.opcode} (Tipo I)`,
          tone: 'op',
        },
        {
          label: 'rs',
          range: '[25:21]',
          bits: bin.slice(6, 11),
          meaning: `Reg ${view.slices.rs} (${REGISTER_NAMES[view.slices.rs]})`,
          tone: 'rs',
        },
        {
          label: 'rt',
          range: '[20:16]',
          bits: bin.slice(11, 16),
          meaning: `Reg ${view.slices.rt} (${REGISTER_NAMES[view.slices.rt]})`,
          tone: 'rt',
        },
        {
          label: 'imm16',
          range: '[15:0]',
          bits: bin.slice(16, 32),
          meaning:
            view.slices.immSigned !== view.slices.imm16
              ? `Con signo: ${view.slices.immSigned} (sin signo: ${view.slices.imm16})`
              : `Decimal: ${view.slices.immSigned}`,
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
            PC activo: <code>{fmtAddrDec(view.instructionPc)}</code> · Formato:{' '}
            <code>{view.irWord !== null ? `${detectedFormat} (32 bits cargados)` : 'Pendiente IF'}</code>
          </p>
        </div>
        <span className="badge">
          {view.controlsValid && ID_EX.valid
            ? `${ID_EX.fields.mnemonic} · Formato ${ID_EX.fields.format}`
            : IF_ID.valid && view.irWord !== null
              ? `IR cargado (${detectedFormat})`
              : `${assembleResult?.instructions.length ?? 0} instr.`}
        </span>
      </div>

      {/* Big-Endian 4 bytes readout (8-bit Binary + Decimal) */}
      <div className="be-bytes-strip">
        <span className="be-strip-label">4 bytes Big-Endian (mem[PC..PC+3]):</span>
        <div className="be-strip-cells">
          {(view.bigEndianBytes ?? [null, null, null, null]).map((byteVal, idx) => (
            <span key={idx} className="be-byte-pill be-byte-pill--bin">
              <small>byte +{idx}</small>
              <code>{byteVal !== null ? fmtByteBin(byteVal) : '--------'}</code>
              <span className="be-byte-dec">
                {byteVal !== null ? `dec: ${fmtByteDec(byteVal)}` : '—'}
              </span>
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
          Avanza a la etapa <strong>IF</strong> para ver los 4 bytes en binario y los 32 bits
          desglosados por campo.
        </div>
      )}

      {/* Assembled Listing Table (Binary + Decimal only) */}
      <div className="listing-section">
        <div className="listing-header">
          <div>
            <h4>Listado Ensamblado</h4>
            <span className="muted">
              {assembleResult?.ok
                ? `${assembleResult.instructions.length} instrucciones en IMem`
                : 'Ensambla el programa para ver el listado'}
            </span>
          </div>
        </div>

        {assembleResult?.ok && assembleResult.instructions.length > 0 ? (
          <div className="listing-table-wrap">
            <table className="listing-table">
              <thead>
                <tr>
                  <th>Dir. (byte)</th>
                  <th>Binario (32 bits por campos)</th>
                  <th>Fuente ASM</th>
                </tr>
              </thead>
              <tbody>
                {assembleResult.instructions.map((ins) => {
                  const isActive = ins.address === view.instructionPc;
                  return (
                    <tr key={ins.address} className={isActive ? 'is-active-pc' : ''}>
                      <td>
                        <code>{ins.address}</code>
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
