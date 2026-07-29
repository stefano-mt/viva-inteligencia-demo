# Fase 2 — Resumen de contexto, geografía y escenario

**Fecha de cierre documental:** 2026-07-29

**Estado:** cierre técnico implementado y verificado; HUMAN-GATE-B aprobada; documentos P2-17 preparados en el worktree pero aún no versionados; PR, merge y cierre de ship pendientes

**Veredicto independiente:** `PASS WITH RISKS`

## Resultado

La Fase 2 convierte el filtro distrital de la demo en un escenario geográfico único, reproducible y compartible. El mismo `scenarioContext` alimenta radar, mapa, catálogo, lectura de mercado, comparador, checklist y asistente; distingue proyectos observados, geográficamente válidos, comparables y referencias provisionales de precio; y conserva estados honestos ante cobertura parcial, falta de geometría, radio vacío o evidencia insuficiente.

La fase entrega selección por distrito, cuadrante analítico o radio; mapa geográfico sin servicios externos en runtime; score de comparabilidad explicable; posicionamiento área/precio; configuración de un escenario Viva simulado; diagnóstico prudente contra precios de lista publicados; persistencia por URL; reset reproducible; y una jerarquía visual y responsive validada.

El checker independiente `/root/phase2_final_checker` verificó el HEAD funcional `606452569040d0489685a3c26b16e15da0c476ac` y emitió `PASS WITH RISKS`. La fuente del veredicto es [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md). Este resumen no eleva el resultado a `PASS`.

## Historias entregadas

| Historia | Resultado confirmado |
|---|---|
| HU-DEMO-101 | Barra global, escenario canónico, URL, propagación y reset. |
| HU-DEMO-102 | Fecha de corte, cobertura territorial, comparabilidad y precio como ejes separados. |
| HU-DEMO-103 | Estados de carga, error, vacío e insuficiencia sin fallback silencioso. |
| HU-DEMO-201 | Selección determinista por distrito, cuadrante o radio 500/1,000/1,500 m. |
| HU-DEMO-202 | Mapa geográfico local, accesible, con detalle persistente y atribución visible. |
| HU-DEMO-203 | Score 0–100 con componentes, pesos disponibles, cobertura y desempate estable. |
| HU-DEMO-204 | Alternancia entre mapa geográfico y posicionamiento área/precio sin cambiar IDs. |
| HU-DEMO-205 | Top siete de alta carga y cuatro cuadrantes analíticos por distrito. |
| HU-DEMO-301 | Escenario Viva simulado con punto, producto, área, precio y entrega. |
| HU-DEMO-302 | Diagnóstico Entrada/Alineado/Premium/Insuficiente contra referencias publicadas compatibles. |

Los criterios completos y su evidencia están en [PLAN.md](PLAN.md) y [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md).

## Datos y artefactos confirmados

| Dimensión | Resultado |
|---|---:|
| Contrato público | `2.1.0` |
| Proyectos legacy | 714 |
| Proyectos autoritativos | 676 |
| Agencias de mercado / modelo | 180 / 184 |
| Piloto base / enriched / deep | 30 / 22 / 5 |
| Asignaciones geográficas de los siete distritos | 433 |
| Dentro o sobre el polígono | 422 |
| `outside_district_polygon` | 11 |
| GeoJSON público | 46,650 bytes |

Artefactos verificados:

| Artefacto | SHA-256 |
|---|---|
| [viva-platform-demo.json](../../../prototipo_ejecutable/public/demo-data/viva-platform-demo.json) | `fa9365ff83c9c72aefa15bf5f6fee952b83efdd6ba23c524cf2f92c88b78ada4` |
| [district-boundaries.geojson](../../../prototipo_ejecutable/public/demo-data/district-boundaries.geojson) | `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0` |
| [district-boundaries-source.geojson](../../../datos_relevantes/geography/district-boundaries-source.geojson) | `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0` |

