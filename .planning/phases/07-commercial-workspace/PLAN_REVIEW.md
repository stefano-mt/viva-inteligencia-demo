# Fase 7 — Revisión estructural independiente del plan

**Paso:** P7-00B, tercera ejecución.

**Checker:** `/root/p7_00b_plan_checker`.

**Fecha:** 2026-08-21.

**HEAD revisado:** `83bb0a526535b14d6008483576d07dcccced4209`.

**Veredicto:** `PASS`.

No quedan hallazgos P0–P2. P7-00B queda cerrado y puede iniciarse P7-00C para solicitar HUMAN-GATE-A. Este `PASS` aprueba la estructura del plan; no autoriza por sí mismo cambios de runtime.

## Alcance y método

Se leyó completo `CLAIMS-INVENTORY.md` normalizado y se revisaron las modificaciones de `PLAN.md`. Se contrastaron C01–C23 con las fuentes de verdad ya leídas en las dos ejecuciones anteriores y, de forma dirigida, con:

- semántica geográfica y CT-I de Fase 2;
- matriz de compatibilidad 2.0–2.4 de Fase 6;
- acciones correctivas de `public/js/journey.js`;
- fixtures y paridad DOM de Fase 6;
- CT-F y estados globales de error;
- estado vacío vigente del Comparador.

Inspecciones read-only ejecutadas:

```text
git status --short --branch
git show --stat --name-status 83bb0a5
git diff-tree --no-commit-id --name-only -r 83bb0a5
git diff --check 83bb0a5^ 83bb0a5
rg dirigido sobre C01–C23, CT-F, compatibilidad y corrective actions
auditoría dirigida de DAG, write sets, rutas y catálogo de sinónimos
```

No se ejecutaron tests de runtime: P7-00B revisa planificación y `83bb0a5` solo modifica documentos. No se leyó ni tocó el directorio no rastreado de evidencia de Fase 6.

## Resultado

| Área | Veredicto | Evidencia |
|---|---|---|
| Coherencia CONTEXT/UI-SPEC/PLAN | PASS | Objetivo, alcance, presupuesto visual, historias, riesgos, tareas y gate convergen sin ampliar producto o datos. |
| HU-DEMO-805–810 | PASS | Cada historia tiene criterios observables, tarea propietaria, verificación y rollback. |
| A1–A14 | PASS | Son compatibles con el alcance, las protecciones y la autoridad humana sobre merge. |
| DAG y paralelismo | PASS | Solo P7-06A/B/C y P7-07A/B/C pueden ejecutarse en paralelo; sus write sets son disjuntos. |
| Rutas/write sets | PASS | P7-01–P7-09 usan paths repo-relative completos y marcan archivos nuevos. |
| Navegación/sinónimos | PASS | Nueve destinos y catálogo cerrado; se excluyen valores de datos y búsqueda global implícita. |
| Contrato/datos/motores | PASS | Contrato 2.4, compatibilidad, dataset, writer, engines, elegibilidad y workflow permanecen protegidos. |
| Accesibilidad/responsive | PASS | Foco, teclado, Escape, 44×44, AA, 200%, reduced motion y 14 superficies están especificados. |
| Pruebas/rollback | PASS | C01–C23, CT-A–I/P, DOM↔autoridad, privacidad, cero red, responsive y reversión por tarea están cubiertos. |
| Referencias visuales | PASS | Se reutilizan patrones de organización sin copiar identidad, color, iconografía o composición de Attio. |
| Cero runtime | PASS | `83bb0a5` modifica únicamente `CLAIMS-INVENTORY.md` y `PLAN.md` bajo `.planning/`. |

## Auditoría del contrato C01–C23

### Schema y materialización

Cada entrada posee:

- `id` estable C01–C23;
- `routes` como array explícito o `all_surfaces`;
- un `fixture` ejecutable;
- un claim con calificador;
- autoridad identificada;
- assertions concretas;
- una única visibilidad `mandatory` o `reachable`;
- `corrective_action` literal o `null`.

