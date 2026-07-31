# Fase 4 — Plan de ejecución

## Estado

**Revisado — PASS WITH RISKS.** B1–B4 están cerrados documentalmente. Implementación funcional bloqueada hasta aceptación explícita A1–A12 en `HUMAN-GATE-A` y persistencia P4-00C.

## Objetivo verificable

Entregar una cédula de benchmark que separe referencias elegibles de un índice orientativo de mínimos, y un comparador cualitativo por filas que consuman exactamente el escenario activo, muestren denominadores y exclusiones, respeten la elegibilidad F3 y permitan explicar una conclusión sin depender de texto fijo, hover o datos no observados.

## Alcance funcional

1. Contrato público aditivo `2.3.0` con índice `benchmark` y runtime territorial compatible mediante la excepción mínima A12.
2. Materialización trazable de mercado para los siete distritos de alta carga.
3. Benchmark cuantitativo por distrito, cuadrante y radio.
4. Benchmark cualitativo de atributos anunciados con cobertura.
5. Comparador de 2–3 proyectos y escenario Viva opcional.
6. Filas agrupadas con estado, denominador, fuente y evidencia.
7. Conclusión ejecutiva derivada y enlazada a filas.
8. Estados ready/orientative/orientative-noncomparable/insufficient/excluded/contract-unavailable/error.
9. CT-A/B/C/D/G/I ejecutables.
10. HU-505 diferida; una exportación futura exige enmienda posterior al gate responsive/privacidad.

## Historias y criterios de aceptación

### HU-DEMO-501 — Benchmark de microzona

**Como** responsable comercial, **quiero** una referencia cuantitativa de la microzona, **para** posicionar el escenario Viva con una muestra explicable.

Criterios:

1. Todos los IDs usados pertenecen a `scenarioContext.comparable_project_ids`.
2. Distrito, cuadrante o radio recomponen la muestra sin fallback silencioso.
3. Fecha de corte, fuente, moneda, tipo de precio y área denominadora son visibles.
4. P25, mediana y P75 se calculan por R-7 solo con valores homogéneos.
5. Cada indicador declara numerador, denominador y faltantes propios.
6. La composición abre la lista exacta de proyectos usados y excluidos.
7. `n >= 3` produce `ready`, `n = 1–2` `orientative` y `n = 0` `insufficient`, pero solo para parejas `source_paired`.
8. Los cocientes de mínimos sin pareja demostrada usan `orientative_noncomparable` aun con `n >= 3` y viven fuera del benchmark elegible.
9. CT-G no entra al precio por m² cuando el vínculo tipológico no está resuelto.
10. Un proyecto excluido del precio permanece visible territorialmente cuando corresponde.
11. No se presenta precio de cierre, promedio transaccional o tasación.

### HU-DEMO-502 — Benchmark cualitativo

**Como** analista, **quiero** conocer qué atributos se anuncian y cuáles tienen evidencia, **para** distinguir patrones de publicación de ventajas documentadas.

Criterios:

1. Atributos anunciados, documentados, desconocidos, restringidos y excluidos son estados distintos.
2. Cada atributo conserva texto original y etiqueta normalizada.
3. La prevalencia usa `proyectos que anuncian / proyectos con campo informado`.
4. `No informado` no se cuenta como `No tiene`.
5. Se muestran faltantes, excluidos y cobertura de la muestra.
6. Con menos de cinco informados no se usa “patrón” o “estándar”.
7. Cambiar escenario recompone IDs y prevalencia.
8. `Otros` no se agrega como atributo canónico.
9. CT-D abre el fragmento autorizado, pero no se usa como prevalencia territorial.
10. Acabados y parking degradan a `insufficient` cuando corresponde.

### HU-DEMO-503 — Comparador en filas agrupadas

**Como** responsable comercial, **quiero** contrastar proyectos con criterios homogéneos, **para** entender diferencias sin leer columnas de tarjetas.

Criterios:

