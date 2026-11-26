/**
 * PROPIETARIO: Fares Khalifa (Dia 6)
 * Visualizador del Banco de Registros ($0-$31), Memoria de Instrucciones (bytes big-endian)
 * y Memoria de Datos (palabras/bytes big-endian) con resaltado de cambios.
 */
import { useState } from 'react';
import type { CpuSnapshot } from '@core/types';
import {
  REGISTER_NAMES,
  bytesToWordBigEndian,
  formatHex32,
  formatHexByte,
  toInt32,
} from '@core/isa';

export interface MemoryRegistersPanelProps {
  snapshot: CpuSnapshot;
}

type MemoryTab = 'regs' | 'imem' | 'dmem';

export function MemoryRegistersPanel({ snapshot }: MemoryRegistersPanelProps) {
  const [activeTab, setActiveTab] = useState<MemoryTab>('regs');
  const [onlyNonZeroData, setOnlyNonZeroData] = useState<boolean>(false);

  const regChanged = snapshot.lastChange?.registerChanged;
  const memChanged = snapshot.lastChange?.memoryChanged;
  const activeFetchPc =
    snapshot.error?.stage === 'IF' || !snapshot.buffers.IF_ID.valid
      ? snapshot.pc
      : snapshot.buffers.IF_ID.pc;

  // Agrupar IMem en filas de 4 bytes big-endian
  const imemRows: Array<{
    address: number;
    bytes: [number, number | null, number | null, number | null];
    word: number | null;
  }> = [];
  for (let addr = 0; addr < snapshot.instructionMemory.length; addr += 4) {
    const b0 = snapshot.instructionMemory[addr];
    const b1 = addr + 1 < snapshot.instructionMemory.length ? snapshot.instructionMemory[addr + 1] : null;
    const b2 = addr + 2 < snapshot.instructionMemory.length ? snapshot.instructionMemory[addr + 2] : null;
    const b3 = addr + 3 < snapshot.instructionMemory.length ? snapshot.instructionMemory[addr + 3] : null;
    const word =
      b1 !== null && b2 !== null && b3 !== null
        ? bytesToWordBigEndian(b0, b1, b2, b3)
        : null;
    imemRows.push({ address: addr, bytes: [b0, b1, b2, b3], word });
  }

  // Agrupar DMem en palabras de 4 bytes big-endian
  const dmemRows: Array<{
    address: number;
    bytes: [number, number, number, number];
    word: number;
    signed: number;
  }> = [];
  for (let addr = 0; addr + 3 < snapshot.dataMemory.length; addr += 4) {
    const b0 = snapshot.dataMemory[addr];
    const b1 = snapshot.dataMemory[addr + 1];
    const b2 = snapshot.dataMemory[addr + 2];
    const b3 = snapshot.dataMemory[addr + 3];
    const word = bytesToWordBigEndian(b0, b1, b2, b3);
    dmemRows.push({
      address: addr,
      bytes: [b0, b1, b2, b3],
      word,
      signed: toInt32(word),
    });
  }

  const visibleDmemRows = onlyNonZeroData
    ? dmemRows.filter(
        (r) =>
          r.word !== 0 ||
          (memChanged && memChanged.address === r.address),
      )
    : dmemRows;

  return (
    <div className="memory-regs-panel">
      <div className="panel-title">
        <div>
          <h2>Banco de Registros y Memorias</h2>
          <p className="muted">
            {snapshot.lastChange?.summary ?? 'Estado inicial limpio (Big-Endian)'}
          </p>
        </div>
        <div className="mem-tabs" role="tablist" aria-label="Inspección de estado">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'regs'}
            className={`tab-btn ${activeTab === 'regs' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('regs')}
          >
            Registros (32)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'imem'}
            className={`tab-btn ${activeTab === 'imem' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('imem')}
          >
            Mem. Instrucciones ({snapshot.instructionMemory.length}B)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dmem'}
            className={`tab-btn ${activeTab === 'dmem' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('dmem')}
          >
            Mem. Datos ({snapshot.dataMemory.length}B)
          </button>
        </div>
      </div>

      {/* Prominent Error Banner */}
      {snapshot.error && (
        <div className="cpu-error-banner" role="alert">
          <div>
            <strong>
              Error en etapa {snapshot.error.stage} [{snapshot.error.code}]
            </strong>{' '}
            · PC=<code>{formatHex32(snapshot.error.pc)}</code>
            {snapshot.error.address !== undefined && (
              <>
                {' '}
                · Dirección=<code>{formatHex32(snapshot.error.address)}</code>
              </>
            )}
          </div>
          <p>{snapshot.error.message}</p>
        </div>
      )}

      {/* Tab 1: 32 Registers */}
      {activeTab === 'regs' && (
        <div className="regs-grid" aria-label="Los 32 registros MIPS">
          {snapshot.registers.map((val, idx) => {
            const isChanged = regChanged?.index === idx;
            const signedVal = toInt32(val);
            const isNonZero = val !== 0;
            return (
              <div
                key={idx}
                className={`reg-card ${isChanged ? 'reg-card--changed' : ''} ${
                  isNonZero ? 'reg-card--nonzero' : ''
                }`}
              >
                <div className="reg-card-top">
                  <span className="reg-name">
                    {REGISTER_NAMES[idx]} <small className="reg-num">${idx}</small>
                  </span>
                  {idx === 0 && <span className="reg-tag">Fijo 0</span>}
                  {isChanged && <span className="reg-tag reg-tag--change">Actualizado</span>}
                </div>
                <div className="reg-card-values">
                  <code>{formatHex32(val)}</code>
                  <span className="reg-dec">{signedVal}</span>
                </div>
                {isChanged && regChanged && (
                  <div className="reg-diff">
                    Antes: <code>{formatHex32(regChanged.before)}</code>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Instruction Memory (byte-by-byte Big-Endian) */}
      {activeTab === 'imem' && (
        <div className="mem-table-wrap">
          {imemRows.length === 0 ? (
            <p className="muted">
              Memoria de instrucciones vacía. Pulsa <strong>Ensamblar</strong> para cargar el programa.
            </p>
          ) : (
            <table className="mem-table">
              <thead>
                <tr>
                  <th>Dirección base</th>
                  <th>Byte +0 (MSB)</th>
                  <th>Byte +1</th>
                  <th>Byte +2</th>
                  <th>Byte +3 (LSB)</th>
                  <th>Palabra 32b (Big-Endian)</th>
                </tr>
              </thead>
              <tbody>
                {imemRows.map((row) => {
                  const isActivePc = row.address === activeFetchPc;
                  return (
                    <tr key={row.address} className={isActivePc ? 'is-active-pc' : ''}>
                      <td>
                        <code>{formatHex32(row.address)}</code>
                        {isActivePc && <span className="row-pill">PC..PC+3</span>}
                      </td>
                      {row.bytes.map((b, i) => (
                        <td key={i}>
                          <code className="byte-cell">
                            {b !== null ? `0x${formatHexByte(b)}` : '--'}
                          </code>
                        </td>
                      ))}
                      <td>
                        <code>{row.word !== null ? formatHex32(row.word) : '—'}</code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 3: Data Memory (word + 4 bytes Big-Endian) */}
      {activeTab === 'dmem' && (
        <div>
          <div className="dmem-toolbar">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={onlyNonZeroData}
                onChange={(e) => setOnlyNonZeroData(e.target.checked)}
              />
              Mostrar solo palabras distintas de cero (o modificadas)
            </label>
            {memChanged && (
              <span className="badge badge-ok">
                Última escritura: {formatHex32(memChanged.address)} ({formatHex32(memChanged.before)} →{' '}
                {formatHex32(memChanged.after)})
              </span>
            )}
          </div>

          <div className="mem-table-wrap">
            {visibleDmemRows.length === 0 ? (
              <p className="muted">
                Todas las palabras de Memoria de Datos están en 0x00000000.
              </p>
            ) : (
              <table className="mem-table">
                <thead>
                  <tr>
                    <th>Dirección</th>
                    <th>Palabra 32b (Hex)</th>
                    <th>Entero (con signo)</th>
                    <th>Bytes Big-Endian [+0..+3]</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDmemRows.map((row) => {
                    const isModified = memChanged?.address === row.address;
                    return (
                      <tr
                        key={row.address}
                        className={`${isModified ? 'is-mem-changed' : ''} ${
                          row.word !== 0 ? 'is-nonzero' : ''
                        }`}
                      >
                        <td>
                          <code>{formatHex32(row.address)}</code>
                          {isModified && <span className="row-pill row-pill--green">Modificado</span>}
                        </td>
                        <td>
                          <code>{formatHex32(row.word)}</code>
                        </td>
                        <td>
                          <code>{row.signed}</code>
                        </td>
                        <td>
                          <code className="bytes-inline">
                            [{row.bytes.map(formatHexByte).join(' ')}]
                          </code>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
