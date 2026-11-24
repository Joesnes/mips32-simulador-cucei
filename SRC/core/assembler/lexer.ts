/**
 * PROPIETARIO: Fares Khalifa
 * Analizador lexico del ensamblador: separa cada linea en etiquetas, mnemonico y operandos.
 *
 * Comentarios: `#` inicia un comentario hasta el fin de linea, EXCEPTO cuando aparece al inicio
 * de un operando y va pegado a un valor, como en la sintaxis de la consigna:
 *   addi $t0, $t1, #5      j #fin      lw $t0, #4($s0)
 * Asi conviven las dos formas:
 *   add $t0, $t1, $t2  # esto es comentario
 *   addi $t0, $t1, #5  # el primer '#' es prefijo del inmediato, el segundo es comentario
 */

export interface LabelToken {
  name: string;
}

export interface SourceLine {
  /** Numero de linea 1-based en el archivo original. */
  line: number;
  /** Texto original de la linea (sin salto de linea). */
  raw: string;
  /** Etiquetas definidas en esta linea (`fin:`), en orden. */
  labels: LabelToken[];
  /** Mnemonico en minusculas, o null si la linea solo tiene etiquetas/comentarios. */
  mnemonic: string | null;
  /** Operandos ya separados por comas y sin espacios en los extremos. */
  operands: string[];
  /** Texto limpio de la instruccion: `mnemonico op1, op2, op3` (sin etiquetas ni comentario). */
  text: string;
  /** Error de sintaxis detectado al separar la linea (operando vacio, falta de coma, etc.). */
  syntaxError: string | null;
}

const LABEL_RE = /^([A-Za-z_.][A-Za-z0-9_.]*)\s*:/;
const MNEMONIC_RE = /^[A-Za-z][A-Za-z0-9.]*/;

/** Quita el comentario de la parte de operandos respetando el prefijo `#` de inmediatos/etiquetas. */
function stripOperandComment(rest: string): string {
  let expectOperandStart = true;
  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i];
    if (ch === '#') {
      const next = rest[i + 1];
      const glued = next !== undefined && !/\s/.test(next) && next !== ',';
      if (expectOperandStart && glued) {
        expectOperandStart = false;
        continue;
      }
      return rest.slice(0, i);
    }
    if (ch === ',') {
      expectOperandStart = true;
    } else if (!/\s/.test(ch)) {
      expectOperandStart = false;
    }
  }
  return rest;
}

/** Separa una linea de ensamblador en sus partes. */
export function tokenizeLine(raw: string, line: number): SourceLine {
  const result: SourceLine = {
    line,
    raw,
    labels: [],
    mnemonic: null,
    operands: [],
    text: '',
    syntaxError: null,
  };

  let rest = raw.replace(/\r$/, '').trim();

  // Etiquetas al inicio de la linea (puede haber varias: `a: b: add ...`).
  for (;;) {
    if (rest.startsWith('#')) {
      return result;
    }
    const match = LABEL_RE.exec(rest);
    if (!match) {
      break;
    }
    result.labels.push({ name: match[1] });
    rest = rest.slice(match[0].length).trim();
  }

  if (rest === '' || rest.startsWith('#')) {
    return result;
  }

  const mnemonicMatch = MNEMONIC_RE.exec(rest);
  if (!mnemonicMatch) {
    result.syntaxError = `No se reconoce una instruccion en "${rest}".`;
    result.text = rest;
    return result;
  }

  result.mnemonic = mnemonicMatch[0].toLowerCase();
  const afterMnemonic = rest.slice(mnemonicMatch[0].length);
  if (afterMnemonic !== '' && !/^\s/.test(afterMnemonic) && !afterMnemonic.startsWith('#')) {
    result.syntaxError = `Falta un espacio despues del mnemonico "${mnemonicMatch[0]}".`;
  }

  const operandText = stripOperandComment(afterMnemonic).trim();
  if (operandText !== '') {
    const parts = operandText.split(',').map((p) => p.trim());
    result.operands = parts;
    if (result.syntaxError === null) {
      if (parts.some((p) => p === '')) {
        result.syntaxError = 'Hay un operando vacio (revisa las comas).';
      } else if (parts.some((p) => /\s/.test(p))) {
        result.syntaxError = 'Los operandos deben separarse con comas.';
      }
    }
  }

  result.text = result.operands.length > 0
    ? `${result.mnemonic} ${result.operands.join(', ')}`
    : result.mnemonic;
  return result;
}

/** Separa todo el programa en lineas analizadas (1-based). */
export function tokenizeSource(source: string): SourceLine[] {
  return source.split('\n').map((raw, index) => tokenizeLine(raw, index + 1));
}
