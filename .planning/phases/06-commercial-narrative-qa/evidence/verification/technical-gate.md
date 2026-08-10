# P6-15 — Evidencia del gate técnico

**Fecha:** 2026-08-10

**HEAD:** `7a08fca`

**Comando:** `npm.cmd run verify`, ejecutado desde `prototipo_ejecutable/`.

**Resultado:** `PASS`, exit code `0`.

## Cobertura observada

| Capa | Resultado independiente |
|---|---|
| Sintaxis y `check:phase6` | PASS |
| Ownership CSS | PASS |
| Grafo modular | PASS — 27 módulos alcanzables, contexto 90/85 y una recomposición por cambio |
| Catálogo, URL, shell, estado, paridad, guía y reset del recorrido | PASS |
| Fixtures CT-A–I/P y estados 2.0–2.4 | PASS |
| Lenguaje comercial y paquete de ensayo `PENDING` | PASS |
| Escenario, comparabilidad, mapa y proyectos | PASS |
| Contrato, schema, validator y referencias | PASS |
| Agencias | PASS — 180 canónicas de mercado, 184 modeladas, piloto 30/22/5 |
| Evidencia, medidas, Inspector CT-D/CT-G | PASS |
| Histórico y Asistente | PASS |
| Determinismo | PASS — JSON `20d44245...`, cobertura `639b613a...`, GeoJSON `ef75b5de...` |
| Privacidad | PASS |
| Benchmark y Comparador | PASS |
| E2E F2–F6 | PASS |
| Journey UI-only | PASS según las aserciones existentes |
| Responsive F6 | PASS — 14 superficies × 3 viewports, zoom 200 %, teclado, foco, 44×44, AA y reduced motion |
| Smoke | PASS — 8 rutas × 3 viewports |
| Accesibilidad | PASS — 14 superficies × 3 viewports |

No se omitió ninguna suite del manifiesto `verify`.

## Artefactos regenerados por el gate

`journey-e2e.mjs` regeneró cuatro artefactos rastreados fuera del write set P6-15. Se restauraron exactamente a `HEAD` después de comprobar que eran productos de la corrida:

- `evidence/functional/03-quality-type7.png`;
- `evidence/functional/05-movement-signal.png`;
- `evidence/functional/06-decision-assistant.png`;
- `evidence/functional/manifest.json`.

El manifiesto volvió al blob `e6fa83afed05ce9327e367e4afd81154cfdfe6c1`; no quedó ningún cambio rastreado de esas regeneraciones.

## Integridad de evidencia existente

- Manifiesto funcional: 8/8 archivos presentes, 0 mismatches SHA-256.
- Manifiesto responsive: 14 superficies, 3 viewports, 56 capturas incluyendo zoom 200 %, 0 mismatches SHA-256.
- Revisión visual directa: Escala, Calidad, Decisión, Comparador laptop/móvil y Decisión a zoom 200 % sin overflow o solape visible.

El `PASS` del comando no determina el veredicto final: la prueba adversarial documentada en `adversarial-ui-state.md` encontró un gap P1 no cubierto por las aserciones actuales.
