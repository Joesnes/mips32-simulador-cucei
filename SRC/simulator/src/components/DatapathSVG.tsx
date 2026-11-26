/**
 * Diagrama SVG interactivo del Datapath MIPS32 (Modalidad B — estilo MIPS 101).
 * Muestra en tiempo real PC, reunión Big-Endian de 4 bytes, campos de instrucción,
 * Unidad de Control, Banco de Registros (AR1/AR2/AW/Dw/we/DR1/DR2), Extensor,
 * ALU Control, MIPSALU (A/B/ALUOut/Zero), 5 Muxes, lógica de siguiente PC,
 * Memoria de Datos y los 4 buffers intermedios (IF/ID, ID/EX, EX/MEM, MEM/WB).
 */
import { useEffect, useState } from 'react';
import type { CpuSnapshot, Stage } from '@core/types';
import { REGISTER_NAMES, formatHex32, formatHexByte } from '@core/isa';
import {
  deriveDatapathView,
  getBlockInspectorInfo,
  type DatapathBlockId,
  type DatapathViewModel,
  type DatapathWireId,
} from '../utils/datapathModel';

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

function shortHex(val: number | null): string {
  if (val === null) return '—';
  return formatHex32(val);
}

function wireStrokeColor(
  wireId: DatapathWireId,
  view: DatapathViewModel,
): string {
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
          strokeOpacity={0.7}
          strokeWidth={2}
          strokeDasharray="6 12"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="dp-wire-flow"
        />
      )}
      {isActive && pulse && (
        <circle r={3.6} fill={color} className="dp-wire-pulse">
          <animateMotion dur="1.45s" repeatCount="indefinite" path={d} />
        </circle>
      )}
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

  const blockClass = (id: DatapathBlockId): string => {
    const classes = ['dp-block'];
    if (view.errorBlock === id) {
      classes.push('dp-block--error');
    } else if (view.activeBlocks[id]) {
      classes.push('dp-block--active');
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
  const bytesDisplay = view.bigEndianBytes
    ? view.bigEndianBytes.map(formatHexByte)
    : ['--', '--', '--', '--'];

  return (
    <div className="datapath-container">
      <div className="panel-title datapath-header">
        <div>
          <h2>Ruta de Datos MIPS32 (MIPS 101 · Multiciclo 5 Etapas)</h2>
          <p className="muted dp-subtitle">
            Pasa el cursor o haz clic en cualquier bloque para ver sus bits exactos y explicación.
          </p>
        </div>
        <div className="dp-header-badges">
          <span className="badge badge-cycle">Ciclo {snapshot.cycle}</span>
          <span className="badge badge-stage-active">
            Etapa activa: {view.activeStage ?? 'IDLE'}
          </span>
          <span className="badge badge-stage-next">
            Próxima: {view.nextStage}
          </span>
          <span className="badge badge-pc">PC: {formatHex32(view.pc)}</span>
        </div>
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
                        ? 'rgba(255, 255, 255, 0.12)'
                        : 'rgba(255, 255, 255, 0.03)'
                  }
                  stroke={isErr ? '#FF453A' : isCurrent ? meta.accent : 'rgba(255,255,255,0.08)'}
                  strokeWidth={isCurrent || isErr ? 1.5 : 1}
                />
                <text
                  x={meta.x}
                  y={28}
                  textAnchor="middle"
                  className="dp-stage-pill-text"
                  fill={isErr ? '#FF453A' : isCurrent ? '#FFFFFF' : '#8E8E93'}
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
          <WirePath id="BE_TO_IFID" d="M 252 446 L 270 446" view={view} />

          {/* ID Wires (exits aligned to Campos IR bitfield rows) */}
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

          {/* WB & Feedback Wires (routed outside Campos IR & BR) */}
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

          {/* Wire Rail Labels */}
          <text x={690} y={53} textAnchor="middle" className="dp-wire-tag">
            nextPC → PC {view.nextPC !== null ? `(${formatHex32(view.nextPC)})` : ''}
          </text>
          <text x={940} y={706} textAnchor="middle" className="dp-wire-tag">
            Dw (Dato a escribir en BR) {view.dw !== null ? `= ${formatHex32(view.dw)}` : ''}
          </text>
          <text x={940} y={730} textAnchor="middle" className="dp-wire-tag">
            AW (Registro destino) {view.aw !== null ? `= ${REGISTER_NAMES[view.aw]}` : ''}
          </text>

          {/* ================= STAGE 1: IF ================= */}
          {/* PC */}
          <g className={blockClass('PC')} {...bindBlockEvents('PC')}>
            <rect x={26} y={266} width={84} height={96} rx={12} className="dp-box" />
            <text x={68} y={292} textAnchor="middle" className="dp-title">PC</text>
            <text x={68} y={310} textAnchor="middle" className="dp-sub">32 bits</text>
            <rect x={33} y={322} width={70} height={24} rx={6} className="dp-pill" />
            <text x={68} y={338} textAnchor="middle" className="dp-mono">
              {formatHex32(view.pc)}
            </text>
          </g>

          {/* PC + 4 */}
          <g className={blockClass('PC_PLUS_4')} {...bindBlockEvents('PC_PLUS_4')}>
            <rect x={138} y={132} width={96} height={66} rx={12} className="dp-box" />
            <text x={186} y={155} textAnchor="middle" className="dp-title">Sumador +4</text>
            <text x={186} y={172} textAnchor="middle" className="dp-sub">PC + 4</text>
            <text x={186} y={188} textAnchor="middle" className="dp-mono-sm">
              {formatHex32(view.pcPlus4)}
            </text>
          </g>

          {/* IMem */}
          <g className={blockClass('IMEM')} {...bindBlockEvents('IMEM')}>
            <rect x={134} y={236} width={110} height={118} rx={12} className="dp-box" />
            <text x={189} y={260} textAnchor="middle" className="dp-title">IMem</text>
            <text x={189} y={276} textAnchor="middle" className="dp-sub">Mem. Instrucciones</text>
            <text x={189} y={296} textAnchor="middle" className="dp-port">
              Dir: {formatHex32(view.instructionPc)}
            </text>
            <text x={189} y={316} textAnchor="middle" className="dp-sub">1 byte / dirección</text>
            <text x={189} y={338} textAnchor="middle" className="dp-mono-sm">
              {snapshot.instructionMemory.length} B cargados
            </text>
          </g>

          {/* Reunión Big-Endian (Obligatoria antes de decodificar) */}
          <g className={blockClass('BIG_ENDIAN')} {...bindBlockEvents('BIG_ENDIAN')}>
            <rect x={124} y={384} width={130} height={134} rx={12} className="dp-box dp-box-accent" />
            <text x={189} y={404} textAnchor="middle" className="dp-title-sm">
              Reunión Big-Endian
            </text>
            <text x={189} y={419} textAnchor="middle" className="dp-sub">
              4 bytes → 32 bits
            </text>
            {bytesDisplay.map((byteHex, idx) => (
              <g key={idx} transform={`translate(${132 + idx * 29}, 430)`}>
                <rect width={26} height={36} rx={5} className="dp-byte-cell" />
                <text x={13} y={13} textAnchor="middle" className="dp-byte-idx">+{idx}</text>
                <text x={13} y={28} textAnchor="middle" className="dp-mono-xs">{byteHex}</text>
              </g>
            ))}
            <text x={189} y={484} textAnchor="middle" className="dp-sub">IR [31:0] antes de ID</text>
            <text x={189} y={504} textAnchor="middle" className="dp-mono-sm">
              {shortHex(view.irWord)}
            </text>
          </g>

          {/* ================= BUFFER 1: IF/ID ================= */}
          <g className={blockClass('IF_ID')} {...bindBlockEvents('IF_ID')}>
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
              IF / ID · {IF_ID.valid ? 'VÁLIDO' : 'VACÍO'} · Carga: IF
            </text>
          </g>

          {/* ================= STAGE 2: ID ================= */}
          {/* Divisor de Campos */}
          <g className={blockClass('FIELDS')} {...bindBlockEvents('FIELDS')}>
            <rect x={328} y={204} width={138} height={296} rx={12} className="dp-box" />
            <text x={397} y={226} textAnchor="middle" className="dp-title-sm">Campos IR</text>
            <text x={397} y={242} textAnchor="middle" className="dp-sub">
              {view.mnemonic} {view.format ? `(${view.format})` : ''}
            </text>
            <g className="dp-fields-list">
              <text x={336} y={268} className="dp-field-row">
                [31:26] op: {view.slices ? `0x${view.slices.opcode.toString(16).toUpperCase().padStart(2, '0')}` : '—'}
              </text>
              <text x={336} y={294} className="dp-field-row">
                [25:21] rs: {view.slices ? `$${view.slices.rs}` : '—'}
              </text>
              <text x={336} y={320} className="dp-field-row">
                [20:16] rt: {view.slices ? `$${view.slices.rt}` : '—'}
              </text>
              <text x={336} y={346} className="dp-field-row">
                [15:11] rd: {view.slices ? `$${view.slices.rd}` : '—'}
              </text>
              <text x={336} y={372} className="dp-field-row">
                [10:6] sh: {view.slices ? view.slices.shamt : '—'}
              </text>
              <text x={336} y={398} className="dp-field-row">
                [5:0] fn: {view.slices ? `0x${view.slices.funct.toString(16).toUpperCase().padStart(2, '0')}` : '—'}
              </text>
              <text x={336} y={428} className="dp-field-row">
                [15:0] imm: {view.slices ? `0x${view.slices.imm16.toString(16).toUpperCase().padStart(4, '0')}` : '—'}
              </text>
              <text x={336} y={458} className="dp-field-row">
                [25:0] idx: {view.slices ? `0x${view.slices.jumpIndex.toString(16).toUpperCase()}` : '—'}
              </text>
            </g>
          </g>

          {/* Unidad de Control */}
          <g className={blockClass('CONTROL')} {...bindBlockEvents('CONTROL')}>
            <rect x={500} y={126} width={162} height={92} rx={12} className="dp-box" />
            <text x={581} y={148} textAnchor="middle" className="dp-title-sm">
              Unidad de Control
            </text>
            <text x={581} y={165} textAnchor="middle" className="dp-sub">
              {view.controlsValid ? `${view.mnemonic} · Tipo ${view.format}` : 'Pendiente etapa ID'}
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
          <g className={blockClass('BR')} {...bindBlockEvents('BR')}>
            <rect x={500} y={244} width={162} height={224} rx={12} className="dp-box" />
            <text x={581} y={264} textAnchor="middle" className="dp-title-sm">
              Banco Registros (BR)
            </text>
            <text x={581} y={279} textAnchor="middle" className="dp-sub">
              we (RegWrite) = {view.controlsValid && view.ctrl ? view.ctrl.RegWrite : '—'}
            </text>
            {/* Left inputs (upper section, vertically separated from DR1/DR2) */}
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
              Dw: {shortHex(view.dw)}
            </text>
            {/* Right outputs (lower section) */}
            <text x={654} y={390} textAnchor="end" className="dp-port-out">
              DR1: {view.dr1 !== null ? formatHex32(view.dr1) : '—'}
            </text>
            <text x={654} y={414} textAnchor="end" className="dp-port-out">
              DR2: {view.dr2 !== null ? formatHex32(view.dr2) : '—'}
            </text>
            {/* Status pill */}
            <rect x={506} y={432} width={150} height={22} rx={6} className="dp-pill" />
            <text x={581} y={446} textAnchor="middle" className="dp-pill-text">
              {view.brStatusLabel}
            </text>
          </g>

          {/* Extensor de Inmediato */}
          <g className={blockClass('EXTENDER')} {...bindBlockEvents('EXTENDER')}>
            <rect x={500} y={482} width={162} height={82} rx={12} className="dp-box" />
            <text x={581} y={504} textAnchor="middle" className="dp-title-sm">
              Extensor 16 → 32b
            </text>
            <text x={581} y={522} textAnchor="middle" className="dp-sub">
              ExtOp: {view.extOpLabel}
            </text>
            <text x={581} y={546} textAnchor="middle" className="dp-mono-sm">
              {shortHex(view.immExt)}
            </text>
          </g>

          {/* ================= BUFFER 2: ID/EX ================= */}
          <g className={blockClass('ID_EX')} {...bindBlockEvents('ID_EX')}>
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
              ID / EX · {ID_EX.valid ? 'VÁLIDO' : 'VACÍO'} · Carga: ID
            </text>
          </g>

          {/* ================= STAGE 3: EX ================= */}
          {/* Jump Target Concat */}
          <g className={blockClass('JUMP_CONCAT')} {...bindBlockEvents('JUMP_CONCAT')}>
            <rect x={746} y={82} width={118} height={48} rx={10} className="dp-box" />
            <text x={805} y={101} textAnchor="middle" className="dp-title-xs">
              Jump (idx &lt;&lt; 2)
            </text>
            <text x={805} y={119} textAnchor="middle" className="dp-mono-xs">
              {shortHex(view.jumpTarget)}
            </text>
          </g>

          {/* Shift Left 2 (Branch) */}
          <g className={blockClass('SHIFT_BRANCH')} {...bindBlockEvents('SHIFT_BRANCH')}>
            <rect x={746} y={148} width={74} height={52} rx={10} className="dp-box" />
            <text x={783} y={170} textAnchor="middle" className="dp-title-xs">Shift &lt;&lt; 2</text>
            <text x={783} y={187} textAnchor="middle" className="dp-sub">imm × 4</text>
          </g>

          {/* Sumador Branch */}
          <g className={blockClass('BRANCH_ADDER')} {...bindBlockEvents('BRANCH_ADDER')}>
            <rect x={838} y={142} width={96} height={62} rx={10} className="dp-box" />
            <text x={886} y={162} textAnchor="middle" className="dp-title-xs">Sumador Branch</text>
            <text x={886} y={177} textAnchor="middle" className="dp-sub">PC+4 + desp</text>
            <text x={886} y={194} textAnchor="middle" className="dp-mono-xs">
              {shortHex(view.branchTarget)}
            </text>
          </g>

          {/* Branch Logic (BEQ / BNE) */}
          <g className={blockClass('BRANCH_LOGIC')} {...bindBlockEvents('BRANCH_LOGIC')}>
            <rect x={838} y={218} width={96} height={46} rx={10} className="dp-box" />
            <text x={886} y={236} textAnchor="middle" className="dp-title-xs">
              Branch Logic
            </text>
            <text x={886} y={252} textAnchor="middle" className="dp-mono-xs">
              {EX_MEM.valid && view.errorStage !== 'IF'
                ? view.branchTaken
                  ? 'Tomado (1)'
                  : 'No (0)'
                : 'BEQ/BNE'}
            </text>
          </g>

          {/* Mux PCSrc */}
          <g className={blockClass('MUX_PCSRC')} {...bindBlockEvents('MUX_PCSRC')}>
            <text x={973} y={124} textAnchor="middle" className="dp-mono-xs">
              sel={view.muxPCSrcSel ?? '—'}
            </text>
            <rect x={954} y={132} width={38} height={76} rx={10} className="dp-mux" />
            <text x={973} y={150} textAnchor="middle" className="dp-mux-label">0</text>
            <text x={973} y={170} textAnchor="middle" className="dp-mux-title">PCSrc</text>
            <text x={973} y={195} textAnchor="middle" className="dp-mux-label">1</text>
          </g>

          {/* Mux Jump */}
          <g className={blockClass('MUX_JUMP')} {...bindBlockEvents('MUX_JUMP')}>
            <text x={1031} y={86} textAnchor="middle" className="dp-mono-xs">
              sel={view.muxJumpSel ?? '—'}
            </text>
            <rect x={1012} y={94} width={38} height={76} rx={10} className="dp-mux" />
            <text x={1031} y={112} textAnchor="middle" className="dp-mux-label">1</text>
            <text x={1031} y={134} textAnchor="middle" className="dp-mux-title">Jump</text>
            <text x={1031} y={156} textAnchor="middle" className="dp-mux-label">0</text>
          </g>

          {/* Mux ALUSrc */}
          <g className={blockClass('MUX_ALUSRC')} {...bindBlockEvents('MUX_ALUSRC')}>
            <rect x={764} y={362} width={40} height={78} rx={10} className="dp-mux" />
            <text x={784} y={380} textAnchor="middle" className="dp-mux-label">0:B</text>
            <text x={784} y={404} textAnchor="middle" className="dp-mux-title">ALUSrc</text>
            <text x={784} y={428} textAnchor="middle" className="dp-mux-label">1:Imm</text>
            <text x={784} y={454} textAnchor="middle" className="dp-mono-xs">
              sel={view.muxALUSrcSel ?? '—'}
            </text>
          </g>

          {/* MIPSALU Trapezoid */}
          <g className={blockClass('MIPSALU')} {...bindBlockEvents('MIPSALU')}>
            <polygon
              points="836,296 976,324 976,424 836,452 836,396 860,374 836,352"
              className="dp-box"
            />
            <text x={904} y={367} textAnchor="middle" className="dp-title">MIPSALU</text>
            <text x={904} y={385} textAnchor="middle" className="dp-mono-xs">
              {view.aluCtlLabel}
            </text>
            <text x={844} y={322} className="dp-port">
              A: {view.aluA !== null ? formatHex32(view.aluA) : '—'}
            </text>
            <text x={844} y={434} className="dp-port">
              B: {view.aluB !== null ? formatHex32(view.aluB) : '—'}
            </text>
            <text x={968} y={340} textAnchor="end" className="dp-port-out">
              Zero: {view.zeroFlag !== null ? (view.zeroFlag ? '1' : '0') : '—'}
            </text>
            <text x={968} y={412} textAnchor="end" className="dp-port-out">
              Out: {view.aluOut !== null ? formatHex32(view.aluOut) : '—'}
            </text>
          </g>

          {/* ALU Control */}
          <g className={blockClass('ALU_CONTROL')} {...bindBlockEvents('ALU_CONTROL')}>
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
          <g className={blockClass('MUX_REGDST')} {...bindBlockEvents('MUX_REGDST')}>
            <rect x={764} y={566} width={40} height={74} rx={10} className="dp-mux" />
            <text x={784} y={584} textAnchor="middle" className="dp-mux-label">0:rt</text>
            <text x={784} y={606} textAnchor="middle" className="dp-mux-title">RegDst</text>
            <text x={784} y={628} textAnchor="middle" className="dp-mux-label">1:rd</text>
            <text x={784} y={654} textAnchor="middle" className="dp-mono-xs">
              sel={view.muxRegDstSel ?? '—'} → {view.aw !== null ? REGISTER_NAMES[view.aw] : '—'}
            </text>
          </g>

          {/* ================= BUFFER 3: EX/MEM ================= */}
          <g className={blockClass('EX_MEM')} {...bindBlockEvents('EX_MEM')}>
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
              EX / MEM · {EX_MEM.valid ? 'VÁLIDO' : 'VACÍO'} · Carga: EX
            </text>
          </g>

          {/* ================= STAGE 4: MEM ================= */}
          <text x={1216} y={258} textAnchor="middle" className="dp-wire-tag">
            Bypass ALUOut
          </text>
          <g className={blockClass('DMEM')} {...bindBlockEvents('DMEM')}>
            <rect x={1144} y={298} width={144} height={180} rx={12} className="dp-box" />
            <text x={1216} y={322} textAnchor="middle" className="dp-title-sm">
              Memoria Datos
            </text>
            <text x={1216} y={338} textAnchor="middle" className="dp-sub">(DMem · Big-Endian)</text>
            <text x={1152} y={362} className="dp-port">
              Address: {EX_MEM.valid && view.errorStage !== 'IF' ? formatHex32(EX_MEM.aluResult) : '—'}
            </text>
            <text x={1152} y={390} className="dp-port">
              WriteData: {EX_MEM.valid && view.errorStage !== 'IF' ? formatHex32(EX_MEM.writeData) : '—'}
            </text>
            <text x={1216} y={418} textAnchor="middle" className="dp-mono-xs">
              MR={view.controlsValid && view.ctrl ? view.ctrl.MemRead : '—'} · MW={view.controlsValid && view.ctrl ? view.ctrl.MemWrite : '—'}
            </text>
            <text x={1216} y={442} textAnchor="middle" className="dp-port-out">
              MDR: {view.mdr !== null ? formatHex32(view.mdr) : '—'}
            </text>
            <rect x={1156} y={450} width={120} height={20} rx={6} className="dp-pill" />
            <text x={1216} y={463} textAnchor="middle" className="dp-mono-xs">
              {view.dmemAction}
            </text>
          </g>

          {/* ================= BUFFER 4: MEM/WB ================= */}
          <g className={blockClass('MEM_WB')} {...bindBlockEvents('MEM_WB')}>
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
              MEM / WB · {MEM_WB.valid ? 'VÁLIDO' : 'VACÍO'} · Carga: MEM
            </text>
          </g>

          {/* ================= STAGE 5: WB ================= */}
          <g className={blockClass('MUX_MEMTOREG')} {...bindBlockEvents('MUX_MEMTOREG')}>
            <rect x={1390} y={318} width={44} height={88} rx={10} className="dp-mux" />
            <text x={1412} y={338} textAnchor="middle" className="dp-mux-label">0:ALU</text>
            <text x={1412} y={362} textAnchor="middle" className="dp-mux-title">M2Reg</text>
            <text x={1412} y={388} textAnchor="middle" className="dp-mux-label">1:MDR</text>
            <text x={1412} y={424} textAnchor="middle" className="dp-mono-xs">
              sel={view.muxMemToRegSel ?? '—'}
            </text>
            <text x={1412} y={442} textAnchor="middle" className="dp-mono-xs">
              Dw={shortHex(view.dw)}
            </text>
          </g>
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

      {/* Interactive Hover/Click Detail Inspector */}
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
            <div className="dp-inspector-grid">
              <div>
                <span className="dp-inspector-label">Bits y Puertos Exactos</span>
                <div className="dp-bit-pills">
                  {inspectedInfo.bitRanges.map((b) => (
                    <code key={b} className="dp-bit-pill">{b}</code>
                  ))}
                </div>
              </div>
              <div>
                <span className="dp-inspector-label">Valores en Vivo</span>
                <dl className="dp-live-dl">
                  {inspectedInfo.liveValues.map((lv) => (
                    <div key={lv.label} className="dp-live-row">
                      <dt>{lv.label}</dt>
                      <dd>
                        <code>{lv.value}</code>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </>
        ) : (
          <p className="muted dp-inspector-empty">
            Pasa el cursor o haz clic sobre cualquier bloque del diagrama (<code>PC</code>,{' '}
            <code>Reunión Big-Endian</code>, <code>BR</code>, <code>MIPSALU</code>,{' '}
            <code>Muxes</code>, <code>DMem</code> o buffers) para inspeccionar sus bits y función
            sin saturar la vista.
          </p>
        )}
      </div>
    </div>
  );
}
