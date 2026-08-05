# Plan ejecutable — Fase 5: histórico, señales y asistente

**Estado:** `IN PROGRESS / HUMAN-GATE-A APPROVED / P5-01–P5-12 COMPLETED`.

**Rama:** `feat/phase-5-history-signals-assistant`.

**Objetivo:** completar HU-DEMO-601–603 y 701–703 con un histórico verificable, señales prudentes y un asistente determinista que comparta escenario, motores y evidencia con las demás rutas.

## 1. Definition of Done

Fase 5 estará técnicamente completa cuando:

- CT-C/D/E/F/G/I/P pasen en fixtures, unidad, integración, E2E y navegador;
- el contrato público `2.4.0` sea determinista, privado, trazable y compatible en lectura con 2.0–2.4;
- `#activity` no muestre eventos de proyectos fuera de la muestra canónica;
- cada evento muestre valores, fechas, vigencia, estado y referencias;
- ninguna causa se atribuya sin evidencia causal;
- el asistente use motores autoritativos y cada cifra coincida con las otras rutas;
- las preguntas cualitativas tengan hechos/evidencias autorizadas o un rechazo explícito;
- CT-F rechace el precio real de cierre sin inventar;
- ocho rutas × tres viewports, teclado, contraste y zoom 200% pasen;
- el checker independiente emita `PASS`, o el humano acepte riesgos mediante HUMAN-GATE-B;
- exista memoria, evidencia portable, handoff y PR funcional listo para revisión humana.

## 2. Historias y criterios de aceptación

### HU-DEMO-601 — Línea de tiempo de cambios

**Como** responsable comercial, **quiero** ver cambios observados en proyectos comparables, **para** decidir qué revisar sin confundir publicaciones con ventas.

**Aceptación:**

1. La línea de tiempo contiene solo proyectos de `scenarioContext.comparableProjectIds`.
2. Cada fila muestra campo, valor anterior, valor nuevo, delta absoluto, delta porcentual válido, ambas fechas y fecha de detección.
3. Si la base es cero, el porcentaje es `null` y se explica; no aparece infinito.
4. Fechas invertidas, moneda desconocida o semántica distinta bloquean certificación.
5. La lista está ordenada de forma reproducible y el desempate usa ID canónico.
6. Cada fila abre proyecto y evidencia sin perder el escenario.
7. El texto dice “cambio observado/detectado”, nunca “cambio realizado” si no existe esa evidencia.

### HU-DEMO-602 — Validez y estado

**Como** analista, **quiero** conocer la calidad y vigencia de cada señal, **para** no priorizar outliers o datos vencidos.

**Aceptación:**

1. Estados `certified`, `reviewable` e `insufficient/excluded` tienen icono, texto, razón y contraste AA.
2. Vigencias `current`, `aging`, `historical` y `unknown` se calculan contra el cutoff, no contra el reloj del dispositivo.
3. Una señal revisable nunca aparece por encima de una certificada por ser más extrema.
4. Se muestran denominador total, mostrados, excluidos y razones principales.
5. Evidencia restringida/desconocida no se transforma en evidencia positiva.
6. Los filtros no mutan el escenario y son reproducibles por estado local derivado.

### HU-DEMO-603 — Agenda de seguimiento

**Como** gerente, **quiero** una agenda breve y priorizada, **para** llegar a la reunión con verificaciones concretas.

**Aceptación:**

1. Máximo tres acciones, presentadas como filas numeradas.
2. Cada acción deriva de una señal o gap visible y conserva referencias.
3. No se usa “esta semana” salvo que la ventana calendario esté probada.
4. Si no hay señal certificada, la agenda prioriza validación o ampliación del escenario; no inventa oportunidades.
5. La misma entrada produce la misma agenda.

### HU-DEMO-701 — Asistente del escenario activo

**Como** usuario comercial, **quiero** hacer una pregunta sobre el escenario, **para** recibir una lectura consistente con Radar, Benchmark y Comparador.

**Aceptación:**

1. Distrito, alcance, filtros y muestra provienen de `scenarioContext`.
2. El asistente no cambia silenciosamente de distrito por texto escrito o sugerido.
3. Las cifras se obtienen de motores puros, no de strings duplicados.
4. Cada bloque numérico indica denominador, corte y limitación relevante.
5. La navegación a otra ruta conserva el escenario.
6. La consulta no se persiste ni produce solicitudes externas.

