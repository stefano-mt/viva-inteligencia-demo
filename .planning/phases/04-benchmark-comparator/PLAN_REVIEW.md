# Fase 4 — Reader-test independiente del plan

**Fecha:** 2026-07-31

**Rol:** checker/reader independiente, sin implementación funcional

**Veredicto inicial:** **FAIL**

**Veredicto vigente tras re-review:** **PASS WITH RISKS**

## Resumen ejecutivo

El rumbo de producto es prudente y CT-G está conceptualmente bien protegido, pero el plan todavía no está listo para habilitar `HUMAN-GATE-A` ni P4-01. Hay cuatro gaps bloqueantes:

1. el writer 2.3 produciría un payload que el runtime territorial vigente rechaza, mientras `scenario.js` está protegido y el gate humano prohíbe modificar ese motor;
2. la evaluación declara suficiente el snapshot para un benchmark elegible sin demostrar que el precio y el área usados representan la misma oferta o tipología;
3. el contrato operativo no congela la formación y trazabilidad por indicador de todos los denominadores ni resuelve una contradicción de estados;
4. varios `write_set` siguen abiertos mediante expresiones como “tests afectados” o “helpers necesarios”, contrarias a la frontera de escritura exigida por `AGENTS.md`.

Hasta remediarlos, aceptar A1–A10 no bastaría para ejecutar el plan sin que los makers tengan que tomar decisiones de alcance o tocar archivos no autorizados.

## Matriz de las ocho preguntas del reader-test

| # | Pregunta | Resultado | Hallazgo principal |
|---:|---|---|---|
| 1 | ¿Qué se certifica y qué no? | Riesgo controlable | Solo hechos elegibles bajo reglas internas; no cierre, tasación, stock, absorción, áreas inferidas, amenities ejecutados ni validez legal |
| 2 | ¿Cómo se forma cada denominador? | **Gap bloqueante B3** | Falta lineage por KPI, deduplicación, tratamiento de `restricted` y partición exacta de usados/faltantes/excluidos |
| 3 | ¿Cómo se trata CT-G? | Correcto con prueba faltante | Pardo Coast permanece territorial; Tipo 7 y precio no enlazado quedan fuera, pero el fixture debe bloquear también la nueva observación F4 |
| 4 | ¿Cómo funcionan los estados insuficientes? | **Gap bloqueante B3** | `orientative` depende solo de `n` en PLAN/A8, pero UI-SPEC añade una “cobertura baja” sin umbral; cualitativo tampoco está cerrado |
| 5 | ¿Es compatible el contrato 2.3? | **Gap bloqueante B1** | El runtime F2 rechaza 2.3 y el archivo que debe admitirlo está protegido y fuera de la autorización humana |
| 6 | ¿Son seguros `write_set`, maker/checker y paralelismo? | **Gap bloqueante B4** | La pareja P4-07/P4-08 y el checker separado son correctos, pero varios `write_set` no enumeran rutas exactas |
| 7 | ¿Qué decisiones pertenecen al humano? | Incompleto | A1–A10 cubren narrativa principal; faltan autorizar compatibilidad F2 y decidir provenance/degradación de la pareja precio-área |
| 8 | ¿Son verificables DoD y rollback? | Gap remediable antes de ejecutar | Buen gate general, pero faltan baseline browser reproducible, arranque multiversión, particiones por KPI y rollback coherente de writer/datos/hashes |

Las afirmaciones inseguras quedan concentradas en B1 y B2: hoy no es sostenible afirmar que el payload 2.3 preservará F2 ni que las referencias calculadas con dos mínimos representan una pareja precio-área demostrada.

## 1. Qué se certifica y qué no

Según los documentos, “certificado” significa solo **elegible bajo reglas internas de la demo**. Puede aplicarse a hechos que tengan fuente, corte, trazabilidad, homogeneidad, compatibilidad y ausencia de issues bloqueantes. P25, mediana y P75 serían salidas derivadas de esos hechos elegibles; no son una certificación externa.

