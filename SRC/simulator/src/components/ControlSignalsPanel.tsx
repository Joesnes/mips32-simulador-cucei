/**
 * Panel de las 12 señales de la Unidad de Control y los 4 buffers intermedios
 * (IF/ID, ID/EX, EX/MEM, MEM/WB) con valores en Binario y Decimal.
 */
import type { CpuSnapshot } from '@core/types';
import { REGISTER_NAMES } from '@core/isa';
import { deriveControlSignalsView } from '../utils/datapathModel';
import {
  fmtAddrDec,
  fmtByteBin,
  fmtByteDec,
  fmtSignedDec,
  fmtWordBin32,
} from '../utils/numberFormat';

export interface ControlSignalsPanelProps {
  snapshot: CpuSnapshot;
}

const GROUP_TITLES: Record<'datapath' | 'memory' | 'flow', string> = {
  datapath: 'Ruta de Datos y Extensión',
  memory: 'Registros y Memoria',
  flow: 'Control de Flujo y ALU',
};

function BinDecValue({
  dec,
  bin,
}: {
  dec: string;
  bin: string;
}) {
  return (
    <span className="buf-val-stack">
      <strong className="buf-dec">{dec}</strong>
      <code className="buf-bin">{bin}</code>
    </span>
  );
}

export function ControlSignalsPanel({ snapshot }: ControlSignalsPanelProps) {
  const ctrlView = deriveControlSignalsView(snapshot);
  const updated = new Set(snapshot.lastChange?.buffersUpdated ?? []);
  const { IF_ID, ID_EX, EX_MEM, MEM_WB } = snapshot.buffers;

  const groups: Array<'datapath' | 'memory' | 'flow'> = ['datapath', 'memory', 'flow'];

  return (
    <div className="control-panel">
      <div className="panel-title">
        <div>
          <h3>Señales de Control (12) y Buffers Intermedios</h3>
          <p className="muted">
            {ctrlView.controlsValid
              ? `${ctrlView.sourceStageLabel} · ${ID_EX.fields.mnemonic} (${ID_EX.fields.format})`
              : 'Señales en espera: se activan al completar la etapa ID.'}
          </p>
        </div>
        <span className={`badge ${ctrlView.controlsValid ? 'badge-ok' : 'badge-muted'}`}>
          {ctrlView.controlsValid ? 'ID/EX Válido' : 'Pendiente ID'}
        </span>
      </div>

      {/* 12 Control Signals Matrix */}
      <div className="signals-sections">
        {groups.map((group) => (
          <div key={group} className="signals-group">
            <div className="signals-group-title">{GROUP_TITLES[group]}</div>
            <div className="signals-grid">
              {ctrlView.items
                .filter((item) => item.group === group)
                .map((item) => (
                  <div
                    key={item.key}
                    className={`signal-card ${
                      item.pending
                        ? 'signal-card--pending'
                        : item.isAsserted
                          ? 'signal-card--active'
                          : 'signal-card--zero'
                    }`}
                    title={item.meaning}
                  >
                    <div className="signal-head">
                      <span className="signal-name">{item.label}</span>
                      <span className="signal-value">{item.displayValue}</span>
                    </div>
                    <div className="signal-sub">{item.sublabel}</div>
                    <div className="signal-meaning">{item.meaning}</div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* 4 Intermediate Buffers */}
      <div className="buffers-section">
        <div className="buffers-header">
          <h4>Buffers Intermedios (Multiciclo: 1 instrucción activa)</h4>
          <span className="muted">
            Última etapa: <strong>{snapshot.lastStage ?? 'Ninguna (Reset)'}</strong>
          </span>
        </div>

        <div className="buffers-grid">
          {/* IF/ID */}
          <article
            className={`buffer-card ${IF_ID.valid ? 'buffer-card--valid' : 'buffer-card--empty'} ${
              updated.has('IF_ID') ? 'buffer-card--updated' : ''
            }`}
          >
            <header className="buffer-card-head">
              <div>
                <span className="buffer-name">IF / ID</span>
                <span className="buffer-load-tag">Carga en IF</span>
              </div>
              <div className="buffer-badges">
                {updated.has('IF_ID') && <span className="badge badge-pulse">Actualizado</span>}
                <span className={`badge ${IF_ID.valid ? 'badge-ok' : 'badge-muted'}`}>
                  {IF_ID.valid ? 'Válido' : 'Vacío'}
                </span>
              </div>
            </header>
            <dl className="buffer-fields">
              <div>
                <dt>pc / pcPlus4</dt>
                <dd>
                  <code>
                    {IF_ID.valid
                      ? `${fmtAddrDec(IF_ID.pc)} / ${fmtAddrDec(IF_ID.pcPlus4)}`
                      : '—'}
                  </code>
                </dd>
              </div>
              <div>
                <dt>bytes Big-Endian</dt>
                <dd>
                  <code>
                    {IF_ID.valid
                      ? IF_ID.bytes.map((b) => `${fmtByteBin(b)} (${fmtByteDec(b)})`).join(' · ')
                      : '—'}
                  </code>
                </dd>
              </div>
              <div>
                <dt>instruction (IR)</dt>
                <dd>
                  {IF_ID.valid ? (
                    <code className="buf-bin">{fmtWordBin32(IF_ID.instruction)}</code>
                  ) : (
                    <code>—</code>
                  )}
                </dd>
              </div>
            </dl>
          </article>

          {/* ID/EX */}
          <article
            className={`buffer-card ${ID_EX.valid ? 'buffer-card--valid' : 'buffer-card--empty'} ${
              updated.has('ID_EX') ? 'buffer-card--updated' : ''
            }`}
          >
            <header className="buffer-card-head">
              <div>
                <span className="buffer-name">ID / EX</span>
                <span className="buffer-load-tag">Carga en ID</span>
              </div>
              <div className="buffer-badges">
                {updated.has('ID_EX') && <span className="badge badge-pulse">Actualizado</span>}
                <span className={`badge ${ID_EX.valid ? 'badge-ok' : 'badge-muted'}`}>
                  {ID_EX.valid ? 'Válido' : 'Vacío'}
                </span>
              </div>
            </header>
            <dl className="buffer-fields">
              <div>
                <dt>Instrucción</dt>
                <dd>
                  <code>
                    {ID_EX.valid ? `${ID_EX.fields.mnemonic} (${ID_EX.fields.format})` : '—'}
                  </code>
                </dd>
              </div>
              <div>
                <dt>rs / rt / rd</dt>
                <dd>
                  <code>
                    {ID_EX.valid
                      ? `${REGISTER_NAMES[ID_EX.fields.rs]} / ${REGISTER_NAMES[ID_EX.fields.rt]} / ${REGISTER_NAMES[ID_EX.fields.rd]}`
                      : '—'}
                  </code>
                </dd>
              </div>
              <div>
                <dt>A (DR1) / B (DR2)</dt>
                <dd>
                  {ID_EX.valid ? (
                    <BinDecValue
                      dec={`A=${fmtSignedDec(ID_EX.A)} / B=${fmtSignedDec(ID_EX.B)}`}
                      bin={`${fmtWordBin32(ID_EX.A)}`}
                    />
                  ) : (
                    <code>—</code>
                  )}
                </dd>
              </div>
              <div>
                <dt>immExt ({ID_EX.valid ? ID_EX.ctrl.ExtOp : '—'})</dt>
                <dd>
                  {ID_EX.valid ? (
                    <BinDecValue
                      dec={fmtSignedDec(ID_EX.immExt)}
                      bin={fmtWordBin32(ID_EX.immExt)}
                    />
                  ) : (
                    <code>—</code>
                  )}
                </dd>
              </div>
            </dl>
          </article>

          {/* EX/MEM */}
          <article
            className={`buffer-card ${EX_MEM.valid ? 'buffer-card--valid' : 'buffer-card--empty'} ${
              updated.has('EX_MEM') ? 'buffer-card--updated' : ''
            }`}
          >
            <header className="buffer-card-head">
              <div>
                <span className="buffer-name">EX / MEM</span>
                <span className="buffer-load-tag">Carga en EX</span>
              </div>
              <div className="buffer-badges">
                {updated.has('EX_MEM') && <span className="badge badge-pulse">Actualizado</span>}
                <span className={`badge ${EX_MEM.valid ? 'badge-ok' : 'badge-muted'}`}>
                  {EX_MEM.valid ? 'Válido' : 'Vacío'}
                </span>
              </div>
            </header>
            <dl className="buffer-fields">
              <div>
                <dt>ALU A / B</dt>
                <dd>
                  <code>
                    {EX_MEM.valid
                      ? `${fmtSignedDec(EX_MEM.aluOperandA)} / ${fmtSignedDec(EX_MEM.aluOperandB)}`
                      : '—'}
                  </code>
                </dd>
              </div>
              <div>
                <dt>ALUOut / Zero</dt>
                <dd>
                  {EX_MEM.valid ? (
                    <BinDecValue
                      dec={`${fmtSignedDec(EX_MEM.aluResult)} · Zero=${EX_MEM.zero ? '1' : '0'}`}
                      bin={fmtWordBin32(EX_MEM.aluResult)}
                    />
                  ) : (
                    <code>—</code>
                  )}
                </dd>
              </div>
              <div>
                <dt>writeData / AW</dt>
                <dd>
                  <code>
                    {EX_MEM.valid
                      ? `${fmtSignedDec(EX_MEM.writeData)} / ${REGISTER_NAMES[EX_MEM.writeReg]}`
                      : '—'}
                  </code>
                </dd>
              </div>
              <div>
                <dt>branchTaken / nextPC</dt>
                <dd>
                  <code>
                    {EX_MEM.valid
                      ? `${EX_MEM.branchTaken ? 'Sí (1)' : 'No (0)'} / ${fmtAddrDec(EX_MEM.nextPC)}`
                      : '—'}
                  </code>
                </dd>
              </div>
            </dl>
          </article>

          {/* MEM/WB */}
          <article
            className={`buffer-card ${MEM_WB.valid ? 'buffer-card--valid' : 'buffer-card--empty'} ${
              updated.has('MEM_WB') ? 'buffer-card--updated' : ''
            }`}
          >
            <header className="buffer-card-head">
              <div>
                <span className="buffer-name">MEM / WB</span>
                <span className="buffer-load-tag">Carga en MEM</span>
              </div>
              <div className="buffer-badges">
                {updated.has('MEM_WB') && <span className="badge badge-pulse">Actualizado</span>}
                <span className={`badge ${MEM_WB.valid ? 'badge-ok' : 'badge-muted'}`}>
                  {MEM_WB.valid ? 'Válido' : 'Vacío'}
                </span>
              </div>
            </header>
            <dl className="buffer-fields">
              <div>
                <dt>memReadData (MDR)</dt>
                <dd>
                  {MEM_WB.valid ? (
                    <BinDecValue
                      dec={fmtSignedDec(MEM_WB.memReadData)}
                      bin={fmtWordBin32(MEM_WB.memReadData)}
                    />
                  ) : (
                    <code>—</code>
                  )}
                </dd>
              </div>
              <div>
                <dt>aluResult</dt>
                <dd>
                  <code>{MEM_WB.valid ? fmtSignedDec(MEM_WB.aluResult) : '—'}</code>
                </dd>
              </div>
              <div>
                <dt>Dw (writeBackData) / AW</dt>
                <dd>
                  {MEM_WB.valid ? (
                    <BinDecValue
                      dec={`${fmtSignedDec(MEM_WB.writeBackData)} → ${REGISTER_NAMES[MEM_WB.writeReg]}`}
                      bin={fmtWordBin32(MEM_WB.writeBackData)}
                    />
                  ) : (
                    <code>—</code>
                  )}
                </dd>
              </div>
              <div>
                <dt>nextPC</dt>
                <dd>
                  <code>{MEM_WB.valid ? fmtAddrDec(MEM_WB.nextPC) : '—'}</code>
                </dd>
              </div>
            </dl>
          </article>
        </div>
      </div>
    </div>
  );
}
