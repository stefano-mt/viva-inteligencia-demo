# Fase 0 — Plan inicial

## Estado

`COMPLETADA — 0A y 0B verificadas de forma independiente el 2026-07-28`

## Tarea 0A-01 — Harness documental

- `depends_on`: ninguno.
- `write_set`: `AGENTS.md`, `.planning/**`, `.gitignore`.
- Resultado: fuente de verdad, loops, gates, plantillas y evaluación Graphify.
- Verificación: enlaces internos, cobertura de fases, `git diff --check`, estado Git.

## Tarea 0B-01 — Baseline de comportamiento

- `depends_on`: 0A-01 aprobada.
- `write_set`: archivos nuevos de prueba, scripts de `package.json`, evidencia local.
- Archivos protegidos: `public/app.js`, `public/styles.css`.
- Resultado: smoke tests de rutas, consola, navegación y escenario actual.
- Verificación: test falla ante una ruta rota y pasa en baseline.

## Tarea 0B-02 — Especificación de modularización

- `depends_on`: 0B-01.
- `write_set`: `UI-SPEC.md` y plan revisado.
- Resultado: módulos, imports, propiedad de estado, orden CSS y estrategia de paridad.
- Verificación: plan checker confirma ausencia de ciclos y solapamientos.

## Tarea 0B-03 — Extracción JavaScript

- `depends_on`: 0B-02.
- `write_set`: `public/app.js` y nuevos módulos JS.
- Resultado: separar estado, navegación, utilidades, vistas y eventos sin cambiar salida.
- Verificación: sintaxis, smoke, consola y capturas de paridad.
- Regla: un solo implementador.

## Tarea 0B-04 — Fronteras CSS

- `depends_on`: 0B-03 estable.
- `write_set`: `public/styles.css`, nuevos CSS e `index.html` si requiere imports.
- Resultado: separar tokens/base/layout/componentes/vistas preservando cascada.
- Verificación: regresión visual por vista y viewport.
- Regla: un solo implementador.

## Tarea 0B-05 — Verificación independiente

- `depends_on`: 0B-03 y 0B-04.
- `write_set`: informe/evidencia, no código productivo.
- Resultado: veredicto de paridad y lista de gaps.
- Si falla: crear plan de gaps; no corregir desde la revisión.

## Olas

1. 0A-01.
2. 0B-01.
3. 0B-02.
4. 0B-03.
5. 0B-04.
6. 0B-05.

La secuencia es deliberadamente serial porque los archivos centrales están acoplados. El paralelismo se habilita después, no durante la extracción de fronteras.

## Resultado

- 0A-01: completada; fuente de verdad, roles, loops, gates y plantillas versionables.
- 0B-01: completada; contratos de datos, smoke browser y accesibilidad.
- 0B-02: completada; `UI-SPEC.md` define fronteras, DAG y contrato de no cambio.
- 0B-03: completada; `app.js` quedó como orquestador y las siete vistas tienen archivos propietarios.
- 0B-04: completada; ocho archivos CSS reproducen exactamente los 40,259 bytes originales.
- 0B-05: completada; veredicto independiente `PASS`.

El detalle técnico y la evidencia están en `SUMMARY.md` y `VERIFICATION_REPORT.md`.
