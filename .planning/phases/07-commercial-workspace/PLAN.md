# Fase 7 — Plan del workspace comercial simplificado

**Estado:** `PLANNED — awaiting independent plan review and HUMAN-GATE-A`.

**Rama:** `feat/phase-7-commercial-workspace`.

**Base:** `6251442f989df26d5589cadbafa5f13ccaf19e8c`.

## 1. Objetivo y Definition of Done

Fase 7 reduce el tiempo de orientación y escaneo de la demo sin alterar sus resultados. La fase termina cuando:

1. HU-DEMO-805–810 cumplen todos sus criterios;
2. el rail prioriza cinco trabajos y conserva cuatro herramientas expertas en máximo dos interacciones;
3. el escenario activo permanece visible y su editor está cerrado por defecto;
4. cada ruta muestra lectura/trabajo antes que ayuda, metodología o detalle;
5. proyectos, señales, evidencia y checklist usan filas en lugar de grids de cards;
6. una sola acción primaria domina cada viewport;
7. `Ctrl+K` navega un catálogo local y accesible, sin simular búsqueda de datos;
8. seis etapas, ocho rutas, deep-links, reset y compatibilidad 2.0–2.4 permanecen intactos;
9. CT-A–I/P, privacidad, determinismo y cero red externa pasan;
10. 14 superficies pasan 1440×900, 1280×720, 390×844 y 200%;
11. un checker independiente emite `PASS` o un riesgo explícitamente aceptado;
12. el PR es revisado y fusionado por el usuario; Pages coincide con el SHA fusionado.

## 2. Historias y criterios de aceptación

### HU-DEMO-805 — Navegación por tareas

- Cinco destinos primarios: Recorrido, Panorama, Proyectos, Decidir y Seguimiento.
- Cuatro rutas en `Profundizar`, abiertas automáticamente si una está activa.
- Cualquier ruta experta es alcanzable en máximo dos interacciones desde desktop y móvil.
- La etiqueta activa usa texto y `aria-current`, no solo color.
- Deep-links `#dashboard`, `#projects`, `#inspector`, `#market`, `#compare`, `#trust`, `#assistant`, `#activity` siguen válidos.

### HU-DEMO-806 — Escenario compacto y editable

- Distrito, alcance y comparables se reconocen con el editor cerrado.
- `Cambiar escenario` abre todos los controles vigentes sin duplicar estado.
- Aplicar un cambio actualiza URL y consumidores una sola vez.
- Escape/cerrar devuelve foco al disparador.
- Reinicio mantiene el contrato canónico de Fase 6.
- Móvil usa diálogo/hoja sin overflow y con foco atrapado.

### HU-DEMO-807 — Lectura principal inmediata

- Cada ruta tiene un `h1`, propósito breve y lectura principal.
- En 1280×720 aparecen escenario, lectura y comienzo de la superficie operativa.
- Ninguna ruta prioritaria antepone simultáneamente hero, guía y resumen.
- Máximo tres métricas antes del trabajo principal.
- Las limitaciones que cambian la interpretación permanecen visibles.

### HU-DEMO-808 — Listas operativas compactas

- Proyectos y señales se representan como filas comparables.
- Inspector y checklist usan ledgers de evidencia/requisitos.
- Comparador y benchmark presentan diferencias como filas agrupadas.
- Toda fila interactiva funciona con teclado y comunica selección/estado.
- Móvil conserva valores críticos y pasa a una composición vertical legible.

### HU-DEMO-809 — Detalle bajo demanda

- `Ayuda` abre propósito, pasos, resultado, límite y siguiente destino.
- Metodología, referencias extensas y atributos secundarios parten cerrados.
- Abrir/cerrar no cambia escenario, filtros ni selección.
- Ningún claim, denominador, exclusión o referencia autoritativa desaparece del DOM alcanzable.
- Estados vacío/insuficiente/error conservan su acción correctiva.

### HU-DEMO-810 — Acceso rápido por teclado

