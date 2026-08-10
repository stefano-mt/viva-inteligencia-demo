# Fase 6 — Plan de narrativa comercial, accesibilidad y QA

**Estado:** P6-15 `PASS WITH RISKS` sobre `a94f251`; P6-15A completado y G1–G5 cerrados. P6-14 continúa `PENDING/DEFERRED` por D-042 y se ejecutará en P6-20.

**Rama:** `feat/phase-6-commercial-narrative-qa`.

**Base:** `25300b1f7f3669fd1f5cc66567a589b69dcb93c2`.

## 1. Objetivo y Definition of Done

Fase 6 convierte los módulos verificados de F1–F5 en un recorrido ejecutivo de seis etapas, reduce densidad sin perder evidencia y cierra la demo con un ensayo humano reproducible.

La fase termina solo si:

1. HU-DEMO-103/104/801–804 cumplen todos sus criterios;
2. las seis etapas consumen selectores/motores autoritativos y pasan paridad con la vista experta;
3. las ocho rutas expertas permanecen accesibles y compatibles;
4. reinicio, deep-link, recarga y atrás/adelante son deterministas;
5. CT-A–I y CT-P no sufren regresiones;
6. 14 superficies (6 etapas + 8 rutas) pasan smoke/a11y en 3 viewports;
7. 2.0 degrada globalmente y 2.1–2.4 respetan capacidades/estados sin `NaN`, infinito o datos obsoletos;
8. zoom 200%, teclado, contraste, densidad y red externa pasan;
9. un checker independiente emite un veredicto técnico; mientras el ensayo esté diferido, su máximo es `PASS WITH RISKS` por `R6-H1`;
10. Pages se verifica después del merge y el resultado se persiste en PR documental separado;
11. en P6-20, un lector humano nuevo completa el guion en ≤10 minutos y explica los cinco claims de `CONTEXT.md`;
12. solo el `PASS` de P6-20 habilita `ready for client` y `deployed and verified`.

## 2. Historias y criterios de aceptación

### HU-DEMO-103 — Estados vacíos e insuficientes

- Hay fixtures/resultados para carga, error global, 2.0, 2.1, 2.2, 2.3, 2.4 y vacío/insuficiente de cada etapa.
- 2.0 muestra `contract_unavailable`; 2.1 habilita escala/geografía; 2.2 suma calidad; 2.3 suma profundidad; 2.4 suma movimiento/decisión.
- Un faltante no recupera datos de otro escenario ni muestra `NaN`, infinito o contenido obsoleto.
- La acción correctiva es operable y el límite permanece visible.

### HU-DEMO-104 — Ayuda contextual actualizada

- Las 6 etapas y 8 rutas explican propósito, acción, resultado, límite y siguiente paso.
- La ayuda abre con click y teclado y no depende de hover.
- El vocabulario comercial es coherente: publicado, orientativo, simulado, certificado, revisable y excluido.
- No hay ayudas obsoletas respecto del contrato 2.4.

### HU-DEMO-801 — Recorrido guiado

- `Recorrido ejecutivo` es visible al cargar la demo.
- Slugs: `scale`, `geography`, `quality`, `depth`, `movement`, `decision`.
- Cada etapa muestra pregunta, lectura, respaldo, límite, evidencia y CTA.
- Anterior/siguiente preservan escenario y mueven foco al título.
- Tipo 7 se rotula `Caso demostrativo transversal · Miraflores`; nunca contamina el escenario activo.
- El usuario abandona el recorrido hacia un módulo y vuelve mediante el mapeo canónico de `UI-SPEC.md`.

### HU-DEMO-802 — Reducción de densidad y jerarquía

- En 1280×720 se ven pregunta, lectura, límite y CTA primario.
- Hay una sola acción primaria de alto contraste por etapa.
- No hay más de tres resúmenes en una fila; móvil usa una columna.
- Evidencia extensa usa divulgación progresiva o módulo experto.
- Procedencia, denominador, exclusión y limitación no se eliminan.
- Ningún texto crítico se trunca o fragmenta palabra por palabra.

### HU-DEMO-803 — Reinicio y reproducibilidad