1. Permite 2–3 proyectos del escenario y una columna Viva opcional.
2. El selector nunca amplía el universo canónico.
3. Las filas se agrupan en precio, áreas, producto, ubicación, entrega, áreas comunes, acabados, estacionamientos y fuentes/confianza.
4. Diferencias prioritarias quedan abiertas inicialmente; el resto usa detalle bajo demanda.
5. Área total, techada y libre nunca comparten fila o denominador.
6. Cada valor declara observado, derivado, simulado, anunciado, unknown o excluido.
7. Original, normalizado, fecha, fuente y confianza son accesibles.
8. CT-G enlaza al inspector y sus hechos bloqueados no se presentan como certificados.
9. En móvil las métricas se apilan o el scroll se anuncia y mantiene criterio visible.
10. Headers y primera columna permanecen legibles durante scroll.
11. Una selección inválida se elimina determinísticamente y se anuncia.
12. La vista no muta estado durante `render`.

### HU-DEMO-504 — Conclusión ejecutiva explicable (`Should`)

**Como** gerente comercial, **quiero** una síntesis de las diferencias, **para** decidir el siguiente análisis sin aceptar una caja negra.

Criterios:

1. La conclusión se deriva de selección, benchmark y filas, no de texto fijo.
2. Presenta como máximo tres hallazgos.
3. Separa hallazgo, implicancia, acción y limitación.
4. Cada hallazgo enlaza al `id` de una fila.
5. Cambiar selección cambia texto y referencias de forma determinista.
6. Declara cualquier precio, área o evidencia crítica faltante.
7. Nunca usa claims de venta, absorción, demanda o precio real de cierre.
8. Con información insuficiente recomienda validar, no inventa una conclusión.
9. Un índice `orientative_noncomparable` puede describirse como limitación, pero no sustenta posicionamiento ni recomendación de precio.

### HU-DEMO-505 — Exportación de comparación (`Could`)

**Como** usuario de la demo, **quiero** guardar la comparación, **para** compartirla en una revisión comercial.

Criterios si se ejecuta:

1. Usa impresión HTML y `Guardar como PDF`; no añade backend o librería.
2. Incluye escenario, corte, muestra, proyectos y denominadores.
3. Excluye secciones vacías.
4. Usa allowlist de campos públicos.
5. No incluye evidencia restricted/pending, hashes completos o rutas locales.
6. Respeta orden y etiquetas de la pantalla.
7. Diferirla no bloquea F4 si 501–504 pasan.

## Casos transversales bloqueantes

### CT-A — Denominadores

- 98 m² built y 206 m² total permanecen separados.
- Los dos precios por m² simulados continúan fuera del benchmark de mercado.
- F4 no infiere built/free para publicaciones Nexo.

### CT-B — Precio discrepante

- Conserva ambos valores.
- Ninguno se selecciona como verdad o entra al agregado.

### CT-C — Microzona

- Proyecto dentro y fuera producen universos distintos.
- Mapa, benchmark y comparador consumen el mismo `comparable_project_ids`.
- Con un solo valor, el benchmark es orientativo.

### CT-D — Evidencia cualitativa

- Cuarzo abre fuente, fragmento y fecha.
- `air_conditioning = unknown` nunca se convierte en `false`.
- CT-D no sustenta prevalencia de mercado.

### CT-G — Incompatibilidad

- Pardo Coast permanece territorialmente visible.
- Tipo 7 y sus ocho hechos permanecen excluidos.
- Precio con vínculo tipológico no resuelto queda fuera con razón explícita.
- No se selecciona una verdad.

### CT-I — Alta carga

- Conserva Miraflores 90 observados, 85 comparables y 5 no reconciliados.
- Conserva cuadrantes 40/5/5/40.
- Añade denominadores F4 sin cambiar IDs F2.

### CT-P — Pareja precio–área y particiones

- `source_paired` entra una sola vez y conserva provenance.
- Dos mínimos de proyecto sin ID de oferta/tipología quedan en `orientative_noncomparable`.
- Observaciones idénticas se deduplican y observaciones incompatibles se excluyen.
- Para cada KPI, `input = used + missing + excluded` sin duplicados.

