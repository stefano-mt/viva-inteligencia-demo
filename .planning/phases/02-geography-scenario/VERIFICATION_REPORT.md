# Fase 2 — Informe de verificación independiente

**Fecha de ejecución:** 2026-07-29  
**Checker:** `/root/phase2_final_checker`  
**Rol:** checker final independiente P2-16; no implementó P2-01 a P2-15  
**Base:** `a8f028453ca185c3ccc0337836bcb528f9a90b31` (`main`)  
**HEAD verificado:** `606452569040d0489685a3c26b16e15da0c476ac`  
**Rama:** `feat/phase-2-geography-scenario`  
**Remoto verificado:** `origin/feat/phase-2-geography-scenario` en el mismo SHA  
**Veredicto:** `PASS WITH RISKS`

## Resumen ejecutivo

La implementación funcional de Fase 2 cumple las historias HU-DEMO-101–103, HU-DEMO-201–205 y HU-DEMO-301–302. El escenario canónico se conserva en URL, alimenta los siete consumidores/rutas, reproduce CT-C y CT-I, degrada sin fallback silencioso, mantiene el mapa sin servicios externos y diferencia datos observados, comparables, referencias de precio y escenario simulado.

El gate completo `npm.cmd run verify` pasó, al igual que una segunda ejecución independiente de `node tests/scenario-e2e.mjs`. La verificación incluye contratos y regresiones de F1, datos, geografía, comparabilidad, siete rutas por tres viewports, accesibilidad, consola, HTTP y ausencia de solicitudes externas.

Los artefactos públicos verificados son:

| Artefacto | Bytes | SHA-256 |
|---|---:|---|
| `viva-platform-demo.json` | 3,588,986 | `fa9365ff83c9c72aefa15bf5f6fee952b83efdd6ba23c524cf2f92c88b78ada4` |
| `district-boundaries.geojson` | 46,650 | `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0` |
| `district-boundaries-source.geojson` | 46,650 | `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0` |

El veredicto no es `PASS` por tres riesgos procedimentales: la identidad de los makers no quedó versionada por tarea; existen desviaciones puntuales de `write_set` que no fueron ampliadas expresamente; y parte de la evidencia visual P2-14/P2-15 vive en directorios temporales, no en un artefacto persistente del repositorio. Ninguno produjo una divergencia funcional o de datos en este gate, pero HUMAN-GATE-B debe aceptarlos y P2-17 debe registrarlos sin ocultarlos.

## Identidad y separación maker/checker

- Este checker fue creado específicamente para P2-16 y no aparece como maker de P2-01 a P2-15.
- Los commits están firmados en Git por `Stefano <stefano@a4f.ai>`. Ese autor acredita propiedad Git, no la identidad del agente que escribió cada tarea.
- No existe todavía `HANDOFF.md` de F2 ni otro registro versionado que asocie cada P2-01–P2-15 con una identidad de maker y los comandos de su ejecución.
- Por tanto, sí se puede demostrar que el checker P2-16 es distinto, pero no se puede auditar desde el repositorio la separación maker/checker histórica de cada tarea.
- P2-17 debe completar el handoff con las identidades disponibles. Si una identidad histórica no puede reconstruirse, debe declararse como “no verificable”; no debe inferirse a partir del autor Git.

## Alcance del diff y commits

El diff `a8f0284..6064525` contiene 66 archivos, 26,308 inserciones y 1,289 eliminaciones. No modifica `.github/workflows/**` ni escribe sobre `main`.