No se certifican:

- precio de cierre, precio transaccional, tasación, demanda, absorción o velocidad de venta;
- stock o inventario: `unit_count` solo puede ser “unidades reportadas por la publicación” cuando su semántica sea sostenible;
- área techada o libre de mercado;
- existencia, ejecución, calidad o disponibilidad física de amenities anunciados;
- acabados o estacionamientos como prevalencia de mercado con la cobertura actual;
- evidencia `pending` o `restricted`, ni una verdad elegida entre fuentes incompatibles;
- validez legal de la fuente: `legal_status = pending_review` continúa siendo un riesgo externo al gate técnico.

La definición de A2 es adecuada, aunque la UI debería preferir “referencia elegible según las reglas de la demo” sobre “certificado” siempre que sea posible.

## 2. Formación de denominadores

La intención correcta es no reutilizar un único `n`, pero falta congelar un ledger por indicador. La política ejecutable debe definir al menos:

| Lectura | Formación exigible |
|---|---|
| Oferta observada | IDs distintos de `scenarioContext.observed_scope_project_ids` |
| Geografía válida | IDs distintos de `geography_valid_project_ids`, con exclusiones territoriales separadas |
| Comparables | IDs distintos de `scenarioContext.comparable_project_ids`; nunca fallback distrital |
| Precio por m² total | Intersección de comparables con entradas 2.3 cuyos hechos de precio `from`, moneda PEN y área `total` sean elegibles, compatibles y enlazados; un proyecto aporta como máximo un valor |
| Inmobiliarias del precio | `agency_id` distintos de los proyectos que entran al indicador de precio, no del universo territorial completo |
| Unidades reportadas | Suma solo de hechos cuya semántica haya pasado A5, más cobertura `proyectos informados / proyectos comparables`; faltantes no son cero |
| Atributo cualitativo | Numerador de proyectos distintos que anuncian/documentan el atributo sobre proyectos distintos con ese campo informado; `unknown` y `excluded` se reportan fuera del denominador |
| Comparador | Solo 2–3 IDs presentes en el escenario vigente, más Viva como columna simulada que no entra en estadísticos de mercado |

El plan aún no fija qué ocurre con `restricted` en el denominador cualitativo, cómo se deduplican múltiples observaciones de un mismo proyecto, cuál es la precedencia cuando un proyecto tiene varias razones de exclusión ni si `usedProjectIds` es global o específico por KPI. Un único `usedProjectIds` en el resultado del motor no alcanza para demostrar denominadores diferentes. Cada indicador necesita `used_project_ids`, `excluded_project_ids` con razones ordenadas y conteos que particionen su universo de entrada.

## 3. CT-G

El tratamiento conceptual es correcto:

- `project:nexo-2951` permanece en el universo territorial y puede seguir visible en mapa/lista;
- `typology:pardo-coast-tipo-7` y sus ocho hechos incompatibles permanecen excluidos;
- no se escoge entre 104.15 m² y 53.37 m² ni se renombra el segundo valor como área techada;
- un precio de proyecto con vínculo tipológico no demostrado se excluye con `typology_link_unresolved`.

La cautela importante es que la fila legacy de Pardo Coast presenta otra área de proyecto, 51.63 m², y un precio/m² derivado. Por ello, el test no puede limitarse a comprobar que los ocho hechos F3 siguen excluidos: debe demostrar también que la nueva observación de mercado no rehabilita indirectamente el proyecto para precio. El fixture debe verificar simultáneamente presencia territorial, ausencia en `quantitative.price_per_m2_total.used_project_ids`, razón exacta de exclusión y enlace al inspector.

## 4. Estados insuficientes

La tabla cuantitativa aprobable es clara: `n >= 3` → `ready`, `n = 1–2` → `orientative`, `n = 0` → `insufficient`. Sin embargo, `UI-SPEC.md` añade “o cobertura baja” a `orientative` sin definir umbral, mientras PLAN y A8 hacen depender el estado solo de `n`. Esto permitiría dos resultados válidos para el mismo fixture.

