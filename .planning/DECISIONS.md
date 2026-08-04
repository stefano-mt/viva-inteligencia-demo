# Registro de decisiones

## D-001 — Memoria en archivos del repositorio

**Fecha:** 2026-07-27

**Estado:** aceptada

La continuidad se almacena en `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, contextos, planes y handoffs. Los chats no son fuente de verdad.

## D-002 — GSD compatible, instalación opcional

**Fecha:** 2026-07-27

**Estado:** aceptada

Se adopta el ciclo y los artefactos de GSD. La instalación de `@opengsd/gsd-core` es opcional porque añade comandos/runtime y debe decidirse conscientemente; los archivos del proyecto funcionan aun sin ella.

## D-003 — Paralelismo condicionado por write sets

**Fecha:** 2026-07-27

**Estado:** aceptada

El paralelismo se autoriza por independencia de archivos y contratos, no por cantidad de agentes disponible. Mientras `app.js` y `styles.css` sean monolíticos, existe un único implementador UI.

## D-004 — Verificador independiente

**Fecha:** 2026-07-27

**Estado:** aceptada

El implementador puede ejecutar comprobaciones locales, pero no emite el veredicto final de su propia tarea. Un verificador separado evalúa criterios, regresiones y evidencia.

## D-005 — Graphify local y determinista

**Fecha:** 2026-07-27

**Estado:** aceptada

Se usa extracción `--code-only` sin API key para orientación. Los outputs locales se regeneran y no se versionan por defecto.

## D-006 — Inspector como momento comercial central

**Fecha:** 2026-07-27

**Estado:** aceptada

El caso tarjeta/plano incompatible recibe máxima jerarquía junto al mapa. Los módulos restantes sostienen esa narrativa sin competir visualmente.

## D-007 — Fronteras ES y controlador por inyección

**Fecha:** 2026-07-28

**Estado:** aceptada

`app.js` compone la aplicación; estado, configuración, dominio, navegación, controlador y vistas viven en módulos ES. El controlador recibe `render` mediante `bindEvents(render)` y conserva una referencia privada, evitando importar el entrypoint y crear ciclos.

## D-008 — CSS dividido sin alterar cascada

**Fecha:** 2026-07-28

**Estado:** aceptada

`styles.css` es un manifiesto de ocho `@import` ordenados. La concatenación debe seguir reproduciendo exactamente el CSS previo mientras la fase no autorice cambios visuales.

## D-009 — Conteo reproducible de Miraflores

**Fecha:** 2026-07-28

**Estado:** aceptada

El conteo reproducible vigente es 90 proyectos en Miraflores: coincide en el CSV versionado, el JSON generado, la UI, el reporte de cobertura y los requisitos. El valor 88 registrado antes en `CONTEXT.md` era drift documental y fue corregido en P2-00B dentro de su `write_set`, sin alterar el dataset.

## D-010 — `deep` estructurado no equivale a dossier visual

**Fecha:** 2026-07-28

**Estado:** aceptada

Un tier `deep` demuestra matching alto, tipología Nexo inspeccionable y al menos tres valores estructurados respaldados por snapshots versionados. No autoriza afirmar que existen cinco dossiers visuales públicos: el modelo actual contiene una tipología de mercado, un fragmento autorizado disponible y ningún activo visual público.

Fase 3 debe incorporar activos autorizados o neutrales y navegación proyecto → tipología → evidencia antes de usar esa narrativa comercial.

## D-011 — Aliases ambiguos fuera del modelo canónico

**Fecha:** 2026-07-28

**Estado:** aceptada

Los aliases con resolución `manual_review` no se asignan por intuición. Los 42 proyectos legacy asociados a 11 aliases ambiguos permanecen fuera de `model.projects`; siguen visibles en la reconciliación 714 legacy frente a 676 autoritativos.

## D-012 — Moneda ambigua permanece `unknown`

**Fecha:** 2026-07-28

**Estado:** aceptada

El símbolo `$` sin contexto suficiente se normaliza como `unknown`, no como USD. Los 37 proyectos legacy afectados quedan fuera de agregados monetarios certificados; no existe conversión ni inferencia sin un hecho de moneda o tipo de cambio con fuente y fecha.

## D-013 — Privacidad y permisos en el artefacto público

**Fecha:** 2026-07-28

**Estado:** aceptada

El JSON público excluye contactos personales, emails, teléfonos, WhatsApp, contenido crudo, rutas locales y activos no autorizados. Documentos o evidencias con permiso `restricted` o `pending` conservan metadata trazable sin publicar ruta o fragmento no autorizado.

## D-014 — Build fijo y determinista

**Fecha:** 2026-07-28

**Estado:** aceptada

El build no usa reloj de ejecución ni llamadas de red. Dataset, cutoff y metadata se fijan desde inputs versionados; 27 fingerprints SHA-256 registran las entradas y la serialización es estable.

El artefacto verificado tiene 3,382,916 bytes y SHA-256 `a7f68af35d97c6fbc066b4213ebb12d525d630fa366a0e75826d2349087d8141`. Cualquier cambio futuro del JSON debe recomputar `coverage-report.json`; un hash distinto sin reporte actualizado bloquea el PR.

## D-015 — Fase 2 no inicia con checker FAIL

**Fecha:** 2026-07-28

**Estado:** aceptada

Los tres reader-tests del plan F2 terminaron en `FAIL`, aunque el último fue estrecho y sus gaps se remediaron documentalmente después. Esa remediación no se interpreta como autoaprobación. No se descarga geometría ni se edita código funcional hasta obtener una nueva validación independiente favorable, confirmar licencia/permiso, completar HUMAN-GATE-A y versionar `APPROVAL.md` mediante P2-00C.

## D-016 — OSM como fuente cartográfica referencial propuesta para F2

**Fecha:** 2026-07-28

**Estado:** aceptada

F2 usa un snapshot fijo de siete relaciones OpenStreetMap bajo ODbL 1.0. La geometría se conserva separada del dataset inmobiliario, con atribución visible, aviso share-alike, timestamp y hashes; la demo no consulta servicios cartográficos en runtime. RENLIM permanece como referencia legal y OSM no se presenta como límite oficial. El checker independiente emitió `PASS WITH RISKS`; HUMAN-GATE-A fue aprobada y persistida en `APPROVAL.md`.

## D-017 — HUMAN-GATE-A habilita P2-01

**Fecha:** 2026-07-28

**Estado:** aceptada

Stefano aprobó explícitamente la ruta OSM/ODbL y el inicio de Fase 2. `APPROVAL.md` registra fuente, relaciones, licencia, atribución, riesgos aceptados/rechazados, timestamp y hashes de los documentos revisados. Cualquier cambio de esas condiciones reactiva la stop rule y exige repetir assessment, checker y aprobación.

## D-018 — Cobertura poligonal real 422/433

**Fecha:** 2026-07-28

**Estado:** aceptada

El motor normativo P2-03 reprodujo 422 de 433 proyectos dentro o sobre el borde de su polígono OSM. Once quedan fuera: Santiago de Surco 1, Magdalena del Mar 7 y San Isidro 3. Se conservan como exclusiones `outside_district_polygon` y producen cobertura territorial parcial; no se reasignan ni se ocultan. Miraflores mantiene 90/90, por lo que CT-I continúa aprobado. Esta corrección no cambia fuente, licencia o riesgos aceptados en HUMAN-GATE-A.

## D-019 — Distancia radial pertenece al contexto territorial

**Fecha:** 2026-07-28

**Estado:** aceptada

`buildTerritorialContext` entrega `distance_meters_by_observed_project_id` con precisión completa para los proyectos observados cuando el alcance es radial. P2-06 consume esa distancia únicamente para puntuar y ordenar comparables; no vuelve a calcular Haversine, pertenencia territorial ni polígonos. El campo es aditivo al contrato interno de P2-05 y evita dos fuentes de verdad entre selección geográfica y comparabilidad.

## D-020 — Presets explícitos al activar cuadrante o radio

**Fecha:** 2026-07-28

**Estado:** aceptada

Al activar cuadrante se selecciona en la misma transición el primer cuadrante disponible, NW en el snapshot vigente. Al activar radio se usa la mediana observada del distrito y 1,000 m en una única transición, rotulada en UI como `Centro observado del distrito`. El usuario puede reemplazar después el punto desde el mapa; no existe estado territorial oculto.

## D-021 — P2-10 posee el submit atómico del planificador

**Fecha:** 2026-07-28

**Estado:** aceptada

El formulario de producto y precio vive en `dashboard.js`, pero su listener debe permanecer en el único propietario de eventos, `controller.js`. Se amplía de forma controlada el `write_set` de P2-10 para incluir ese controlador. P2-08 define hooks y contrato; P2-10 implementa un solo submit atómico; P2-14 lo verifica montado. No se trasladan controles avanzados a la barra global ni se crean listeners paralelos en `app.js`.

## D-022 — Lectura simultánea de cuadrantes no duplica comparabilidad

**Fecha:** 2026-07-28

**Estado:** aceptada

P2-11 muestra para los cuatro cuadrantes del distrito conteos reproducibles de observados, geografía válida y reconciliación autoritativa, junto con precio publicado provisional cuando la evidencia es compatible. Solo el cuadrante activo presenta comparables y diagnóstico derivados del `scenarioContext` vigente. No se recomponen cuatro escenarios durante render ni se crea un segundo motor de comparabilidad para llenar filas no activas.

## D-023 — P2-12/P2-13 incorporan tests puros y eliminan respuesta paralela

**Fecha:** 2026-07-28

**Estado:** aceptada

Se agregan `tests/projects-compare.mjs` y `tests/checklist-assistant.mjs` a los `write_set` de P2-12 y P2-13. P2-13 también puede editar `controller.js`, una vez integrado P2-10, para retirar el cálculo legacy de `state.assistantResponse`. La respuesta visible se genera de forma determinista desde el `scenarioContext` vigente; no existe un segundo contexto derivado del texto de la pregunta.

## D-024 — HUMAN-GATE-B acepta R1–R5 sin elevar el veredicto

**Fecha:** 2026-07-29

**Estado:** aceptada

Stefano declaró exactamente “Acepto R1–R5 y autorizo HUMAN-GATE-B.” con timestamp de sesión `2026-07-29T08:01:09.8984344-05:00`. La decisión autoriza P2-17 y la preparación del PR, pero el veredicto independiente permanece `PASS WITH RISKS`; no equivale a `PASS`, merge, despliegue ni verificación de GitHub Pages.

Las mitigaciones obligatorias son:

1. registrar makers de P2-01–P2-15 solo cuando sean verificables; ante ausencia de evidencia, usar “no verificable desde el repositorio” y no inferir identidad desde el autor Git;
2. hacer durable la evidencia visual durante la preparación/revisión del PR y antes de solicitar merge, mediante adjuntos o enlaces, sin versionar binarios fuera de un `write_set` aprobado;
3. mantener PLAN, informe y tests ejecutables como contrato distribuido mientras no exista un `TEST_CONTRACTS.md` autorizado;
4. complementar Graphify con tests de datos, hashes, Playwright, contraste y revisión visual, porque no cubre fielmente CSS/JSON;
5. realizar una comprobación humana breve de Chrome al 200% antes de la demo; puede hacerse durante la revisión del PR solo si esa revisión ocurre primero.

Las desviaciones `20f282a`, `080cc61` y `ec6e6e9` permanecen registradas como riesgo procedimental; no crean precedente para ampliar un `write_set` después de escribir. Los documentos P2-17 deben versionarse antes de crear el PR. El merge del PR funcional es humano. P2-18 verifica Pages de forma read-only después del merge. P2-19 persiste ese resultado en una rama y PR documental separados, y su PR también requiere merge humano antes de declarar `deployed and verified` o `merged, deployment verification failed`.

## D-025 — HUMAN-GATE-A habilita P3-01 bajo A1–A8

**Fecha:** 2026-07-29

**Estado:** aceptada

Stefano declaró exactamente “Acepto A1–A8 y autorizo HUMAN-GATE-A de la Fase 3.” con timestamp de sesión `2026-07-29T11:03:25.5945816-05:00`. La aprobación acepta el plan revisado en `2ca7cf3` y habilita P3-01.

Queda decidido:

1. los originales CT-G no se publican;
2. los activos neutrales son propios, controlados y se identifican como no originales;
3. `30 / 22 / 5`, tipologías inspectables y activos autorizados son denominadores separados;
4. el inventario inicial contiene 10 tipologías, 5 agencias, 1 caso observado y 9 controlados;
5. no se elige una verdad ni se infiere área techada;
6. la elegibilidad se decide por hecho/tipología; Pardo Coast permanece en F2/CT-I;
7. la demo sigue estática, sin OCR en vivo, scraping, backend o servicios externos;
8. un cambio material a A1–A8, contrato, inventario, permisos, write sets, dependencias o CT-D/CT-G exige replanificación y nueva revisión.

La aprobación no equivale a PASS técnico, merge o despliegue. P3-14 permanece independiente y HUMAN-GATE-B será obligatoria si el veredicto es `PASS WITH RISKS`.

## D-026 — Contrato 2.2 separa evidencia, permiso y elegibilidad territorial

**Fecha:** 2026-07-30

**Estado:** aceptada

Fase 3 materializa `metadata.contract_version = 2.2.0` y un índice autoritativo `$.inspector`, manteniendo compatibilidad de lectura con 2.0 y 2.1. Los niveles 30/22/5, los diez expedientes y los quince activos visuales autorizados son denominadores distintos.

La calidad y el permiso son ejes independientes. Un hecho `pending` o `restricted` puede conservar metadata trazable, pero no publica ruta, fragmento, binario, enlace o solicitud externa. Una representación controlada se identifica persistentemente como no original.

El JSON conserva fingerprints completos de cadena de custodia y puede conservar el `source_url` público de la observación de tarjeta CT-G. Esa metadata no se presenta como evidencia abrible: para `pending`, `restricted` o `unavailable`, la UI no genera CTA externo, `href`, `src`, fragmento, recurso incrustado o solicitud de red, y muestra como máximo un hash abreviado.

La elegibilidad se decide por hecho y tipología. Una incompatibilidad excluye esos datos de salidas certificadas sin retirar el proyecto del universo territorial. En CT-G, `typology:pardo-coast-tipo-7` y sus ocho hechos quedan excluidos; `project:nexo-2951` permanece en CT-I y comparables de Fase 2. No se selecciona una verdad ni se renombra `area_type = unknown` como área techada.

## D-027 — P3-14 PASS habilita PR sin HUMAN-GATE-B

**Fecha:** 2026-07-30

**Estado:** aceptada

El checker independiente `/root/phase3_checker` emitió `PASS` sobre `c35646f1adfb4a0603c5838e32af6119ca5f66a1`. Verificó historias 401–406/901, CT-D, CT-G, permisos, claims, determinismo, regresiones, accesibilidad, responsive, Graphify y un recorrido comercial por un lector nuevo en `00:01:28.548`.

No existen gaps bloqueantes y `HUMAN-GATE-B` no aplica. Las notas de baja severidad no alteran el veredicto: terminología de porcentajes de evidencia, cobertura parcial de Graphify para CSS/JSON y prerequisito local de instalar dependencias de desarrollo.

El alcance aprobado “17–20 documentos/evidencias” se materializó como 19 documentos y 19 evidencias emparejados uno a uno. P3-14 aceptó la interpretación por colección. Si el responsable pretendía un máximo combinado, ese alcance debe reabrirse antes de añadir nuevos registros; no se alteran los datos aprobados durante P3-15.

P3-15 puede preparar el PR funcional. El merge continúa siendo humano. El `PASS` previo al PR no demuestra despliegue: P3-16 debe verificar Pages después del merge y P3-17 debe persistir el resultado en una rama y PR documental separados. Cualquier cambio posterior a P3-14 en código, datos, tests, activos o comportamiento exige repetir el checker sobre el nuevo SHA.

## D-028 — HUMAN-GATE-A habilita Fase 4 bajo A1–A12

**Fecha:** 2026-07-31

**Estado:** aceptada

Stefano declaró exactamente “Acepto A1–A12 y autorizo HUMAN-GATE-A de la Fase 4.” con timestamp de sesión `2026-07-31T11:11:10.4019829-05:00`. La aprobación acepta el plan `be5fd33` después de que el re-review independiente cerrara B1–B4 con `PASS WITH RISKS`.

Queda decidido que:

1. Nexo se usa solo como snapshot fijo de demo y continúa `pending_review` jurídicamente;
2. la UI habla de referencia elegible, no certificación externa;
3. precio publicado `desde`, área total, unidades reportadas y atributos anunciados conservan semánticas separadas;
4. `unknown`, `restricted`, `excluded` e insuficiente no se convierten en ausencia;
5. Pardo Coast permanece territorial y Tipo 7 no se rehabilita;
6. los 371/69 cocientes de mínimos son `orientative_noncomparable`; solo `source_paired` puede entrar al benchmark elegible;
7. HU-505 queda diferida;
8. `scenario.js` solo puede ampliar su allowlist a 2.3 y debe demostrar arranque 2.1/2.2/2.3 sin alterar F2;
9. P4-00D crea el lockfile y baseline browser antes de P4-01;
10. cualquier cambio material a A1–A12, fuente, pairing, contrato, umbrales o `write_set` exige nueva revisión.

La aprobación no equivale a PASS técnico, merge, despliegue o revisión legal. P4-13 permanece independiente y HUMAN-GATE-B será obligatoria si emite `PASS WITH RISKS`.

## D-029 — Enmienda técnica P4-01 incorpora semántica benchmark al reader

**Fecha:** 2026-07-31

**Estado:** aceptada

Stefano autorizó explícitamente la enmienda técnica de P4-01 con timestamp de sesión `2026-07-31T11:36:09.8204568-05:00`. La autorización añade `prototipo_ejecutable/scripts/data/validate.js` al `write_set` de P4-01 exclusivamente para ejecutar en el reader real las reglas semánticas ya aprobadas del benchmark 2.3.

El reader debe rechazar referencias colgantes, pairing no demostrado, hechos incompatibles, atributos canónicos duplicados o ambiguos y ledgers que no cumplan la partición disjunta por indicador. La enmienda no autoriza modificar writer, build, dataset público, selección territorial, IDs, geometría ni otra semántica F2/F3. P4-03 conserva la responsabilidad posterior de materialización y P4-04 la regeneración del dataset y su fingerprint.

## D-030 — Enmiendas P4-04 preservan regresiones y catálogos extensibles

**Fecha:** 2026-07-31

**Estado:** aceptada

Stefano autorizó explícitamente dos ampliaciones acotadas del `write_set` de P4-04:

1. actualizar tres regresiones legacy al contrato público 2.3 y a 50 fingerprints;
2. adaptar dos pruebas de integración F1 a catálogos públicos extensibles, preservando sin cambios sus registros originales.

La autoridad se limita a pruebas y compatibilidad con el contrato materializado. No autoriza cambiar semántica, registros originales F1, runtime, fuentes, pairing, selección territorial ni claims. El checker P4-13 confirmó que las cinco regresiones pasan y que el dataset conserva contrato, referencias, privacidad y determinismo.

## D-031 — Enmienda P4-11 integra la regresión y los E2E vigentes

**Fecha:** 2026-07-31

**Estado:** aceptada

Stefano autorizó explícitamente migrar `prototipo_ejecutable/tests/projects-compare.mjs` al modelo vigente e integrar `benchmark-e2e.mjs` y `comparison-e2e.mjs` en `package.json`.

La enmienda se limita a tests y composición del gate. No permite modificar runtime, datos o estilos. El checker P4-13 confirmó que búsqueda profunda, universo canónico, máximo tres, estados vacíos, escaping, E2E F4, smoke y accesibilidad pasan.

## D-032 — P4-13A cierra G1 y habilita P4-14 sin HUMAN-GATE-B

**Fecha:** 2026-08-03

**Estado:** aceptada

La primera ejecución P4-13 emitió `FAIL` porque el resumen territorial afirmaba `Referencia de precio lista` antes de mostrar 0 parejas elegibles. Stefano autorizó la enmienda correctiva P4-13A con el `write_set` exacto registrado en `AMENDMENT-P4-13A.md`.

La corrección reemplaza esa afirmación por `Referencia de precio no demostrada` y explica que las 69 publicaciones raw no prueban una pareja precio–área de la misma oferta. No cambia motor, estado, contrato, dataset, pairing, CT-G, estilos o configuración; F4 conserva 68 cocientes orientativos y 0 elegibles.

El checker independiente `/root/phase4_gate_checker` repitió P4-13 sobre `be05fdc456e3ab85da01df26b4cd22daa426dac6` y emitió `PASS`. Verificó HU-DEMO-501–504, CT-A/B/C/D/G/I/P, contrato 2.3, privacidad, determinismo, responsive, accesibilidad, regresiones, Graphify y recorrido comercial. No existen gaps bloqueantes y `HUMAN-GATE-B` no aplica.

P4-14 puede preparar el PR funcional. El merge continúa siendo humano. El `PASS` no demuestra despliegue: P4-15 debe verificar Pages read-only después del merge y P4-16 debe persistir ese resultado en una rama y PR documental separados. Cualquier cambio posterior a P4-13 en código, datos, tests, estilos, activos o comportamiento exige repetir el checker.

## D-033 — HUMAN-GATE-A habilita Fase 5 bajo A1–A12

**Fecha:** 2026-08-04

**Estado:** aceptada

Stefano declaró exactamente “Acepto A1–A12 y autorizo HUMAN-GATE-A de la Fase 5.” con timestamp de sesión `2026-08-04T10:50:13.4321329-05:00`. La aprobación acepta el plan `ae55fa5fa1670fd471921b74dba8dfa7bfad048e` y habilita P5-00D; P5-01 solo puede comenzar si el baseline preimplementación pasa.

Queda decidido que:

1. el contrato objetivo es 2.4 con `history` y `assistant` autoritativos y reader 2.0–2.4;
2. los 34 candidatos históricos preliminares se auditan y no constituyen un mínimo comprometido;
3. el histórico describe precios publicados desde/mínimos a nivel proyecto en dos observaciones, nunca ventas o cierres;
4. no se atribuye causa sin evidencia causal;
5. vigencia se calcula contra el cutoff con umbrales 30/90 días;
6. señales y asistente conservan el escenario canónico;
7. calidad/vigencia preceden a magnitud y outliers débiles no lideran la lectura;
8. HU-DEMO-603 entra como agenda reproducible, no como afirmación semanal;
9. el asistente es determinista, local, de catálogo cerrado y sin servicios externos;
10. toda afirmación resoluble porta referencias y CT-F rechaza precio real de cierre.

La aprobación no equivale a PASS técnico, merge o despliegue. P5-13 permanece independiente y HUMAN-GATE-B será obligatorio ante `PASS WITH RISKS`.

## D-034 — Contrato 2.4 separa histórico y catálogo semántico

**Fecha:** 2026-08-04

**Estado:** aceptada

P5-01 añade al schema la revisión `2.4.0` con dos índices autoritativos y cerrados: `history` referencia observaciones, hechos y evidencias sin duplicar el modelo; `assistant` publica política, intenciones, guardrails y contrato de respuesta sin precalcular cifras.

Las revisiones 2.0–2.3 prohíben anunciar `history` y conservan `assistant` legacy. La revisión 2.4 hereda escenario, inspector y benchmark, y exige ambos índices F5. El reader admite 2.0–2.4; el runtime territorial permanece 2.1–2.3 hasta P5-06.

P5-01 no modifica writer ni dataset. El cambio del schema produce un drift esperado en su fingerprint dentro del JSON público 2.3. P5-04 es el único propietario autorizado para regenerar el payload 2.4 y cerrar determinismo; actualizar a mano el fingerprint queda prohibido.

## D-035 — P5-02 separa calidad histórica de visibilidad territorial

**Fecha:** 2026-08-04

**Estado:** aceptada

La policy y el catálogo de P5-02 se materializan exactamente dentro del contrato 2.4 aprobado, sin ampliar reason codes, topics o propiedades. CT-C no se representa como un defecto del evento: un cambio compatible puede ser materializable en el universo y, simultáneamente, quedar fuera de la vista porque su `project_id` no pertenece al escenario canónico.

Moneda, cronología, semántica, entidad y evidencia gobiernan calidad; `scenario_project_ids` gobierna visibilidad. CT-G/CT-I cierran por defecto ante evidencia restringida, desconocida o conflictiva. El asistente nunca cambia de territorio por texto y las preguntas de cierre, causalidad o datos personales usan limitaciones deterministas.

P5-02 no modifica writer, validator, runtime ni dataset público. El drift de fingerprint del schema permanece reservado a P5-04. P5-03 puede reutilizar los evaluadores puros para auditar candidatos, pero no puede relajar la policy para aproximarse a 34 eventos.

## D-036 — P5-03 explica 34 preliminares y materializa 36 por policy

**Fecha:** 2026-08-04

**Estado:** aceptada

La auditoría reproduce exactamente los 34 candidatos conservadores documentados, pero esa cifra no es un mínimo ni un máximo contractual. Tras exigir identidad canónica, 31 quedan certificados. La policy aprobada permite conservar cinco cambios extremos con identidad y cronología válidas como `reviewable`, de modo que el resultado materializado es 36.

Se excluyen cinco identidades no resueltas (`3240`, `3385`, `3406`, `4052`, `4139`) y una moneda ambigua (`3313`). Los cinco outliers materializados (`2587`, `3445`, `3540`, `3735`, `3902`) nunca se certifican ni adquieren prioridad por magnitud. Todos los eventos conservan causa nula y vigencia derivada del cutoff.

P5-03 crea IDs de linaje deterministas, no registros públicos: P5-04 debe materializar observaciones, hechos y evidencias, resolver todas las referencias y regenerar el payload 2.4. Si ese gate reduce el conteo, debe explicarlo; queda prohibido relajar identidad, moneda, cronología o evidencia para conservar 36.

## D-037 — P5-06 adopta 2.4 sin acoplar histórico y escenario

**Fecha:** 2026-08-04

**Estado:** aceptada

El runtime territorial admite contratos 2.1–2.4. El reader estructural conserva 2.0, pero el escenario F2 no lo declara operativo porque esa revisión no contiene su contrato territorial. Histórico se habilita únicamente en 2.4 y degrada explícitamente en 2.1–2.3.

El índice Benchmark es semánticamente idéntico entre 2.3 y 2.4; por ello su motor amplía exclusivamente la allowlist de compatibilidad a ambas revisiones. Esta decisión no modifica fórmulas, pairing, elegibilidad, datos ni claims.

`historyContext` se deriva del mismo `scenarioContext`, pero mantiene filtros, selección y revisión locales. Los filtros no mutan ni recomponen el escenario; distrito, alcance y reset sí recomponen la cadena derivada una sola vez. La vista futura debe consumir esta proyección y queda prohibido que reconstruya reglas desde `payload.history` o campos legacy.