- `Ctrl+K`/`Cmd+K` abre `Ir a…` fuera de campos editables.
- Catálogo contiene exactamente los destinos visibles y sus sinónimos aprobados.
- Flechas, Enter, Escape y Tab son deterministas.
- Cerrar devuelve foco al disparador.
- No persiste consultas, no modifica URL hasta navegar y no realiza red.
- El diálogo explica que navega secciones; no promete búsqueda de datos.

## 3. Supuestos para aprobación

| ID | Supuesto |
|---|---|
| A1 | La fase es exclusivamente UX/UI y navegación; contrato, datos y motores quedan protegidos. |
| A2 | Se conserva `/` → `#journey/scale` y el recorrido de seis etapas. |
| A3 | El rail primario usa Recorrido, Panorama, Proyectos, Decidir y Seguimiento. |
| A4 | Inspector, Benchmark, Comparador y Checklist se agrupan bajo `Profundizar`. |
| A5 | Las rutas expertas permanecen accesibles en máximo dos interacciones. |
| A6 | El escenario se resume en el shell y el editor completo queda cerrado por defecto. |
| A7 | `Ctrl+K` implementa solo navegación local y puede retirarse si no pasa accesibilidad. |
| A8 | Se adopta `Viva Decision Desk`, sin copiar identidad visual de las capturas. |
| A9 | Proyectos y señales pasan a filas; evidencia, requisitos y diferencias usan ledgers. |
| A10 | Una acción primaria y máximo tres métricas gobiernan la primera pantalla. |
| A11 | Ayuda/metodología se compactan, pero límites y claims críticos permanecen visibles. |
| A12 | No se añaden dependencias, fuentes externas, backend, telemetría o persistencia. |
| A13 | La UAT humana no forma parte de Fase 7 salvo nueva instrucción explícita. |
| A14 | El usuario conserva merge y despliegue; ningún agente fusiona automáticamente. |

## 4. Protegidos

Protegidos por defecto:

- `prototipo_ejecutable/contracts/*`;
- `prototipo_ejecutable/scripts/build-demo-data.js` y `scripts/data/*`;
- `prototipo_ejecutable/public/demo-data/*`;
- `datos_relevantes/*`;
- `prototipo_ejecutable/public/js/*-engine.js`;
- semántica de `state.js`, `navigation.js` y reset, salvo adaptaciones de presentación aprobadas;
- assets de evidencia;
- `.github/workflows/deploy-pages.yml`.

Modificar un protegido exige enmienda técnica, justificación, aprobación explícita y repetición integral.

## 5. Olas

- **Wave 7.0:** P7-00A–D — diagnóstico, especificación, revisión, aprobación y baseline.
- **Wave 7.1:** P7-01–03 — primitives, shell/escenario y navegación rápida.
- **Wave 7.2:** P7-04–07 — simplificación de recorrido y ocho rutas.
- **Wave 7.3:** P7-08–10 — integración, responsive/a11y y verificación independiente.
- **Wave 7.4:** P7-11–14 — memoria, PR, merge y post-merge.

## 6. Secuencia atómica y write sets

### P7-00A — Contexto, auditoría y diseño

**Write set:** `CONTEXT.md`, `UX-AUDIT.md`, `UI-SPEC.md`, `PLAN.md`, `HUMAN-GATE-A-REQUEST.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`.

**DoD:** diagnóstico visual/DOM, presupuesto, dirección, historias, riesgos y tareas explícitos; cero runtime modificado.

### P7-00B — Revisión estructural independiente

**Write set:** `PLAN_REVIEW.md`.

**Checks:** alcance, claims protegidos, rutas, accesibilidad, write sets, pruebas, rollback y coherencia con Fase 6.

**DoD:** `PASS`; cualquier P0–P2 corrige plan y repite revisión.

### P7-00C — HUMAN-GATE-A

**Write set posterior a la aprobación:** `APPROVAL.md`, `.planning/DECISIONS.md`, `.planning/STATE.md`.

**DoD:** A1–A14 aceptados o enmendados textualmente. Ningún runtime cambia antes.

