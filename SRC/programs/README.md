# Programas MIPS

Cada programa `.asm` tiene junto a él dos archivos generados por el ensamblador:

- `.hex`: imagen cargable en la memoria de instrucciones, **1 byte en hexadecimal por línea**, en orden big-endian (la línea N corresponde a la dirección N).
- `.lst`: listado con dirección, palabra de 32 bits en hex, binario separado por campos e instrucción fuente.

## Regenerar las imágenes

Desde la carpeta `SRC/`:

```bash
npm run assemble -- programs/selection_sort.asm
npm run assemble -- programs/examples/tipo_r.asm
npm run assemble -- programs/examples/tipo_i.asm
npm run assemble -- programs/examples/tipo_j.asm
```

La prueba `VERIF/tests/algorithm.test.ts` falla si algún `.hex` guardado no coincide con lo que genera el ensamblador, así que después de editar un `.asm` hay que regenerar su imagen.

Si el programa tiene errores, el comando no escribe archivos y muestra cada error con su número de línea.

## Algoritmo

`selection_sort.asm` ordena de menor a mayor (con signo) el arreglo de la memoria de datos: `N` en `0x0000` y `A[0..N-1]` desde `0x0004`. Termina en `fin: j fin` con el arreglo ya ordenado. El diseño, pseudocódigo y mapas están en `DOCS/propuesta_algoritmo.md`.

`datasets.json` tiene las 3 entradas de prueba (estándar, negativos con duplicados y el caso borde `N = 1`) con la memoria inicial y la esperada. `VERIF/tests/algorithm.test.ts` ejecuta el programa en `MipsCpu` con cada una y compara la memoria final con la esperada.

## Ejemplos

| Archivo | Qué muestra |
|---|---|
| `examples/tipo_r.asm` | `add`, `sub`, `and`, `or`, `slt` (con negativos) y la escritura descartada en `$zero` |
| `examples/tipo_i.asm` | Ejemplo `addiu` de la consigna, extensión con signo y con ceros, `sw`/`lw`, rama tomada, rama no tomada y rama hacia atrás |
| `examples/tipo_j.asm` | `j` hacia adelante que omite una instrucción con efecto visible y `j` hacia atrás que cierra un ciclo |

Cada `.asm` indica en su encabezado el estado final esperado de registros y memoria.
