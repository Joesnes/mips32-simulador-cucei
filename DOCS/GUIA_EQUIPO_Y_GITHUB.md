# Guía Paso a Paso de Git y GitHub (Para Principiantes)

Esta guía está pensada para que **Alejandro Espinoza** e **Fares Khalifa** trabajen juntos en GitHub sin experiencia previa, evitando conflictos y manteniendo una actividad equilibrada (50/50) evaluable por el profesor.

---

## Regla de Oro del Equipo

> **NUNCA hagas cambios directos en la rama `main`.**
> Siempre crea una rama propia (`feat/...` o `docs/...`), sube tus cambios y abre un **Pull Request (PR)** para que tu compañero lo revise y lo apruebe.

---

## 1. Configuración Inicial (Solo se hace UNA vez en tu computadora)

Abre una terminal (PowerShell en Windows) y escribe tus datos (usa el mismo correo de tu cuenta de GitHub):

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-correo@ejemplo.com"
```

Para descargar el proyecto por primera vez (Fares Khalifa):

```bash
git clone https://github.com/Joesnes/mips32-simulador-cucei.git
cd mips32-simulador-cucei/SRC
npm install
```

> **Tip para Windows PowerShell:** Si al correr `npm` te sale un error de *"running scripts is disabled"*, usa `npm.cmd` (ej. `npm.cmd install`, `npm.cmd test`) o habilita scripts una sola vez con:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

---

## 2. Ciclo Diario de Trabajo (Repetir en cada tarea)

### Paso A: Actualizar tu copia local con lo último de `main`
Antes de empezar una tarea nueva, asegúrate de tener lo más reciente:

```bash
git checkout main
git pull origin main
```

### Paso B: Crear una rama nueva para tu tarea
Usa un nombre corto y descriptivo (por ejemplo `feat/asm-tipo-r` o `docs/propuesta-algoritmo`):

```bash
git checkout -b feat/nombre-de-tu-tarea
```

### Paso C: Trabajar SOLO en tus archivos y verificar que todo funciona
Antes de guardar en Git, entra a `SRC/` y corre estas 3 verificaciones:

```bash
cd SRC
npm run typecheck
npm test
npm run build
```
Si los 3 comandos salen en verde (sin errores), estás listo para hacer commit.

### Paso D: Guardar tus cambios (Commit) y subirlos a GitHub (Push)
Desde la carpeta raíz del proyecto:

```bash
git status
git add .
git commit -m "feat(assembler): implementar parser y codificador tipo R"
git push -u origin feat/nombre-de-tu-tarea
```

**Convención de mensajes de commit:**
- `feat(modulo): ...` -> nueva funcionalidad
- `fix(modulo): ...` -> corrección de error
- `test(modulo): ...` -> nuevas pruebas en `VERIF/`
- `docs(modulo): ...` -> documentación, reporte o evidencias en `DOCS/`

### Paso E: Abrir Pull Request (PR) en GitHub
1. Entra al repositorio en GitHub.com.
2. Verás un banner amarillo que dice **"Compare & pull request"** → haz clic ahí.
3. Escribe un título claro y en la descripción explica qué hiciste y qué pruebas pasaron.
4. En **Reviewers** (derecha), selecciona a tu compañero.
5. Espera a que aparezca la palomita verde de **CI - Verificación de Pull Requests** (GitHub corre `typecheck`, `test` y `build` automáticamente).

### Paso F: Revisar el PR de tu compañero (Revisión cruzada)
1. Abre el PR de tu compañero en la pestaña **Pull requests**.
2. Haz clic en **Files changed** y revisa que solo tocó sus archivos y que las pruebas pasaron.
3. Haz clic en **Review changes** → escribe un comentario breve útil → selecciona **Approve** → **Submit review**.
4. Haz clic en **Merge pull request** → **Confirm merge**.

---

## 3. ¿Cómo saber si voy parejo en GitHub?

En GitHub entra a **Insights → Contributors** y **Pulse**: ambos integrantes deben aparecer con commits y PRs distribuidos durante los 8 días (2 a 4 commits pequeños al día cada uno).