- Ruta, escenario y etapa tienen representación canónica en URL.
- Recarga reproduce etapa y subconjunto; atrás/adelante recorre URLs reales.
- `Reiniciar` ejecuta toda la matriz de reset de `UI-SPEC.md` y termina en `/#journey/scale` con foco en su `h1`.
- Consultas del asistente siguen solo en memoria; no se usa localStorage, cookie, telemetría o red externa.

### HU-DEMO-804 — Navegación orientada a venta

- El sidebar separa `Recorrido` de `Explorar análisis`.
- La etapa actual usa texto, número y `aria-current`.
- Los CTA nombran el resultado siguiente.
- Las ocho rutas expertas siguen accesibles en máximo dos interacciones.
- La navegación móvil conserva foco, Escape y retorno al control de apertura.

## 3. Supuestos para aprobación

| ID | Supuesto |
|---|---|
| A1 | GitHub Pages estático; sin servicios externos. |
| A2 | Contrato 2.4, dataset, writer, hashes y elegibilidad quedan protegidos. |
| A3 | `Recorrido ejecutivo` es la entrada comercial principal; los módulos son exploración experta. |
| A4 | `/` sin hash abre `#journey/scale`; `#dashboard` y deep-links existentes siguen válidos. |
| A5 | La secuencia es escala, geografía, calidad, profundidad, movimiento y decisión. |
| A6 | La etapa se serializa en hash y el escenario conserva query canónica; no hay progreso persistido. |
| A7 | Una acción primaria y máximo tres resúmenes antes del detalle. |
| A8 | Tipo 7 es un caso transversal de Miraflores, independiente del escenario activo y de sus agregados. |
| A9 | Los ocho módulos permanecen disponibles y no pierden evidencia ni controles. |
| A10 | Se preservan paleta Viva, logo y tipografías locales; sin librería visual nueva. |
| A11 | HU-DEMO-505/exportación continúa fuera de alcance. |
| A12 | El ensayo humano nuevo de ≤10 minutos es bloqueante para aceptación final; D-042 lo difiere a P6-20 y permite continuar P6-15–P6-19. |
| A13 | HUMAN-GATE-B no puede aceptar un claim falso o una regresión Must. |

## 4. Autoridad, compatibilidad y paridad

La matriz vinculante está en `CONTEXT.md`. El recorrido no recalcula cifras: usa `state.scenarioContext`, `state.geographyArtifact`, el caso F3, `state.benchmarkContext`, `buildComparisonModel`, `state.historyContext` y `buildAssistantResponse`.

Cada etapa debe probar:

1. igualdad de valor, denominador, estado y referencia con su superficie experta;
2. escenario estable al navegar;
3. ausencia de recomputación paralela;
4. fallback de capacidad por contrato;
5. vacío/insuficiente específico con CTA correctivo.

La cifra 184 identifica registros modelados; 30/22/5 son niveles anidados del piloto. No se suman ni se presentan como universos equivalentes.

## 5. Protegidos y disciplina de escritura

Protegidos por defecto:

- `contracts/demo-v2.schema.json`;
- `scripts/build-demo-data.js` y `scripts/data/*`;
- `public/demo-data/*`;
- `datos_relevantes/*`;
- assets/evidencia F3–F5;
- `.github/workflows/deploy-pages.yml`.

Modificar un protegido exige enmienda técnica y aprobación humana. `domain.js`, `app.js`, `state.js`, `controller.js`, `navigation.js`, `styles.css`, `50-views.css` y `90-responsive.css` tienen escritor único por tarea. Ninguna tarea paralela comparte `write_set`.

## 6. Olas

- **Wave 6.0:** P6-00A–D, plan, revisión, gate y baseline.
- **Wave 6.1:** P6-01–05, catálogo, URL, shell, estado y ayuda.
- **Wave 6.2:** P6-06–09, extracción CSS serial y vistas con propietarios disjuntos.
- **Wave 6.3:** P6-10–15, reset, integración, E2E, responsive, preparación del ensayo y checker técnico; P6-14 queda `DEFERRED` por D-042.
- **Wave 6.4:** P6-16–20, handoff, merge, post-merge, persistencia y testing humano integral final.

## 7. Secuencia atómica y write sets cerrados

### P6-00A — Diagnóstico y plan