## Contrato público 2.3.0

El writer pasa de 2.2 a 2.3. El validador de contrato conserva compatibilidad de datos 2.0–2.3. El runtime territorial, que hoy requiere 2.1+, aceptará 2.1, 2.2 y 2.3 mediante el cambio mínimo A12; 2.1/2.2 mantienen F2/F3 y degradan solo F4 a `contract_unavailable`.

Para 2.3 el root requiere:

```js
benchmark: {
  version: 1,
  methodology: {
    cutoff_at,
    minimum_quantitative_sample: 3,
    minimum_qualitative_informed_sample: 5,
    quantile_method: "R7",
    price_type_policy: "from",
    allowed_area_denominators: ["total"],
    pairing_policy,
    exclusion_reason_precedence,
    certification_label
  },
  fact_index: BenchmarkFactIndex[],
  attribute_catalog: BenchmarkAttribute[],
  coverage: {
    indicators: Record<IndicatorId, {
      input_project_ids,
      used_project_ids,
      missing_project_ids,
      excluded_projects
    }>
  }
}
```

`BenchmarkFactIndex` referencia IDs existentes en `model`; no duplica valores. Todo precio por m² referencia sus hechos de precio y área, fórmula, denominador, `pairing_status` y evidencia de pairing. Cada indicador posee una partición propia; no existe un `usedProjectIds` global reutilizado entre KPIs.

Un payload runtime 2.1–2.2 mantiene F2/F3 y muestra `contract_unavailable` solo en F4. El contrato 2.0 continúa cubierto por validación de datos, pero no se promete arranque del escenario F2 porque el runtime vigente ya requiere 2.1+.

## Motor puro

Nuevo módulo:

```js
buildBenchmarkContext({
  data,
  scenarioContext,
  targetScenario
}) => {
  scope,
  status,
  quantitative,
  qualitative,
  coverage,
  methodology
}
```

```js
buildComparisonModel({
  benchmarkContext,
  selectedProjectIds,
  includeTargetScenario
}) => {
  selected,
  groups,
  priorityRows,
  conclusion,
  limitations
}
```

Reglas:

- no lee DOM ni estado global;
- no importa vistas;
- no consulta red;
- no muta inputs;
- falla cerrado ante IDs o contratos inválidos;
- emite orden determinista.
- deduplica por proyecto/indicador y excluye conflictos;
- cada indicador devuelve `inputProjectIds`, `usedProjectIds`, `missingProjectIds` y `excludedProjects` como partición disjunta.

## Estado

Añadir solo si el diseño aprobado lo requiere:

- `benchmarkContext`, derivado una vez por revisión de escenario;
- `compareIncludeTarget`, booleano;
- selección existente `compareProjectIds` se conserva.

Los `<details>` no requieren estado persistente. El escenario territorial sigue siendo la fuente global; no se crea un segundo filtro de microzona.

## Archivos protegidos

Durante F4 quedan protegidos salvo enmienda previa al write:

- `prototipo_ejecutable/public/app.js`;
- `prototipo_ejecutable/public/js/domain.js`;
- `prototipo_ejecutable/public/js/comparability.js`;
- `prototipo_ejecutable/public/js/navigation.js`;
- `prototipo_ejecutable/public/js/evidence-inspector.js`;
- `prototipo_ejecutable/public/js/views/inspector.js`;
- `prototipo_ejecutable/public/styles/55-inspector.css`;
- `prototipo_ejecutable/public/assets/evidence/**`;
- `prototipo_ejecutable/public/js/views/geographic-map.js`;
- `prototipo_ejecutable/public/js/views/positioning-map.js`;
- `prototipo_ejecutable/public/styles/45-geography.css`;
- `.github/workflows/deploy-pages.yml`.