### P7-00D — Baseline reproducible

**Write set:** `BASELINE_BROWSER.md`, `evidence/baseline/*`.

**Checks:** `npm.cmd run verify`; 14 superficies en 1440/1280/390; screenshot, DOM, consola, red, foco, orden de lectura y conteo de acciones.

**DoD:** baseline vinculada al SHA, métricas y evidencia portable.

### P7-01 — Primitives y presupuestos visuales

**Write set:** `public/styles/00-tokens.css`, `10-base.css`, `30-components.css`, `styles.css`, `tests/commercial-density.mjs`, `tests/style-ownership.mjs`, `package.json` bajo `prototipo_ejecutable/`.

**DoD:** tipografía, spacing, filas, toolbar, decision-line, disclosures y action hierarchy disponibles; no cambia una vista todavía; ownership CSS y sintaxis pasan.

### P7-02 — Shell y escenario compacto

**Write set:** `public/app.js`, `public/js/views/scenario-context.js`, `public/styles/20-shell.css`, `25-scenario-context.css`, `tests/commercial-shell.mjs`, `tests/scenario-e2e.mjs`, `package.json`.

**DoD:** rail ≤248 px, topbar ≤72 px, cinco destinos, grupo Profundizar, escenario resumido/editor, móvil/foco/reset/deep-links verificados.

### P7-03 — Paleta local `Ir a…`

**Write set:** `public/app.js`, `public/js/config.js`, `public/js/controller.js`, `public/js/views/command-menu.js`, `public/js/views/index.js`, `public/styles.css`, `public/styles/64-command-menu.css`, `tests/command-menu.mjs`, `tests/module-graph.mjs`, `package.json`.

**DoD:** catálogo cerrado, filtro local, teclado, diálogo, retorno de foco, cero persistencia/red; si falla accesibilidad se retira atómicamente.

### P7-04 — Recorrido y Panorama

**Write set:** `public/js/views/journey.js`, `public/js/views/dashboard.js`, `public/styles/50-views.css`, `61-journey.css`, `tests/commercial-journey-dashboard.mjs`, `package.json`.

**DoD:** pregunta/lectura/límite/CTA y mapa aparecen antes del detalle; paridad de seis etapas y Radar intacta; formulario y metodología progresivos.

### P7-05 — Proyectos por filas

**Write set:** `public/js/views/projects.js`, `public/styles/62-projects.css`, `tests/commercial-projects.mjs`, `tests/projects-browser.mjs`, `package.json`.

**DoD:** toolbar compacta, lista semántica, selección y detalle; precio/área/estado/score legibles; filtros, límite, orden y deep-link preservados.

### P7-06 — Inspector, Benchmark y Comparador

Subtareas separables solo con write sets disjuntos:

- **A Inspector:** `views/inspector.js`, `styles/55-inspector.css`, `tests/commercial-inspector.mjs`.
- **B Benchmark:** `views/market.js`, `styles/56-benchmark.css`, `tests/commercial-benchmark.mjs`.
- **C Comparador:** `views/compare.js`, `styles/57-comparison.css`, `tests/commercial-compare.mjs`.

**DoD:** conclusión primero, ledgers por filas, evidencia progresiva; Tipo 7, denominadores, referencias y comparación vacía sin cambios.

### P7-07 — Asistente, Checklist y Señales

Subtareas separables solo con write sets disjuntos:

- **A Asistente:** `views/assistant.js`, `styles/59-assistant.css`, `tests/commercial-assistant.mjs`.
- **B Checklist:** `views/checklist.js`, `styles/63-checklist.css`, `tests/commercial-checklist.mjs`.
- **C Señales:** `views/activity.js`, `styles/58-history-signals.css`, `tests/commercial-activity.mjs`.

**DoD:** consulta primero, requisitos/señales en filas, agenda antes del detalle; seis bloques, causa nula, privacidad y CT-E/F sin cambios.

### P7-08 — Integración y regresiones

