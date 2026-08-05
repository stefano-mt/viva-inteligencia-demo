# Fase 6 — Plan de narrativa comercial, accesibilidad y QA

**Estado:** propuesto; bloqueado por HUMAN-GATE-A.

**Rama:** `feat/phase-6-commercial-narrative-qa`.

**Base:** `25300b1f7f3669fd1f5cc66567a589b69dcb93c2`.

## 1. Objetivo y Definition of Done

Fase 6 convierte los módulos verificados de F1–F5 en un recorrido ejecutivo de seis etapas, reduce densidad sin perder evidencia y cierra la demo con un ensayo humano reproducible.

La fase está terminada solo si:

1. HU-DEMO-103/104/801–804 cumplen todos sus criterios;
2. las seis etapas derivan cifras del escenario canónico;
3. las ocho rutas expertas permanecen accesibles y compatibles;
4. reinicio, deep-link, recarga y atrás/adelante son deterministas;
5. CT-A–I y CT-P no sufren regresiones;
6. 14 superficies (6 etapas + 8 rutas) pasan smoke/a11y en 3 viewports;
7. zoom 200%, teclado, contraste, densidad y red externa pasan;
8. un lector humano nuevo completa el guion en ≤10 minutos y explica los cinco claims de `CONTEXT.md`;
9. un checker independiente emite `PASS` o HUMAN-GATE-B acepta explícitamente riesgos;
10. Pages se verifica después del merge y el resultado se persiste en PR documental separado.

## 2. Historias y criterios de aceptación

### HU-DEMO-103 — Estados vacíos e insuficientes

- Cada etapa define carga, vacío, insuficiente, error y degradación legacy.
- Un faltante no recupera datos de otro escenario ni muestra `NaN`/infinito.
- La acción correctiva indica qué debe hacer el usuario.
- Un límite no se oculta al colapsar detalle.

### HU-DEMO-104 — Ayuda contextual actualizada

- Las seis etapas y ocho rutas explican propósito, acción, resultado, límite y siguiente paso.
- La ayuda abre con click y teclado y no depende de hover.
- El texto usa vocabulario comercial coherente: publicado, orientativo, simulado, certificado, revisable y excluido.
- No hay ayudas obsoletas respecto del contrato 2.4.

### HU-DEMO-801 — Recorrido guiado

- Existe una entrada `Recorrido ejecutivo` visible al cargar la demo.
- Hay seis slugs canónicos: `scale`, `geography`, `quality`, `depth`, `movement`, `decision`.
- Cada etapa muestra pregunta, lectura, respaldo, límite, evidencia y CTA.
- Anterior/siguiente preservan escenario y mueven foco al título.
- Mapa e inspector Tipo 7 son pasos explícitos, no enlaces accidentales.
- El usuario puede abandonar el recorrido hacia un módulo y volver a la etapa relacionada.

### HU-DEMO-802 — Reducción de densidad y jerarquía

- En 1280×720 la pregunta, lectura, límite y CTA primario de una etapa están visibles.
- Hay una sola acción primaria de alto contraste por etapa.
- No hay más de tres resúmenes en una fila; móvil usa una columna.
- Listas/metodología/evidencia extensa usan divulgación progresiva o módulo experto.
- No se elimina procedencia, denominador, exclusión o limitación.
- Ningún texto crítico se trunca o fragmenta palabra por palabra.

### HU-DEMO-803 — Reinicio y reproducibilidad

- Ruta, escenario y etapa tienen representación canónica en URL.
- Recarga reproduce la misma etapa y el mismo subconjunto.
- Atrás/adelante recorre etapas sin perder escenario.
- `Reiniciar` limpia filtros/selecciones/borradores y vuelve a la entrada canónica.
- Consultas del asistente siguen solo en memoria.
- No se usa localStorage, cookie, telemetría o red externa.

### HU-DEMO-804 — Navegación orientada a venta

