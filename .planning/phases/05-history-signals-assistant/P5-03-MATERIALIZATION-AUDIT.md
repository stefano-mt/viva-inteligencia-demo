# P5-03 — Materializador determinista y auditoría histórica

**Estado:** completado.

**Rama:** `feat/phase-5-history-signals-assistant`.

## Objetivo

Auditar los 34 candidatos preliminares documentados en Fase 5 y construir un materializador puro que transforme el snapshot legacy en eventos 2.4 normalizados, con exclusiones explicables, orden estable, causalidad nula e idempotencia.

P5-03 no escribe el JSON público. P5-04 conserva la propiedad exclusiva del writer, referencias completas, índices, fingerprints y regeneración del payload.

## Fuente y autoridad

- Snapshot: `datos_relevantes/viva_minimum_dataset_latest.csv`.
- Filas: 714.
- Captura actual: `captured_at`.
- Observación anterior: `latest_price_history_date` + `latest_price_history_from`.
- Valor actual: `list_price_avg`, con fallback a `price_min`.
- Semántica: `published_price_from_project`.
- Moneda autorizada: PEN.
- Identidad pública: intersección con los 676 proyectos de `model.projects`.
- Distritos Top-7: IDs del manifiesto geográfico; distritos fuera del catálogo reciben un ID legacy estable y no se convierten en escenario oficial.

Los campos de contacto presentes en el CSV no entran al materializador ni a su linaje.

## Embudo reproducido

| Etapa | Registros | Regla |
|---|---:|---|
| Snapshot | 714 | filas versionadas |
| Cambio no nulo | 42 | anterior y actual numéricos y distintos |
| Valores positivos | 41 | anterior y actual > 0 |
| Moneda PEN | 40 | sin inferir `$` |
| Cronología válida | 40 | anterior < actual |
| Dentro de ±30% | 34 | subconjunto preliminar conservador |
| Canónicos dentro de ±30% | 31 | identidad presente en `model.projects` |
| Materializados por policy | 36 | 31 certificados + 5 outliers canónicos revisables |

Los 34 preliminares fueron reproducidos exactamente; no se sustituyeron por una cifra fija.

## Distribución de los 34 preliminares

| Distrito | N |
|---|---:|
| Santiago De Surco | 6 |
| Miraflores | 5 |
| Surquillo | 5 |
| Jesus Maria | 4 |
| Cercado de lima | 2 |
| Lince | 2 |
| Pueblo Libre | 2 |
| San Isidro | 2 |
| Breña | 1 |
| Chorrillos | 1 |
| La Victoria | 1 |
| Magdalena Del Mar | 1 |
| San Borja | 1 |
| San Miguel | 1 |

IDs preliminares: `1866, 2378, 2566, 2570, 2671, 2855, 3025, 3060, 3198, 3212, 3338, 3358, 3385, 3406, 3414, 3470, 3511, 3528, 3553, 3561, 3590, 3596, 3637, 3685, 3814, 3927, 3937, 3981, 4010, 4012, 4046, 4052, 4085, 4105`.

## Resultado final de policy

Se materializan **36 eventos**:

- 31 `certified`: identidad canónica, PEN, cronología compatible, evidencia estructurada y variación ≤30%;
- 5 `reviewable`: identidad canónica y cronología compatible, pero variación extrema;
- 0 eventos con causa: `cause=null` y `cause_evidence_ids=[]` en todos los casos;
- 36 con vigencia `aging`, calculada contra el cutoff fijo, no contra el reloj del dispositivo.

Outliers conservados como revisables:

| Proyecto Nexo | Cambio | Lectura permitida |
|---|---:|---|
| 2587 | −45.17% | cambio observado por revisar |
| 3445 | +202.49% | cambio observado por revisar |
| 3540 | +359.51% | cambio observado por revisar |
| 3735 | −100% | valor actual cero; revisar, nunca certificar |
| 3902 | +841.42% | cambio observado por revisar |