**Write set:** `tests/commercial-workspace-e2e.mjs`, `tests/browser-smoke.mjs`, `tests/browser-a11y.mjs`, `tests/journey-dom-parity.mjs`, `package.json`.

**DoD:** 6+8 rutas, 2.0–2.4, CT-A–I/P, deep-link, reset, historial, asistente, escenario y paleta pasan; cero `NaN`, infinito, red o persistencia.

### P7-09 — Responsive, contraste y zoom 200%

**Write set:** `public/styles/90-responsive.css`, `tests/phase7-responsive.mjs`, `tests/browser-a11y.mjs`, `evidence/responsive/*`, `package.json`.

**DoD:** 14 superficies × 3 viewports, 200%, teclado, foco, 44×44, AA, reduced motion, cero overflow/solape/truncamiento crítico; criterios visuales de `UI-SPEC.md` medidos.

### P7-10 — Verificación formal independiente

**Write set:** `VERIFICATION_REPORT.md`, `evidence/verification/*`.

**Checks:** suite integral, browser adversarial, Graphify, diff/write sets, paridad DOM↔estado, datos/claims protegidos, responsive y evidencia.

**DoD:** `PASS`; `PASS WITH RISKS` requiere HUMAN-GATE-B; `FAIL` reabre correctivo.

### P7-11 — Memoria y PR funcional

**Write set:** `SUMMARY.md`, `HANDOFF.md`, `.planning/STATE.md`.

**DoD:** commits atómicos, rama publicada, PR con alcance, pruebas, capturas, riesgos y rollback.

### P7-12 — Revisión y merge humano

**DoD:** usuario revisa evidencia, marca PR listo y fusiona. El agente no hace merge.

### P7-13 — Verificación post-merge

**Write set:** ninguno en `main`.

**DoD:** SHA merge = workflow = Pages; recorrido crítico, 14 superficies, consola y red pasan en URL pública.

### P7-14 — Persistencia post-merge

**Write set en rama documental separada:** `POSTMERGE_REPORT.md`, `.planning/STATE.md`, `.planning/ROADMAP.md`, `evidence/postmerge/*`.

**DoD:** resultado read-only persistido y PR documental fusionado por el usuario.

## 7. Matriz de verificación

| Capa | Actividad | Evidencia |
|---|---|---|
| Sintaxis/arquitectura | check, module graph, Graphify | logs y hubs |
| Navegación | cinco primarios, cuatro expertos, `Ctrl+K`, deep-links | tests + browser |
| Paridad | DOM contra estado/motores | tests de claims protegidos |
| Funcional | 6 etapas + 8 rutas + CT-A–I/P | E2E |
| Visual | 1440×900, 1280×720, 390×844, 200% | capturas y geometría |
| Accesibilidad | teclado, foco, landmarks, AA, dialog | tests + revisión |
| Densidad | presupuesto, primera pantalla, acciones | mediciones DOM/layout |
| Privacidad | 0 persistencia y 0 hosts externos | scanner + browser |
| Ship | merge SHA = workflow = Pages | informe post-merge |

Comando integral esperado:

```powershell
cd prototipo_ejecutable
npm.cmd run verify
```

## 8. Rollback

Cada tarea es revertible por commit. Si shell o paleta fallan, se revierte P7-02/P7-03 sin tocar las vistas. Si una ruta falla, se revierte únicamente P7-04/05/06/07 correspondiente y se repiten smoke, a11y y paridad. Después de merge, se revierte el PR funcional completo, se redespliega y se confirma el SHA público.

Ningún rollback puede conservar imports huérfanos, relajar pruebas, ocultar evidencia o cambiar datos.

## 9. Condiciones de parada

- cambio no aprobado en datos, contrato, motor o elegibilidad;
- pérdida de un claim, límite o referencia;
- ruta experta inaccesible o deep-link roto;
- escenario duplicado o cambio no serializado;
- más de una acción primaria dominante;
- overflow del documento o contenido crítico ilegible;
- paleta que persiste consultas o promete buscar datos;
- colisión de write sets;
- tres fallos consecutivos del mismo gate sin nueva hipótesis.