En cualitativo, A8 solo prohíbe hablar de patrón/prevalencia con menos de cinco informados, mientras `DATA-ASSESSMENT.md` parece convertir toda cobertura menor en `insufficient`. Debe congelarse si se muestran conteos descriptivos sin conclusión, y con qué estado textual. También faltan criterios observables para distinguir `contract_unavailable`, vacío de selección, `insufficient` y `error`, y una prueba de carga inicial para las vistas F4 si aplica.

## 5. Compatibilidad 2.3

Este es un gap bloqueante demostrado en código:

- `public/js/scenario.js` solo acepta `2.1.0` y `2.2.0` y lanza error para otra versión;
- `state.js` llama obligatoriamente a `createScenarioEnvironment(dataValue)` al cargar datos;
- PLAN declara `scenario.js` protegido;
- HUMAN-GATE-A dice que la aprobación no autoriza modificar motores protegidos de F2.

Por tanto, cambiar el writer a `metadata.contract_version = 2.3.0` rompería la inicialización completa antes de que F4 pudiera degradar o renderizar.

**Remediación obligatoria:** escoger y documentar una de estas rutas antes de repetir el reader-test:

1. autorizar una modificación mínima de compatibilidad en `scenario.js`, ampliar su `write_set` y sus tests para aceptar 2.1/2.2/2.3 sin cambiar semántica F2; actualizar A1–A10 porque hoy esa modificación está explícitamente excluida; o
2. diseñar un mecanismo de versionado que mantenga compatible al reader territorial sin declarar un contrato 2.3 que el runtime rechace.

La primera ruta es la más directa. Debe incluir prueba de arranque completo con payloads 2.1, 2.2 y 2.3, no solo validación JSON. El payload 2.0 puede degradar F4, pero el plan debe aclarar que F2 ya requiere 2.1+ y qué parte exacta de la aplicación continúa con 2.0.

## 6. Fuente y elegibilidad precio/área

`DATA-ASSESSMENT.md` afirma que hay base suficiente para un benchmark de precio publicado desde por m² total, pero la evidencia versionada disponible solo documenta que:

- `list_price_avg` puede ser “precio publicado o precio desde”;
- `price_per_m2_list` se deriva como `list_price_avg / total_area`;
- el build legacy elige `list_price_avg || price_min` y `total_area || total_area_min || area_min`.

La coincidencia aritmética dentro de 0.5% demuestra el cálculo, no que ambos mínimos correspondan a la misma unidad, oferta o tipología. La frase “vínculo tipológico resuelto o no necesario” tampoco define evidencia ni algoritmo. Este vacío afecta a toda la muestra, no solo a CT-G.

**Remediación obligatoria:** agregar al assessment, policy, contrato y fixtures una regla auditable de emparejamiento `precio ↔ área`, su provenance y sus estados. Solo se podrá llamar elegible al cociente cuando la fuente/versionado demuestre la pareja. Si el snapshot no permite demostrarla, el plan debe degradar esos registros a una razón explícita —por ejemplo `price_area_link_unresolved`— y recomputar si queda `n >= 3`; de no quedar muestra, debe cambiar el claim y mostrar información insuficiente, no certificar el cociente de dos mínimos independientes. Esta decisión material debe añadirse al gate humano.

## 7. `write_set`, maker/checker y paralelismo

La separación principal es razonable: datos → motor → estado → vistas paralelas → integración → checker. P4-07 y P4-08 tienen archivos propietarios distintos y son la única pareja funcional paralelizable. P4-13 es independiente de los makers.

No obstante, los siguientes conjuntos no están cerrados:

- P4-04: “tests de referencias, determinismo y privacidad afectados”;
- P4-09: “tests de interacción afectados”;
- P4-10: “tests de exportación/privacidad” sin rutas;
- P4-11: “helpers/descriptores estrictamente necesarios”;
- P4-12 usa nombres CSS abreviados sin ruta completa;
- P4-02 abrevia cinco fixtures después de la primera ruta.