**Write set:** `CONTEXT.md`, `UX-AUDIT.md`, `UI-SPEC.md`, `PLAN.md`, `HUMAN-GATE-A-REQUEST.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`.

**DoD:** cero runtime modificado; baseline, autoridad y supuestos explícitos.

### P6-00B — Revisión estructural independiente

**Write set:** `PLAN_REVIEW.md`.

**DoD:** checker independiente revisa criterios, fuentes, compatibilidad, write sets, reset, rehearsal y rollback. Todo `FAIL` se corrige y se repite.

### P6-00C — HUMAN-GATE-A

**Write set posterior al texto humano:** `APPROVAL.md`, `DECISIONS.md`, `.planning/STATE.md`.

**DoD:** A1–A13 aceptados o enmendados textualmente; no inicia runtime antes.

### P6-00D — Baseline reproducible

**Write set:** `BASELINE_BROWSER.md`, `evidence/baseline/*`.

**Checks:** `npm.cmd run verify`; 8 rutas × 3 viewports; navegación, densidad, consola y red.

### P6-01 — Catálogo puro del recorrido

**Write set:** `prototipo_ejecutable/public/js/journey.js`, `prototipo_ejecutable/public/js/config.js`, `prototipo_ejecutable/tests/journey-domain.mjs`, `prototipo_ejecutable/tests/module-graph.mjs`, `prototipo_ejecutable/package.json`.

**Protegidos:** estado, shell, vistas, estilos y datos.

**DoD:** seis etapas, matriz `module→canonicalReturnStage`, `stage→expertLinks`, fuentes y capacidades por versión; tests primero.

### P6-02 — Navegación y URL

**Write set:** `prototipo_ejecutable/public/js/navigation.js`, `prototipo_ejecutable/tests/journey-navigation.mjs`, `prototipo_ejecutable/tests/scenario-e2e.mjs`, `prototipo_ejecutable/package.json`.

**DoD:** `#journey/<stage>`, `/`, aliases, deep-links inválidos, query, recarga y back/forward verificados.

### P6-03 — Vista y shell del recorrido

**Write set:** `prototipo_ejecutable/public/app.js`, `prototipo_ejecutable/public/js/views/journey.js`, `prototipo_ejecutable/public/js/views/index.js`, `prototipo_ejecutable/public/styles.css`, `prototipo_ejecutable/public/styles/20-shell.css`, `prototipo_ejecutable/public/styles/61-journey.css`, `prototipo_ejecutable/tests/journey-view.mjs`, `prototipo_ejecutable/tests/journey-shell.mjs`, `prototipo_ejecutable/package.json`.

**DoD:** entrada, rail, un `h1`, CTA, acceso experto y estados base; solo esta tarea importa `61-journey.css`.

### P6-04 — Estado, adaptadores y foco

**Write set:** `prototipo_ejecutable/public/js/state.js`, `prototipo_ejecutable/public/js/controller.js`, `prototipo_ejecutable/public/js/journey.js`, `prototipo_ejecutable/tests/journey-state.mjs`, `prototipo_ejecutable/tests/journey-parity.mjs`, `prototipo_ejecutable/package.json`.

**DoD:** adaptadores consumen motores vigentes sin recomputar; paridad de 6 etapas; foco/anuncio correctos; Tipo 7 transversal no altera escenario. Decisión reproduce literalmente `state.assistantResponse` si existe; si es nula muestra checklist + CTA y `journey-parity.mjs` demuestra que no invoca `buildAssistantResponse`.

### P6-05 — Ayuda contextual y handoff

**Write set:** `prototipo_ejecutable/public/js/domain.js`, `prototipo_ejecutable/public/js/views/guidance.js`, `prototipo_ejecutable/public/js/config.js`, `prototipo_ejecutable/public/styles/30-components.css`, `prototipo_ejecutable/tests/journey-guidance.mjs`, `prototipo_ejecutable/package.json`.

**DoD:** propósito, acción, resultado, límite y siguiente paso para 6+8; retorno canónico; no hover-only.

### P6-06 — Extracción CSS serial sin cambio visual

