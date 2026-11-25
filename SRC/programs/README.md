# Programas MIPS

Cada programa `.asm` tiene junto a él dos archivos generados por el ensamblador:

- `.hex`: imagen cargable en la memoria de instrucciones, **1 byte en hexadecimal por línea**, en orden big-endian (la línea N corresponde a la dirección N).
- `.lst`: listado con dirección, palabra de 32 bits en hex, binario separado por campos e instrucción fuente.

## Regenerar las imágenes

Desde la carpeta `SRC/`:

```bash
npm run assemble -- programs/examples/tipo_r.asm
npm run assemble -- programs/examples/tipo_i.asm
```

Si el programa tiene errores, el comando no escribe archivos y muestra cada error con su número de línea.

## Ejemplos

| Archivo | Qué muestra |
|---|---|
| `examples/tipo_r.asm` | `add`, `sub`, `and`, `or`, `slt` (con negativos) y la escritura descartada en `$zero` |
| `examples/tipo_i.asm` | Ejemplo `addiu` de la consigna, extensión con signo y con ceros, `sw`/`lw`, rama tomada, rama no tomada y rama hacia atrás |

Cada `.asm` indica en su encabezado el estado final esperado de registros y memoria.