### HU-DEMO-702 — Preguntas cualitativas/documentales

**Como** analista, **quiero** consultar atributos o documentos, **para** contrastar una hipótesis con evidencia visible.

**Aceptación:**

1. Solo se responden intenciones del catálogo aprobado.
2. Una afirmación cualitativa requiere fact ID y evidence ID autorizados.
3. Valores desconocidos, restringidos, contradictorios o incompatibles se declaran como tales.
4. El usuario puede abrir la evidencia desde la respuesta.
5. No se interpreta una imagen más allá de los hechos materializados y revisados.

### HU-DEMO-703 — Insuficiencia y rechazo prudente

**Como** usuario, **quiero** que la plataforma admita sus límites, **para** no presentar una estimación como dato observado.

**Aceptación:**

1. CT-F rechaza precio real de cierre y explica que la demo observa precios publicados.
2. Preguntas causales sin evidencia reciben un rechazo equivalente.
3. Preguntas desconocidas muestran familias soportadas; no se genera texto genérico.
4. Una estimación solo puede ofrecerse como flujo separado, explícito y con supuestos ingresados por el usuario; Fase 5 no la calcula automáticamente.
5. El contenido del usuario se escapa y no se refleja como HTML.

## 3. Contrato objetivo `2.4.0`

### Autoridad

- `model`: entidades, observaciones, hechos, issues y eventos base.
- `inspector`: activos y permisos de evidencia.
- `benchmark`: agregados y comparación.
- `history`: política, eventos históricos normalizados, índices y cobertura.
- `assistant`: catálogo semántico, guardrails y contrato de respuesta.

### Regla de lectura

El runtime acepta 2.0–2.4. Para 2.0–2.3, histórico/asistente muestran capacidad limitada; nunca reconstruyen autoridad desde `projects[].price_delta_pct` o respuestas legacy.

## 4. Arquitectura objetivo

```text
fuentes legacy + fixtures
          │
          ▼
policy + validator ──► writer determinista ──► demo-data.json 2.4
                                                │
                ┌───────────────────────────────┼───────────────────┐
                ▼                               ▼                   ▼
        scenarioContext                 history engine       assistant engine
                │                               │                   │
                └──────── comparable IDs ───────┴──── facts/evidence┘
                                                │
                                  activity view / assistant view
```

Los motores puros no leen DOM. Las vistas no calculan porcentajes, elegibilidad ni respuestas.

## 5. Write sets y archivos protegidos

### Write sets exclusivos

| Propietario | Write set |
|---|---|
| Data-contract | `scripts/data/history.js`, `scripts/data/assistant.js`, schemas/fixtures F5 |
| Writer | `scripts/build-demo-data.js`, JSON público generado, coverage/fingerprints |
| History-domain | `public/js/history.js`, pruebas de dominio |
| Assistant-domain | `public/js/assistant-engine.js`, pruebas de dominio |
| Activity-UI | `public/js/views/activity.js`, `public/styles/58-history-signals.css`, pruebas de vista |
| Assistant-UI | `public/js/views/assistant.js`, `public/styles/59-assistant.css`, pruebas de vista |
| Integration | `state.js`, `controller.js`, `config.js`, `views/index.js`, pruebas E2E |
| Shared-style | `styles.css`, migración puntual desde `50-views.css`, `90-responsive.css` |
| Docs | `.planning/phases/05-history-signals-assistant/**`, `STATE.md`, `ROADMAP.md`, `DECISIONS.md` |

### Archivos protegidos

- Contratos y datos de Fases 2–4 no cambian de semántica.
- `public/assets/**`, logos y branding no se reemplazan.
- Tests aprobados no se relajan para hacerlos pasar.
- JSON público no se edita a mano.
- Evidencia binaria no se modifica; solo manifiestos y referencias autorizadas.

Todo cambio fuera del write set requiere enmienda documentada y autorización humana cuando altere contrato, runtime o dataset público.

## 6. Olas

### Wave 5.1 — Contrato histórico y señales

P5-01 a P5-05. Define política, fixtures, writer, cobertura y motor puro antes de tocar interfaz.

### Wave 5.2 — Experiencia de señales

P5-06 a P5-08. Integra estado, reconstruye timeline y agenda de seguimiento.

### Wave 5.3 — Asistente semántico

