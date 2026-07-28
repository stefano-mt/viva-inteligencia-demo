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