**Remediación obligatoria:** enumerar cada ruta exacta, asignar un solo maker por ola a archivos repetidos (`build-demo-data.js`, `module-graph.mjs`, `package.json`, estilos y controlador), y exigir enmienda previa + nuevo reader-test si aparece un archivo no previsto. La compatibilidad 2.3 debe incorporarse a esta matriz; no puede resolverse como excepción silenciosa a un archivo protegido.

La exportación P4-10 es opcional, pero su secuencia contradice A10: se agenda antes de P4-11/P4-12 aunque A10 exige aprobar privacidad y responsive primero. Debe moverse después de esos gates o marcarse `deferred` desde Gate A.

## 8. Decisiones humanas A1–A10

| Decisión | Lectura del checker |
|---|---|
| A1 | Correcta como aceptación limitada del snapshot; no resuelve revisión legal |
| A2 | Correcta, con preferencia por “referencia elegible” |
| A3 | Correcta: precio publicado `desde`, sin conversión |
| A4 | Correcta en intención, pero “compatibles” carece de regla de emparejamiento precio/área |
| A5 | Correcta; no autoriza tratar cobertura 100% como semántica válida |
| A6 | Correcta; `unknown` no es `false` |
| A7 | Correcta; CT-D no prueba prevalencia |
| A8 | Correcta para `n`, pero debe armonizarse con “cobertura baja” y el estado cualitativo |
| A9 | Correcta para CT-G; requiere overlay verificable sobre las nuevas observaciones F4 |
| A10 | Correcta como Could, pero el orden P4-10 debe corregirse |

Faltan dos decisiones materiales: aceptar la semántica/provenance de la pareja precio-área —o aceptar su degradación— y autorizar el cambio mínimo de compatibilidad en el motor protegido F2. No deben esconderse dentro de tareas maker.

## 9. Verificabilidad, DoD y rollback

El DoD cubre historias, CTs, determinismo, privacidad, regresiones, responsive, accesibilidad, lector nuevo y Pages. Los comandos dirigidos son adecuados como inventario, pero deben asociarse uno a uno con tareas y criterios de salida.

Gaps de verificación:

- el baseline browser no se ejecutó por `playwright` ausente, aunque se exigen capturas before/after; debe existir un gate pre-implementación que instale dependencias desde lockfile y capture el baseline desde el SHA conocido, o documente una fuente reproducible equivalente;
- el test de compatibilidad debe ser de arranque/runtime, no solo de schema;
- cada KPI debe probar partición exacta `universo = usados + faltantes + excluidos` sin duplicados;
- se requieren fixtures para múltiples observaciones, razones múltiples, `restricted`, selección invalidada, `contract_unavailable`, error técnico y `n = 0/1/2/3/4/5` según el tipo de indicador;
- la prueba CT-G debe cubrir la observación F4 recién materializada, no solo los hechos F3 existentes.

El rollback por capas es conceptualmente útil, pero “retirar root benchmark y conservar reader 2.2” no define cómo vuelven `metadata.contract_version`, hechos/observaciones añadidos, coverage report, JSON y hashes al estado coherente. Debe identificar el artefacto/commit conocido, los archivos restaurados y el gate completo que demuestra que F2/F3 siguen operativos. `contract_unavailable` es una degradación prevista, no por sí sola una estrategia de rollback del writer.

## 10. Riesgos no bloqueantes

- `legal_status = pending_review` sigue siendo riesgo aceptable solo para la demo bajo A1.
- El término “certificado” conserva riesgo comercial aun con tooltip; preferir “elegible”.
- `unit_count` muestra cobertura aparente alta, pero su semántica puede ser heterogénea; A5 permite omitirlo.
- La taxonomía de amenities requerirá mantenimiento de aliases y revisión de falsos agrupamientos.
- Graphify no cubre bien CSS/JSON; debe seguir complementado con tests y revisión visual.
- El umbral JSON de 10 MB es razonable, pero debe medirse junto con tiempo de carga en móvil.
- HU-504 es Should; si se difiere, el plan debe identificar quién aprueba la justificación y cómo se registra. HUMAN-GATE-B es el lugar natural si el checker final lo trata como riesgo.