| Tarea | Commit(s) | Auditoría del alcance |
|---|---|---|
| Planificación/P2-00B | `94c41b5`, `f258eba` | Documentos de planificación y corrección del drift 88/90. |
| P2-00C | `70dae60` | Aprobación humana, decisiones y estado. |
| P2-01 | `fc6160e` | `write_set` exacto de fuente OSM. |
| P2-02 | `70f74e1`, `f18e5ac` | `write_set` de contrato, fixtures y tests; remediación dentro del mismo conjunto. |
| P2-03 | `079f9ac` | `write_set` exacto del motor y tests geográficos. |
| Memoria tras P2-03 | `20f282a` | Modifica `DECISIONS.md`, `STATE.md` y `SOURCE-ASSESSMENT.md`; es factual, pero no pertenece al `write_set` de P2-03. |
| P2-04 | `080cc61` | Entrega funcional completa. Además toca `DECISIONS.md` y `tests/data-contract-compatibility.mjs`, fuera del `write_set` publicado. |
| P2-05 | `223f1ea` | `write_set` exacto. |
| P2-06 | `3f0fccd` | `write_set` exacto. |
| P2-07 | `86ee414`, `d6ea5a4`, `736140a` | Cambios dentro de estado/controlador/dominio/grafo permitidos; dos remediaciones se integraron después de la primera entrega. |
| Cierre de gaps | `bc060d3` | Actualiza PLAN/DECISIONS; documenta D-021, D-022 y D-023. |
| P2-08 | `ec6e6e9` | Entrega barra/contexto. También añade una línea de restauración de foco en `controller.js`, fuera del `write_set` P2-08. |
| P2-09 | `8d9aa77`, `3fc8c44` | Componentes/tests de mapa dentro del conjunto permitido; el segundo commit estabiliza accesibilidad. |
| P2-10 | `85c337a` | Dashboard y controlador, conforme a D-021. |
| P2-11 | `6dfd27e` | `market.js`, conforme al plan. |
| Contratos consumidores | `934c8df` | PLAN/DECISIONS; amplía P2-12/P2-13 mediante D-023. |
| P2-12 | `3b158f2` | Catálogo, comparador y test puro dentro del conjunto ampliado. |
| P2-13 | `da09c82` | Checklist, asistente, controlador y test puro dentro del conjunto ampliado. |
| P2-14 | `9f0aed5` | `write_set` E2E exacto. |
| P2-15 | `6064525` | Cuatro archivos CSS exactos; no modifica tokens globales ni HTML/JS. |

Comprobaciones:

- `git diff --check a8f0284..HEAD`: PASS.
- Árbol limpio antes de este informe: PASS.
- `HEAD == origin/feat/phase-2-geography-scenario`: PASS.
- Archivos protegidos `.github/workflows/**`: sin cambios.
- `graphify-out/` permanece ignorado por Git.

Las desviaciones anteriores son acotadas y el contenido fue cubierto por el gate, pero contradicen la regla de ampliar el `write_set` antes de escribir. Se registran como riesgo R1.

## Comandos ejecutados por P2-16

Se configuró:

```powershell
$env:NODE_PATH='C:\Users\Stefano\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:PLAYWRIGHT_CHROME_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
```

| Comando | Resultado |
|---|---|
| `python ...\webapp-testing\scripts\with_server.py --help` | PASS; helper inspeccionado antes de usar Playwright. |
| `npm.cmd run verify` | PASS en 63.5 s. |
| `node tests/scenario-e2e.mjs` | PASS en 10.2 s, ejecución adicional independiente. |
| `uvx --from graphifyy graphify extract . --code-only --no-cluster` | PASS; 2,066 nodos, 4,104 relaciones. |
| `uvx --from graphifyy graphify god-nodes --top 15` | PASS. |
| Medición Playwright independiente 1440/1280/390/720 efectivo | PASS; contraste, foco, tamaño táctil, truncamiento, overflow, consola y red. |
| Hash de 21 capturas de escenarios P2-15 | PASS; 21/21 coinciden con `sha256.json`. |
| Hash de 21 capturas de rutas P2-15 | PASS; 21/21 coinciden con `sha256.json`. |
| SHA-256 directo de JSON/GeoJSON/fuente | PASS; coincide con dataset, cobertura y manifiesto. |
| `git diff --check a8f0284..HEAD` | PASS. |
| Estado de puertos 4173–4194 | PASS; ninguno quedó escuchando al terminar los tests. |

`npm.cmd run verify` ejecutó y aprobó:

- sintaxis de app, dominio, vistas, generador y tests;
- grafo de 19 módulos alcanzables, sin contexto paralelo;
- escenario, URL, reducer, CT-C y CT-I;
- comparabilidad, score, cuantiles y precio;
- mapa geográfico y posicionamiento;
- catálogo/comparador;
- checklist/asistente;
- contrato de datos, compatibilidad 2.0→reader 2.1, schema y validador;
- fuente/motor geográfico;
- referencias, agencias, evidencia, medidas, determinismo y privacidad;
- E2E de escenario;
- smoke de 7 rutas × 3 viewports;
- accesibilidad en las 7 rutas.

## Historias y criterios de aceptación

