# Fase 7 — Revisión estructural independiente del plan

**Paso:** P7-00B.

**Checker:** `/root/p7_00b_plan_checker`.

**Fecha:** 2026-08-21.

**Commit revisado:** `3907f274a3ce8bb9966a5c5e9e174c0d85973fd8`.

**Veredicto:** `FAIL`.

P7-00C permanece bloqueado. No se encontraron hallazgos P0 o P1, pero tres hallazgos P2 impiden afirmar que el plan sea delegable sin ambigüedad y que la promesa de cero pérdida de claims sea verificable.

## Alcance y método

Se leyeron completos `AGENTS.md`, `.planning/STATE.md`, `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/VERIFICATION.md` y los seis documentos vigentes de Fase 7: `CONTEXT.md`, `UX-AUDIT.md`, `UI-SPEC.md`, `PLAN.md`, `HUMAN-GATE-A-REQUEST.md` y la reserva previa de este informe.

También se ejecutaron inspecciones read-only de Git:

```text
git show --stat --name-status 3907f27
git diff-tree --no-commit-id --name-only -r 3907f27
git ls-files <rutas dirigidas de vistas, estilos y tests>
rg -n <tareas, write sets, claims y rutas de Fase 7>
```

No se ejecutaron tests de runtime porque P7-00B revisa el plan y el commit no contiene implementación. No se leyó ni tocó el directorio no rastreado de evidencia de Fase 6.

## Resultado por área

| Área | Resultado | Evidencia |
|---|---|---|
| Coherencia de objetivo | PASS | `CONTEXT.md`, `UX-AUDIT.md` y `UI-SPEC.md` convergen en lectura principal, filas, detalle progresivo y una acción primaria. |
| HU-DEMO-805–810 | PASS condicionado | Las seis historias tienen criterios observables en `PLAN.md`; la trazabilidad de claims y los sinónimos de HU-810 requieren los cierres indicados abajo. |
| Contrato, datos y motores | PASS | A1/A12 y §4 de `PLAN.md` protegen contrato 2.4, dataset, writer, fingerprints, engines, elegibilidad y workflow. |
| Rutas y recorrido | PASS | Se enumeran los ocho deep-links, las seis etapas, `/` → `#journey/scale` y el reset canónico. |
| Accesibilidad | PASS | Se especifican foco atrapado/retorno, Escape, teclado, 44×44 px, AA, `aria-current`, reflow 200% y reduced motion. |
| Responsive y pruebas | PASS condicionado | La matriz cubre 14 superficies, tres viewports, 200%, CT-A–I/P, privacidad, red y paridad; falta cerrar el contrato exacto de claims. |
| Rollback | PASS | §8 define reversión por tarea y del PR completo sin relajar pruebas ni conservar imports huérfanos. |
| Referencias visuales | PASS | `CONTEXT.md` §3 y `UI-SPEC.md` adoptan patrones, conservan identidad Viva y prohíben copiar marca, colores, iconografía o composición de Attio. |
| Commit de planificación | PASS | `3907f27` cambia únicamente nueve archivos bajo `.planning/`; no modifica runtime, tests, datos, estilos ni workflow. |

## Hallazgos

### P2 — Las olas no resuelven colisiones reales de `write_set`

`PLAN.md` agrupa P7-01–03 en Wave 7.1, P7-04–07 en Wave 7.2 y P7-08–10 en Wave 7.3, pero no declara un DAG ni orden obligatorio dentro de cada ola. Existen colisiones concretas:

- P7-01, P7-02 y P7-03 escriben `package.json`; P7-01/P7-03 escriben el manifiesto `public/styles.css`; P7-02/P7-03 escriben `public/app.js`.
- P7-04 y P7-05 escriben `package.json` dentro de la misma Wave 7.2.
- P7-08 y P7-09 escriben `tests/browser-a11y.mjs` y `package.json` dentro de la misma Wave 7.3.

La frase “secuencia atómica” no indica si una ola habilita paralelismo. Esto contradice la regla de `AGENTS.md`: dos tareas que declaran el mismo archivo no pueden ejecutarse en paralelo.

**Condición de cierre:** añadir dependencias explícitas —por ejemplo P7-01 → P7-02 → P7-03 y P7-08 → P7-09— y serializar P7-04/P7-05, o asignar los archivos compartidos a un integrador único posterior. La tabla de olas debe distinguir tareas seriales de subtareas realmente paralelizables.

