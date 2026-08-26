# P7-10 — Verificación formal independiente

Fecha: 2026-08-26

Candidato cerrado: `6a6a60ca2e607dc4768c56b139c2549b5fae41d8`

Rama: `feat/phase-7-commercial-workspace`

Base auditada: `6251442`
Verificador independiente: `/root/p7_10_checker`

## Veredicto

**FAIL**

El candidato conserva semántica, datos, compatibilidad y comportamiento, y la suite oficial pasa completa. Sin embargo, el checker browser independiente encontró dos brechas únicas **P2** contra criterios vinculantes de Fase 7. Conforme a `PLAN.md` P7-10, la presencia de P0–P2 impide `PASS` y reabre un correctivo antes de repetir P7-09/P7-10. `HUMAN-GATE-B` no corresponde mientras el resultado sea `FAIL`.

## Resumen ejecutivo

| Área | Resultado | Evidencia |
|---|---|---|
| Candidato, rama y remoto | PASS | HEAD y origin en `6a6a60c` |
| `npm.cmd run verify` | PASS | suite completa sin fallos |
| C01–C23 | PASS funcional | fixture read-only y pruebas oficiales |
| CT-A–I/P | PASS | suite integral |
| Compatibilidad 2.0–2.4 | PASS | rutas legacy, unavailable y CTA |
| Navegación 5+4 | PASS | checker independiente |
| Experto en ≤2 interacciones | PASS | 4/4 rutas probadas |
| Escenario / teclado / foco / Escape | PASS | desktop y móvil |
| Ctrl/Cmd+K local | PASS | nueve destinos, sin storage ni red |
| Reset / deep links | PASS | hash canónico, query vacía y foco |
| Vacío / error / insuficiente | PASS | CTA correctiva y sin estado obsoleto |
| Responsive / AA / 44×44 / tipografía | PASS salvo G2 | 14×4 superficies |
| Semántica de títulos | **FAIL — G1 P2** | dos `h1` en dos rutas |
| Primera pantalla 1280×720 | **FAIL — G2 P2** | tres superficies fuera del pliegue |
| Graphify e impacto | PASS | extract, god-nodes, query, affected |
| Diff / DAG / write sets / protegidos | PASS | desviaciones solo con enmienda autorizada |

## Hallazgos vinculantes

### G1 — P2 — Dos `h1` visibles en Inspector y Comparador

**Requisito incumplido:** `UI-SPEC.md` exige “un solo h1” y `PLAN.md` exige que cada ruta tenga un `h1`.

**Resultado reproducible:** Inspector y Comparador presentan dos `h1` visibles en 1440×900, 1280×720, 390×844 y zoom 200%. El shell genera el título en `public/js/views/scenario-context.js:591`, mientras las vistas vuelven a generar otro en `public/js/views/inspector.js:1750` y `public/js/views/compare.js:540`.

**Impacto:** duplica el encabezado principal para lectores de pantalla y rompe la jerarquía semántica de la ruta. No es una diferencia cosmética.

**Correctivo requerido:** conservar un único `h1` por ruta y rebajar o eliminar el encabezado duplicado sin perder el nombre visible ni el foco canónico. Repetir semántica, foco, teclado, deep link y las cuatro geometrías.

### G2 — P2 — Lectura o trabajo no visible en la primera pantalla de 1280×720

**Requisito incumplido:** `PLAN.md` exige que en 1280×720 aparezcan escenario, lectura y comienzo de la superficie operativa; `UI-SPEC.md` exige “primera lectura + trabajo visible” y CTA/lectura principal dentro de ese viewport.

**Resultado reproducible a scroll 0:**

| Superficie | Lectura | Trabajo | Alto viewport |
|---|---:|---:|---:|
| Benchmark | y=873 | y=894 | 720 |
| Comparador | y=929 | y=988 | 720 |
| Seguimiento | y=1067 | y=596 | 720 |

Benchmark y Comparador dejan lectura y trabajo completamente bajo el pliegue. Seguimiento muestra el inicio operativo, pero posterga su lectura principal hasta y=1067. Las capturas de P7-09 `evidence/responsive/expert-market-1280x720.png`, `expert-compare-1280x720.png` y `expert-activity-1280x720.png` corroboran el estado a scroll 0.

**Por qué P7-09 no lo detectó:** `tests/phase7-responsive.mjs:229–251` ejecuta `scrollIntoViewIfNeeded()` para el control de foco antes de `assertReadingAndWork()` (`:381`, invocado en `:446` y `:473`). La medición ocurre después de desplazar el documento, no en la primera pantalla inicial.

**Impacto:** el equipo comercial debe desplazarse antes de obtener la lectura decisiva o comenzar el trabajo, contrariando el objetivo central de consulta rápida de Fase 7.

