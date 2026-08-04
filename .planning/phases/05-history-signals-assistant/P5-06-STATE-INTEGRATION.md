# P5-06 — Integración derivada de estado y adopción runtime 2.4

**Estado:** completado.

**Rama:** `feat/phase-5-history-signals-assistant`.

## Objetivo

Adoptar el contrato público 2.4 en el runtime territorial e integrar `historyContext` como una proyección derivada del mismo `scenarioContext` utilizado por Radar, mapa, Benchmark y Comparador. La integración no modifica el payload, no reconstruye cambios desde campos legacy y no incorpora todavía interfaz ni estilos.

## Modelo de estado

`public/js/state.js` conserva tres responsabilidades locales nuevas:

- `historyFilters`: filtros normalizados de estado, vigencia y dirección;
- `historyContext`: resultado inmutable del motor puro `buildHistoryContext`;
- `selectedHistoryEventId`: selección válida únicamente si el evento permanece visible.

La revisión global de escenario y la revisión local de histórico están separadas:

1. Un cambio de distrito o alcance recalcula una vez `scenarioContext`, Benchmark e histórico.
2. Un cambio de filtros recalcula únicamente `historyContext`; no muta el escenario ni incrementa su revisión.
3. Una selección no recalcula el motor y se invalida si el evento deja de estar visible.
4. `RESET` restaura escenario, filtros y selección. Si el escenario ya era el predeterminado pero el histórico estaba filtrado, solo recompone el histórico.
5. Una navegación que no cambia el escenario conserva referencia y revisión del histórico; una navegación que sí cambia el escenario activa una única recomposición derivada.
6. La ausencia de datos limpia escenario, Benchmark, histórico, filtros y selección sin conservar estado obsoleto.

El estado consume `normalizeHistoryFilters` y `buildHistoryContext` desde `history.js`. No duplica reglas de orden, vigencia, evidencia, cobertura o agenda.

## Compatibilidad runtime

| Contrato público | Escenario | Benchmark | Histórico |
| --- | --- | --- | --- |
| 2.0 | no disponible en el runtime territorial F2+ | no disponible | no disponible |
| 2.1–2.2 | disponible | degradación explícita | degradación explícita |
| 2.3 | disponible | disponible | degradación explícita |
| 2.4 | disponible | disponible, con semántica 2.3 preservada | disponible |

El reader estructural continúa aceptando 2.0–2.4. `scenario.js` adopta 2.4 sin retirar 2.1–2.3. `benchmark.js` amplía su allowlist de 2.3 a 2.3–2.4 porque el índice heredado no cambia en 2.4; no se modifican fórmulas, elegibilidad, pairing, claims ni salidas del motor.

## Ciclo rojo → verde

El test nuevo `tests/history-state.mjs` falló primero por la ausencia de la API de selección y los gates de escenario/Benchmark fallaron porque el runtime aún rechazaba 2.4. Tras integrar el estado y ampliar las allowlists compatibles quedaron cubiertos:

- composición única de `buildHistoryContext`;
- prohibición de reconstruir `price_delta_pct` legacy;
- inmutabilidad del payload;
- paridad de `comparable_project_ids` y revisión de escenario;
- filtros locales y no-op normalizado;
- selección válida, inválida e invalidación por filtro;
- recomposición por distrito, cuadrante y reset;
- reset local sin recomponer escenario;
- degradación explícita para 2.1–2.3;
- limpieza integral ante datos nulos;
- compatibilidad de navegación y grafo modular.

## Verificación

PASS:

```text
npm.cmd run test:history:state
npm.cmd run test:scenario
npm.cmd run test:benchmark:domain
node tests/contract-runtime-startup.mjs
npm.cmd run test:architecture
npm.cmd run check
npm.cmd run verify
git diff --check
```

La verificación integral cubrió sintaxis, arquitectura, contrato, datos, referencias, privacidad, determinismo, Inspector, Benchmark, E2E, ocho rutas en tres viewports y accesibilidad. Los artefactos permanecen deterministas:

```text
JSON público   20d44245c956a198c8621b3f544115387037b73cc462e50f63a5ce6d61fb4a37
Cobertura      639b613aff89f9605c3dcc74a7914700dfa89fb84ababe70910fc25c3ba81864
GeoJSON        ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0
```

## Archivos modificados

- `prototipo_ejecutable/public/js/scenario.js`
- `prototipo_ejecutable/public/js/benchmark.js`
- `prototipo_ejecutable/public/js/state.js`
- tests de estado, compatibilidad, arquitectura y regresión
- `prototipo_ejecutable/package.json`
- memoria de planificación de P5-06

## Archivos protegidos

Sin cambios en schema, writer, policy, fixtures, dataset público, motor `history.js`, `controller.js`, vistas, estilos, activos, fórmulas de Benchmark o semántica de elegibilidad.

## Handoff a P5-07

La interfaz de histórico debe leer exclusivamente `state.historyContext`, `state.historyFilters` y `state.selectedHistoryEventId`, y despachar `setHistoryFilters`/`selectHistoryEvent`. No debe leer `payload.history` directamente, recalcular vigencia, reordenar señales ni reconstruir métricas.