**Write set:** `prototipo_ejecutable/public/styles.css`, `prototipo_ejecutable/public/styles/50-views.css`, `prototipo_ejecutable/public/styles/62-projects.css`, `prototipo_ejecutable/public/styles/63-checklist.css`, `prototipo_ejecutable/tests/style-ownership.mjs`, `prototipo_ejecutable/tests/browser-smoke.mjs`, `prototipo_ejecutable/package.json`.

**DoD:** selectores de proyectos/checklist se mueven mecánicamente; manifest importa 62/63 una vez; smoke de ocho rutas demuestra paridad visual/funcional. Es serial y precede cualquier paralelismo de vistas.

### P6-07 — Escala y geografía

**Write set:** `prototipo_ejecutable/public/js/views/dashboard.js`, `prototipo_ejecutable/public/js/views/market.js`, `prototipo_ejecutable/public/styles/50-views.css`, `prototipo_ejecutable/public/styles/56-benchmark.css`, `prototipo_ejecutable/tests/journey-scale-geography.mjs`.

**DoD:** escala distingue 184 de 30/22/5; mapa/conteos derivan escenario; paridad y fallbacks 2.0–2.4.

### P6-08 — Calidad y profundidad (paralelo tras P6-06)

- **A Inspector:** `public/js/views/inspector.js`, `public/styles/55-inspector.css`, `tests/journey-quality.mjs`.
- **B Proyectos:** `public/js/views/projects.js`, `public/styles/62-projects.css`, `tests/journey-projects-handoff.mjs`.
- **C Comparador:** `public/js/views/compare.js`, `public/styles/57-comparison.css`, `tests/journey-depth.mjs`.

Todos los paths se resuelven bajo `prototipo_ejecutable/`.

**DoD:** Tipo 7 transversal e inequívoco; conclusión antes del detalle; evidencia accesible; write sets disjuntos.

### P6-09 — Movimiento y decisión (paralelo tras P6-06)

- **A Actividad:** `public/js/views/activity.js`, `public/styles/58-history-signals.css`, `tests/journey-movement.mjs`.
- **B Asistente:** `public/js/views/assistant.js`, `public/styles/59-assistant.css`, `tests/journey-decision.mjs`.
- **C Checklist:** `public/js/views/checklist.js`, `public/styles/63-checklist.css`, `tests/journey-checklist-handoff.mjs`.

Todos los paths se resuelven bajo `prototipo_ejecutable/`.

**DoD:** señal→asistente→checklist con handoffs explícitos; CT-E/F y privacidad intactos; write sets disjuntos.

### P6-10 — Reinicio y reproducibilidad

**Write set:** `prototipo_ejecutable/public/js/state.js`, `prototipo_ejecutable/public/js/controller.js`, `prototipo_ejecutable/public/js/navigation.js`, `prototipo_ejecutable/tests/journey-reset.mjs`, `prototipo_ejecutable/tests/journey-navigation.mjs`, `prototipo_ejecutable/package.json`.

**DoD:** ejecuta exhaustivamente la matriz de `UI-SPEC.md`; URL final `/#journey/scale`; foco en `h1`; historial no revive estado; consultas no persisten. El reset restaura `project:nexo-2951`, `typology:pardo-coast-tipo-7` y `case:f3-ct-g-pardo`, y `journey-reset.mjs` demuestra que el dossier Tipo 7 queda disponible con evidencia/diálogo cerrados.

### P6-11 — Compatibilidad e integración

**Write set:** `prototipo_ejecutable/tests/phase6-fixtures.mjs`, `prototipo_ejecutable/tests/phase6-integral-e2e.mjs`, `prototipo_ejecutable/tests/e2e-scenarios/ct-a-journey.json`, `prototipo_ejecutable/tests/e2e-scenarios/ct-b-journey.json`, `prototipo_ejecutable/tests/e2e-scenarios/ct-c-journey.json`, `prototipo_ejecutable/tests/e2e-scenarios/ct-d-journey.json`, `prototipo_ejecutable/tests/e2e-scenarios/ct-e-journey.json`, `prototipo_ejecutable/tests/e2e-scenarios/ct-f-journey.json`, `prototipo_ejecutable/tests/e2e-scenarios/ct-g-journey.json`, `prototipo_ejecutable/tests/e2e-scenarios/ct-h-journey.json`, `prototipo_ejecutable/tests/e2e-scenarios/ct-i-journey.json`, `prototipo_ejecutable/tests/e2e-scenarios/ct-p-journey.json`, `prototipo_ejecutable/tests/browser-smoke.mjs`, `prototipo_ejecutable/tests/browser-a11y.mjs`, `prototipo_ejecutable/package.json`.

