/**
 * PROPIETARIO: Integrante B (Dia 3)
 * CLI para regenerar imagenes cargables (.hex de 1 byte/dir) y listados (.lst) desde un .asm:
 *   Uso: npm run assemble -- programs/selection_sort.asm
 */

import fs from 'node:fs';
import path from 'node:path';
import { assemble } from './assembler';

const inputArg = process.argv[2];
if (!inputArg) {
  console.error('Uso: npm run assemble -- <ruta/archivo.asm>');
  process.exit(1);
}

const fullPath = path.resolve(process.cwd(), inputArg);
const source = fs.readFileSync(fullPath, 'utf-8');
const result = assemble(source);

if (!result.ok) {
  console.error('Errores de ensamblado:');
  for (const diag of result.diagnostics) {
    console.error(`  Linea ${diag.line} [${diag.code}]: ${diag.message}`);
  }
  process.exit(1);
}

const base = fullPath.replace(/\.(asm|s)$/i, '');
fs.writeFileSync(`${base}.hex`, result.hexImage, 'utf-8');
fs.writeFileSync(`${base}.lst`, result.listing, 'utf-8');
console.log(`Ensamblado exitoso: ${result.instructions.length} instrucciones -> ${path.basename(base)}.hex y .lst`);
