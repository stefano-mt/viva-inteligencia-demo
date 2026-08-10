# P6-15 — Verificación formal independiente de Fase 6

**Fecha:** 2026-08-10

**Checker:** `/root/p6_15_checker`, sin autoría en los commits de Fase 6

**Rama:** `feat/phase-6-commercial-narrative-qa`

**Base:** `25300b1f7f3669fd1f5cc66567a589b69dcb93c2`

**HEAD verificado:** `7a08fca`

## Veredicto

**FAIL**

El gate automatizado completo terminó con código `0`, Graphify no encontró un hub nuevo bloqueante y contrato, datos, privacidad, E2E, responsive y accesibilidad permanecen verdes. Sin embargo, la vista del recorrido no consume el `state.journeyContext` autoritativo que Fase 6 construyó.

Esto produce una divergencia visible bloqueante: un estado geográfico `empty` y una capacidad Decisión `capability_unavailable` se renderizan como `ready`. Las etapas tampoco muestran sus resultados derivados principales: Escala omite 184 y 30/22/5; Calidad omite 104.15/53.37/50.78 y la decisión de exclusión; Decisión omite checklist/respuesta literal. La UI-only existente valida el shell y abre módulos expertos, pero no prueba paridad DOM ↔ `journeyContext`.

El defecto incumple HU-DEMO-103 y HU-DEMO-801, además de CONTEXT §4.1/4.2, PLAN §1/2/4 y UI-SPEC §6/7/10. Por la regla P6-15, cualquier gap técnico impone `FAIL`; `R6-H1` no puede elevar este resultado a `PASS WITH RISKS`.

**No se habilita P6-16 ni la creación del PR funcional.** Debe volver al maker con una enmienda correctiva acotada y repetir P6-15 completo sobre un nuevo SHA.

## Fuentes y método

El checker leyó completamente `AGENTS.md`, STATE, PROJECT, ROADMAP, CONTEXT, PLAN, VERIFICATION, GRAPHIFY, REQUIREMENTS, DECISIONS y los documentos vinculantes de Fase 6. Revisó el rango `25300b1..7a08fca`, los write sets por commit, archivos protegidos, imports, manifest de pruebas y evidencia portable.

La verificación combinó:

- `npm.cmd run verify` completo;
- Graphify `--code-only --no-cluster`, god nodes y dos consultas dirigidas;
- revisión adversarial del DOM frente a `state.journeyContext`;
- compatibilidad 2.0–2.4, escenario vacío y rutas críticas;
- inspección visual representativa en desktop, laptop, móvil y zoom 200 %;
- hashes de evidencia, privacidad/red y archivos protegidos;
- reader-test documental de D-042.

## Checks

| Capa | Resultado |
|---|---|
| `npm.cmd run verify` | PASS, exit 0 |
| Sintaxis/arquitectura/ownership | PASS |
| Datos, contrato, determinismo y privacidad | PASS |
| CT-A–I/P | PASS en motores/fixtures/rutas expertas |
| Journey state/parity unitarios | PASS |
| Journey UI-only existente | PASS según su contrato actual, pero cobertura insuficiente |
| DOM ↔ `journeyContext` | **FAIL** |
| 14 superficies × 3 viewports + 200 % | PASS |
| Smoke 8 rutas × 3 viewports | PASS |
| A11y 14 superficies × 3 viewports | PASS |
| Hosts externos durante pruebas dirigidas | 0 |
| Graphify | PASS estructural; confirma frontera sin integración visible |
| Paquete P6-14 | PASS estructural, `PENDING/DEFERRED` |

Detalle: [technical-gate.md](evidence/verification/technical-gate.md), [adversarial-ui-state.md](evidence/verification/adversarial-ui-state.md), [graphify.md](evidence/verification/graphify.md) y [write-set-audit.md](evidence/verification/write-set-audit.md).

## Hallazgos

### G1 — La UI del recorrido ignora estado y datos autoritativos

**Severidad:** P1 / bloqueante.

`public/app.js:380-385` entrega a `renderJourney` solo una reducción `loading`/`ready` basada en geografía. `public/js/views/journey.js:134-217` usa copy estático y no recibe la etapa materializada.

Pruebas observadas:

- radio sin proyectos: estado `empty`, DOM `ready`;
- contrato 2.1 en Decisión: estado/capacidad `capability_unavailable`, DOM `ready`, sin explicación de indisponibilidad;
- Escala no muestra 184/30/22/5;
- Calidad no muestra 104.15/53.37/50.78;
- Decisión no muestra checklist ni respuesta literal.