`prototipo_ejecutable/public/js/scenario.js` permanece protegido salvo P4-01, que puede añadir únicamente `"2.3.0"` al allowlist y sus pruebas bajo A12. F4 consume `scenarioContext` y aplica una capa de elegibilidad propia; no reescribe otra semántica F2. Si esto resulta imposible, la tarea se detiene y el plan vuelve a revisión.

## Olas

```text
4.0 contexto + datos + UI + plan + reader + HUMAN-GATE-A
  ↓
4.1 contrato 2.3 + policy + fixtures + materialización + build
  ↓
4.2 motor puro + integración derivada
  ↓
4.3 benchmark ║ comparador/conclusión
  ↓
4.4 integración + E2E + responsive/a11y
  ↓
checker + HUMAN-GATE-B si aplica + memoria + PR
  ↓ merge humano
Pages read-only + persistencia documental
```

## Matriz normativa de ejecución

| Tarea | Depende de | Puede paralelizar | Gate |
|---|---|---|---|
| P4-00A | F3 cerrada | auditorías read-only | baseline y gaps confirmados |
| P4-00B | P4-00A | ninguno | reader-test del plan |
| HUMAN-GATE-A | P4-00B | ninguno | A1–A12 aceptados |
| P4-00C | Gate A | ninguno | aprobación persistida |
| P4-00D | P4-00C | ninguno | baseline browser reproducible capturado |
| P4-01 | P4-00D | P4-02 investigación | contrato/reader 2.3 congelado |
| P4-02 | P4-01 | ninguno | policy, catálogo y fixtures válidos |
| P4-03 | P4-02 | ninguno | facts/índice materializados |
| P4-04 | P4-03 | ninguno | build, coverage, privacidad y determinismo |
| P4-05 | P4-04 | ninguno | motor puro CT-A/B/C/D/G/I |
| P4-06 | P4-05 | ninguno | una recomposición por escenario |
| P4-07 | P4-06 | P4-08 | benchmark visual |
| P4-08 | P4-06 | P4-07 | comparador + conclusión |
| P4-09 | P4-07 + P4-08 | ninguno | integración completa |
| P4-10 | Gate A | ninguno | HU-505 registrada como diferida, sin writes |
| P4-11 | P4-09 | ninguno | E2E/regresiones |
| P4-12 | P4-11 | ninguno | responsive/a11y/200% |
| P4-13 | P4-12 | revisor read-only | veredicto independiente |
| P4-14 | P4-13 + Gate B si aplica | ninguno | memoria y PR |
| P4-15 | merge humano | ninguno | Pages verificado |
| P4-16 | P4-15 | ninguno | resultado persistido |

## Tareas

### P4-00A — Preflight y evaluación

**Tipo:** read-only salvo documentos de contexto.

**Write set:**

- `.planning/phases/04-benchmark-comparator/CONTEXT.md`;
- `.planning/phases/04-benchmark-comparator/DATA-ASSESSMENT.md`;
- `.planning/phases/04-benchmark-comparator/UI-SPEC.md`;
- `.planning/phases/04-benchmark-comparator/PLAN.md`;
- `.planning/phases/04-benchmark-comparator/HUMAN-GATE-A-REQUEST.md`;
- `.planning/STATE.md`;
- `.planning/ROADMAP.md`.

**Done:** cifras recompuestas, Graphify consultado, riesgo legal/semántico visible y baseline de pruebas registrado.

### P4-00B — Reader-test independiente

**Write set:** `.planning/phases/04-benchmark-comparator/PLAN_REVIEW.md`.

Debe responder:

- qué se certifica y qué no;
- cómo se forma cada denominador;
- por qué CT-G queda fuera del precio sin desaparecer del mapa;
- cómo funcionan los estados insuficientes;
- qué archivos puede escribir cada maker;
- qué decisiones pertenecen al humano.
- cómo se demuestra o degrada la pareja precio–área;
- cómo arranca el runtime con 2.1/2.2/2.3;
- si cada `write_set` enumera rutas exactas y un propietario único;
- si DoD, baseline y rollback son reproducibles.

