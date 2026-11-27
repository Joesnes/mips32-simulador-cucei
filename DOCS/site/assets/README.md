# Assets SVG de Arquitectura para el Reporte Técnico

Diagramas propios vectoriales elaborados por **Alejandro Espinoza** (Día 7) para incrustar en `DOCS/site/index.html`:

1. `datapath-multiciclo.svg` — Ruta de datos MIPS32 de 5 etapas (anchos de bus, reunión Big-Endian de 4 bytes, 12 señales de control y 4 buffers intermedios).
2. `reunion-big-endian.svg` — Ejemplo paso a paso `addiu $t0, $zero, 5` (4 bytes Big-Endian → palabra 32 bits → campos → señales → resultado).
3. `buffers-multiciclo.svg` — Documentación visual de los 4 registros intermedios (`IF/ID`, `ID/EX`, `EX/MEM`, `MEM/WB`): anchos, ciclo de carga, validez, reset y protección ante errores.

## Cómo incrustarlos en `DOCS/site/index.html`

```html
<figure>
  <img src="./assets/datapath-multiciclo.svg" alt="Datapath multiciclo MIPS32 de 5 etapas" />
  <figcaption>Figura 1. Ruta de datos MIPS32 multiciclo con reunión Big-Endian y buffers intermedios.</figcaption>
</figure>

<figure>
  <img src="./assets/reunion-big-endian.svg" alt="Reunión Big-Endian de 4 bytes para addiu $t0, $zero, 5" />
  <figcaption>Figura 2. Reunión de los 4 bytes Big-Endian antes de decodificar la instrucción.</figcaption>
</figure>

<figure>
  <img src="./assets/buffers-multiciclo.svg" alt="Registros intermedios IF/ID, ID/EX, EX/MEM y MEM/WB" />
  <figcaption>Figura 3. Anchos, ciclos de habilitación y política de reset de los 4 buffers intermedios.</figcaption>
</figure>
```