- El sidebar separa `Recorrido` de `Explorar análisis`.
- La etapa actual se identifica con texto, número y `aria-current`.
- Los CTA nombran el resultado siguiente, no `Continuar` sin contexto.
- Las ocho rutas expertas siguen accesibles en máximo dos interacciones.
- La navegación móvil conserva foco, cierre por Escape y retorno al control de apertura.

## 3. Supuestos para aprobación

| ID | Supuesto |
|---|---|
| A1 | Fase 6 conserva GitHub Pages estático y no añade servicios externos. |
| A2 | Contrato 2.4, dataset, writer, hashes y elegibilidad quedan protegidos. |
| A3 | `Recorrido ejecutivo` es la entrada comercial principal; los módulos son exploración experta. |
| A4 | `/` sin hash abre `#journey/scale`; `#dashboard` y deep-links existentes siguen válidos. |
| A5 | Las seis etapas son escala, geografía, calidad, profundidad, movimiento y decisión. |
| A6 | La etapa se serializa en hash y el escenario conserva su query canónica; no hay progreso oculto persistido. |
| A7 | Cada etapa muestra una acción primaria y como máximo tres resúmenes antes del detalle. |
| A8 | Mapa e inspector Tipo 7 reciben máxima jerarquía dentro del guion. |
| A9 | Los ocho módulos permanecen disponibles y no pierden evidencia ni controles. |
| A10 | Se preservan paleta Viva, logo y tipografías locales; no se carga una librería visual nueva. |
| A11 | HU-DEMO-505/exportación continúa fuera de alcance. |
| A12 | El ensayo humano nuevo de ≤10 minutos es bloqueante para el ship de Fase 6. |
| A13 | HUMAN-GATE-B solo puede aceptar riesgos explícitos; no puede ocultar un claim falso o una regresión Must. |

## 4. Arquitectura y archivos protegidos

### Protegidos por defecto

- `contracts/demo-v2.schema.json`;
- `scripts/build-demo-data.js` y `scripts/data/*`;
- `public/demo-data/*`;
- `datos_relevantes/*`;
- assets/evidencia de F3–F5;
- `.github/workflows/deploy-pages.yml`.

Modificar un protegido exige enmienda técnica y aprobación humana explícita.

### Fronteras

- `domain.js`, `app.js`, `state.js`, `controller.js`, `navigation.js` y `90-responsive.css` tienen escritor único por tarea.
- Ninguna tarea paralela comparte `write_set`.
- La lógica nueva del recorrido vive en `public/js/journey.js` y una vista propietaria, no dentro de un nuevo hub.
- CSS global del recorrido usa un bloque nuevo importado antes de `90-responsive.css`.

## 5. Olas

### Wave 6.0 — Planificación y gate

P6-00A a P6-00D. Contexto, auditoría, UI-SPEC, plan, revisión, aprobación y baseline portable.

### Wave 6.1 — Contrato y shell

P6-01 a P6-04. Catálogo de etapas, navegación, vista del recorrido, shell y ayuda contextual.

### Wave 6.2 — Handoffs y densidad

P6-05 a P6-08. Reordenamiento progresivo de módulos con propietarios de vista/estilo separados.

### Wave 6.3 — Reproducibilidad y QA

P6-09 a P6-14. Reset, E2E, responsive, ensayo humano y checker independiente.

### Wave 6.4 — Integración y ship

P6-15 a P6-18. Memoria, PR funcional, merge humano, Pages y persistencia documental.

## 6. Secuencia atómica

### P6-00A — Diagnóstico y plan

**Salida:** `CONTEXT.md`, `UX-AUDIT.md`, `UI-SPEC.md`, `PLAN.md`, solicitud de gate, actualización de roadmap/estado.

**DoD:** cero archivos de runtime modificados; baseline y supuestos explícitos.

### P6-00B — Revisión estructural independiente

