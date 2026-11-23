# Carpeta VERIF — Verificación, Pruebas y Trazas

Contiene las pruebas reproducibles exigidas por la consigna:
- `tests/`: Suites automatizadas en Vitest (`smoke.test.ts`, `isa.test.ts`, `assembler.test.ts`, `integration.test.ts`, `algorithm.test.ts`).
- `traces/`: Trazas detalladas ciclo a ciclo para una instrucción de cada formato (`traza_R.md`, `traza_I.md`, `traza_J.md`).
- `results/`: Reporte consolidado de resultados esperados vs observados (`test_report.md`).

## Cómo ejecutar las pruebas

```bash
cd SRC
npm test
```