### HUMAN-GATE-A

Aceptación explícita A1–A12 de `HUMAN-GATE-A-REQUEST.md`. Una aceptación parcial no inicia P4-01.

### P4-00C — Persistir aprobación

**Write set:**

- `.planning/phases/04-benchmark-comparator/APPROVAL.md`;
- `.planning/STATE.md`;
- `.planning/DECISIONS.md`.

### P4-00D — Baseline de navegador reproducible

**Write set:**

- nuevo `prototipo_ejecutable/package-lock.json`;
- `.planning/phases/04-benchmark-comparator/BASELINE_BROWSER.md`;
- `.planning/phases/04-benchmark-comparator/evidence/baseline/market-1440x900.png`;
- `.planning/phases/04-benchmark-comparator/evidence/baseline/compare-1440x900.png`;
- `.planning/phases/04-benchmark-comparator/evidence/baseline/market-390x844.png`;
- `.planning/phases/04-benchmark-comparator/evidence/baseline/compare-390x844.png`.

**Criterios:** generar una vez el lockfile con `npm.cmd install --package-lock-only`, revisarlo y después usar `npm.cmd ci`; smoke/a11y/browser ejecutados sobre `e30973b`; capturas con SHA, viewport, consola, red y comando; `node_modules` permanece ignorado. Un fallo real de baseline detiene P4-01; una ausencia de dependencia ya no se acepta como evidencia.

### P4-01 — Contrato 2.3 y compatibilidad

**Write set:**

- `prototipo_ejecutable/contracts/demo-v2.schema.json`;
- `prototipo_ejecutable/contracts/README.md`;
- `prototipo_ejecutable/public/js/scenario.js` — solo allowlist 2.3 bajo A12;
- `prototipo_ejecutable/tests/data-contract-compatibility.mjs`;
- `prototipo_ejecutable/tests/data-schema.mjs`;
- `prototipo_ejecutable/tests/data-benchmark-contract.mjs`;
- `prototipo_ejecutable/tests/scenario-domain.mjs`;
- `prototipo_ejecutable/tests/scenario-context.mjs`;
- nuevo `prototipo_ejecutable/tests/contract-runtime-startup.mjs`.

**Criterios:** validador acepta 2.0–2.3; runtime arranca con 2.1/2.2/2.3; índice cerrado; referencias, metodología, pairing y atributos validados; 2.1/2.2 degradan solo F4; selección territorial e IDs no cambian.

### P4-02 — Policy, catálogo y fixtures

**Write set:**

- `datos_relevantes/demo-pilot/benchmark-policy.json`;
- `datos_relevantes/demo-pilot/benchmark-attribute-catalog.json`;
- `prototipo_ejecutable/tests/e2e-scenarios/ct-a-benchmark.json`;
- `prototipo_ejecutable/tests/e2e-scenarios/ct-b-benchmark.json`;
- `prototipo_ejecutable/tests/e2e-scenarios/ct-c-benchmark.json`;
- `prototipo_ejecutable/tests/e2e-scenarios/ct-d-benchmark.json`;
- `prototipo_ejecutable/tests/e2e-scenarios/ct-g-benchmark.json`;
- `prototipo_ejecutable/tests/e2e-scenarios/ct-i-benchmark.json`;
- `prototipo_ejecutable/tests/e2e-scenarios/ct-p-benchmark.json`;
- `prototipo_ejecutable/tests/phase4-fixtures.mjs`.

**Criterios:** fuente fija, corte, precio `from`, total-only, pairing, particiones, thresholds, precedencia y aliases explícitos; ninguna palabra “Otros” canónica; fixtures n=0/1/2/3/4/5, duplicado, conflicto y restricted.

### P4-03 — Materializador de mercado

**Único escritor de datos.**

**Write set:**

- nuevo `prototipo_ejecutable/scripts/data/benchmark.js`;
- `prototipo_ejecutable/scripts/build-demo-data.js`;
- `prototipo_ejecutable/scripts/data/validate.js`;
- `prototipo_ejecutable/tests/data-benchmark.mjs`;
- `prototipo_ejecutable/tests/data-validator-unit.mjs`.