### P2 — Varios `write_set` no usan rutas canónicas e inequívocas

Los write sets combinan rutas completas con abreviadas. Ejemplos:

- P7-01 declara `public/styles/00-tokens.css` y luego `10-base.css`, `30-components.css`, `styles.css`.
- P7-02 declara `public/styles/20-shell.css` y luego `25-scenario-context.css`.
- P7-04 declara `public/styles/50-views.css` y luego `61-journey.css`.
- P7-06/P7-07 declaran `views/inspector.js`, `styles/55-inspector.css`, etc.; los archivos rastreados reales viven bajo `prototipo_ejecutable/public/js/views/` y `prototipo_ejecutable/public/styles/`.

La nota “bajo `prototipo_ejecutable/`” solo aparece en P7-01 y no resuelve las demás tareas. Un delegado no puede distinguir de forma contractual entre una ruta abreviada, un archivo nuevo y un error.

**Condición de cierre:** expresar cada ruta de P7-01–P7-09 en forma repo-relative completa, incluida `prototipo_ejecutable/`, y declarar explícitamente cuáles archivos son nuevos.

### P2 — La protección de claims carece del inventario y contrato ejecutable prometidos

`CONTEXT.md` §11 trata la pérdida de contexto como riesgo alto y propone “inventario de claims protegidos y pruebas DOM↔modelo”. `PLAN.md` exige cero pérdida de claim, denominador, exclusión o referencia y P7-08/P7-10 mencionan tests de claims, pero ninguna tarea crea o posee ese inventario.

El caso Tipo 7 sí está concretado (`104.15 m²`, `53.37 m²`, `50.78 m²` y exclusión), pero no existe una matriz equivalente por ruta para otros límites decisivos: naturaleza publicada/orientativa/simulada, denominadores de benchmark, pairing no demostrado, causa histórica nula, referencias autorizadas y degradación legacy.

Sin una fuente explícita, un test DOM↔estado puede preservar cifras y aun perder una advertencia cualitativa que cambia su interpretación.

**Condición de cierre:** incorporar antes de P7-04 un inventario versionado o fixture ejecutable con `ruta → escenario/fixture → claim/valor/límite → origen autoritativo → selector/assertion → visibilidad obligatoria o alcanzable`. Asignar su `write_set` y hacer que P7-04–P7-10 lo consuman. Debe cubrir como mínimo Tipo 7, denominadores/exclusiones del benchmark, comparación vacía, causa nula del histórico, carácter simulado del escenario, referencias del asistente y degradación 2.0–2.4.

### P3 — El catálogo de sinónimos de `Ir a…` aún no está cerrado

HU-DEMO-810 exige “sinónimos aprobados”, pero `UI-SPEC.md` solo enumera los nueve destinos. Esto no bloquea por sí solo la arquitectura, aunque deja un criterio abierto a interpretación del implementador.

**Recomendación:** fijar el pequeño catálogo de sinónimos en `UI-SPEC.md`, `PLAN.md` o un fixture de P7-03 y verificar que no incluya nombres de proyectos/datos que hagan parecer global a la paleta.

## Auditoría de historias y supuestos

- HU-DEMO-805/806/807/808/809 tienen criterio, tarea propietaria, prueba prevista y rollback proporcional.
- HU-DEMO-810 tiene interacción y accesibilidad definidas; queda pendiente cerrar sus sinónimos.
- A1–A14 son consistentes con el alcance, el cierre de Fase 6 y la autoridad humana sobre merge. Ningún supuesto autoriza cambios de datos, motores, contrato o workflow.
- A13 preserva correctamente que una UAT humana no forma parte de esta fase; no convierte la exención histórica de Fase 6 en aceptación de usuario.

## Condiciones para repetir P7-00B

1. Corregir los tres P2 en `PLAN.md` y, donde corresponda, `CONTEXT.md`/`UI-SPEC.md`.
2. Mantener el runtime sin cambios hasta HUMAN-GATE-A.
3. Entregar al checker el nuevo SHA y diff documental.
4. Repetir la auditoría de write sets y verificar que no queden colisiones simultáneas.
5. Verificar trazabilidad HU-DEMO-805–810 y que el inventario de claims sea consumible por P7-04–P7-10.

Hasta entonces, no corresponde solicitar la aceptación de A1–A14 ni iniciar P7-00D/P7-01.
