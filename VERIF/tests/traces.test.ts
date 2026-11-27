import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TRACE_SPECS, buildTrace } from '../traces/generar_trazas';

const tracesDir = path.resolve(__dirname, '../traces');

describe('Trazas R, I y J reproducibles', () => {
  it.each(TRACE_SPECS.map((s) => [s.file, s] as const))('%s coincide con la ejecucion en MipsCpu', (_file, spec) => {
    const saved = fs.readFileSync(path.join(tracesDir, spec.file), 'utf-8').replace(/\r\n/g, '\n');
    expect(saved).toBe(buildTrace(spec));
  });

  it('la traza I carga N = 5 en $s1, la traza J regresa a outer y la traza R escribe 1 en $t5', () => {
    expect(buildTrace(TRACE_SPECS[0])).toContain('| $s1 ($17) | 0x00000000 (0) | 0x00000005 (5) |');
    expect(buildTrace(TRACE_SPECS[1])).toContain('| PC | 0x00000068 | 0x00000014 |');
    expect(buildTrace(TRACE_SPECS[2])).toContain('| $t5 ($13) | 0x00000000 (0) | 0x00000001 (1) |');
  });
});