**Tratamiento requerido:** conectar la etapa vigente desde `state.journeyContext` a la vista; renderizar estado, datos, evidencia mínima y `correctiveAction` sin recalcular; mantener una CTA primaria, densidad y fallbacks aprobados.

### G2 — Las pruebas de Journey permiten el split-brain

**Severidad:** P1 / bloqueante.

El E2E visible exige estructura y copy genérico; los datos se comprueban importando el estado o abriendo rutas expertas. No hay una aserción que compare `data-journey-state`, contenido visible y CTA contra `state.journeyContext.stages[stageId]` para 2.0–2.4 y vacíos.

**Tratamiento requerido:** añadir primero una regresión DOM ↔ estado que falle para los casos demostrados; cubrir las seis etapas, capacidad legacy, vacío/insuficiente/error, cifras críticas, decisión sin consulta implícita y CTA correctiva.

### G3 — Drift documental de write sets

**Severidad:** P3 / proceso.

Tres commits de planificación/baseline actualizaron ROADMAP/STATE u otros documentos fuera del set literal del paso. No afecta el producto, pero debe registrarse/corregirse en la memoria y no está aceptado por R6-H1.

## D-042 y paquete humano

**Claridad documental:** PASS.

Un lector fresco puede determinar que:

- P6-14 continúa `PENDING/DEFERRED`;
- P6-15–P6-19 podían continuar solo si no había gaps técnicos;
- el veredicto máximo era `PASS WITH RISKS` únicamente por R6-H1;
- P6-20 conserva prompt, rúbrica, SHA de Pages y cierre final;
- no puede declararse `ready for client` o `deployed and verified` antes del PASS humano.

Los textos pre-merge en APPROVAL/PLAN_REVIEW son registros históricos de la decisión original; DECISIONS D-042, STATE, ROADMAP, CONTEXT, PLAN, VERIFICATION y COMMERCIAL_REHEARSAL expresan la enmienda vigente sin fabricar aprobación.

La carpeta de sesión creada por el usuario no se usa para el veredicto. El protocolo versionado y sus plantillas permanecen `PENDING`.

## Graphify y arquitectura

- 3,762 nodos y 7,556 relaciones.
- Sin clustering y sin nuevo Journey god node entre los 15 primeros.
- `buildJourneyContext`, `state.js`, `app.js` y `renderJourney` son alcanzables como fronteras; la lectura directa demuestra que el modelo se detiene antes del render.
- CSS/JSON y SQL permanecen fuera de la cobertura fiel de Graphify; Playwright, hashes, imports y tests compensan esa limitación.

## Evidencia visual, responsive y accesibilidad

Los manifiestos existentes tienen 0 mismatches. Se revisaron capturas de Escala, Calidad, Decisión y Comparador en 1440/1280/móvil/200 %. No se observó overflow, solape o contraste bloqueante. La falla es semántica/funcional: las superficies son legibles, pero muestran una narración genérica separada del estado autoritativo.

## Regresiones preservadas

**PASS.** Contrato 2.4, dataset, writer, fingerprints, elegibilidad, geometría, Inspector, Benchmark, Comparador, Histórico, Asistente, ocho rutas, privacidad, determinismo y red permanecen intactos. No se modificaron archivos protegidos.

## Próximo gate recomendado

1. Crear una enmienda correctiva posterior a P6-15 con write set explícito para `app.js`, `views/journey.js`, tests de Journey y, solo si una prueba visual lo exige, estilos/evidencia F6.
2. Escribir la regresión DOM ↔ estado antes del runtime.
3. Renderizar los seis modelos autoritativos y estados correctivos sin duplicar motores.
4. Ejecutar `npm.cmd run verify`, revisar 14 superficies × 3 viewports y repetir P6-15 con checker independiente sobre el nuevo SHA.
5. Mantener P6-14/P6-20 `PENDING/DEFERRED`; no solicitar HUMAN-GATE-B para ocultar G1/G2.

## Formato de veredicto

```text
Veredicto: FAIL
Historias: HU-DEMO-103 y HU-DEMO-801 fallan en la superficie Journey
Commit/diff: 25300b1..7a08fca
Checks: gate integral PASS; contraste DOM↔estado FAIL
Evidencia visual: íntegra y legible, pero semánticamente desconectada
Casos de datos: motores/fixtures PASS; presentación empty/legacy FAIL
Accesibilidad: PASS estructural
Regresiones: F2–F5 PASS
Riesgos residuales: R6-H1 sigue aceptado y pendiente; no compensa gaps técnicos
Gaps: G1 P1, G2 P1, G3 P3
```