`all_surfaces` está definido como las seis etapas y ocho rutas expertas, y P7-01 debe expandirlo literalmente en el JSON. No quedan wildcards, rutas implícitas ni visibilidades combinadas. P7-01 es el único writer; P7-02/P7-04–P7-09 consumen el fixture y P7-10 lo audita.

### Semántica y autoridades

- C02 conserva 90 observados, 85 comparables y cinco **observados no reconciliados**; exige que no se llamen fuera del distrito/polígono.
- C04 separa publicaciones de precio/área de pairing certificado y precio/m² elegible.
- C06 conserva 104.15, 53.37 y 50.78 m² más la exclusión del caso Tipo 7.
- C08 conserva 69 raw, 68 cocientes orientativos y cero parejas elegibles.
- C11 preserva `cause=null` como causa no observada.
- C12/C13 separan contenido obligatorio y referencias alcanzables del asistente.
- C15 exige error global uniforme para 2.0 y prohíbe transformarlo en `capability_unavailable` interno.
- C20 protege `No disponible / 22 / 5` sin cero fabricado.
- C22 protege CT-F contra precio real de cierre o respuesta inventada.
- C23 separa error global de fetch de cifras obsoletas o contenido parcial.

### Acciones correctivas

Las etiquetas coinciden literalmente con las autoridades vigentes:

| Claim | Acción |
|---|---|
| C09 comparación vacía | `Seleccionar proyectos` |
| C15 contrato 2.0 global | `Reintentar` |
| C16 Calidad no disponible en 2.1 | `Volver a geografía` |
| C17 Profundidad no disponible en 2.2 | `Revisar benchmark` |
| C18 Movimiento no disponible en 2.3 | `Volver a profundidad` |
| C19 Decisión 2.4 sin respuesta | `Formular consulta en el asistente` |
| C21 Geografía vacía | `Ajustar escenario` |
| C23 error global de fetch | `Reintentar` |

C16–C19 prueban los límites de incorporación por versión; P7-08 mantiene además la matriz completa 2.0–2.4 ya cubierta por los tests vigentes.

## Hallazgos

### P0–P2

Ninguno.

### P3 — disciplina de implementación

El fixture de C01–C23 será una copia ejecutable del inventario, no una nueva autoridad. Si durante P7-01 una assertion no coincide con el motor/selector vigente, se corrige el fixture contra la autoridad y se registra el drift; nunca se modifica el runtime o el dato para satisfacer el documento. Esta regla ya está expresada en `CLAIMS-INVENTORY.md` y debe permanecer en el handoff.

## Historial de P7-00B

1. Primera ejecución sobre `3907f27`: `FAIL` por tres P2 y un P3; acta persistida en `cb0af8e`.
2. Segunda ejecución sobre `9ecf1d7`: `FAIL` por semántica C02 y schema no materializable de C04/C12/C14–C16; acta persistida en `dde4f88`.
3. Tercera ejecución sobre `83bb0a5`: `PASS`; los correctivos normalizan C01–C23 sin introducir cambios de runtime.

## Condiciones para HUMAN-GATE-A

1. Presentar al usuario A1–A14 sin omitir que la fase reorganiza las nueve superficies y añade navegación local `Ir a…`.
2. Registrar una aceptación o enmienda textual en `APPROVAL.md`, `.planning/DECISIONS.md` y `.planning/STATE.md`.
3. No modificar runtime antes de esa aprobación.
4. Tras HUMAN-GATE-A, ejecutar P7-00D y vincular el baseline al SHA aprobado antes de P7-01.
5. Toda relajación de C01–C23, cambio `mandatory → reachable` o modificación de contrato/datos/motores exige enmienda técnica y nueva aprobación.

Cumplidas estas condiciones, el plan queda habilitado para ejecución según su DAG.