**Criterios:** usa el CSV fuente; crea observations/facts/index; preserva original; no promueve cocientes de mínimos a `source_paired`; serie orientativa separada; exclusiones y particiones explícitas; CT-G/CT-P fail-closed; sin duplicados.

### P4-04 — Build, cobertura y seguridad

**Write set:**

- `datos_relevantes/demo-pilot/coverage-report.json`;
- `prototipo_ejecutable/public/demo-data/viva-platform-demo.json`;
- `prototipo_ejecutable/tests/data-references.mjs`;
- `prototipo_ejecutable/tests/data-determinism.mjs`;
- `prototipo_ejecutable/tests/data-privacy.mjs`.

**Criterios:** dos hashes idénticos; JSON <10 MB; GAP-F4 cerrado; cero PII/rutas/activos restringidos; conteos recompuestos.

### P4-05 — Motor puro

**Write set:**

- nuevo `prototipo_ejecutable/public/js/benchmark.js`;
- nuevo `prototipo_ejecutable/tests/benchmark-domain.mjs`.

**Criterios:** funciones puras, todos los estados, R-7, cobertura cualitativa, conclusión referenciada, CT-A/B/C/D/G/I/P, particiones por KPI, sin importar DOM/state/views.

### P4-06 — Integración derivada de estado

**Único escritor compartido.**

**Write set:**

- `prototipo_ejecutable/public/js/state.js`;
- nuevo `prototipo_ejecutable/tests/benchmark-state.mjs`.

**Criterios:** un `benchmarkContext` por revisión, selección inválida corregida, escenario intacto, no segunda fuente de microzona.

### P4-07 — Vista benchmark

**Write set:**

- `prototipo_ejecutable/public/js/views/market.js`;
- nuevo `prototipo_ejecutable/public/styles/56-benchmark.css`;
- nuevo `prototipo_ejecutable/tests/benchmark-view.mjs`.

**Criterios:** cédula, línea de evidencia, cuantitativo, cualitativo, composición/exclusiones, contexto territorial contraído, CTA único y estados honestos.

### P4-08 — Comparador y conclusión

**Puede avanzar con P4-07; write sets disjuntos.**

**Write set:**

- `prototipo_ejecutable/public/js/views/compare.js`;
- nuevo `prototipo_ejecutable/public/styles/57-comparison.css`;
- nuevo `prototipo_ejecutable/tests/comparison-view.mjs`.

**Criterios:** deja de importar otra vista; 2–3+Viva; grupos; prioridad; evidencia; conclusión derivada; render puro; móvil apilado.

### P4-09 — Integración de UI y eventos

**Único escritor de integración.**

**Write set:**

- `prototipo_ejecutable/public/js/controller.js`;
- `prototipo_ejecutable/public/js/config.js`;
- `prototipo_ejecutable/public/styles.css`;
- `prototipo_ejecutable/package.json`;
- `prototipo_ejecutable/tests/module-graph.mjs`;
- nuevo `prototipo_ejecutable/tests/benchmark-events.mjs`.

**Criterios:** eventos centralizados, foco/announcements, labels de navegación, imports CSS ordenados, cero nuevo hub.

### P4-10 — Exportación diferida

**Write set:** ninguno. A10 congela HU-505 como `deferred` para esta ejecución. Reabrirla exige una enmienda nueva después de P4-12, con rutas, privacidad y reader-test propios.

### P4-11 — E2E y regresiones

**Write set:**

- nuevo `prototipo_ejecutable/tests/benchmark-e2e.mjs`;
- nuevo `prototipo_ejecutable/tests/comparison-e2e.mjs`;
- `prototipo_ejecutable/tests/scenario-e2e.mjs`;
- `prototipo_ejecutable/tests/browser-smoke.mjs`;
- `prototipo_ejecutable/tests/browser-a11y.mjs`.

