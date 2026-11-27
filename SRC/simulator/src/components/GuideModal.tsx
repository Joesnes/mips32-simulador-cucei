/**
 * Modal didáctico ("Cómo usar y cómo funciona") pensado para cualquier persona
 * sin conocimientos previos de arquitectura de computadoras.
 */
import { useEffect, useState } from 'react';

export interface GuideModalProps {
  open: boolean;
  onClose: () => void;
}

export function GuideModal({ open, onClose }: GuideModalProps) {
  const [tab, setTab] = useState<'uso' | 'arquitectura'>('uso');

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      onClick={onClose}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <span className="badge">Guía Interactiva</span>
            <h2 id="guide-modal-title">Cómo usar y cómo funciona el simulador</h2>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            aria-label="Cerrar guía"
          >
            ✕ Cerrar
          </button>
        </header>

        <div className="modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'uso'}
            className={`tab-btn ${tab === 'uso' ? 'is-active' : ''}`}
            onClick={() => setTab('uso')}
          >
            1. Cómo usar la página
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'arquitectura'}
            className={`tab-btn ${tab === 'arquitectura' ? 'is-active' : ''}`}
            onClick={() => setTab('arquitectura')}
          >
            2. Cómo funciona el procesador
          </button>
        </div>

        <div className="modal-body">
          {tab === 'uso' ? (
            <div className="guide-section">
              <p className="guide-intro">
                Sigue estos 5 pasos sencillos para ver cómo una instrucción en texto se convierte en
                ceros y unos y recorre el procesador etapa por etapa:
              </p>
              <ol className="guide-steps">
                <li>
                  <strong>Elige un ejemplo o escribe tu programa:</strong> En el panel izquierdo puedes
                  seleccionar un programa listo (como <em>Tipo R</em>, <em>Tipo I</em> o{' '}
                  <em>Selection Sort</em>) o escribir tus propias instrucciones MIPS. Si eliges
                  Selection Sort, también puedes cargar uno de los 3 arreglos de prueba en Memoria de
                  Datos.
                </li>
                <li>
                  <strong>Pulsa “Ensamblar”:</strong> Convierte el texto en código máquina de 32 bits
                  (4 bytes por instrucción) y lo carga en la Memoria de Instrucciones. Si hay un error
                  de escritura, aparecerá indicado con su número de línea.
                </li>
                <li>
                  <strong>Ejecuta a tu ritmo:</strong>
                  <ul>
                    <li>
                      <code>+ Etapa</code> avanza <strong>una sola etapa</strong> (IF → ID → EX → MEM → WB)
                      para ver exactamente qué cables y bloques se encienden.
                    </li>
                    <li>
                      <code>+ Instrucción</code> completa las 5 etapas de la instrucción actual.
                    </li>
                    <li>
                      <code>Play / Pausa</code> reproduce automáticamente etapa por etapa con la
                      velocidad que elijas (<em>Lento</em>, <em>Normal</em>, <em>Rápido</em> o{' '}
                      <em>Turbo</em>) y se detiene solo al terminar el programa o detectar un error.
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>Explora el diagrama interactivo:</strong> Pasa el cursor o haz clic sobre
                  cualquier bloque del diagrama (<code>PC</code>, <code>Reunión Big-Endian</code>,{' '}
                  <code>BR</code>, <code>MIPSALU</code>, <code>Muxes</code>, <code>DMem</code>) para
                  ver una explicación sencilla, sus bits exactos y los valores reales en ese instante.
                </li>
                <li>
                  <strong>Observa señales, registros y memoria:</strong> Revisa las 12 señales de
                  control, los 4 buffers intermedios, los 32 registros (<code>$0</code>–<code>$31</code>)
                  y la memoria byte por byte con resaltado automático en cada cambio.
                </li>
              </ol>
            </div>
          ) : (
            <div className="guide-section">
              <p className="guide-intro">
                Imagina al procesador como una línea de trabajo organizada en <strong>5 estaciones</strong>.
                En este simulador (<strong>Multiciclo</strong>) viaja <strong>una instrucción a la vez</strong>,
                pasando su resultado al siguiente módulo mediante 4 memorias temporales llamadas{' '}
                <em>buffers intermedios</em>.
              </p>

              <div className="guide-cards">
                <div className="guide-card">
                  <h4>1. PC y Reunión Big-Endian (Etapa IF)</h4>
                  <p>
                    El <strong>PC</strong> (Contador de Programa) es como un marcador de página que
                    señala qué instrucción sigue. La Memoria de Instrucciones guarda <strong>1 byte</strong>{' '}
                    (8 bits) por dirección, así que para leer una instrucción de 32 bits se leen 4 bytes
                    consecutivos (<code>mem[PC..PC+3]</code>) y se unen en orden <strong>Big-Endian</strong>{' '}
                    (el byte más importante primero) antes de poder decodificarla.
                  </p>
                </div>

                <div className="guide-card">
                  <h4>2. Decodificación y Banco de Registros (Etapa ID)</h4>
                  <p>
                    Los 32 bits se dividen en campos (operación, registros fuente/destino, constantes). La{' '}
                    <strong>Unidad de Control</strong> genera 12 señales que dirigen al circuito, el{' '}
                    <strong>Banco de Registros (BR)</strong> entrega hasta 2 valores desde sus 32 casillas
                    rápidas (<code>$zero</code> siempre vale 0 y rechaza escrituras) y el{' '}
                    <strong>Extensor</strong> adapta constantes de 16 bits a 32 bits.
                  </p>
                </div>

                <div className="guide-card">
                  <h4>3. Calculadora MIPSALU y Próximo PC (Etapa EX)</h4>
                  <p>
                    La <strong>MIPSALU</strong> ejecuta la operación elegida por <code>ALUctl</code>{' '}
                    (sumar, restar, AND, OR o comparar con signo en <code>slt</code>) y enciende la
                    bandera <code>Zero</code> si el resultado es 0. Al mismo tiempo se decide cuál será la
                    siguiente dirección de <code>PC</code> (<code>PC+4</code>, un salto condicional{' '}
                    <code>beq/bne</code> o un salto incondicional <code>j</code>).
                  </p>
                </div>

                <div className="guide-card">
                  <h4>4. Memoria de Datos y Escritura Final (Etapas MEM y WB)</h4>
                  <p>
                    En <strong>MEM</strong>, solo las instrucciones <code>lw</code> y <code>sw</code>{' '}
                    leen o escriben en la Memoria de Datos (también en Big-Endian). En <strong>WB</strong>,
                    si <code>RegWrite=1</code> y el destino no es <code>$zero</code>, el resultado final{' '}
                    <code>Dw</code> se guarda en el registro destino <code>AW</code> y el <code>PC</code> se
                    actualiza al <code>nextPC</code>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
