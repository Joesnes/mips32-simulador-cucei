/**
 * Diagrama SVG interactivo del Datapath MIPS32 (Modalidad B — estilo MIPS 101).
 * Usa exclusivamente BINARIO y DECIMAL, muestra la progresión real etapa por etapa
 * sin adelantar valores futuros y permite inspeccionar Entradas/Salidas por bloque.
 */
import { useEffect, useState } from 'react';
import type { CpuSnapshot, Stage } from '@core/types';
import { REGISTER_NAMES } from '@core/isa';
import {
  deriveDatapathView,
  getBlockInspectorInfo,
  type DatapathBlockId,
  type DatapathViewModel,
  type DatapathWireId,
} from '../utils/datapathModel';
import {
  fmtAddrDec,
  fmtBits,
  fmtByteBin,
  fmtByteDec,
  fmtSignedDec,
  fmtUnsignedDec,
} from '../utils/numberFormat';

export interface DatapathSVGProps {
  snapshot: CpuSnapshot;
}

const STAGE_ORDER: Stage[] = ['IF', 'ID', 'EX', 'MEM', 'WB'];

const STAGE_META: Record<Stage, { label: string; x: number; width: number; accent: string }> = {
  IF: { label: '1 · IF (Búsqueda)', x: 138, width: 184, accent: '#0A84FF' },
  ID: { label: '2 · ID (Decodificación)', x: 494, width: 184, accent: '#BF5AF2' },
  EX: { label: '3 · EX (Ejecución)', x: 900, width: 184, accent: '#FF9F0A' },
  MEM: { label: '4 · MEM (Memoria)', x: 1214, width: 184, accent: '#64D2FF' },
  WB: { label: '5 · WB (Escritura)', x: 1428, width: 168, accent: '#30D158' },
};

function fmtDecOrDash(val: number | null): string {
  return val === null ? '—' : fmtSignedDec(val);
}

function fmtByteDecOrDash(val: number | null): string {
  return val === null ? '—' : `byte ${fmtUnsignedDec(val)}`;
}

function wireStrokeColor(wireId: DatapathWireId, view: DatapathViewModel): string {
  if (view.hasError && view.activeWires[wireId]) return '#FF453A';
  if (!view.activeWires[wireId]) return 'rgba(255, 255, 255, 0.14)';

  if (wireId.includes('CTRL') || wireId.includes('ALUCTL') || wireId.includes('REGDST')) {
    return '#BF5AF2';
  }
  if (
    wireId.includes('NEXTPC') ||
    wireId.includes('BRANCH') ||
    wireId.includes('BR_ADDER') ||
    wireId.includes('BRLOGIC') ||
    wireId.includes('PCSRC') ||
    wireId.includes('JUMP') ||
    wireId.includes('SHIFT')
  ) {
    return '#FF9F0A';
  }
  if (wireId.includes('DMEM') || wireId.includes('BYPASS')) {
    return '#64D2FF';
  }
  if (wireId.includes('MEMTOREG') || wireId.includes('BR_DW') || wireId.includes('BR_AW')) {
    return '#30D158';
  }
  return '#0A84FF';
}

function wireArrowMarker(wireId: DatapathWireId, view: DatapathViewModel): string {
  if (!view.activeWires[wireId]) return 'url(#dp-arrow-muted)';
  const color = wireStrokeColor(wireId, view);
  switch (color) {
    case '#FF453A':
      return 'url(#dp-arrow-red)';
    case '#BF5AF2':
      return 'url(#dp-arrow-purple)';
    case '#FF9F0A':
      return 'url(#dp-arrow-orange)';
    case '#64D2FF':
      return 'url(#dp-arrow-cyan)';
    case '#30D158':
      return 'url(#dp-arrow-green)';
    default:
      return 'url(#dp-arrow-active)';
  }
}

interface WirePathProps {
  id: DatapathWireId;
  d: string;
  view: DatapathViewModel;
  hasArrow?: boolean;
  pulse?: boolean;
}