La fuente es un snapshot estático de siete relaciones OpenStreetMap en `EPSG:4326`, bajo ODbL 1.0, con atribución visible y RENLIM como referencia jurídica. La demo no consulta OSM, Nominatim, Overpass, tiles ni geocodificadores durante el recorrido. La aprobación de fuente se conserva en [APPROVAL.md](APPROVAL.md).

## CT-C — Consistencia territorial

El descriptor E2E público reproduce un radio de 500 m con:

- tres observados en mapa y selector: `observed:nexo-2417`, `observed:nexo-4088` y `observed:nexo-4135`;
- un comparable y una referencia de precio: `project:nexo-2417`;
- el mismo ID en catálogo, comparador, checklist y asistente;
- exclusión de `observed:nexo-4088` por `not_reconciled`;
- exclusión de `observed:nexo-4135` por `bedrooms_mismatch`.

La prueba ejercita URL, reload, hash, CTA, selector nativo, click, teclado, visualización y reset sin mocks ni inyección de fixtures. El contrato ejecutable está en [ct-c-public.json](../../../prototipo_ejecutable/tests/e2e-scenarios/ct-c-public.json) y [scenario-e2e.mjs](../../../prototipo_ejecutable/tests/scenario-e2e.mjs).

## CT-I — Miraflores de alta carga

| Métrica | Resultado |
|---|---:|
| Observados | 90 |
| Coordenadas válidas | 90 |
| Dentro/sobre polígono | 90 |
| Autoritativos/comparables baseline | 85 |
| No reconciliados visibles | 5 |
| Referencias provisionales de precio | 69 |
| Cuadrantes NW / NE / SW / SE | 40 / 5 / 5 / 40 |

Seleccionar NW produce un subconjunto no vacío, no amplía el universo distrital y propaga los mismos IDs a los consumidores. Reset restaura 90 observados, 85 comparables y `/#dashboard`.

## UI, responsive y accesibilidad

El mapa quedó como firma visual principal y los consumidores secundarios redujeron densidad horizontal mediante filas y apilado responsive. La verificación final cubrió:

- 7 rutas × 3 viewports;
- 7 escenarios × 3 viewports;
- 1440×900, 1280×720 y 390×844;
- reflujo automatizado equivalente a zoom 200% en 720×450;
- objetivo táctil mínimo de 44 px;
- CTA `#00614f` sobre blanco con contraste 7.44:1 y altura mínima de 48 px;
- foco visible, navegación por teclado y reduced motion;
- cero overflow horizontal, truncamiento crítico, errores de consola/HTTP o solicitudes externas.

Las 42 capturas finales P2-15 coincidieron con sus manifiestos SHA-256 durante P2-16. Permanecen sujetas al riesgo R2 porque su ubicación verificada fue temporal; deben adjuntarse o enlazarse de forma durable en el PR.

## Graphify

Se ejecutaron:

```powershell
uvx --from graphifyy graphify extract . --code-only --no-cluster
uvx --from graphifyy graphify god-nodes --top 15
```

Resultado: 2,066 nodos, 4,104 relaciones, 73 archivos de código cambiados y 7 sin cambios. No apareció un nuevo hub injustificado. `parseScenarioUrl()` quedó con 18 aristas y `buildComparabilityContext()` con 17, dentro de fronteras explícitas de F2.

Graphify no cubre con fidelidad la cascada CSS ni el contenido JSON: reportó 24 archivos no clasificados y 22 JSON sin nodos. Esa limitación se complementó con tests de datos, hashes, Playwright, contraste y revisión visual directa.

## Commits de la fase

| Tarea | Commit(s) |
|---|---|
| P2-00B | `94c41b5`, `f258eba` |
| P2-00C | `70dae60` |
| P2-01 | `fc6160e` |
| P2-02 | `70f74e1`, `f18e5ac` |
| P2-03 | `079f9ac` |
| Memoria posterior P2-03 | `20f282a` |
| P2-04 | `080cc61` |
| P2-05 | `223f1ea` |
| P2-06 | `3f0fccd` |
| P2-07 | `86ee414`, `d6ea5a4`, `736140a` |
| Cierre de gaps | `bc060d3` |
| P2-08 | `ec6e6e9` |
| P2-09 | `8d9aa77`, `3fc8c44` |
| P2-10 | `85c337a` |
| P2-11 | `6dfd27e` |
| Contratos de consumidores | `934c8df` |
| P2-12 | `3b158f2` |
| P2-13 | `da09c82` |
| P2-14 | `9f0aed5` |
| P2-15 | `6064525` |
| P2-16 | `49bf8de` |