| Historia | Estado | Evidencia comprobada |
|---|---|---|
| HU-DEMO-101 — Barra global | PASS | `scenario-domain`, `scenario-context`, `module-graph` y E2E prueban una fuente, URL canónica, fallbacks por campo, reset, propagación y foco. |
| HU-DEMO-102 — Corte, cobertura y suficiencia | PASS | La UI deriva `cutoff_at`, separa cobertura territorial/comparabilidad/precio y muestra exclusiones; estados visibles en pruebas puras y navegador. |
| HU-DEMO-103 — Vacío e insuficiencia | PASS | Radio vacío real en E2E conserva 0, punto/radio y no vuelve a distrito; geometría ausente, carga, corrección, error e insuficiencia están cubiertos en tests puros; no hay `NaN`/`Infinity`. |
| HU-DEMO-201 — Cuadrante/radio | PASS | Modos y radios 500/1000/1500, Haversine, validación de punto, preservación de producto y alcance textual probados. |
| HU-DEMO-202 — Mapa geográfico | PASS | GeoJSON local, 0 solicitudes externas, estados por forma/borde/texto, click/select/teclado equivalentes, detalle persistente, leyenda, escala, norte y atribución visible. |
| HU-DEMO-203 — Score explicable | PASS | Componentes 30/20/15/10/10/15, cobertura, faltantes, umbral 60%, tie-break y redondeo probados; cantidad de unidades no puntúa. |
| HU-DEMO-204 — Mapa/posicionamiento | PASS | Visualización inicia en geográfica; alternancia conserva URL/IDs/foco; posicionamiento muestra ejes, ticks, mediana, unidades, target condicional y detalle persistente. |
| HU-DEMO-205 — Alta carga/cuadrantes | PASS | Top siete derivado, conteos 90/88/67/63/43/42/40, cuatro cuadrantes por distrito y suma de puntos válidos; un distrito sintético `high_load=false` deshabilita cuadrantes. |
| HU-DEMO-301 — Escenario Viva | PASS | Punto, producto, área, precio, dormitorios y entrega; commit atómico, URL, reset, `simulated`, sin dirección/geocodificador y sin convertir faltantes en cero. |
| HU-DEMO-302 — Diagnóstico de precio | PASS | PEN/lista/denominador compatible, P25/mediana/P75 R-7, diferencia absoluta/relativa, Entrada/Alineado/Premium/Insuficiente y advertencia de no cierre real. |

### Criterios de estados

- `scenario_status`, `geography_status`, `comparability_status` y `price_status` permanecen independientes.
- Carga: controles deshabilitados, `aria-busy` y “Preparando escenario geográfico”.
- Geometría ausente/hash inválido: lista preservada y mapa no inventado.
- Radio 0/0: `geography_status=ready`; comparabilidad/precio insuficientes.
- Cobertura 89/90: `geography_status=partial`.
- Cero comparables: cobertura 0 e `insufficient`.
- Dos comparables con 80/80: `orientative`.
- Tres comparables con media 60: `ready`.
- Dos referencias de precio: `insufficient`; tres: `ready`.

## CT-C — Consistencia territorial

### Fixture controlado

Los tests puros verifican:

- un proyecto dentro;
- uno fuera;
- uno con coordenadas inválidas;
- uno observado dentro pero no reconciliado;
- independencia del orden;
- borde exterior dentro y borde de hueco fuera;
- Haversine exactamente en 500 m;
- score y cuantiles R-7 exactos;
- mismo comparable en mapa/lectura/comparador/asistente;
- motivos `outside_scope`, `invalid_coordinates` y `not_reconciled`.

### Descriptor público E2E

URL canónica:

```text
/?sv=1&scope=radius&lat=-12.120166&lon=-77.024975&radius=500&typology=departamento&bedrooms=1&area=80&price=650000&delivery=2026#dashboard
```

Resultado:

| Universo | IDs |
|---|---|
| Observados/mapa/select | `observed:nexo-2417`, `observed:nexo-4088`, `observed:nexo-4135` |
| Comparable | `project:nexo-2417` |
| Referencia de precio | `project:nexo-2417` |
| Catálogo/comparador/checklist/asistente | `project:nexo-2417` |
| Exclusión reconciliación | `observed:nexo-4088` → `not_reconciled` |
| Exclusión producto | `observed:nexo-4135` → `bedrooms_mismatch` |

La URL, reload, hash, CTA, select nativo, click, Espacio/Enter, alternancia de visualización y reset fueron ejercitados sin inyección de fixtures ni mocks.

## CT-I — Miraflores alta carga

Resultado reproducido:

