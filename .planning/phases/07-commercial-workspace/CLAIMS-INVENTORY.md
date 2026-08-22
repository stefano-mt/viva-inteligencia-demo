# Fase 7 — Inventario de claims protegidos

**Estado:** contrato de planificación vinculante para P7-01 y P7-04–P7-10.

## 1. Propósito

Evitar que la simplificación visual conserve cifras pero pierda la advertencia, denominador, procedencia o exclusión que cambia su interpretación.

P7-01 materializa este inventario como fixture ejecutable en:

```text
prototipo_ejecutable/tests/fixtures/commercial-claims.json
```

y crea el consumidor inicial:

```text
prototipo_ejecutable/tests/commercial-claims.mjs
```

P7-04–P7-09 consumen el fixture como lectura; solo P7-01 puede escribirlo. P7-10 audita su cobertura y no cambia sus expectativas.

## 2. Contrato del fixture

Cada entrada materializada debe contener exactamente:

| Campo | Tipo/regla |
|---|---|
| `id` | string estable `C01`–`C23` |
| `routes` | array no vacío de hashes exactos o nombre de route set definido abajo |
| `fixture` | un único escenario/contrato/caso ejecutable |
| `claim` | un único valor o estado que debe preservar la UI |
| `qualifier` | límite/procedencia inseparable del claim |
| `authority` | selector, motor o bloque autoritativo |
| `assertions` | array no vacío de aserciones DOM/modelo concretas |
| `visibility` | exactamente `mandatory` o `reachable` |
| `corrective_action` | string o `null`; acción requerida en estados no listos |

`mandatory` significa visible sin abrir ayuda o metodología. `reachable` admite divulgación accesible en máximo una interacción. Una entrada no puede aprobarse solo porque el texto exista oculto por CSS o fuera del árbol accesible.

Route set permitido:

```text
all_surfaces = [
  #journey/scale, #journey/geography, #journey/quality,
  #journey/depth, #journey/movement, #journey/decision,
  #dashboard, #projects, #inspector, #market,
  #compare, #trust, #assistant, #activity
]
```

P7-01 expande `all_surfaces` al array literal anterior dentro del JSON; ninguna otra wildcard o ruta implícita está permitida.

## 3. Matriz mínima normalizada