**Criterios:** 8 rutas × 3 viewports; CT-C/G/I/P; 2/3/3+Viva; n=0/1/2/3/4/5; no precios; pairing no resuelto; no informado/restricted/error/contract-unavailable; deep-link/reload; cero red externa.

### P4-12 — Responsive, contraste y zoom

**Write set:**

- `prototipo_ejecutable/public/styles/56-benchmark.css`;
- `prototipo_ejecutable/public/styles/57-comparison.css`;
- `prototipo_ejecutable/public/styles/90-responsive.css`;
- nuevo `prototipo_ejecutable/tests/benchmark-comparison-responsive.mjs`.

**Criterios:** 1440×900, 1280×720, 390×844, 200%, 44×44, sticky/foco, sin truncamiento, contraste y reduced motion.

### P4-13 — Checker independiente

**Write set:** `.planning/phases/04-benchmark-comparator/VERIFICATION_REPORT.md`.

Veredicto `PASS`, `PASS WITH RISKS` o `FAIL`. Verifica historias, casos, datos, narrativa, permisos, determinismo, visual, a11y, regresiones y Graphify.

Un lector comercial nuevo debe completar:

`escenario → muestra → benchmark → exclusión → comparación → conclusión`

en <= 5 minutos sin código ni facilitador.

### HUMAN-GATE-B

Solo si P4-13 emite `PASS WITH RISKS`. El usuario acepta cada riesgo; no transforma el veredicto en PASS.

### P4-14 — Memoria y PR funcional

**Write set:**

- `.planning/phases/04-benchmark-comparator/SUMMARY.md`;
- `.planning/phases/04-benchmark-comparator/HANDOFF.md`;
- `.planning/STATE.md`;
- `.planning/ROADMAP.md`;
- `.planning/DECISIONS.md`.

El merge es humano.

### P4-15 — Verificación post-merge

Read-only: PR/SHA, workflow, HTTP, contrato 2.3, CT-C/G/I, benchmark/comparador, assets, escritorio/móvil/consola/red.

### P4-16 — Persistencia post-merge

Rama/PR documental separados:

- `.planning/phases/04-benchmark-comparator/POSTMERGE_REPORT.md`;
- `.planning/STATE.md`.

## Paralelismo

- P4-07 y P4-08 son la única pareja funcional paralelizable.
- Comienzan después de congelar datos, motor y estado.
- Un maker no toca archivos fuera de su `write_set`.
- `state.js`, `controller.js`, `build-demo-data.js`, `styles.css` y `package.json` tienen un único escritor por ola.
- `prototipo_ejecutable/public/js/domain.js` y `prototipo_ejecutable/public/js/comparability.js` permanecen protegidos; `scenario.js` solo admite la excepción exacta P4-01/A12.

## Comandos previstos