Conservarlos no implica priorizarlos: P5-05 debe aplicar calidad y vigencia antes que magnitud.

## Exclusiones

Se excluyen **6 registros**:

| Proyecto Nexo | Razón primaria | Nota |
|---|---|---|
| 3240 | `entity_mismatch` | Zafira no pertenece al modelo autoritativo; además es extremo |
| 3313 | `unknown_currency` | la fuente declara `$`; no se infiere PEN ni USD |
| 3385 | `entity_mismatch` | Albamar permanece sin identidad canónica |
| 3406 | `entity_mismatch` | Albamar permanece sin identidad canónica |
| 4052 | `entity_mismatch` | ESPARQ EOM permanece sin identidad canónica |
| 4139 | `entity_mismatch` | Zafira no pertenece al modelo autoritativo; además es extremo |

Tres de los 34 preliminares (`3385`, `3406`, `4052`) se excluyen por identidad. Cinco outliers resueltos entran como revisables; por ello el resultado materializado es 36 y no 31 o 34.

## Salida del materializador

`materializeHistoryCandidates` devuelve:

- embudo y lista exacta de candidatos preliminares;
- distribución distrital auditada;
- eventos con shape `historyEvent` 2.4;
- linaje mínimo anterior/actual con IDs deterministas de observación, hecho y evidencia;
- exclusiones con razón primaria y reason codes completos;
- cobertura global y distrital;
- serialización JSON estable.

Los IDs de linaje quedan listos para que P5-04 cree los registros reales y resuelva referencias dentro de `model`. P5-03 no anuncia esos registros en el payload 2.3 actual.

## Ciclo rojo → verde

1. Se creó `tests/data-history-materializer.mjs` antes de la implementación.
2. La primera ejecución falló porque `history.js` no exportaba `materializeHistoryCandidates`.
3. Se implementó el materializador y la serialización determinista.
4. La suite pasó con orden original e invertido, mutación duplicada, schema por evento y privacidad.

## Verificación

PASS:

```text
npm.cmd run check
npm.cmd run test:phase5:data
npm.cmd run test:data
npm.cmd run test:data:compatibility
npm.cmd run test:data:validator
npm.cmd run test:data:schema
npm.cmd run test:data:privacy
npm.cmd run test:inspector:data
npm.cmd run test:benchmark:data
npm.cmd run test:architecture
```

Pruebas específicas:

- 42/34/36/31/5/6 y distribución distrital exactos;
- cada evento encaja en `$defs.historyEvent` 2.4;
- IDs únicos y ordenados;
- dos ejecuciones con orden de entrada inverso son estructural y byte-idénticas;
- un `project_id` duplicado se excluye con `duplicate` y no produce evento;
- cero `NaN`, infinito, PII, rutas locales o causas inventadas;
- Fases 1–4 conservan contrato, Inspector, Benchmark y escenario.

`npm.cmd run test:data:determinism` conserva el único rojo esperado de P5-01/P5-02: el JSON público 2.3 todavía contiene el fingerprint anterior del schema (`e68fac…`) frente al schema lógico 2.4 (`89c2f4…`). P5-04 debe resolverlo mediante regeneración completa; no se actualiza manualmente.

## Archivos protegidos

Sin cambios en:

- `scripts/build-demo-data.js`;
- `scripts/data/validate.js`;
- `public/demo-data/viva-platform-demo.json`;
- `public/js/**`, vistas, estilos y activos;
- contratos y fuentes de Fases 2–4.

## Handoff a P5-04

P5-04 debe integrar policy, catálogo y materializador al writer, crear observaciones/hechos/evidencias referenciados por los 36 eventos, construir `history.by_project_id`, `history.by_district_id`, coverage y fingerprints, actualizar a contrato 2.4 y demostrar dos builds byte-idénticos. Si una referencia de linaje no puede materializarse de forma válida, debe excluir el evento y explicar el nuevo conteo; no puede relajar policy ni inventar evidencia.