**Correctivo requerido:** reducir/ordenar el contenido previo para que lectura principal y comienzo del trabajo estén visibles a scroll 0 en 1280×720. Además, medir geometría antes de cualquier acción que produzca scroll y repetir las 14 superficies en las cuatro geometrías.

## Cobertura independiente

El checker recorrió las seis etapas de Recorrido y ocho rutas expertas en 1440×900, 1280×720, 390×844 y equivalente de zoom 200%. Validó navegación, disclosures, editor de escenario, command palette, reinicio, deep links, paridad visible, vacío/error/insuficiente, acciones primarias, consola, red, recursos, overflow, truncamiento, tamaño táctil, tipografía, contraste, foco y reduced motion.

Pasaron sin brechas adicionales:

- cinco trabajos principales y cuatro herramientas expertas;
- acceso a cuatro rutas expertas en dos interacciones;
- editor de escenario cerrado por defecto, apertura con Enter, cierre con Escape y retorno de foco;
- command palette con Ctrl/Cmd+K, copy local, nueve destinos, navegación por teclado, Escape y sin storage/red;
- reinicio a `/#journey/scale`, query vacía, comparación vacía y foco en título;
- comparación vacía con CTA correctiva;
- Tipo 7 con paridad DOM ↔ estado visible;
- contrato 2.1 con `capability_unavailable` y CTA;
- error global uniforme, sin contenido obsoleto/parcial y con `Reintentar`;
- una o ninguna acción primaria por viewport, sin superar el máximo de una;
- targets interactivos 44×44, texto 16/13 px, contraste AA, foco visible y reduced motion;
- cero overflow/truncamiento material, request fallida o error de consola en los recorridos que pasaron.

El detalle portable está en `evidence/verification/browser-verification.json`; sus repeticiones por viewport se consolidaron en G1 y G2.

## Suite, datos y compatibilidad

`npm.cmd run verify` finalizó con código 0. Pasaron sintaxis, arquitectura, estilo, ownership, módulos, contrato C01–C23, datos, determinismo, privacidad, E2E, smoke, accesibilidad, CT-A–I/P y compatibilidad 2.0–2.4.

Fingerprints observados:

- dataset JSON: `20d44245c956a198c8621b3f544115387037b73cc462e50f63a5ce6d61fb4a37`;
- reporte: `639b613aff89f9605c3dcc74a7914700dfa89fb84ababe70910fc25c3ba81864`;
- GeoJSON: `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0`.

El fixture C01–C23 no cambió desde P7-01 y conserva el objeto Git `15429c090cdeac2bcc9b19ccff74a4849c607e0d`.

## Graphify e impacto

La extracción code-only produjo 4,020 nodos y 8,105 aristas. Los hubs principales incluyen `state`, `render()`, `buildInspectorViewModel()` y `renderMarket()`. La query de frontend alcanzó `navigation.js`, `state.js`, `domain.js`, `controller.js`, `app.js`, Recorrido, las ocho vistas y sus pruebas.

El análisis `affected navigation.js --depth 2` conecta navegación con `app.js`, `controller.js`, `projects.js`, render, shell, editor de escenario, command palette, reset y pruebas de navegación/estado. Por ello, el correctivo no debe comprobar solo CSS: debe repetir shell, títulos/foco, navegación, estado, E2E y responsive.

Graphify no identificó una razón para ampliar el cambio a contratos, writer, dataset o engines puros.

## Auditoría de diff, DAG y límites

- `git diff --check 6251442..HEAD`: PASS.
- DAG de 17 commits: planificación → revisiones → aprobación → baseline → P7-01…P7-09, en orden serial conforme al plan.
- Write sets: consistentes con P7-01…P7-09. Los cambios de integración en `domain.js`, `journey.js`, `app.js` y tests corresponden a P7-08A–F; los ajustes de `journey-shell.mjs` y `journey-reset.mjs` corresponden a P7-09A/B.
- Sin cambios frente a la base en contratos, scripts de datos, dataset público, `datos_relevantes`, engines puros ni workflows.
- No se modificó runtime durante P7-10.
- Las nueve modificaciones preexistentes de evidencia funcional F6 permanecieron intactas.
- El directorio no rastreado de ensayo humano F6 excluido no fue leído ni tocado.

## Decisión y siguiente estado

P7-10 queda **FAIL** por G1 y G2, ambos P2. No se autoriza cerrar la Fase 7 ni avanzar a memoria/PR funcional sobre este candidato como si fuera `PASS`.

Siguiente paso requerido:

1. abrir un correctivo acotado para G1 y G2;
2. añadir una regresión que mida primera pantalla antes de cualquier `scrollIntoViewIfNeeded()`;
3. ejecutar `npm.cmd run verify`;
4. repetir P7-09 en las 14 superficies y cuatro geometrías;
5. repetir P7-10 con un checker independiente sobre un nuevo SHA cerrado.

No surgieron gaps P0, P1 ni P3 adicionales.