**DoD:** loading, error, 2.0–2.4, vacíos por etapa, HU 103/104/801–804, CT-A–I/P y 8 rutas pasan; cero `NaN`/infinito.

### P6-12 — E2E de narrativa UI-only

**Write set:** `prototipo_ejecutable/tests/journey-e2e.mjs`, `.planning/phases/06-commercial-narrative-qa/evidence/functional/*`.

**DoD:** seis etapas, mapa, Tipo 7, comparador, señal, asistente, checklist, salida/retorno experto y paridad; cero consulta al código durante el recorrido.

### P6-13 — Responsive, contraste y zoom 200%

**Write set:** `prototipo_ejecutable/public/styles/90-responsive.css`, `prototipo_ejecutable/tests/phase6-responsive.mjs`, `prototipo_ejecutable/tests/browser-a11y.mjs`, `.planning/phases/06-commercial-narrative-qa/evidence/responsive/*`, `prototipo_ejecutable/package.json`.

**DoD:** 14 superficies × 3 viewports, 200%, teclado, foco, 44×44, AA, reduced motion, cero overflow/solape/truncamiento.

### P6-14 — Ensayo comercial humano (`PENDING/DEFERRED` por D-042)

**Write set:** `.planning/phases/06-commercial-narrative-qa/COMMERCIAL_REHEARSAL.md`, `.planning/phases/06-commercial-narrative-qa/evidence/rehearsal/*`.

**Protocolo conservado:** lector que no participó en implementación; copia limpia del SHA candidato; registrar SHA, comando, origen limpio y URL exacta. Prompt: `Explora la demo y prepara una recomendación comercial prudente para el escenario visible. Avísame cuando puedas justificarla.` El maker no explica controles ni contenido. D-042 traslada la ejecución a P6-20 sobre Pages y su SHA desplegado; no convierte este paso en `PASS`.

**Respuestas esperadas:** cobertura/denominadores; alcance geográfico; exclusión Tipo 7; diferencia respaldada; cambio observado y límite de causalidad.

**Claims prohibidos:** precio de cierre; causalidad no observada; exhaustividad del mercado; certificación de una fuente no certificada; mezclar 184 con 30/22/5; presentar Tipo 7 como parte del escenario activo.

**Rúbrica de aceptación final:** ≤10:00; 5/5 respuestas correctas; 0 claims prohibidos; 0 ayudas del maker; completa mapa, evidencia Tipo 7 y decisión. Evidencia: grabación/capturas, cronómetro, respuestas textuales y rubricado firmado. Cada repetición usa un lector nuevo.

P6-18 repite el recorrido crítico sobre la URL pública de Pages y verifica que su SHA desplegado coincide con el merge.

### P6-15 — Verificación formal independiente

**Estado:** `PASS WITH RISKS` sobre `a94f251`; único riesgo residual `R6-H1`, aceptado y diferido a P6-20.

**Write set:** `.planning/phases/06-commercial-narrative-qa/VERIFICATION_REPORT.md`, `.planning/phases/06-commercial-narrative-qa/evidence/verification/*`.

**Checks:** `npm.cmd run verify`, Graphify, diff/write sets, E2E, responsive, paridad, evidencia automática y consistencia del paquete `PENDING/DEFERRED`. No se simula ni sustituye el ensayo humano.

**DoD:** `PASS WITH RISKS` por el riesgo aceptado `R6-H1` si todo lo técnico pasa y el único pendiente es P6-20; `FAIL` si existe cualquier gap técnico. Un riesgo adicional conserva HUMAN-GATE-B separado.

### P6-15A — Correctivo de paridad DOM ↔ estado

**Estado:** completado en `8740182` y `a94f251`; G1–G5 cerrados, gate integral y contraste adversarial independientes en PASS.