| ID | Rutas exactas/route set | Fixture único | Claim + calificador | Autoridad | Assertions | Visibilidad / CTA |
|---|---|---|---|---|---|---|
| C01 | `["#journey/scale"]` | `contract-2.4-default` | 184 agencias modeladas; 30/22/5 son niveles anidados del piloto y no se suman | `metadata.counts`, `pilot.counts`, `journeyContext.scale` | 184, 30, 22 y 5; etiqueta de denominadores | `mandatory` / `null` |
| C02 | `["#journey/geography"]` | `miraflores-district-default` | 90 observados, 85 comparables y 5 observados no reconciliados/por revisar; permanecen visibles como cobertura excluida de comparabilidad y no se llaman fuera del distrito/polígono | `scenarioContext`, `geographyArtifact` | escenario; 90/85/5; texto `no reconciliados` | `mandatory` / `null` |
| C03 | `["#dashboard"]` | `scenario-with-target` | diagnóstico Viva simulado; no es precio observado ni de cierre | `scenarioState`, diagnóstico vigente | lectura; etiqueta `simulado` | `mandatory` / `null` |
| C04 | `["#dashboard", "#projects"]` | `miraflores-district-default` | hay publicaciones de precio/área, pero no pairing certificado por unidad ni precio/m² elegible | `scenarioContext`, elegibilidad vigente | límite de pairing; ausencia de precio/m² elegible | `mandatory` / `null` |
| C05 | `["#projects"]` | `miraflores-district-default` | 85 comparables; comparable no implica que todos sus campos sean utilizables | `scenarioContext`, catálogo vigente | conteo 85; límite en ayuda asociada | `reachable` / `null` |
| C06 | `["#inspector/case/f3-ct-g-pardo"]` | `case:f3-ct-g-pardo` | 104.15 m², 53.37 m² y 50.78 m²; fuentes incompatibles y exclusión del precio/m² certificado | caso F3 | tres valores; estado de exclusión | `mandatory` / `null` |
| C07 | `["#market"]` | `benchmark-2.4-default` | partición del benchmark distingue usadas, faltantes y excluidas; naturaleza orientativa cuando corresponda | `benchmarkContext` | `n`; usadas; faltantes; excluidas; estado | `mandatory` / `null` |
| C08 | `["#market"]` | `benchmark-miraflores-default` | 69 publicaciones raw, 68 cocientes orientativos y 0 parejas elegibles; no son benchmark certificado ni precio de cierre | `benchmarkContext`, dataset 2.4 | 69/68/0; `orientativo`; `0 elegibles` | `mandatory` / `null` |
| C09 | `["#compare"]` | `comparison-empty` | comparación vacía; no generar conclusión ni proyecto implícito | `comparisonContext` | estado vacío; CTA | `mandatory` / `Seleccionar proyectos` |
| C10 | `["#compare"]` | `comparison-selected` | diferencias con denominadores y referencias asociados | motor de comparación vigente | conclusión; referencias tras una divulgación | `reachable` / `null` |
| C11 | `["#activity"]` | `history-event-null-cause` | cambio publicado anterior/nuevo y vigencia; causa no observada y sin causalidad atribuida | `historyContext` | cambio; fecha/estado; causa no observada | `mandatory` / `null` |
| C12 | `["#assistant"]` | `assistant-six-block-response` | conclusión y limitación de respuesta autoritativa; no cierre, predicción ni causalidad | `state.assistantResponse`, catálogo 2.4 | bloque `answer`; bloque `limitations` | `mandatory` / `null` |
| C13 | `["#assistant"]` | `assistant-six-block-response` | referencias autorizadas de la misma respuesta | `state.assistantResponse.references` | conteo; 100% de etiquetas tras una divulgación | `reachable` / `null` |
| C14 | `["#trust"]` | `checklist-blocked` | condición de avance y pendientes; progreso no equivale a certificación/readiness | checklist vigente | estado; condición | `mandatory` / `null` |
| C15 | `all_surfaces` | `contract-2.0-global-error` | contrato 2.0 produce error global de carga; nunca `capability_unavailable` interno ni fragmentos 2.1+ | validación global/compatibilidad F6 | shell con error global uniforme en 14 rutas + acción correctiva; ningún contenido parcial | `mandatory` / `Reintentar` |
| C16 | `["#journey/quality"]` | `contract-2.1` | Calidad no disponible por contrato; ausencia técnica no es vacío de negocio | matriz F6 | `capability_unavailable`; límite 2.1 | `mandatory` / `Volver a geografía` |
| C17 | `["#journey/depth"]` | `contract-2.2` | Profundidad no disponible por contrato | matriz F6 | `capability_unavailable`; límite 2.2 | `mandatory` / `Revisar benchmark` |
| C18 | `["#journey/movement"]` | `contract-2.3` | Movimiento no disponible por contrato | matriz F6 | `capability_unavailable`; límite 2.3 | `mandatory` / `Volver a profundidad` |
| C19 | `["#journey/decision"]` | `contract-2.4-decision-without-response` | checklist prudente disponible y ninguna consulta implícita | `journeyContext.decision` | modo `checklist`; respuesta nula; ausencia de consulta generada | `mandatory` / `Formular consulta en el asistente` |
| C20 | `["#journey/scale"]` | `phase6-scale-missing-counts` | conteo faltante se muestra `No disponible`; nunca cero, `NaN`, infinito o dato obsoleto | `journeyContext.scale` | `No disponible`; 22; 5; ausencia de cero fabricado | `mandatory` / `null` |
| C21 | `["#journey/geography"]` | `phase6-geography-empty` | escenario vacío se distingue de error/capacidad ausente | `journeyContext.geography` | estado `empty`; límite | `mandatory` / `Ajustar escenario` |
| C22 | `["#assistant"]` | `ct-f-insufficient-evidence` | evidencia insuficiente no produce precio real de cierre ni respuesta inventada | motor/asistente CT-F | limitación; siguiente acción; ausencia de claim prohibido | `mandatory` / `null` |
| C23 | `all_surfaces` | `global-fetch-error` | fallo de carga global no conserva cifras obsoletas ni contenido parcial | estado global de carga/error | error global uniforme + ausencia de valores previos | `mandatory` / `Reintentar` |

## 4. Cobertura por tarea

| Tarea | Claims mínimos |
|---|---|
| P7-02 | C02, C15–C23 en shell/escenario |
| P7-04 | C01–C04, C15–C23 |
| P7-05 | C04–C05, C15–C23 |
| P7-06 | C06–C10, C15–C23 |
| P7-07 | C11–C14, C15–C23 |
| P7-08 | C01–C23 en E2E/paridad |
| P7-09 | C01–C23 visibles/alcanzables en la matriz responsive |
| P7-10 | auditoría de cobertura C01–C23 y diff contra autoridades |

## 5. Regla de cambio

Un claim nuevo puede añadirse durante implementación. Relajar, eliminar o cambiar `mandatory` a `reachable` requiere enmienda técnica y aprobación explícita. Una diferencia entre el fixture y la autoridad se resuelve contra la autoridad; no se modifica el dato para que coincida con la vista.
