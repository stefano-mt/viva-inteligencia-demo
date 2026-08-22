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

Cada entrada debe contener:

| Campo | Regla |
|---|---|
| `id` | identificador estable |
| `route` | hash o patrón de etapa |
| `fixture` | escenario/contrato/caso necesario |
| `claim` | valor o estado que debe preservar la UI |
| `qualifier` | límite/procedencia inseparable del claim |
| `authority` | selector, motor o bloque autoritativo |
| `assertion` | texto/atributo/relación DOM a verificar |
| `visibility` | `mandatory` o `reachable` |
| `corrective_action` | acción requerida en estados no listos, si aplica |

`mandatory` significa visible sin abrir ayuda o metodología. `reachable` admite divulgación accesible en máximo una interacción. Una entrada no puede aprobarse solo porque el texto exista oculto por CSS o fuera del árbol accesible.

## 3. Matriz mínima

| ID | Ruta/fixture | Claim protegido | Calificador inseparable | Autoridad | Assertion/visibilidad |
|---|---|---|---|---|---|
| C01 | `#journey/scale`, 2.4 default | 184 agencias modeladas | 30/22/5 son niveles anidados del piloto; no se suman | `metadata.counts`, `pilot.counts`, `journeyContext.scale` | valores + diferencia de denominadores, `mandatory` |
| C02 | `#journey/geography`, Miraflores distrito | 90 observados, 85 comparables, 5 fuera/por revisar | los conteos pertenecen al escenario activo | `scenarioContext`, `geographyArtifact` | escenario + conteos, `mandatory` |
| C03 | `#dashboard`, escenario con objetivo | diagnóstico del escenario Viva | objetivo/resultado Viva es simulado, no precio observado ni de cierre | `scenarioState`, modelo de diagnóstico vigente | lectura + etiqueta `simulado`, `mandatory` |
| C04 | `#dashboard`/`#projects`, Miraflores | publicaciones de precio/área disponibles | no existe pairing certificado por unidad; no producir precio/m² elegible | `scenarioContext`, elegibilidad vigente | límite junto a lectura o toolbar, `mandatory` |
| C05 | `#projects`, default | 85 comparables por escenario | comparable no implica que todos sus campos sean utilizables | `scenarioContext`, catálogo vigente | conteo + límite alcanzable en una interacción, `reachable` |
| C06 | `#inspector/case/f3-ct-g-pardo` | 104.15 m² tarjeta, 53.37 m² plano, diferencia 50.78 m² | fuentes incompatibles; registro excluido del precio/m² certificado | caso F3 `case:f3-ct-g-pardo` | tres valores + exclusión, `mandatory` |
| C07 | `#market`, default 2.4 | denominadores del benchmark | distinguir usadas, faltantes y excluidas; naturaleza orientativa cuando aplique | `benchmarkContext` | `n` y partición/estado, `mandatory` |
| C08 | `#market`, Miraflores | 69 publicaciones raw, 68 cocientes orientativos y 0 parejas elegibles | cociente orientativo no es benchmark certificado ni precio de cierre | `benchmarkContext`, dataset 2.4 | valores + `orientativo`/`0 elegibles`, `mandatory` |
| C09 | `#compare`, selección vacía | comparación no disponible todavía | no generar conclusión ni proyecto implícito | `comparisonContext`/selección vigente | estado vacío + CTA, `mandatory` |
| C10 | `#compare`, proyectos seleccionados | diferencias por atributos | referencias y denominadores permanecen asociados a cada diferencia | motor de comparación vigente | conclusión + referencia alcanzable, `reachable` |
| C11 | `#activity`, evento con `cause=null` | cambio publicado anterior/nuevo y vigencia | causa no observada; no atribuir causalidad | `historyContext` | cambio + fecha/estado + causa no observada, `mandatory` |
| C12 | `#assistant`, respuesta vigente | seis bloques autoritativos y referencias autorizadas | no cierre, predicción o causalidad; consulta en memoria y sin red | `state.assistantResponse`, catálogo 2.4 | conclusión/límite visibles y referencias alcanzables, `mandatory`/`reachable` |
| C13 | `#trust`, escenario bloqueado | condición de avance y requisitos pendientes | progreso no equivale a certificación ni readiness comercial | checklist vigente | estado + condición, `mandatory` |
| C14 | contrato 2.0 | capacidad global no disponible | no mezclar fragmentos de contratos posteriores | validación/compatibilidad vigente | mensaje + acción correctiva, `mandatory` |
| C15 | contratos 2.1–2.4 | capacidades según versión | ausencia técnica no se presenta como vacío de negocio | matriz de compatibilidad F6 | estado `capability_unavailable` + CTA por ruta, `mandatory` |
| C16 | loading/error/insufficient | nulo honesto | nunca `0`, `NaN`, infinito o dato obsoleto para un valor ausente | contexto autoritativo de cada ruta | fallback + acción correctiva, `mandatory` |

## 4. Cobertura por tarea

| Tarea | Claims mínimos |
|---|---|
| P7-02 | C02, C14–C16 en shell/escenario |
| P7-04 | C01–C04, C14–C16 |
| P7-05 | C04–C05, C14–C16 |
| P7-06 | C06–C10, C14–C16 |
| P7-07 | C11–C13, C14–C16 |
| P7-08 | C01–C16 en E2E/paridad |
| P7-09 | C01–C16 visibles/alcanzables en la matriz responsive |
| P7-10 | auditoría de cobertura C01–C16 y diff contra autoridades |

## 5. Regla de cambio

Un claim nuevo puede añadirse durante implementación. Relajar, eliminar o cambiar `mandatory` a `reachable` requiere enmienda técnica y aprobación explícita. Una diferencia entre el fixture y la autoridad se resuelve contra la autoridad; no se modifica el dato para que coincida con la vista.