| Métrica | Valor |
|---|---:|
| Observados Miraflores | 90 |
| Coordenadas válidas | 90 |
| Dentro/sobre polígono | 90 |
| Autoritativos/comparables baseline | 85 |
| No reconciliados visibles | 5 |
| Referencias de precio baseline | 69 |
| Cuadrantes | 4 |
| NW / NE / SW / SE | 40 / 5 / 5 / 40 |

Seleccionar NW produce un subconjunto no vacío, no amplía el universo distrital y propaga los mismos IDs a catálogo, comparador, checklist y asistente. Reset restaura 90 observados, 85 comparables y URL `/#dashboard`.

## Geografía, fuente y contrato 2.1

- Contrato público: `2.1.0`; reader 2.1 acepta 2.0 y 2.1, y rechaza majors no soportados.
- Fuente: siete relaciones OSM aprobadas, `EPSG:4326`, snapshot estático ODbL 1.0.
- Atribución visible y enlazada: OpenStreetMap, ODbL y nota RENLIM.
- Runtime: ninguna solicitud a OSM/Nominatim/Overpass/tiles/geocodificadores.
- Asignaciones: 433.
- Dentro/sobre polígono: 422.
- `outside_district_polygon`: 11.
- Distribución: Santiago de Surco 1, Magdalena del Mar 7, San Isidro 3.
- Miraflores conserva 90/90; las exclusiones no se ocultan ni se reasignan.
- GeoJSON público sin simplificación: 46,650 bytes, muy por debajo del presupuesto de 750 KB.
- Hash del GeoJSON público, fuente y manifiesto: idéntico.

## Evidencia visual, responsive y contraste

Se verificaron tres conjuntos:

1. baseline P2-14: 21 PNG de 7 rutas × 3 viewports;
2. P2-15 escenarios: 21 PNG de 7 escenarios × 3 viewports;
3. P2-15 smoke final: 21 PNG de 7 rutas × 3 viewports.

Los 42 PNG finales P2-15 coinciden con sus manifiestos SHA-256. Se inspeccionaron manualmente:

- dashboard antes y después en escritorio;
- dashboard final en móvil;
- foco visible;
- mapa geográfico;
- posicionamiento;
- precio insuficiente.

Medición final:

| Caso | Resultado |
|---|---|
| 1440×900 | stage 1122×603.5; frame de mapa 760.4×435.6; detalle 30%; cumple mínimo de mapa y jerarquía. |
| 1280×720 | stage apilado; frame 918×527.6; detalle debajo. |
| 390×844 | stage 360 px; frame 332×363.7; controles a una columna; documento sin overflow horizontal. |
| Zoom efectivo 200% (720×450) | frame 646×398.7; sin overflow horizontal ni truncamiento crítico. |
| Objetivos táctiles | mínimo independiente 44 px. |
| CTA primario | `#00614f`/blanco = 7.44:1; min-height 48 px; peso 900. |
| Foco CTA | outline blanco 3 px + halo `#202022` de 6 px. |
| Texto secundario | `#52605b`/blanco = 6.60:1; `#46534f`/blanco = 8.04:1. |
| Advertencia | `#8a5400`/`#fff3d9` = 5.70:1. |
| Error | `#b42318`/`#fff0ec` = 5.93:1. |
| Información | `#315fba`/`#e9effb` = 5.24:1. |

La medición independiente no encontró:

- overflow horizontal de documento;
- texto crítico con `scrollWidth > clientWidth`;
- objetivos principales menores a 44 px;
- errores de consola/página/red/HTTP;
- solicitudes externas.

La evidencia de “distrito sin cuadrantes” es sintética en `scenario-context.mjs` porque el artefacto geográfico público contiene exactamente los siete distritos `high_load`. No se inventó un octavo polígono para producir una captura.

## Accesibilidad

- Un solo `main` y una navegación etiquetada en cada ruta.
- Controles sin nombre accesible: 0.
- IDs duplicados: 0.
- Mapa y selector nativo exponen los mismos IDs.
- Los puntos pointer-only quedan fuera del árbol y del orden de tabulación; el `select` nativo es la vía equivalente.
- Primer Tab enfoca el skip-link; Enter lleva a `#main-content`.
- Click, select, Espacio, End y Enter convergen en el mismo proyecto.
- Escape cierra ayuda contextual y menú móvil, y devuelve foco.
- CTA “Ver comparables” conserva escenario/hash y enfoca `#main-content`.
- Reset conserva foco y anuncia el baseline.
- `aria-live`, `aria-pressed`, `aria-current` y estados deshabilitados fueron comprobados.
- Reduced motion está acotado por CSS y las pruebas eliminan animaciones durante evidencia.