**Plan vinculante:** `P6-15A-CORRECTIVE-PLAN.md`.

**DoD:** la vista consume la etapa materializada de `state.journeyContext`, presenta datos/estados/acciones correctivas sin recomputar y una regresión adversarial impide el split-brain. Después se repite P6-15 completo con checker independiente.

### P6-16 — Memoria, handoff y PR funcional

**Write set:** `SUMMARY.md`, `HANDOFF.md`, `.planning/STATE.md`, commits atómicos y cuerpo del PR.

### P6-17 — Merge humano

**DoD:** revisión y merge exclusivamente por el usuario.

### P6-18 — Verificación post-merge

**Write set:** ninguno en `main`; verificación read-only de Pages, SHA, 14 superficies, recorrido crítico, red y consola.

### P6-19 — Persistencia post-merge

**Write set en rama documental separada:** `POSTMERGE_REPORT.md`, `.planning/STATE.md`, `.planning/ROADMAP.md`, evidencia post-merge. Tras merge humano de ese PR, F6 queda `deployed and technically verified; human acceptance pending`.

### P6-20 — Testing humano integral final

**Write set en rama documental separada:** `COMMERCIAL_REHEARSAL.md`, `evidence/rehearsal/run-AAAA-MM-DD-alias/*`, `FINAL_HUMAN_ACCEPTANCE.md`, `.planning/STATE.md`, `.planning/ROADMAP.md`.

**Protocolo:** lector nuevo e independiente; URL pública de Pages; SHA completo idéntico al merge desplegado; prompt y rúbrica de `COMMERCIAL_REHEARSAL.md`; sin ayuda del maker; evidencia consentida, mínima y no destructiva.

**DoD:** `PASS` humano reproducible. `FAIL` o `INVALID` reabre el ciclo correctivo y mantiene bloqueadas las declaraciones `ready for client` y `deployed and verified`.

## 8. Matriz de verificación

| Capa | Actividad | Evidencia |
|---|---|---|
| Sintaxis/arquitectura | `npm.cmd run check`, module graph, Graphify | logs y conteos |
| Dominio | journey/state/navigation/parity | tests unitarios |
| Compatibilidad | carga/error, 2.0–2.4 y vacíos por etapa | fixtures/resultados |
| Integración | 6 etapas + 8 rutas + CT-A–I/P | E2E UI-only |
| Narrativa técnica | cinco claims, límites, prohibiciones y paquete pendiente íntegro | P6-15 |
| Aceptación humana | recorrido público, cinco claims, límites y prohibiciones | P6-20 |
| Visual | 1440×900, 1280×720, 390×844, 200% | capturas portables |
| Accesibilidad | teclado, foco, landmarks, AA, reduced motion | pruebas + revisión |
| Privacidad/red | consultas en memoria, 0 hosts externos | scanner y navegador |
| Ship | SHA merge = workflow = Pages | informe post-merge |

## 9. Rollback verificable

### Rollback parcial antes del merge

Revertir la tarea atómica que falla, retirar sus imports/registro si aplica y ejecutar `npm.cmd run verify`, `browser-smoke.mjs`, `browser-a11y.mjs` y las ocho rutas expertas. El journey no puede quedar apuntando a una etapa incompleta: se deshabilita el enlace o se revierte el catálogo de esa etapa en el mismo rollback.

### Rollback funcional después del merge

Revertir el PR funcional completo para restaurar `/`→`#dashboard` y retirar catálogo/vista/estilos del recorrido, sin tocar contrato, datos o motores. Volver a desplegar, confirmar SHA de Pages y repetir smoke/a11y de las ocho rutas. La persistencia documental registra causa, SHA revertido, SHA desplegado y resultado.

Ningún rollback puede ocultar evidencia, relajar tests o conservar enlaces rotos.

## 10. Condiciones de parada

- cambio de contrato/dataset no aprobado;
- nueva fuente externa, telemetría o persistencia;
- cifra del recorrido distinta de su vista experta;
- pérdida de un deep-link existente;
- claim comercial sin evidencia;
- colisión de write sets;
- ensayo humano final fallido o inválido sin hipótesis correctiva;
- tres fallos consecutivos del mismo gate sin causa nueva.