La autoría Git `Stefano <stefano@a4f.ai>` no demuestra la identidad del maker agéntico. La identidad de maker para P2-01–P2-15 se registra como no verificable desde el repositorio en [HANDOFF.md](HANDOFF.md).

## Verificación y veredicto

P2-16 aprobó:

- `npm.cmd run verify`;
- una ejecución independiente adicional de `node tests/scenario-e2e.mjs`;
- Graphify y revisión de hubs;
- hashes de JSON, GeoJSON y 42 capturas finales;
- Playwright en tres viewports y reflujo equivalente a 200%;
- regresiones de Fase 1, privacidad, determinismo y accesibilidad.

**Veredicto vigente:** `PASS WITH RISKS`.

Stefano aprobó HUMAN-GATE-B con la declaración exacta:

> Acepto R1–R5 y autorizo HUMAN-GATE-B.

**Timestamp de sesión:** `2026-07-29T08:01:09.8984344-05:00`.

La aceptación autoriza preparar este cierre documental y el PR. Los cinco documentos P2-17 todavía deben versionarse en la rama antes de crear el PR; la aceptación no equivale a merge, despliegue ni verificación de GitHub Pages.

## Riesgos residuales aceptados

1. **R1 — makers y `write_set`:** no existe identidad versionada por maker y hubo desviaciones acotadas en `20f282a`, `080cc61` y `ec6e6e9`. Mitigación: registrar solo lo verificable y no inventar makers.
2. **R2 — evidencia temporal:** las capturas y mediciones verificadas pueden desaparecer de `%TEMP%`. Mitigación pendiente: adjuntar o enlazar evidencia durable durante la preparación/revisión del PR y antes de solicitar merge.
3. **R3 — contratos dispersos:** no existe `TEST_CONTRACTS.md`. Mitigación: usar como fuentes [PLAN.md](PLAN.md), [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md) y los tests ejecutables enlazados en [HANDOFF.md](HANDOFF.md); no crear un archivo fuera del `write_set`.
4. **R4 — Graphify limitado en CSS/JSON:** mitigado mediante tests, hashes, Playwright, contraste y revisión visual.
5. **R5 — zoom 200% automatizado:** no hubo sesión manual de Chrome con el control de zoom visible. Mitigación pendiente: comprobación humana breve al 200% antes de la demo; puede ejecutarse durante la revisión del PR solo si esa revisión ocurre primero.

## Estado de ship

- Cierre técnico: implementado y verificado.
- HUMAN-GATE-B: aprobada.
- Documentos P2-17: preparados en el worktree; commit/versionado pendiente.
- Evidencia durable en PR: pendiente y requerida antes de solicitar merge.
- PR contra `main`: pendiente.
- Merge humano: pendiente.
- P2-18, verificación read-only de GitHub Pages: pendiente y bloqueada hasta el merge.
- P2-19, persistencia post-merge en rama y PR documental separados: pendiente; su PR debe ser revisado y fusionado por un humano para cerrar la memoria.
- Estado de ship: **no completado**.
- Despliegue: **no demostrado ni verificado; no debe declararse desplegado**.

El workflow versionado es [deploy-pages.yml](../../../.github/workflows/deploy-pages.yml): se llama `Deploy demo to GitHub Pages`, se dispara con un push a `main`, publica `prototipo_ejecutable/public` en el environment `github-pages` y su owner operativo es GitHub Actions. La URL esperada por convención del repositorio es `https://stefano-mt.github.io/viva-inteligencia-demo/`, pero permanece **a confirmar por P2-18**.