Desde `prototipo_ejecutable/`:

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd run test:data
npm.cmd run test:architecture
npm.cmd run test:scenario
npm.cmd run test:comparability
npm.cmd run test:inspector
npm.cmd run test:e2e
npm.cmd run test:smoke
npm.cmd run test:a11y
npm.cmd run verify
```

Tests F4 previstos:

```powershell
node tests/phase4-fixtures.mjs
node tests/data-benchmark-contract.mjs
node tests/contract-runtime-startup.mjs
node tests/data-benchmark.mjs
node tests/benchmark-domain.mjs
node tests/benchmark-state.mjs
node tests/benchmark-view.mjs
node tests/comparison-view.mjs
node tests/benchmark-events.mjs
node tests/benchmark-e2e.mjs
node tests/comparison-e2e.mjs
node tests/benchmark-comparison-responsive.mjs
```

El baseline del 2026-07-31 pasó sintaxis, arquitectura, escenario, comparabilidad, datos e inspector; el gate de navegador se detuvo antes de ejecutarse por dependencia local `playwright` ausente. Instalar dependencias es prerequisito operativo, no un fallo funcional publicado.

Graphify al cierre:

```powershell
$env:UV_CACHE_DIR = "$PWD\..\.cache\uv"
uvx --from graphifyy graphify extract .. --code-only --no-cluster
uvx --from graphifyy graphify god-nodes --top 15
```

## Evidencia requerida

- handoff por tarea;
- diff vs `write_set`;
- hashes de dos builds;
- conteos por universo/indicador;
- lista exacta de usados y excluidos;
- CT-A/B/C/D/G/I/P;
- baseline browser reproducible de `e30973b`;
- partición `input = used + missing + excluded` por KPI;
- capturas before/after y estados;
- teclado y reflow 200%;
- prueba negativa de evidencia restringida y de pairing no resuelto;
- reporte checker y lector nuevo;
- PR, workflow y Pages.

## Definition of Done

1. HU-501–503 cumplen todos sus criterios.
2. HU-504 pasa o se difiere con justificación aprobada; el objetivo es entregarla.
3. HU-505 queda diferida mediante A10 y no bloquea.
4. GAP-F4-BENCHMARK queda cerrado como capacidad trazable: si no hay parejas elegibles, la UI muestra `insufficient` y separa el índice orientativo sin promoverlo.
5. El validador 2.3 conserva 2.0–2.3 y el runtime territorial arranca sin regresión con 2.1/2.2/2.3.
6. Solo hechos elegibles y homogéneos forman agregados.
7. Cada KPI declara denominador y partición exacta sin duplicados.
8. CT-G no se rehabilita ni desaparece territorialmente.
9. Cualitativo separa anunciado, evidenciado y desconocido.
10. Comparador usa filas agrupadas y conclusión trazable.
11. Escenario, mapa, benchmark y comparador comparten universo.
12. Teclado, foco, móvil, contraste y 200% pasan.
13. Cero errores de consola/HTTP/red externa.
14. Cero activos restringidos o PII filtrados.
15. Build determinista y JSON bajo límite aprobado; CT-P prueba pairing positivo, no resuelto, duplicado y conflicto.
16. F2/F3 no regresionan.
17. Checker independiente emite veredicto.
18. Lector nuevo completa el guion en <=5:00.
19. Memoria y PR son revisables.
20. Pages se verifica después del merge antes del cierre final.

## Rollback

El baseline recuperable es `e30973baa963fd4caa408aaa802803beac91dddd`. El rollback se realiza revirtiendo commits F4 completos, nunca editando manualmente el JSON generado:

- contrato/datos: revertir P4-04, P4-03, P4-02 y P4-01 en ese orden; esto restaura `contract_version = 2.2.0`, schema, allowlist de `scenario.js`, coverage, JSON, hashes, observations/facts e índice como conjunto coherente;
- motor/estado: revertir P4-06 y P4-05; F2/F3 recuperan el comportamiento de `e30973b`;
- vistas/integración: revertir P4-12, P4-11, P4-09 y luego P4-07/P4-08;
- después de cualquier rollback se ejecuta `npm.cmd ci` y `npm.cmd run verify`, se comparan CT-C/D/G/I y se exige hash público igual al baseline si se retiró toda F4;
- CT-G incorrecto, pairing promovido por intuición o partición imposible bloquean el PR; no se corrigen ocultando la discrepancia.

## Condiciones de parada

Detener y escalar si:

- no se aprueba el uso del snapshot Nexo;
- se pide llamar cierre/promedio a un precio ambiguo;
- se exige built/free sin fuente;
- se pide usar CT-D como prevalencia de mercado;
- se propone tratar unknown como false;
- se propone promover `project_minima_pair_unresolved` a elegible por volumen o coincidencia aritmética;
- el runtime 2.1/2.2 cambia IDs o selección tras la excepción A12;
- el motor necesita elegir una verdad en CT-B/G;
- el JSON supera 10 MB sin revisión;
- dos makers comparten archivo en la misma ola;
- un cambio requiere tocar un archivo protegido sin enmienda;
- el gate falla tres veces sin hipótesis nueva.
