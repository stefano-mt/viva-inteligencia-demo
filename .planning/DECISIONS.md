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