**Salida:** `PLAN_REVIEW.md`.

**DoD:** criterios, dependencias, write sets, narrativa, riesgos y gates revisados por un agente sin contexto de autor.

### P6-00C — HUMAN-GATE-A

**Write set:** `APPROVAL.md`, `DECISIONS.md`, `STATE.md`.

**DoD:** A1–A13 aceptados o enmendados textualmente; no se inicia runtime antes.

### P6-00D — Baseline reproducible

**Write set:** `BASELINE_BROWSER.md`, `evidence/baseline/*`.

**Checks:** `npm.cmd run verify`, ocho rutas × tres viewports, auditoría de navegación y densidad.

### P6-01 — Catálogo puro del recorrido

**Write set:** `public/js/journey.js`, `public/js/config.js`, `tests/journey-domain.mjs`, `tests/module-graph.mjs`, `package.json`.

**Protegidos:** estado, shell, vistas, estilos y datos.

**DoD:** seis etapas cerradas, rutas válidas, anterior/siguiente y mapeo módulo↔etapa deterministas; tests primero.

### P6-02 — Contrato de navegación y URL

**Write set:** `public/js/navigation.js`, `tests/journey-navigation.mjs`, regresiones de navegación existentes.

**DoD:** `#journey/<stage>`, aliases, deep-links inválidos, back/forward y query de escenario verificados.

### P6-03 — Vista y shell del recorrido

**Write set:** `public/app.js`, `public/js/views/journey.js`, `public/js/views/index.js`, `public/styles.css`, `public/styles/61-journey.css`, `public/styles/20-shell.css`, pruebas de vista/shell.

**DoD:** entrada principal, rail de seis etapas, un `h1`, CTA anterior/siguiente, navegación experta y estados base.

### P6-04 — Estado, controlador y foco

**Write set:** `public/js/state.js`, `public/js/controller.js`, `tests/journey-state.mjs`, `tests/journey-e2e.mjs`.

**DoD:** recorrido deriva escenario vigente, no duplica payload, anuncia etapas y preserva foco/URL.

### P6-05 — Ayuda contextual y handoff

**Write set:** `public/js/domain.js`, `public/js/views/guidance.js`, `public/js/config.js`, `public/styles/30-components.css`, tests de ayuda.

**Dependencia:** P6-03/P6-04 integrados; escritor único sobre `domain.js` y `config.js`.

**DoD:** propósito, acción, resultado, límite y siguiente paso para 6+8 superficies; no hover-only.

### P6-06 — Escala y geografía

**Write set:** `public/js/views/dashboard.js`, `public/js/views/market.js`, `public/styles/50-views.css`, `public/styles/56-benchmark.css`, pruebas dirigidas.

**DoD:** escala y mapa aparecen antes de detalle, lente duplicada se reduce y CTA entrega el handoff correcto.

### P6-07 — Calidad y profundidad

**Subtarea A:** `inspector.js` + `55-inspector.css`.

**Subtarea B:** `projects.js` + estilos propietarios de proyectos extraídos desde `50-views.css` si se necesita paralelismo.

**Subtarea C:** `compare.js` + `57-comparison.css`.

**DoD:** Tipo 7 es inequívoco; comparación concluye antes de detalle; evidencia completa permanece accesible. Solo subtareas con write sets disjuntos pueden ejecutarse en paralelo.

### P6-08 — Movimiento y decisión

**Subtarea A:** `activity.js` + `58-history-signals.css`.

**Subtarea B:** `assistant.js` + `59-assistant.css`.

**Subtarea C:** `checklist.js` + estilo propietario extraído si aplica.

**DoD:** señal→asistente→checklist tiene handoffs explícitos; CT-E/F y privacidad intactos.

### P6-09 — Reinicio y reproducibilidad

**Write set:** `state.js`, `controller.js`, `navigation.js`, tests de reset/reload/history.