## Gaps bloqueantes y criterio para re-review

| ID | Gap bloqueante | Evidencia de cierre requerida |
|---|---|---|
| B1 | Runtime F2 rechaza contrato 2.3 y su archivo está protegido | Gate humano y `write_set` enmendados; test de arranque 2.1/2.2/2.3 |
| B2 | No está demostrada la pareja semántica precio-área de la muestra | Regla de provenance ejecutable, fixtures positivos/negativos y conteos recompuestos |
| B3 | Denominadores/estados no forman un contrato inequívoco por KPI | Esquema de lineage por indicador, particiones y tabla de estados sin contradicciones |
| B4 | `write_set` abiertos y secuencia opcional inconsistente | Rutas exactas, ownership por ola y P4-10 reordenada o diferida |

El siguiente reader-test puede emitir `PASS` o `PASS WITH RISKS` cuando B1–B4 estén cerrados documentalmente y la solicitud humana revisada contenga todas las decisiones materiales. Hasta entonces, P4-01 permanece bloqueada.

## Re-review de remediación

**Veredicto: PASS WITH RISKS.** B1–B4 están cerrados a nivel documental y el plan puede avanzar al `HUMAN-GATE-A`. Este veredicto no habilita P4-01: `HUMAN-GATE-A-REQUEST.md` todavía figura pendiente de aceptación explícita A1–A12, y la implementación, los tests y el baseline siguen siendo evidencia futura.

| ID | Estado | Evidencia de cierre |
|---|---|---|
| B1 | PASS | A12 limita el cambio protegido de `scenario.js` al allowlist 2.3 y exige arranque 2.1/2.2/2.3 sin alterar selección ni IDs. P4-01 enumera la ruta y `contract-runtime-startup.mjs`, y conserva 2.1/2.2 con F4 en `contract_unavailable`. |
| B2 | PASS | `CONTEXT.md` y `DATA-ASSESSMENT.md` exigen `source_paired` con `offer_id`, `typology_id` o métrica nativa documentada. Los mínimos no emparejados quedan en `project_minima_pair_unresolved` / `orientative_noncomparable`, fuera del benchmark elegible; CT-P y P4-02 incluyen casos positivos, negativos, duplicados, conflictos y tamaños `n = 0/1/2/3/4/5`. |
| B3 | PASS | El índice 2.3 define lineage por indicador con IDs de entrada, usados, faltantes y excluidos; cada KPI debe cumplir la partición disjunta `input = used + missing + excluded` sin duplicados. `DATA-ASSESSMENT.md`, `UI-SPEC.md` y `PLAN.md` distinguen de forma consistente `ready`, `orientative`, `insufficient`, `orientative_noncomparable`, `contract_unavailable`, `error`, `restricted`, `unknown` y `excluded`. |
| B4 | PASS | Las tareas enumeran rutas exactas, los archivos compartidos tienen escritor único por ola y cualquier archivo no previsto exige enmienda. P4-07/P4-08 mantienen conjuntos disjuntos; P4-10 queda diferida con `write_set` vacío y solo puede reabrirse mediante una enmienda posterior a P4-12 con privacidad y reader-test propios. |

### Riesgos residuales

- `HUMAN-GATE-A` continúa pendiente; sin la frase de aceptación A1–A12 no se inicia P4-01 ni se ejerce la excepción sobre `scenario.js`.
- `legal_status = pending_review` limita el uso de la fuente Nexo a la demo aceptada bajo A1; no cubre uso productivo ni distribución adicional.
- El arranque 2.1/2.2/2.3, las particiones, los fixtures de pairing, el baseline de navegador y el rollback están especificados pero todavía deben demostrarse con ejecución y evidencia durante las tareas previstas.
