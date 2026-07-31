# Fase 4 — Baseline browser P4-00D

## Resultado

**PASS** el 2026-07-31. P4-00D no encontró una regresión previa a la implementación y habilita P4-01 bajo las condiciones de `APPROVAL.md`.

## Baseline y entorno

- Baseline funcional: `e30973baa963fd4caa408aaa802803beac91dddd`.
- Rama: `feat/phase-4-benchmark-comparator`.
- Paridad de `public/`, `tests/`, `scripts/` y `contracts/` frente a `e30973b`: PASS.
- Node: `v24.14.0`.
- npm: `11.9.0`.
- `package-lock.json`: lockfile v3.
- Playwright / playwright-core: `1.62.1`.
- Browser: Chromium headless mediante el helper local; cero red externa permitida.

## Preparación reproducible

```powershell
npm.cmd install --package-lock-only
npm.cmd ci
npm.cmd run verify
```

- Instalación: PASS, 3 paquetes auditados, 0 vulnerabilidades reportadas.
- `npm.cmd run verify`: PASS en 112.1 s.
- Arquitectura, escenario, comparabilidad, geografía, datos, referencias, privacidad, determinismo e inspector: PASS.
- E2E: escenario, CT-D/CT-G e inspector responsive: PASS.
- Smoke: 8 rutas × 3 viewports: PASS.
- Accesibilidad: 8 rutas × 3 viewports: PASS.
- Consola, page errors, HTTP >= 400 y solicitudes externas: cero.

## Evidencia visual

| Vista | Viewport | Bytes | SHA-256 |
|---|---:|---:|---|
| [Benchmark distrital](evidence/baseline/market-1440x900.png) | 1440×900 | 315,743 | `2c9f4a5329c348fe22e42aee5ce18d3499d70483a508bd54aaafd83facf72943` |
| [Comparador estratégico](evidence/baseline/compare-1440x900.png) | 1440×900 | 213,180 | `a739369ba7ba5472b29455c1bd92752d19a5e24e594116ca5c0fa009c4b461c5` |
| [Benchmark móvil](evidence/baseline/market-390x844.png) | 390×844 | 244,176 | `2f22dbab3c9929a38310f138cf396ab6f4d3657d07fff6d1465e44177aec8f69` |
| [Comparador móvil](evidence/baseline/compare-390x844.png) | 390×844 | 151,752 | `897b13b4af94f3325c97821e0e4cd96be98d8756897bf8eb2a3f0fe0253391ad` |

Las cuatro capturas fueron inspeccionadas visualmente. No presentan contenido vacío, colisión estructural bloqueante ni error de render.

## Gaps visuales congelados para Fase 4

Estos hallazgos pertenecen al baseline y son el trabajo previsto; no son regresiones de P4-00D:

1. la UI todavía usa “69 referencias publicadas elegibles” y “referencia de precio lista”, lenguaje que Fase 4 debe reemplazar por el índice orientativo no comparable aprobado en A11;
2. `#market` prioriza ranking y cuadrantes antes del benchmark/denominador;
3. `#compare` presenta una selección extensa antes de la conclusión y una matriz plana;
4. en móvil, el comparador depende de una tabla horizontal y muestra una sola columna de proyecto en el viewport inicial;
5. la lectura móvil de mercado es muy larga y repite bloques con jerarquía similar.

Las correcciones deben conservar los resultados técnicos de este baseline y demostrar el before/after en P4-11/P4-12.

## Gate

P4-00D: **PASS**. P4-01 puede comenzar desde el commit que incluya este informe, el lockfile y las cuatro capturas. Cualquier cambio funcional previo invalida el baseline.