## Graphify

Comando exacto del plan:

```powershell
uvx --from graphifyy graphify extract . --code-only --no-cluster
uvx --from graphifyy graphify god-nodes --top 15
```

Resultado:

- 73 archivos de código cambiados, 7 sin cambios;
- 2,066 nodos;
- 4,104 relaciones;
- sin clustering;
- 24 archivos no clasificados, principalmente CSS;
- `00-tokens.css` omitido por el detector de datos sensibles;
- 22 JSON sin nodos, limitación conocida de Graphify.

Top 15:

| # | Nodo | Aristas | Fuente | Lectura |
|---:|---|---:|---|---|
| 1 | `escapeHtml()` | 54 | `public/js/domain.js` | Hub heredado de escape; no creció como motor F2. |
| 2 | `formatNumber()` | 49 | `public/js/domain.js` | Formato compartido heredado. |
| 3 | `buildDemoBundle()` | 40 | `scripts/build-demo-data.js` | Integrador serial de datos heredado de F1. |
| 4 | `escapeAttr()` | 36 | `public/js/domain.js` | Escape compartido heredado. |
| 5 | `$defs` | 29 | schema | Nodo estructural, no función runtime. |
| 6 | `scripts` | 26 | `package.json` | Nodo de configuración. |
| 7 | `priceM2()` | 23 | `public/js/domain.js` | Utilidad compartida heredada. |
| 8 | `render()` | 22 | `public/app.js` | Orquestador de vistas esperado. |
| 9 | `renderProjectDetail()` | 22 | `views/projects.js` | Detalle de catálogo existente. |
| 10 | `push()` | 21 | `scripts/data/validate.js` | Acumulador del validador. |
| 11 | `required` | 19 | schema | Nodo estructural. |
| 12 | `buildAssistantResponse()` | 19 | `public/js/domain.js` | Asistente legacy/compatibilidad; no crea contexto paralelo. |
| 13 | `bindEvents()` | 18 | `public/js/controller.js` | Controlador único previsto por D-021/D-023. |
| 14 | `parseScenarioUrl()` | 18 | `public/js/scenario.js` | Frontera normativa de URL F2. |
| 15 | `buildComparabilityContext()` | 17 | `public/js/comparability.js` | Frontera pura de comparabilidad F2. |

Conclusión Graphify: no aparece un nuevo hub injustificado. Los dos hubs funcionales nuevos de F2 quedan por debajo de 20 aristas y corresponden a fronteras explícitas. `domain.js` conserva utilidades de alta conectividad ya conocidas. Graphify no evalúa con fidelidad CSS/HTML dinámico; esa área fue cubierta por Playwright y revisión directa.

## Regresiones de Fase 1

El gate confirma:

- 714 proyectos legacy;
- 676 proyectos autoritativos;
- 184 agencias en el modelo, 180 de mercado;
- piloto 30/22/5;
- 42 proyectos excluidos por aliases no resueltos;
- 8 fuentes, 17 observaciones, 26 hechos, 4 documentos, 4 evidencias, 5 issues y 3 eventos;
- CT-A/B/D/E/G/H válidos;
- privacidad, permisos, referencias y determinismo;
- 7 rutas y aliases heredados;
- sin PII, rutas locales o recursos restringidos expuestos.

## Definition of Done de F2

| Criterio | Estado P2-16 |
|---|---|
| Historias Must de F2 | PASS |
| CT-C/CT-I deterministas | PASS |
| Miraflores 90/85/5 y 69 precios | PASS |
| Top siete y cuadrantes exhaustivos | PASS |
| Consumidores comparten IDs | PASS |
| Mapa offline/sin red externa | PASS |
| URL/reload/reset | PASS |
| Score y cobertura explicables | PASS |
| Simulado vs publicado | PASS |
| Vacío/error/carga/insuficiente | PASS |
| Consola/ciclos/404 | PASS |
| 3 viewports y zoom efectivo 200% | PASS |
| Teclado/foco | PASS |
| Contraste crítico | PASS |
| Regresiones F1 | PASS |
| Graphify sin god node nuevo | PASS |
| Checker independiente | PASS |
| Makers/comandos históricos versionados | RIESGO; pendiente de completar en P2-17 |
| Estado/resumen/handoff | PENDIENTE P2-17 |
| HUMAN-GATE-B | PENDIENTE decisión humana |
| PR, merge y Pages | FUERA de P2-16; P2-17–P2-19 |