function WirePath({ id, d, view, hasArrow = true, pulse = true }: WirePathProps) {
  const isActive = view.activeWires[id];
  const color = wireStrokeColor(id, view);
  const markerEnd = hasArrow ? wireArrowMarker(id, view) : undefined;

  return (
    <g className={isActive ? 'dp-wire dp-wire--active' : 'dp-wire'}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={isActive ? 2.6 : 1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={markerEnd}
      />
      {isActive && (
        <path
          d={d}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={0.75}
          strokeWidth={2}
          strokeDasharray="6 12"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="dp-wire-flow"
        />
      )}
      {isActive && pulse && (
        <circle r={3.8} fill={color} className="dp-wire-pulse">
          <animateMotion dur="1.35s" repeatCount="indefinite" path={d} />
        </circle>
      )}
    </g>
  );
}

interface WireBadgeProps {
  x: number;
  y: number;
  text: string;
  tone?: 'blue' | 'purple' | 'orange' | 'cyan' | 'green';
}

function WireBadge({ x, y, text, tone = 'blue' }: WireBadgeProps) {
  const width = Math.max(66, text.length * 6.6 + 16);
  return (
    <g className={`dp-wire-badge dp-wire-badge--${tone}`} transform={`translate(${x}, ${y})`}>
      <rect x={-width / 2} y={-11} width={width} height={22} rx={11} />
      <text x={0} y={3.5} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}

export function DatapathSVG({ snapshot }: DatapathSVGProps) {
  const view = deriveDatapathView(snapshot);
  const [pinnedBlock, setPinnedBlock] = useState<DatapathBlockId | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<DatapathBlockId | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPinnedBlock(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const inspectedBlockId = pinnedBlock ?? hoveredBlock;
  const inspectedInfo = inspectedBlockId
    ? getBlockInspectorInfo(inspectedBlockId, view, snapshot)
    : null;

  const blockClass = (id: DatapathBlockId, stage?: Stage): string => {
    const classes = ['dp-block'];
    if (view.errorBlock === id) {
      classes.push('dp-block--error');
    } else if (view.activeBlocks[id]) {
      classes.push('dp-block--active');
    } else if (stage && !view.stageReached[stage]) {
      classes.push('dp-stage-group--future');
    } else if (stage && view.stageReached[stage]) {
      classes.push('dp-stage-group--done');
    }
    if (pinnedBlock === id || hoveredBlock === id) {
      classes.push('dp-block--selected');
    }
    return classes.join(' ');
  };

  const bindBlockEvents = (id: DatapathBlockId) => ({
    onMouseEnter: () => setHoveredBlock(id),
    onMouseLeave: () => setHoveredBlock((prev) => (prev === id ? null : prev)),
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      setPinnedBlock((prev) => (prev === id ? null : id));
    },
    role: 'button' as const,
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setPinnedBlock((prev) => (prev === id ? null : id));
      }
    },
  });

  const { IF_ID, ID_EX, EX_MEM, MEM_WB } = snapshot.buffers;
  const f = view.stageReached.ID && ID_EX.valid ? ID_EX.fields : null;

  return (
    <div className="datapath-container">
      <div className="panel-title datapath-header">
        <div>
          <h2>Ruta de Datos MIPS32 (MIPS 101 · Multiciclo 5 Etapas)</h2>
          <p className="muted dp-subtitle">
            Todo en binario y decimal. Haz clic o pasa el cursor sobre cualquier bloque para ver qué
            recibe y qué entrega.
          </p>
        </div>
        <div className="dp-header-badges">
          <span className="badge badge-cycle">Ciclo {snapshot.cycle}</span>
          <span className="badge badge-stage-active">
            Etapa activa: {view.activeStage ?? 'LISTO'}
          </span>
          <span className="badge badge-stage-next">Próxima: {view.nextStage}</span>
          <span className="badge badge-pc">PC: {fmtAddrDec(view.pc)}</span>
        </div>
      </div>

      {/* Franja animada con el cambio exacto de este ciclo */}
      <div
        key={snapshot.cycle}
        className={`dp-cycle-change-bar tone-${
          view.hasError ? 'error' : view.activeStage?.toLowerCase() ?? 'neutral'
        }`}
        aria-live="polite"
      >
        <span className="dp-cycle-chip">
          {view.activeStage ? `Etapa ${view.activeStage}` : 'Inicio'}
        </span>
        <span className="dp-cycle-text">{view.cycleSummary}</span>
      </div>

      <div className="dp-svg-scroll" onClick={() => setPinnedBlock(null)}>
        <svg
          className="datapath-svg"
          viewBox="0 0 1524 765"
          role="img"
          aria-label="Diagrama interactivo de ruta de datos MIPS32 de 5 etapas"
        >
          <defs>
            <marker
              id="dp-arrow-muted"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="rgba(255,255,255,0.3)" />
            </marker>
            <marker
              id="dp-arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0A84FF" />
            </marker>
            <marker
              id="dp-arrow-purple"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#BF5AF2" />
            </marker>
            <marker
              id="dp-arrow-orange"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#FF9F0A" />
            </marker>
            <marker
              id="dp-arrow-cyan"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#64D2FF" />
            </marker>
            <marker
              id="dp-arrow-green"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#30D158" />
            </marker>
            <marker
              id="dp-arrow-red"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#FF453A" />
            </marker>
            <filter id="dp-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Stage Header Pills */}
          {STAGE_ORDER.map((stage) => {
            const meta = STAGE_META[stage];
            const isCurrent = view.activeStage === stage;
            const isDone = view.stageReached[stage];
            const isErr = view.errorStage === stage;
            return (
              <g key={stage}>
                <rect
                  x={meta.x - meta.width / 2}
                  y={10}
                  width={meta.width}
                  height={28}
                  rx={14}
                  fill={
                    isErr
                      ? 'rgba(255, 69, 58, 0.24)'
                      : isCurrent
                        ? 'rgba(255, 255, 255, 0.14)'
                        : isDone
                          ? 'rgba(255, 255, 255, 0.06)'
                          : 'rgba(255, 255, 255, 0.02)'
                  }
                  stroke={
                    isErr
                      ? '#FF453A'
                      : isCurrent
                        ? meta.accent
                        : isDone
                          ? 'rgba(255,255,255,0.22)'
                          : 'rgba(255,255,255,0.06)'
                  }
                  strokeWidth={isCurrent || isErr ? 1.8 : 1}
                />
                <text
                  x={meta.x}
                  y={28}
                  textAnchor="middle"
                  className="dp-stage-pill-text"
                  fill={isErr ? '#FF453A' : isCurrent ? '#FFFFFF' : isDone ? '#D1D1D6' : '#6E6E73'}
                >
                  {meta.label}
                </text>
              </g>
            );
          })}

          {/* Subtle Stage Column Guides */}
          <rect x={16} y={46} width={242} height={706} rx={16} className="dp-stage-zone" />
          <rect x={320} y={46} width={350} height={706} rx={16} className="dp-stage-zone" />
          <rect x={732} y={46} width={336} height={706} rx={16} className="dp-stage-zone" />
          <rect x={1130} y={46} width={168} height={706} rx={16} className="dp-stage-zone" />
          <rect x={1360} y={46} width={148} height={706} rx={16} className="dp-stage-zone" />

          {/* ================= DATA & CONTROL WIRES ================= */}
          {/* IF Wires */}
          <WirePath id="PC_TO_IMEM" d="M 110 314 L 134 314" view={view} />
          <WirePath id="PC_TO_ADD4" d="M 118 314 L 118 165 L 138 165" view={view} />
          <WirePath id="ADD4_TO_IFID" d="M 234 165 L 270 165" view={view} />
          <WirePath id="IMEM_TO_BE" d="M 189 354 L 189 384" view={view} />
          <WirePath id="BE_TO_IFID" d="M 254 446 L 270 446" view={view} />

          {/* ID Wires */}
          <WirePath id="IFID_TO_FIELDS" d="M 312 355 L 328 355" view={view} />
          <WirePath
            id="FIELDS_TO_CTRL"
            d="M 466 264 L 477 264 L 477 172 L 500 172"
            view={view}
          />
          <WirePath id="FIELDS_TO_BR" d="M 466 306 L 500 306" view={view} />
          <WirePath
            id="FIELDS_TO_REGDST"
            d="M 466 332 L 477 332 L 477 604 L 680 604"
            view={view}
            hasArrow={false}
            pulse={false}
          />
          <WirePath
            id="FIELDS_TO_ALUCTL"
            d="M 466 394 L 482 394 L 482 584 L 680 584"
            view={view}
            hasArrow={false}
            pulse={false}
          />
          <WirePath
            id="FIELDS_TO_EXT"
            d="M 466 424 L 487 424 L 487 522 L 500 522"
            view={view}
          />
          <WirePath
            id="FIELDS_TO_JUMP"
            d="M 466 454 L 472 454 L 472 106 L 746 106"
            view={view}
          />
          <WirePath id="CTRL_TO_IDEX" d="M 662 172 L 680 172" view={view} />
          <WirePath id="BR_TO_IDEX" d="M 662 345 L 680 345" view={view} />
          <WirePath id="EXT_TO_IDEX" d="M 662 522 L 680 522" view={view} />

          {/* EX Wires & Dual-Input Muxes */}
          <WirePath id="IDEX_TO_ALU_A" d="M 722 328 L 836 328" view={view} />
          <WirePath id="IDEX_TO_ALUSRC" d="M 722 380 L 764 380" view={view} />
          <WirePath
            id="IDEX_TO_ALUSRC_IMM"
            d="M 722 522 L 742 522 L 742 428 L 764 428"
            view={view}
          />
          <WirePath id="ALUSRC_TO_ALU_B" d="M 804 400 L 836 400" view={view} />
          <WirePath id="IDEX_TO_ALUCTL" d="M 722 507 L 844 507" view={view} />
          <WirePath id="ALUCTL_TO_ALU" d="M 908 476 L 908 452" view={view} />
          <WirePath id="IDEX_TO_REGDST" d="M 722 584 L 764 584" view={view} />
          <WirePath id="IDEX_RD_TO_REGDST" d="M 722 628 L 764 628" view={view} />
          <WirePath id="REGDST_TO_EXMEM" d="M 804 603 L 1078 603" view={view} />
          <WirePath id="ALU_TO_EXMEM" d="M 976 386 L 1078 386" view={view} />
          <WirePath
            id="IDEX_PC4_TO_PCSRC"
            d="M 722 136 L 942 136 L 942 150 L 954 150"
            view={view}
          />
          <WirePath id="IDEX_TO_SHIFT" d="M 722 174 L 746 174" view={view} />
          <WirePath id="SHIFT_TO_BR_ADDER" d="M 820 174 L 838 174" view={view} />
          <WirePath id="BR_ADDER_TO_PCSRC" d="M 934 195 L 954 195" view={view} />
          <WirePath
            id="ALU_ZERO_TO_BRLOGIC"
            d="M 976 336 L 992 336 L 992 242 L 934 242"
            view={view}
          />
          <WirePath id="BRLOGIC_TO_PCSRC" d="M 934 226 L 973 226 L 973 208" view={view} />
          <WirePath id="PCSRC_TO_MUXJUMP" d="M 992 156 L 1012 156" view={view} />
          <WirePath id="JUMP_TO_MUXJUMP" d="M 864 112 L 1012 112" view={view} />
          <WirePath id="MUXJUMP_TO_EXMEM" d="M 1050 132 L 1078 132" view={view} />

          {/* MEM Wires */}
          <WirePath id="EXMEM_TO_DMEM_ADDR" d="M 1120 346 L 1144 346" view={view} />
          <WirePath id="EXMEM_TO_DMEM_DATA" d="M 1120 426 L 1144 426" view={view} />
          <WirePath id="DMEM_TO_MEMWB" d="M 1288 388 L 1308 388" view={view} />
          <WirePath id="EXMEM_BYPASS_MEMWB" d="M 1120 268 L 1308 268" view={view} />

          {/* WB & Feedback Wires */}
          <WirePath id="MEMWB_TO_MEMTOREG" d="M 1350 338 L 1390 338" view={view} />
          <WirePath id="MEMWB_MDR_TO_MEMTOREG" d="M 1350 388 L 1390 388" view={view} />
          <WirePath
            id="MEMTOREG_TO_BR_DW"
            d="M 1434 362 L 1464 362 L 1464 712 L 491 712 L 491 360 L 500 360"
            view={view}
          />
          <WirePath
            id="MEMWB_TO_BR_AW"
            d="M 1329 688 L 1329 736 L 495 736 L 495 340 L 500 340"
            view={view}
          />
          <WirePath
            id="MEMWB_NEXTPC_TO_PC"
            d="M 1329 78 L 1329 58 L 68 58 L 68 266"
            view={view}
          />

          {/* Wire Rail Labels (solo Decimal claro) */}
          <text x={690} y={53} textAnchor="middle" className="dp-wire-tag">
            nextPC → PC {view.nextPC !== null ? `(${fmtAddrDec(view.nextPC)})` : ''}
          </text>
          <text x={940} y={706} textAnchor="middle" className="dp-wire-tag">
            Dw (Dato a escribir en BR){' '}
            {view.dw !== null ? `= ${fmtSignedDec(view.dw)}` : ''}
          </text>
          <text x={940} y={730} textAnchor="middle" className="dp-wire-tag">
            AW (Registro destino) {view.aw !== null ? `= ${REGISTER_NAMES[view.aw]}` : ''}
          </text>

          {/* ================= STAGE 1: IF ================= */}
          {/* PC */}
          <g className={blockClass('PC')} {...bindBlockEvents('PC')}>
            <rect x={26} y={266} width={84} height={96} rx={12} className="dp-box" />
            <text x={68} y={290} textAnchor="middle" className="dp-title">PC</text>
            <text x={68} y={306} textAnchor="middle" className="dp-sub">Dirección actual</text>
            <rect x={31} y={316} width={74} height={24} rx={6} className="dp-pill" />
            <text x={68} y={332} textAnchor="middle" className="dp-mono">
              {fmtAddrDec(view.pc)}
            </text>
            <text x={68} y={353} textAnchor="middle" className="dp-mono-xs">
              …{fmtBits(view.pc, 8)}
            </text>
          </g>

          {/* PC + 4 */}
          <g className={blockClass('PC_PLUS_4', 'IF')} {...bindBlockEvents('PC_PLUS_4')}>
            <rect x={138} y={132} width={96} height={66} rx={12} className="dp-box" />
            <text x={186} y={154} textAnchor="middle" className="dp-title">Sumador +4</text>
            <text x={186} y={170} textAnchor="middle" className="dp-sub">PC + 4</text>
            <text x={186} y={188} textAnchor="middle" className="dp-mono-sm">
              {view.stageReached.IF ? fmtAddrDec(view.pcPlus4) : 'En espera'}
            </text>
          </g>

          {/* IMem */}
          <g className={blockClass('IMEM', 'IF')} {...bindBlockEvents('IMEM')}>
            <rect x={134} y={236} width={110} height={118} rx={12} className="dp-box" />
            <text x={189} y={260} textAnchor="middle" className="dp-title">IMem</text>
            <text x={189} y={276} textAnchor="middle" className="dp-sub">Mem. Instrucciones</text>
            <text x={189} y={298} textAnchor="middle" className="dp-port">
              {view.stageReached.IF ? `Dir: ${fmtAddrDec(view.instructionPc)}` : 'En espera IF'}
            </text>
            <text x={189} y={318} textAnchor="middle" className="dp-sub">1 byte / dirección</text>
            <text x={189} y={338} textAnchor="middle" className="dp-mono-sm">
              {snapshot.instructionMemory.length} B totales
            </text>
          </g>

          {/* Reunión Big-Endian */}
          <g className={blockClass('BIG_ENDIAN', 'IF')} {...bindBlockEvents('BIG_ENDIAN')}>
            <rect x={122} y={384} width={134} height={134} rx={12} className="dp-box dp-box-accent" />
            <text x={189} y={404} textAnchor="middle" className="dp-title-sm">
              Reunión Big-Endian
            </text>
            <text x={189} y={419} textAnchor="middle" className="dp-sub">
              {view.bigEndianBytes ? '4 bytes → 32 bits' : 'En espera de IF'}
            </text>
            {(view.bigEndianBytes ?? [null, null, null, null]).map((byteVal, idx) => (
              <g key={idx} transform={`translate(${129 + idx * 30}, 430)`}>
                <rect width={27} height={38} rx={5} className="dp-byte-cell" />
                <text x={13.5} y={13} textAnchor="middle" className="dp-byte-idx">
                  +{idx}
                </text>
                <text x={13.5} y={28} textAnchor="middle" className="dp-mono-xs">
                  {byteVal !== null ? fmtByteDec(byteVal) : '--'}
                </text>
              </g>
            ))}
            <text x={189} y={486} textAnchor="middle" className="dp-sub">
              {view.bigEndianBytes ? 'Bits b0 (31:24) + b3 (7:0)' : 'Sin lectura aún'}
            </text>
            <text x={189} y={504} textAnchor="middle" className="dp-mono-xs">
              {view.bigEndianBytes
                ? `${fmtByteBin(view.bigEndianBytes[0])} … ${fmtByteBin(view.bigEndianBytes[3])}`
                : '—'}
            </text>
          </g>

          {/* ================= BUFFER 1: IF/ID ================= */}
          <g className={blockClass('IF_ID', 'IF')} {...bindBlockEvents('IF_ID')}>
            <rect
              x={270}
              y={78}
              width={42}
              height={610}
              rx={10}
              className={IF_ID.valid ? 'dp-buffer dp-buffer--valid' : 'dp-buffer'}
            />
            <text
              x={291}
              y={375}
              textAnchor="middle"
              transform="rotate(-90 291 375)"
              className="dp-buffer-label"
            >
              IF / ID · {IF_ID.valid ? 'CARGADO' : 'VACÍO'} · Carga: IF
            </text>
          </g>

          {/* ================= STAGE 2: ID ================= */}
          {/* Divisor de Campos (muestra solo campos relevantes al formato tras ID) */}
          <g className={blockClass('FIELDS', 'ID')} {...bindBlockEvents('FIELDS')}>
            <rect x={328} y={214} width={138} height={272} rx={12} className="dp-box" />
            <text x={397} y={238} textAnchor="middle" className="dp-title-sm">Campos IR</text>
            <text x={397} y={255} textAnchor="middle" className="dp-sub">
              {f ? `${f.mnemonic} (Tipo ${f.format})` : 'En espera de etapa ID'}
            </text>
            {f ? (
              <g className="dp-fields-list">
                <text x={338} y={284} className="dp-field-row">
                  op [31:26]: {fmtBits(f.opcode, 6)}
                </text>
                <text x={338} y={300} className="dp-sub">
                  → dec: {f.opcode} ({f.mnemonic})
                </text>
                {f.format === 'J' ? (
                  <>
                    <text x={338} y={336} className="dp-field-row">
                      idx [25:0]: {f.jumpIndex}
                    </text>
                    <text x={338} y={356} className="dp-sub">
                      → destino: byte {f.jumpIndex * 4}
                    </text>
                  </>
                ) : (
                  <>
                    <text x={338} y={328} className="dp-field-row">
                      rs: {fmtBits(f.rs, 5)} → {REGISTER_NAMES[f.rs]}
                    </text>
                    <text x={338} y={356} className="dp-field-row">
                      rt: {fmtBits(f.rt, 5)} → {REGISTER_NAMES[f.rt]}
                    </text>
                    {f.format === 'R' ? (
                      <>
                        <text x={338} y={386} className="dp-field-row">
                          rd: {fmtBits(f.rd, 5)} → {REGISTER_NAMES[f.rd]}
                        </text>
                        <text x={338} y={416} className="dp-field-row">
                          fn: {fmtBits(f.funct, 6)} (dec {f.funct})
                        </text>
                      </>
                    ) : (
                      <>
                        <text x={338} y={392} className="dp-field-row">
                          imm [15:0]: …{fmtBits(f.imm16, 8)}
                        </text>
                        <text x={338} y={412} className="dp-port-out">
                          → decimal: {f.immSigned}
                        </text>
                      </>
                    )}
                  </>
                )}
              </g>
            ) : (
              <text x={397} y={355} textAnchor="middle" className="dp-sub">
                Pulsa +Etapa (ID)
              </text>
            )}
          </g>

          {/* Unidad de Control */}
          <g className={blockClass('CONTROL', 'ID')} {...bindBlockEvents('CONTROL')}>
            <rect x={500} y={126} width={162} height={92} rx={12} className="dp-box" />
            <text x={581} y={148} textAnchor="middle" className="dp-title-sm">
              Unidad de Control
            </text>
            <text x={581} y={165} textAnchor="middle" className="dp-sub">
              {view.controlsValid ? `${view.mnemonic} · Tipo ${view.format}` : 'En espera de etapa ID'}
            </text>
            <text x={581} y={185} textAnchor="middle" className="dp-mono-xs">
              {view.controlsValid && view.ctrl
                ? `RW=${view.ctrl.RegWrite} MR=${view.ctrl.MemRead} MW=${view.ctrl.MemWrite}`
                : 'Señales inactivas'}
            </text>
            <text x={581} y={203} textAnchor="middle" className="dp-mono-xs">
              {view.controlsValid && view.ctrl
                ? `Br=${view.ctrl.Branch}/${view.ctrl.BranchNe} J=${view.ctrl.Jump}`
                : '—'}
            </text>
          </g>

          {/* Banco de Registros (BR) */}
          <g className={blockClass('BR', 'ID')} {...bindBlockEvents('BR')}>
            <rect x={500} y={244} width={162} height={224} rx={12} className="dp-box" />
            <text x={581} y={264} textAnchor="middle" className="dp-title-sm">
              Banco Registros (BR)
            </text>
            <text x={581} y={279} textAnchor="middle" className="dp-sub">
              we (RegWrite) = {view.controlsValid && view.ctrl ? view.ctrl.RegWrite : '—'}
            </text>
            <text x={508} y={300} className="dp-port">
              AR1: {view.ar1 !== null ? REGISTER_NAMES[view.ar1] : '—'}
            </text>
            <text x={508} y={320} className="dp-port">
              AR2: {view.ar2 !== null ? REGISTER_NAMES[view.ar2] : '—'}
            </text>
            <text x={508} y={340} className="dp-port">
              AW: {view.aw !== null ? REGISTER_NAMES[view.aw] : '—'}
            </text>
            <text x={508} y={360} className="dp-port">
              Dw: {fmtDecOrDash(view.dw)}
            </text>
            <text x={654} y={390} textAnchor="end" className="dp-port-out">
              DR1: {fmtDecOrDash(view.dr1)}
            </text>
            <text x={654} y={414} textAnchor="end" className="dp-port-out">
              DR2: {fmtDecOrDash(view.dr2)}
            </text>
            <rect x={506} y={432} width={150} height={22} rx={6} className="dp-pill" />
            <text x={581} y={446} textAnchor="middle" className="dp-pill-text">
              {view.brStatusLabel}
            </text>
          </g>

          {/* Extensor de Inmediato */}
          <g className={blockClass('EXTENDER', 'ID')} {...bindBlockEvents('EXTENDER')}>
            <rect x={500} y={482} width={162} height={82} rx={12} className="dp-box" />
            <text x={581} y={504} textAnchor="middle" className="dp-title-sm">
              Extensor 16 → 32b
            </text>
            <text x={581} y={522} textAnchor="middle" className="dp-sub">
              ExtOp: {view.extOpLabel}
            </text>
            <text x={581} y={546} textAnchor="middle" className="dp-mono-sm">
              {view.immExt !== null
                ? view.extOpLabel === 'ZERO'
                  ? `dec: ${fmtUnsignedDec(view.immExt)}`
                  : `dec: ${fmtSignedDec(view.immExt)}`
                : 'En espera'}
            </text>
          </g>

          {/* ================= BUFFER 2: ID/EX ================= */}
          <g className={blockClass('ID_EX', 'ID')} {...bindBlockEvents('ID_EX')}>
            <rect
              x={680}
              y={78}
              width={42}
              height={610}
              rx={10}
              className={ID_EX.valid ? 'dp-buffer dp-buffer--valid' : 'dp-buffer'}
            />
            <text
              x={701}
              y={375}
              textAnchor="middle"
              transform="rotate(-90 701 375)"
              className="dp-buffer-label"
            >
              ID / EX · {ID_EX.valid ? 'CARGADO' : 'VACÍO'} · Carga: ID
            </text>
          </g>

          {/* ================= STAGE 3: EX ================= */}
          {/* Jump Target Concat */}
          <g className={blockClass('JUMP_CONCAT', 'EX')} {...bindBlockEvents('JUMP_CONCAT')}>
            <rect x={746} y={82} width={118} height={48} rx={10} className="dp-box" />
            <text x={805} y={101} textAnchor="middle" className="dp-title-xs">
              Jump (idx &lt;&lt; 2)
            </text>
            <text x={805} y={119} textAnchor="middle" className="dp-mono-xs">
              {fmtByteDecOrDash(view.jumpTarget)}
            </text>
          </g>

          {/* Shift Left 2 (Branch) */}
          <g className={blockClass('SHIFT_BRANCH', 'EX')} {...bindBlockEvents('SHIFT_BRANCH')}>
            <rect x={746} y={148} width={74} height={52} rx={10} className="dp-box" />
            <text x={783} y={170} textAnchor="middle" className="dp-title-xs">Shift &lt;&lt; 2</text>
            <text x={783} y={187} textAnchor="middle" className="dp-sub">
              {view.stageReached.EX && f ? `${f.immSigned * 4} B` : 'imm × 4'}
            </text>
          </g>

          {/* Sumador Branch */}
          <g className={blockClass('BRANCH_ADDER', 'EX')} {...bindBlockEvents('BRANCH_ADDER')}>
            <rect x={838} y={142} width={96} height={62} rx={10} className="dp-box" />
            <text x={886} y={162} textAnchor="middle" className="dp-title-xs">Sumador Branch</text>
            <text x={886} y={177} textAnchor="middle" className="dp-sub">PC+4 + desp</text>
            <text x={886} y={194} textAnchor="middle" className="dp-mono-xs">
              {fmtByteDecOrDash(view.branchTarget)}
            </text>
          </g>

          {/* Branch Logic (BEQ / BNE) */}
          <g className={blockClass('BRANCH_LOGIC', 'EX')} {...bindBlockEvents('BRANCH_LOGIC')}>
            <rect x={838} y={218} width={96} height={46} rx={10} className="dp-box" />
            <text x={886} y={236} textAnchor="middle" className="dp-title-xs">
              Branch Logic
            </text>
            <text x={886} y={252} textAnchor="middle" className="dp-mono-xs">
              {view.stageReached.EX
                ? view.branchTaken
                  ? 'Tomado (1)'
                  : 'No (0)'
                : 'BEQ/BNE'}
            </text>
          </g>

          {/* Mux PCSrc */}
          <g className={blockClass('MUX_PCSRC', 'EX')} {...bindBlockEvents('MUX_PCSRC')}>
            <text x={973} y={124} textAnchor="middle" className="dp-mono-xs">
              sel={view.muxPCSrcSel ?? '—'}
            </text>
            <rect x={954} y={132} width={38} height={76} rx={10} className="dp-mux" />
            <text x={973} y={150} textAnchor="middle" className="dp-mux-label">0</text>
            <text x={973} y={170} textAnchor="middle" className="dp-mux-title">PCSrc</text>
            <text x={973} y={195} textAnchor="middle" className="dp-mux-label">1</text>
          </g>

          {/* Mux Jump */}
          <g className={blockClass('MUX_JUMP', 'EX')} {...bindBlockEvents('MUX_JUMP')}>
            <text x={1031} y={86} textAnchor="middle" className="dp-mono-xs">
              sel={view.muxJumpSel ?? '—'}
            </text>
            <rect x={1012} y={94} width={38} height={76} rx={10} className="dp-mux" />
            <text x={1031} y={112} textAnchor="middle" className="dp-mux-label">1</text>
            <text x={1031} y={134} textAnchor="middle" className="dp-mux-title">Jump</text>
            <text x={1031} y={156} textAnchor="middle" className="dp-mux-label">0</text>
          </g>

          {/* Mux ALUSrc */}
          <g className={blockClass('MUX_ALUSRC', 'EX')} {...bindBlockEvents('MUX_ALUSRC')}>
            <rect x={764} y={362} width={40} height={78} rx={10} className="dp-mux" />
            <text x={784} y={380} textAnchor="middle" className="dp-mux-label">0:B</text>
            <text x={784} y={404} textAnchor="middle" className="dp-mux-title">ALUSrc</text>
            <text x={784} y={428} textAnchor="middle" className="dp-mux-label">1:Imm</text>
            <text x={784} y={454} textAnchor="middle" className="dp-mono-xs">
              sel={view.muxALUSrcSel ?? '—'}
            </text>
          </g>

          {/* MIPSALU Trapezoid */}
          <g className={blockClass('MIPSALU', 'EX')} {...bindBlockEvents('MIPSALU')}>
            <polygon
              points="836,296 976,324 976,424 836,452 836,396 860,374 836,352"
              className="dp-box"
            />
            <text x={904} y={366} textAnchor="middle" className="dp-title">MIPSALU</text>
            <text x={904} y={385} textAnchor="middle" className="dp-mono-xs">
              {view.aluCtlLabel}
            </text>
            <text x={844} y={322} className="dp-port">
              A: {fmtDecOrDash(view.aluA)}
            </text>
            <text x={844} y={434} className="dp-port">
              B: {fmtDecOrDash(view.aluB)}
            </text>
            <text x={968} y={342} textAnchor="end" className="dp-port-out">
              Zero: {view.zeroFlag !== null ? (view.zeroFlag ? '1' : '0') : '—'}
            </text>
            <text x={968} y={410} textAnchor="end" className="dp-port-out">
              Out: {fmtDecOrDash(view.aluOut)}
            </text>
          </g>

          {/* ALU Control */}
          <g className={blockClass('ALU_CONTROL', 'EX')} {...bindBlockEvents('ALU_CONTROL')}>
            <rect x={844} y={476} width={128} height={62} rx={12} className="dp-box" />
            <text x={908} y={497} textAnchor="middle" className="dp-title-sm">ALU Control</text>
            <text x={908} y={514} textAnchor="middle" className="dp-sub">
              ALUOp + funct → 4b
            </text>
            <text x={908} y={530} textAnchor="middle" className="dp-mono-xs">
              {view.aluCtlLabel}
            </text>
          </g>

          {/* Mux RegDst */}
          <g className={blockClass('MUX_REGDST', 'EX')} {...bindBlockEvents('MUX_REGDST')}>
            <rect x={764} y={566} width={40} height={74} rx={10} className="dp-mux" />
            <text x={784} y={584} textAnchor="middle" className="dp-mux-label">0:rt</text>
            <text x={784} y={606} textAnchor="middle" className="dp-mux-title">RegDst</text>
            <text x={784} y={628} textAnchor="middle" className="dp-mux-label">1:rd</text>
            <text x={784} y={654} textAnchor="middle" className="dp-mono-xs">
              sel={view.muxRegDstSel ?? '—'} → {view.aw !== null ? REGISTER_NAMES[view.aw] : '—'}
            </text>
          </g>

          {/* ================= BUFFER 3: EX/MEM ================= */}
          <g className={blockClass('EX_MEM', 'EX')} {...bindBlockEvents('EX_MEM')}>
            <rect
              x={1078}
              y={78}
              width={42}
              height={610}
              rx={10}
              className={EX_MEM.valid ? 'dp-buffer dp-buffer--valid' : 'dp-buffer'}
            />
            <text
              x={1099}
              y={375}
              textAnchor="middle"
              transform="rotate(-90 1099 375)"
              className="dp-buffer-label"
            >
              EX / MEM · {EX_MEM.valid ? 'CARGADO' : 'VACÍO'} · Carga: EX
            </text>
          </g>

          {/* ================= STAGE 4: MEM ================= */}
          <text x={1216} y={258} textAnchor="middle" className="dp-wire-tag">
            Bypass ALUOut
          </text>
          <g className={blockClass('DMEM', 'MEM')} {...bindBlockEvents('DMEM')}>
            <rect x={1144} y={298} width={144} height={180} rx={12} className="dp-box" />
            <text x={1216} y={322} textAnchor="middle" className="dp-title-sm">
              Memoria Datos
            </text>
            <text x={1216} y={338} textAnchor="middle" className="dp-sub">(DMem · Big-Endian)</text>
            <text x={1152} y={362} className="dp-port">
              Dir: {view.stageReached.EX ? fmtAddrDec(EX_MEM.aluResult) : 'En espera'}
            </text>
            <text x={1152} y={390} className="dp-port">
              Dato: {view.stageReached.EX ? fmtSignedDec(EX_MEM.writeData) : '—'}
            </text>
            <text x={1216} y={418} textAnchor="middle" className="dp-mono-xs">
              MR={view.controlsValid && view.ctrl ? view.ctrl.MemRead : '—'} · MW=
              {view.controlsValid && view.ctrl ? view.ctrl.MemWrite : '—'}
            </text>
            <text x={1216} y={442} textAnchor="middle" className="dp-port-out">
              MDR: {fmtDecOrDash(view.mdr)}
            </text>
            <rect x={1156} y={450} width={120} height={20} rx={6} className="dp-pill" />
            <text x={1216} y={463} textAnchor="middle" className="dp-mono-xs">
              {view.dmemAction}
            </text>
          </g>

          {/* ================= BUFFER 4: MEM/WB ================= */}
          <g className={blockClass('MEM_WB', 'MEM')} {...bindBlockEvents('MEM_WB')}>
            <rect
              x={1308}
              y={78}
              width={42}
              height={610}
              rx={10}
              className={MEM_WB.valid ? 'dp-buffer dp-buffer--valid' : 'dp-buffer'}
            />
            <text
              x={1329}
              y={375}
              textAnchor="middle"
              transform="rotate(-90 1329 375)"
              className="dp-buffer-label"
            >
              MEM / WB · {MEM_WB.valid ? 'CARGADO' : 'VACÍO'} · Carga: MEM
            </text>
          </g>

          {/* ================= STAGE 5: WB ================= */}
          <g className={blockClass('MUX_MEMTOREG', 'MEM')} {...bindBlockEvents('MUX_MEMTOREG')}>
            <rect x={1390} y={318} width={44} height={88} rx={10} className="dp-mux" />
            <text x={1412} y={338} textAnchor="middle" className="dp-mux-label">0:ALU</text>
            <text x={1412} y={362} textAnchor="middle" className="dp-mux-title">M2Reg</text>
            <text x={1412} y={388} textAnchor="middle" className="dp-mux-label">1:MDR</text>
            <text x={1412} y={424} textAnchor="middle" className="dp-mono-xs">
              sel={view.muxMemToRegSel ?? '—'}
            </text>
            <text x={1412} y={442} textAnchor="middle" className="dp-mono-xs">
              Dw={fmtDecOrDash(view.dw)}
            </text>
          </g>

          {/* Floating Value Badges on Active Wires */}
          {view.activeStage === 'IF' && view.bigEndianBytes && (
            <WireBadge
              x={189}
              y={369}
              text={`4 bytes [${view.bigEndianBytes.map(fmtByteDec).join(',')}]`}
              tone="blue"
            />
          )}
          {view.activeStage === 'ID' && view.dr1 !== null && (
            <WireBadge
              x={581}
              y={230}
              text={`DR1=${fmtSignedDec(view.dr1)}${view.immExt !== null ? ` · imm=${fmtSignedDec(view.immExt)}` : ''}`}
              tone="purple"
            />
          )}
          {view.activeStage === 'EX' && view.aluOut !== null && (
            <>
              <WireBadge
                x={1026}
                y={386}
                text={`ALU = ${fmtSignedDec(view.aluOut)}`}
                tone="orange"
              />
              {view.nextPC !== null && (
                <WireBadge
                  x={1031}
                  y={64}
                  text={`nextPC = ${fmtAddrDec(view.nextPC)}`}
                  tone="orange"
                />
              )}
            </>
          )}
          {view.activeStage === 'MEM' && view.dw !== null && (
            <WireBadge
              x={1216}
              y={246}
              text={`Dw = ${fmtSignedDec(view.dw)}`}
              tone="cyan"
            />
          )}
          {view.activeStage === 'WB' && view.dw !== null && (
            <>
              <WireBadge
                x={940}
                y={692}
                text={
                  view.regWriteEnabled && view.aw !== null
                    ? `${REGISTER_NAMES[view.aw]} ← ${fmtSignedDec(view.dw)}`
                    : 'Sin escritura BR'
                }
                tone="green"
              />
              <WireBadge
                x={690}
                y={74}
                text={`Nuevo PC = ${fmtAddrDec(view.pc)}`}
                tone="orange"
              />
            </>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="dp-legend">
        <span className="legend-item">
          <i className="legend-dot legend-if" /> Datos / IF
        </span>
        <span className="legend-item">
          <i className="legend-dot legend-ctrl" /> Control / ID
        </span>
        <span className="legend-item">
          <i className="legend-dot legend-branch" /> Saltos / EX
        </span>
        <span className="legend-item">
          <i className="legend-dot legend-mem" /> DMem / MEM
        </span>
        <span className="legend-item">
          <i className="legend-dot legend-wb" /> Escritura / WB
        </span>
        <span className="legend-item">
          <i className="legend-dot legend-err" /> Error
        </span>
      </div>

      {/* Interactive Input / Output Binary + Decimal Block Inspector */}
      <div className={`dp-inspector-card ${inspectedInfo ? 'is-visible' : ''}`}>
        {inspectedInfo ? (
          <>
            <div className="dp-inspector-head">
              <div>
                <span className="badge">{inspectedInfo.stageTag}</span>
                <h3>{inspectedInfo.title}</h3>
              </div>
              <div className="dp-inspector-actions">
                <span className="muted">
                  {pinnedBlock
                    ? 'Fijado · Clic en el fondo o Esc para cerrar'
                    : 'Vista previa · Clic en el bloque para fijar'}
                </span>
                {pinnedBlock && (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => setPinnedBlock(null)}
                  >
                    Cerrar
                  </button>
                )}
              </div>
            </div>
            <p className="dp-inspector-summary">{inspectedInfo.beginnerSummary}</p>
            <div className="dp-inspector-io-grid">
              <div className="dp-io-card">
                <span className="dp-inspector-label">Lo que RECIBE (Entradas)</span>
                <table className="dp-io-table">
                  <thead>
                    <tr>
                      <th>Entrada</th>
                      <th>Binario</th>
                      <th>Significado (Decimal)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectedInfo.inputs.map((sig) => (
                      <tr key={sig.name}>
                        <td>{sig.name}</td>
                        <td>
                          <code>{sig.binary}</code>
                        </td>
                        <td className="dp-io-dec">{sig.decimalMeaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="dp-io-card">
                <span className="dp-inspector-label">Lo que ENTREGA (Salidas)</span>
                <table className="dp-io-table">
                  <thead>
                    <tr>
                      <th>Salida</th>
                      <th>Binario</th>
                      <th>Significado (Decimal)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectedInfo.outputs.map((sig) => (
                      <tr key={sig.name}>
                        <td>{sig.name}</td>
                        <td>
                          <code>{sig.binary}</code>
                        </td>
                        <td className="dp-io-dec">{sig.decimalMeaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <p className="muted dp-inspector-empty">
            Haz clic o pasa el cursor sobre cualquier bloque (<code>PC</code>,{' '}
            <code>Reunión Big-Endian</code>, <code>Campos IR</code>, <code>BR</code>,{' '}
            <code>MIPSALU</code>, <code>DMem</code> o buffers) para ver exactamente qué recibe en
            binario y qué significa en decimal.
          </p>
        )}
      </div>
    </div>
  );
}