P5-09 a P5-10. Catálogo, motor determinista, respuesta trazable y rechazos.

### Wave 5.4 — Verificación e integración

P5-11 a P5-16. E2E, responsive, checker, handoff, merge y post-merge.

## 7. Secuencia atómica

### P5-00A — Diagnóstico y plan

**Objetivo:** congelar baseline, evaluar datos, UX/UI y dependencias.

**Salida:** `CONTEXT.md`, `DATA-ASSESSMENT.md`, `UI-SPEC.md`, `PLAN.md`, solicitud de gate.

**DoD:** ningún archivo de runtime modificado; problemas de escenario y calidad documentados.

### P5-00B — Revisión estructural

**Objetivo:** verificar que historias, decisiones, tareas, pruebas y write sets sean ejecutables.

**Salida:** `PLAN_REVIEW.md`.

**DoD:** sin ambigüedad bloqueante; riesgos pendientes convertidos en decisiones A1–A12.

### HUMAN-GATE-A

No comienza P5-01 hasta que el usuario acepte explícitamente A1–A12.

### P5-00C — Registrar aprobación

**Salida:** `APPROVAL.md` y actualización de `DECISIONS.md`/`STATE.md`.

### P5-00D — Baseline portable

**Objetivo:** capturar `#activity`/`#assistant` en escritorio y móvil, fingerprints y defectos observados.

**Salida:** `BASELINE_BROWSER.md` y evidencias versionadas seleccionadas.

### P5-01 — Contrato `2.4.0` y compatibilidad

**Objetivo:** definir schemas estrictos de `history` y `assistant`.

**Pruebas primero:** contrato válido, versiones 2.0–2.4, faltantes, referencias rotas, propiedades extra, guardrails.

**DoD:** writer aún sin modificar; lector degrada explícitamente en contratos antiguos.

### P5-02 — Política y fixtures CT-C/D/E/F/G/I/P

**Objetivo:** codificar semántica, estados, vigencia, reason codes y catálogo de intenciones.

**Fixtures mínimos:** cambio normal, base cero, extremo, moneda desconocida, fecha invertida, otro distrito, evidencia restringida, cualitativo autorizado, cierre real y causa no observada.

**DoD:** mutaciones fallan por la razón esperada.

### P5-03 — Materializador determinista de histórico

**Objetivo:** producir candidatos normalizados desde observaciones compatibles.

**DoD:** 34 candidatos preliminares o la cifra resultante explicada; causas nulas; orden estable; idempotencia.

### P5-04 — Dataset público, cobertura y privacidad

**Objetivo:** integrar `history` y catálogo `assistant` al build.

**DoD:** dos builds byte-idénticos, fingerprints estables, cobertura por distrito/estado/razón, cero PII/rutas locales.

### P5-05 — Motor puro de histórico y señales

**Objetivo:** derivar timeline, filtros, detalle y agenda desde payload + scenarioContext.

**DoD:** CT-C/E/G/I en unidad; no DOM, reloj o red; orden determinista.

### P5-06 — Integración derivada de estado

**Objetivo:** agregar selección/filtros sin duplicar el escenario.

**DoD:** reset, cambio de distrito/alcance y navegación invalidan o recomputan de forma correcta; ninguna mutación del payload.

### P5-07 — Interfaz del cuaderno de señales

**Objetivo:** reemplazar feed legacy por timeline explicable y evidencia accesible.

**DoD:** valores/fechas/estado visibles; detalle con teclado; solo escenario activo; estados vacíos/legacy.

### P5-08 — Agenda priorizada

**Objetivo:** implementar HU-DEMO-603 como lista de seguimiento reproducible.

**DoD:** máximo tres acciones, origen visible, sin afirmaciones semanales no probadas.

### P5-09 — Motor semántico del asistente

**Objetivo:** reconocer intenciones cerradas y producir bloques trazables.

**DoD:** respuestas deterministas; cifras del motor; referencias; fallback; CT-F; XSS; sin red.

### P5-10 — Interfaz del asistente

**Objetivo:** implementar preguntas compatibles, entrada segura, respuesta por bloques y enlaces.

**DoD:** escenario visible, modo determinista, consulta no guardada, `aria-live`, foco, limitaciones.

### P5-11 — E2E y regresiones integrales

**Objetivo:** demostrar CT-C/D/E/F/G/I/P y preservar las ocho rutas.