**DoD:** reinicio global vuelve a `#journey/scale`, limpia UI local, preserva baseline y no persiste consultas.

### P6-10 — Integración de regresiones

**Write set:** tests F6, `package.json`.

**DoD:** HU 103/104/801–804, CT-A–I/P, contratos 2.0–2.4 y ocho rutas expertas pasan.

### P6-11 — E2E de narrativa

**Write set:** `tests/journey-e2e.mjs`, evidencia funcional P6.

**DoD:** seis etapas por UI-only, mapa, Tipo 7, comparador, señal, asistente y checklist; cero consulta al código durante el recorrido.

### P6-12 — Responsive, contraste y zoom 200%

**Write set:** `90-responsive.css`, `tests/phase6-responsive.mjs`, evidencia visual P6.

**DoD:** 14 superficies × 3 viewports, 200%, teclado, foco, 44×44, AA, reduced motion, cero overflow/solape/truncamiento.

### P6-13 — Ensayo comercial humano

**Salida:** `COMMERCIAL_REHEARSAL.md` y evidencia de observación, sin código.

**DoD:** lector nuevo, ≤10 minutos, cinco claims correctos, cero ayuda del maker y cero afirmaciones prohibidas. Si falla, vuelve al propietario del defecto; no se sustituye por automatización.

### P6-14 — Verificación formal independiente

**Salida:** `VERIFICATION_REPORT.md`.

**Checks:** `npm.cmd run verify`, Graphify, diff/write sets, E2E, responsive, evidencia, ensayo humano y regresiones.

**DoD:** `PASS`, `PASS WITH RISKS` + HUMAN-GATE-B, o `FAIL` con gaps clasificados.

### P6-15 — Memoria, handoff y PR funcional

**Salida:** `SUMMARY.md`, `HANDOFF.md`, `STATE.md`, commits atómicos y PR en borrador/listo según checker.

### P6-16 — Merge humano

**DoD:** revisión y merge realizados exclusivamente por el usuario; nunca por el agente.

### P6-17 — Verificación post-merge

**Objetivo:** verificar Pages, SHA, 14 superficies, recorrido humano crítico, red y consola de forma read-only.

### P6-18 — Persistencia post-merge

**Objetivo:** rama y PR documentales separados. Solo tras ese merge Fase 6 queda `deployed and verified`.

## 7. Matriz de verificación

| Capa | Actividad | Evidencia |
|---|---|---|
| Sintaxis/arquitectura | `npm.cmd run check`, módulo graph, Graphify | logs y conteos |
| Dominio | journey catalog/state/navigation | tests unitarios |
| Datos | hashes, referencias, compatibilidad 2.0–2.4 | hashes invariantes |
| Integración | 6 etapas + 8 rutas | E2E UI-only |
| Narrativa | cinco claims y límites | ensayo humano |
| Visual | 1440×900, 1280×720, 390×844, 200% | capturas portables |
| Accesibilidad | teclado, foco, landmarks, AA, reduced motion | pruebas + revisión |
| Privacidad/red | consultas en memoria, 0 hosts externos | scanner y navegador |
| Ship | SHA del merge = workflow = Pages | informe post-merge |

## 8. Condición de rollback

Antes del merge, revertir la tarea atómica que falle y conservar las ocho rutas expertas. Después del merge, un rollback debe restaurar `/`→`#dashboard` y retirar únicamente el catálogo/vista del recorrido, sin tocar contrato, datos o motores. Un rollback no puede ocultar evidencia ni relajar tests.

## 9. Condiciones de parada

- cambio de contrato o dataset no aprobado;
- nueva fuente externa, telemetría o persistencia;
- cifras del recorrido que no coincidan con vistas expertas;
- pérdida de un deep-link existente;
- claim comercial sin evidencia;
- colisión de write sets;
- ensayo humano fallido sin hipótesis correctiva;
- tres fallos consecutivos del mismo gate sin una causa nueva.