## Riesgos residuales

### R1 — Trazabilidad incompleta de makers y desviaciones de `write_set`

**Severidad:** media procedimental.  
**Impacto:** impide reconstruir solo desde Git qué agente implementó/aprobó cada tarea y demuestra que tres deltas escribieron fuera de la lista previa.  
**Evidencia:** commits `20f282a`, `080cc61` y `ec6e6e9`; ausencia de handoff F2.  
**Mitigación requerida:** P2-17 debe registrar maker, commit y comandos cuando sean verificables; listar explícitamente las tres desviaciones y prohibir atribuciones inferidas.

### R2 — Evidencia visual final almacenada en temporal

**Severidad:** media de auditabilidad, baja funcional.  
**Impacto:** las capturas y mediciones existen y sus hashes pasan, pero pueden desaparecer al limpiar `%TEMP%`.  
**Evidencia actual:**

```text
C:\Users\Stefano\AppData\Local\Temp\viva-p2-14-fe68a4a3dc434e2b85b606d090ffdb85
C:\Users\Stefano\AppData\Local\Temp\viva-p2-15-evidence
C:\Users\Stefano\AppData\Local\Temp\viva-p2-15-route-smoke
```

**Mitigación requerida:** antes de abrir el PR, P2-17 debe adjuntar o enlazar capturas persistentes en el PR, o regenerarlas con `EVIDENCE_DIR` y registrar su manifiesto. No es necesario versionar binarios en Git si la evidencia queda asociada de forma durable al PR.

### R3 — Contrato de pruebas sin documento único

**Severidad:** baja.  
**Impacto:** `TEST_CONTRACTS.md` no existe; la lectura exige navegar PLAN, REQUIREMENTS y múltiples tests.  
**Mitigación:** el handoff P2-17 debe enlazar los contratos ejecutables actuales. Un documento único puede agregarse en una fase futura con `write_set` aprobado; no debe crearse fuera del cierre autorizado.

### R4 — Limitación de Graphify en CSS/JSON

**Severidad:** baja.  
**Impacto:** 24 archivos no clasificados y 22 JSON sin nodos; el grafo no prueba cascada CSS ni contenido de datos.  
**Mitigación aplicada:** tests de datos, hashes, Playwright, contraste y revisión visual directa. Mantener esta combinación en futuras fases.

### R5 — Evidencia de zoom basada en viewport efectivo/headless

**Severidad:** baja.  
**Impacto:** se verificó el equivalente de reflujo a 200% mediante viewport 720×450 y medición headless, no una sesión manual de Chrome con el control de zoom visible.  
**Mitigación:** realizar una comprobación humana breve al 200% antes de la presentación o durante la revisión del PR; no se detectó ningún síntoma de overflow/truncamiento en la medición automatizada.

## Gaps y decisión del gate

No se identificaron gaps funcionales bloqueantes. Los gaps son de trazabilidad y persistencia:

| Gap | Severidad | Bloquea HUMAN-GATE-B |
|---|---:|---:|
| Maker por tarea no versionado | Media | No, si se acepta y P2-17 registra lo recuperable |
| Tres desviaciones puntuales de `write_set` | Media | No, porque están acotadas y verificadas; deben aceptarse explícitamente |
| Evidencia visual en temporal | Media | No, si se persiste/adjunta antes del PR |
| `TEST_CONTRACTS.md` ausente | Baja | No |
| Graphify no cubre CSS/JSON | Baja | No |
| Zoom 200% no validado manualmente | Baja | No |

## Conclusión

La implementación funcional de Fase 2 está aprobada con riesgos procedimentales. Puede avanzar a HUMAN-GATE-B. Para autorizar P2-17, el responsable debe aceptar expresamente R1–R5 y exigir que el cierre documental/PR:

1. registre makers y comandos históricos solo cuando sean verificables;
2. liste las desviaciones de `write_set`;
3. persista o adjunte la evidencia visual;
4. no cambie este veredicto a `PASS`;
5. mantenga como pendientes el merge humano y P2-18/P2-19.

Con `PASS WITH RISKS`, P2-17 no queda autorizado hasta esa aceptación humana explícita.