**Recorridos:** cambio distrito/alcance; señal→evidencia→regreso; pregunta→respuesta→evidencia; rechazo cierre; contrato 2.3; evidencia restringida; sin eventos.

### P5-12 — Responsive, contraste y zoom 200%

**Objetivo:** verificar 1440×900, 1280×720, 390×844, teclado y reflow 200%.

**DoD:** sin scroll horizontal, foco visible, densidad controlada, contraste AA, capturas portables.

### P5-13 — Verificación independiente

**Objetivo:** checker sin autoría revisa contrato, código, dataset, pruebas, navegador, privacidad y narrativa.

**Salida:** `VERIFICATION_REPORT.md` con `PASS`, `PASS WITH RISKS` o `FAIL`.

**Gate:** `FAIL` vuelve al maker; `PASS WITH RISKS` requiere HUMAN-GATE-B; `PASS` continúa.

### P5-14 — Memoria, handoff y PR funcional

**Salida:** `SUMMARY.md`, `HANDOFF.md`, evidencia portable, commits atómicos y PR funcional en borrador/listo según checker.

### P5-15 — Verificación post-merge

**Objetivo:** tras merge humano, verificar Pages, SHA desplegado, contrato, CT-E/F y rutas públicas sin escribir código.

### P5-16 — Persistencia post-merge

**Objetivo:** rama y PR documental separados con resultado de P5-15. Solo después de ese merge Fase 5 queda `deployed and verified`.

## 8. Matriz de verificación

| Capa | Comando/actividad | Evidencia |
|---|---|---|
| Sintaxis | `npm run check` | salida completa |
| Arquitectura | `npm run test:architecture` + Graphify | dependencias/write sets |
| Datos | tests contract/schema/history/assistant | conteos y reason codes |
| Determinismo | dos builds + hash | SHA-256 idéntico |
| Privacidad | scanner del dataset y repo | cero hallazgos |
| Dominio | history/assistant unit | CT-C/E/F/G/I |
| Integración | E2E F5 + regresiones F2–F4 | rutas y escenario |
| Navegador | smoke 8×3 + a11y | capturas y logs |
| Manual | teclado, zoom 200%, recorrido comercial | checklist firmado |

El comando `npm run verify` debe incorporar las suites F5; no se sustituyen suites existentes.

## 9. Uso de Graphify

- Antes de ejecución: consultar relaciones de `activity.js`, `assistant.js`, `domain.js`, `state.js`, `controller.js`, build y schema.
- Después de P5-04 y P5-10: regenerar mapa y comparar nodos/relaciones afectadas.
- Antes del checker: confirmar que las vistas dependen de motores puros y no del legacy global.
- Si Graphify no cubre CSS/JSON, completar con `rg`, imports y pruebas de contrato; documentar la limitación.

## 10. Paralelismo permitido

- P5-01 y P5-02 son secuenciales por contrato/policy.
- Después de P5-04, history-domain y assistant-domain pueden desarrollarse en paralelo porque tienen write sets exclusivos.
- Las dos vistas pueden construirse en paralelo después de sus motores, pero `state.js`, `controller.js`, `config.js`, `styles.css` y responsive tienen escritor único.
- Verificación independiente nunca comparte autoría con makers.

## 11. Riesgos y rollback

- Cada P5-xx termina en commit atómico y pruebas proporcionales.
- Si 2.4 rompe compatibilidad, revertir solo P5-01/P5-04 y conservar docs/fixtures.
- Si los 34 cambios no superan la auditoría, usar solo candidatos certificados y mostrar cobertura honesta; no bajar umbrales.
- Si HU-603 genera recomendaciones débiles, diferirla sin bloquear Must.
- Si el asistente no puede citar evidencia, responde insuficiencia; no degrada a texto libre.
- Nunca se reescribe `main` ni se fuerza push.

## 12. Stop conditions

Detener y solicitar enmienda si:

- cambia la semántica de precio publicado;
- se propone una API/LLM externo;
- un valor histórico no puede emparejar entidad/campo/moneda;
- se necesita publicar nueva evidencia no autorizada;
- se requiere modificar contrato F2–F4 de forma incompatible;
- una prueba debe relajarse para aceptar mezcla territorial, causa inferida o precio de cierre;
- el checker detecta discrepancia entre asistente e interfaz.
