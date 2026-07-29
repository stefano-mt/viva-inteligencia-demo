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
