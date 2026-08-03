# Fase 4 — Informe de verificación independiente P4-13

## Veredicto

**FAIL**

La implementación pasa los gates técnicos, de datos, privacidad, determinismo, regresión, responsive, accesibilidad y Graphify. Sin embargo, existe un gap narrativo bloqueante en las dos rutas centrales de la fase: el resumen territorial global afirma `Referencia de precio lista` y expone `69 precios publicados compatibles`, mientras el benchmark F4 declara `0` parejas elegibles y `68` cocientes orientativos no comparables. En el comparador, esa misma afirmación global precede la conclusión `No hay precio por m² elegible para posicionamiento`.

La contradicción incumple A11, conserva exactamente el lenguaje que `BASELINE_BROWSER.md` congeló para reemplazar y hace imposible que un lector nuevo explique de forma inequívoca qué referencia puede sostenerse. HU-DEMO-501 y el gate narrativo no están terminados; P4-14 queda bloqueada.

`HUMAN-GATE-B` no aplica a un `FAIL`. Primero debe corregirse el gap y repetirse P4-13 sobre un nuevo SHA.

Este veredicto cubre la rama funcional antes del PR. No equivale a merge, despliegue ni verificación de GitHub Pages.

## Identidad y baseline evaluado

- Checker: `/root/phase4_gate_checker`, distinto de los makers.
- Fecha: `2026-08-03`.
- Rama: `feat/phase-4-benchmark-comparator`.
- Commit evaluado: `30f0ccebf737bc0aa90c85b35aea0923fa24ba8b`.
- Commit corto/asunto: `30f0cce style(ui): harden phase 4 responsive layouts`.
- Árbol inicial: limpio.
- Diff de referencia: `main...30f0cce`, 74 paths y 123,783 inserciones/8,082 eliminaciones.
- `git diff --check`: PASS.
- El cambio protegido de `public/js/scenario.js` se limita a añadir `2.3.0` al allowlist, como autoriza A12.
- `app.js`, `domain.js`, `comparability.js`, `navigation.js`, el motor/vista del inspector, mapas, activos de evidencia y workflow Pages permanecen sin cambios.

Además de la enmienda P4-01 persistida, el usuario autorizó en la conversación tres ampliaciones acotadas:

1. P4-04 podía actualizar tres regresiones legacy por contrato 2.3/50 fingerprints.
2. P4-04 podía adaptar dos integraciones F1 a catálogos extensibles, preservando sus registros originales.
3. P4-11 podía migrar `tests/projects-compare.mjs` e integrar los E2E F4 en `package.json`, sin cambiar runtime, datos o estilos.

Esas autorizaciones tienen precedencia y cubren los paths adicionales observados. No se tratan como sobrealcance. Su ausencia como enmiendas persistidas es un riesgo documental que P4-14 deberá registrar si la fase vuelve a pasar.

## Alcance y método

Se leyeron íntegramente:

- `AGENTS.md`;
- `.planning/STATE.md`;
- `.planning/PROJECT.md`;
- `.planning/ROADMAP.md`;
- `.planning/REQUIREMENTS.md`;
- `.planning/VERIFICATION.md`;
- `.planning/GRAPHIFY.md`;
- `CONTEXT.md`;
- `DATA-ASSESSMENT.md`;
- `UI-SPEC.md`;
- `PLAN.md`;
- `PLAN_REVIEW.md`;
- `HUMAN-GATE-A-REQUEST.md`;
- `APPROVAL.md`;
- `AMENDMENT-P4-01.md`;
- `BASELINE_BROWSER.md`;
- `.planning/phases/03-evidence-inspector/VERIFICATION_REPORT.md` como estructura de referencia;
- las skills `webapp-testing` y `doc-coauthoring`.

La evaluación combinó:

1. gate automatizado completo;
2. prueba responsive F4 separada;
3. recomposición independiente del contrato, payload, hashes, particiones y permisos;
4. recorrido UI-only cronometrado por escenario, muestra, benchmark, exclusión, comparación y conclusión;
5. inspección específica del orden y copy accesible de `#market` y `#compare`;
6. Graphify regenerado en salida local ignorada y consulta dirigida;
7. auditoría de diff, archivos protegidos y autoridades de `write_set`.

P4-13 no modificó producto, datos, tests ni otros documentos. Graphify escribió solo `graphify-out/` y `.cache/`, ambos ignorados. Este informe es el único path versionable escrito por el checker.

## Gap bloqueante G1 — dos verdades incompatibles sobre el precio por m²

**Severidad: bloqueante**

### Evidencia observable

| Ruta | Afirmación global que aparece primero | Lectura F4 posterior | Resultado |
|---|---|---|---|
| `#market` | `Referencia de precio lista`; texto accesible `69 precios publicados compatibles` | `Pareja demostrada 0`; `Orientación 68`; `No demuestra una tipología y no sustenta una recomendación de precio` | Contradicción visible y semántica |
| `#compare` | `Referencia de precio lista`; texto accesible `69 precios publicados compatibles` | `No hay precio por m² elegible para posicionamiento`; los cocientes no emparejados permanecen no comparables | Contradicción visible y semántica |

En 1440×900, el label global aparece aproximadamente en `y = 265` y la tesis honesta del benchmark comienza en `y = 458`: el claim incorrecto precede a la explicación F4. El detalle `69 precios publicados compatibles` está expuesto al árbol accesible aunque su caja visual sea de 1×1 px; el label `Referencia de precio lista` sí ocupa una caja visible de aproximadamente 247×16 px.

El origen está en:

- `prototipo_ejecutable/public/js/views/scenario-context.js:183-184`;
- `prototipo_ejecutable/tests/scenario-context.mjs:170` y `:204`, que aún fijan el copy legacy.

No es una diferencia cosmética. Los `69` candidatos territoriales legacy no aplican el overlay F4; el benchmark reduce la orientación segura a `68` porque CT-G queda fuera por `blocking_issue`. La interfaz comunica simultáneamente dos políticas y dos conteos.

### Criterios incumplidos

- A11: un cociente no emparejado nunca cambia a listo por volumen ni sustenta recomendación de precio.
- `BASELINE_BROWSER.md`, gap visual 1: el lenguaje `referencia de precio lista` debía reemplazarse por el índice orientativo no comparable.
- HU-DEMO-501, criterios 7–8 y 11: estados y semántica prudente del precio.
- HU-DEMO-504, criterios 8–9: insuficiencia y orientación no comparable no pueden convivir con un claim global de referencia lista.
- Gate narrativo: un lector nuevo no puede explicar una única conclusión sin resolver por intuición la contradicción 69/lista frente a 0/68/no comparable.

### Remediación requerida

1. Aprobar una enmienda con rutas exactas para el resumen territorial compartido y sus pruebas; el checker no amplía el `write_set` por su cuenta.
2. En `#market` y `#compare`, eliminar el estado `Referencia de precio lista` para cocientes sin pairing. El resumen debe derivar del `benchmarkContext` o rotular de manera inequívoca `0 referencias elegibles · 68 cocientes orientativos no comparables`.
3. Conservar la exclusión CT-G, de modo que el conteo F4 permanezca en 68 para Miraflores mientras no cambie la evidencia.
4. Añadir una prueba E2E del resumen global en ambas rutas y una negativa que rechace `Referencia de precio lista` cuando `source_paired n = 0`.
5. Ejecutar nuevamente `npm.cmd run verify`, `node tests/benchmark-comparison-responsive.mjs`, el recorrido de lector y P4-13 completo sobre el nuevo SHA.

## Resultado por historia

| Historia | Resultado | Evidencia |
|---|---|---|
| HU-DEMO-501 — benchmark de microzona | **FAIL** | La cédula F4 es correcta: Miraflores 85 comparables, 0 parejas, 68 orientativos, 82 cualitativos, R-7, denominadores y exclusiones. El resumen global previo contradice esa lectura con `Referencia de precio lista · 69`, por lo que la historia no entrega una referencia inequívoca. |
| HU-DEMO-502 — benchmark cualitativo | PASS | Estados anunciado/documentado/unknown/restricted/excluded, originales, cobertura y umbral `n >= 5` pasan dominio, vista y E2E. UI visible: 82/85 informados; `No informado` no significa ausencia. CT-D abre evidencia y no se extrapola. |
| HU-DEMO-503 — comparador agrupado | PASS funcional | 2/3/3+Viva, máximo tres, universo canónico, nueve grupos, estados por celda, selección reparada, CT-G/inspector, responsive y render puro pasan. La ruta queda afectada narrativamente por G1, pero la matriz en sí cumple. |
| HU-DEMO-504 — conclusión ejecutiva | **FAIL de experiencia integrada** | El modelo deriva hasta tres hallazgos y cada CTA enfoca la fila sustentatoria. Sin embargo, la conclusión `No hay precio por m² elegible` aparece debajo del claim global `Referencia de precio lista`; la experiencia integrada no es explicable sin contradicción. |
| HU-DEMO-505 — exportación (`Could`) | Diferida, aceptada | A10 la difiere expresamente; no bloquea por sí sola F4 y no se observó implementación parcial. |

## Casos transversales

| Caso | Resultado | Evidencia |
|---|---|---|
| CT-A | PASS | Área built 98 m² y total 206 m² permanecen separadas; precios simulados no entran al mercado y F4 no inventa built/free. |
| CT-B | PASS | Los dos precios incompatibles se conservan; ninguno se promueve a verdad ni agregado. |
| CT-C | PASS | Escenario, mapa, benchmark y comparador consumen el mismo subconjunto; sin fallback silencioso. |
| CT-D | PASS | Cuarzo abre fuente/fragmento/fecha; `air_conditioning = unknown` no se convierte en `false` ni en prevalencia territorial. |
| CT-G | PASS analítico | Pardo Coast permanece territorial; Tipo 7 y sus ocho hechos siguen excluidos; el índice marca el proyecto `conflicting`, precio/m² nulo y coverage lo excluye por `blocking_issue`; la UI muestra `Abrir inspector`. |
| CT-I | PASS | Miraflores conserva 90 observados, 85 comparables, 5 por revisar y cuadrantes 40/5/5/40. |
| CT-P | PASS | `source_paired`, no emparejado, duplicado, conflicto, restricted, particiones y estados n=0–5 pasan fixtures, reader, dominio y E2E. |

Los casos pasan como reglas de datos/dominio. No compensan G1 porque el problema es precisamente que el shell visible continúa publicando la lectura legacy anterior al overlay CT-G/F4.

## Contrato, datos y determinismo

**PASS técnico**

Recomposición independiente del JSON público:

- contrato: `2.3.0`;
- dataset: `dataset:viva-platform-demo-2026-07-28`;
- bytes: `7,387,136`, bajo el límite de 10 MB;
- SHA-256: `5d8a13b3e0af73d8dc8cee674f83cea541136b4c49bd444780bac3508f562041`;
- modelo: 676 proyectos, 184 agencias, 427 observaciones, 4,021 hechos, 19 documentos, 19 evidencias, 10 issues y 3 eventos;
- benchmark: 397 entradas, 37 atributos;
- metodología: R-7, cuantitativo mínimo 3, cualitativo mínimo 5 y denominador permitido `total`;
- partición global de precio/m²: `397 = 0 usados + 26 faltantes + 371 excluidos`;
- 370 cocientes no comparables en Top 7; Miraflores contiene 68 orientaciones seguras después del overlay CT-G;
- dos builds consecutivos: hashes idénticos;
- 50 inputs ordenados;
- reporte SHA-256: `3e8fbdb8d3ce73b3a58ea9c70e7b289dc1f5df0d44c0f18f67e445d19c8f4b24`;
- GeoJSON SHA-256 estable: `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0`.

El reader acepta 2.0–2.3. El runtime territorial arranca con 2.1/2.2/2.3 y conserva IDs; 2.1/2.2 degradan solo F4 a `contract_unavailable`.

## Permisos, privacidad y claims

**PASS técnico**

- `data-privacy.mjs`: payload, benchmark, reporte, manifest, 15 binarios autorizados, denylist CT-G y negativos pasan.
- Recomposición directa: 0 documentos restricted/pending con ruta o contenido público y 0 evidencias restricted/pending con ruta o fragmento filtrado.
- CT-G no publica binarios ni genera red externa; conserva solo el enlace al inspector.
- CT-D abre únicamente el fragmento autorizado.
- No aparecen HTML crudo, PII, rutas locales o activos restringidos en el payload público.
- El benchmark usa `Precio publicado desde`, `Área total`, `Unidades reportadas por la publicación` y `Atributos anunciados` en su cuerpo F4.
- No se observaron claims de cierre, tasación, demanda, absorción o stock en benchmark/conclusión.

La excepción es G1: `Referencia de precio lista` es un claim de estado no permitido para la serie no emparejada.

## Gate automatizado

Desde `prototipo_ejecutable/`:

```powershell
npm.cmd run verify
```

**Resultado: PASS**, exit code 0.

Resultados relevantes:

- sintaxis: PASS;
- arquitectura: 22 módulos alcanzables, sin ciclo nuevo, una recomposición por cambio de escenario;
- escenario/comparabilidad/mapa/proyectos/asistente: PASS;
- contrato 2.3 y compatibilidad reader/runtime: PASS;
- schema, referencias, geografía y agencias: PASS;
- datos, privacidad y determinismo: PASS;
- inspector CT-D/CT-G: PASS;
- benchmark data/domain/state/view/events: PASS;
- E2E escenario/inspector/benchmark/comparador: PASS;
- benchmark E2E: CT-C/G/I/P, n=0–5, sin precio, no emparejado, restricted, error, legacy, deep-link y red cerrada;
- comparación E2E: 2/3/3+Viva, CT-G, unknown, evidencia, foco, Escape, reload, legacy/error y red cerrada;
- smoke: 8 rutas × 3 viewports;
- a11y smoke: 8 rutas × 3 viewports.

Prueba adicional fuera de `verify`:

```powershell
node tests/benchmark-comparison-responsive.mjs
```

**Resultado: PASS** en 1440×900, 1280×720, 390×844 y reflow 200%, con contraste, foco, densidad, sticky, targets 44×44 y reduced motion cubiertos.

El gate automatizado no detecta G1 porque `scenario-context.mjs` todavía afirma el copy legacy y los E2E F4 no comprueban la coherencia del resumen territorial compartido con `benchmarkContext`.

## Responsive y accesibilidad

**PASS técnico**

- 1440×900: cédula y conclusión renderizan sin overflow bloqueante.
- 1280×720: veredicto, denominador y CTA principal permanecen accesibles.
- 390×844: filas apiladas, nombres/estados legibles y selector operable.
- Reflow 200%: sin truncamiento o solapamiento bloqueante.
- Targets relevantes: mínimo 44×44.
- Contraste, foco visible, sticky headers y reduced motion: PASS.
- Teclado, Escape, retorno de foco y anuncios: PASS en E2E.
- El CTA de una conclusión enfocó `#comparison-row-price-price-per-m2-total`, demostrando trazabilidad sin hover.
- Cero errores de consola, página, HTTP, requests fallidos o red externa en el recorrido final.

G1 también afecta accesibilidad semántica: el detalle `69 precios publicados compatibles` permanece en el árbol accesible aunque visualmente esté reducido.

## Gate narrativo — recorrido UI-only

**FAIL semántico**

El checker ejecutó un recorrido final usando solo controles y texto visibles, sin consultar código o tests durante el tramo cronometrado:

1. escenario Miraflores, distrito completo;
2. muestra de 85 comparables;
3. benchmark con 0 parejas elegibles, 68 orientativas y 82 cualitativas informadas;
4. composición/exclusiones y Pardo Coast `blocking_issue` con `Abrir inspector`;
5. CTA `Comparar proyectos de esta muestra`;
6. comparador con 3/3 proyectos;
7. conclusión explicable y foco en la fila de precio/m² total.

Registro del proxy automatizado:

- inicio: `2026-08-03T20:43:41.265Z`;
- fin: `2026-08-03T20:43:43.953Z`;
- interacción automatizada: `00:00:02.688`, menor a 5:00;
- consola/red: 0 problemas.

La velocidad del proxy no se presenta como tiempo humano de lectura. La comprensión visible sí se recompuso, pero no puede aprobarse: antes del benchmark el lector recibe `Referencia de precio lista · 69`, y después debe aceptar `0 elegibles · 68 orientativos`. En `#compare` recibe el mismo estado global y luego `No hay precio por m² elegible`. La secuencia mecánica cabe en cinco minutos; la conclusión comercial no es unívoca.

Dos intentos intermedios fallaron por selectores del checker —primero trató la navegación lateral como enlace y luego intentó abrir un `<summary>` oculto del contexto legacy—. No fueron fallos de la aplicación y no se usan como evidencia del veredicto. El recorrido final usó únicamente controles visibles y terminó sin errores.

## Regresiones

**PASS técnico**

- F2 conserva CT-C/CT-I, IDs, URL, cuadrantes, radio y selección territorial.
- F3 conserva CT-D/CT-G, permisos, inspector, 19 documentos/evidencias y 15 activos autorizados.
- Las ocho rutas renderizan en tres viewports.
- `projects-compare.mjs` migra al motor F4 y pasa búsqueda profunda, universo canónico, máximo tres, vacío y escaping.
- Contratos 2.1/2.2 preservan F2/F3; 2.3 añade F4.
- `git diff --check`: PASS.

La regresión narrativa G1 no rompe ejecución, pero sí mantiene una semántica F2 incompatible dentro de las rutas F4.

## Graphify

Comandos:

```powershell
$env:UV_CACHE_DIR = "$PWD\.cache\uv"
uvx --from graphifyy graphify extract . --code-only --no-cluster
uvx --from graphifyy graphify god-nodes --top 15
uvx --from graphifyy graphify query "benchmark comparison scenario eligibility exclusions" --budget 3000
```

Resultado:

- 3,034 nodos;
- 5,744 relaciones;
- 84 archivos de código cambiados y 36 sin cambios;
- 22 fuentes de datos produjeron cero nodos;
- 27 archivos, principalmente CSS, no fueron clasificados; `00-tokens.css` fue omitido por heurística sensible;
- `buildDemoBundle` es el nodo más conectado con 42 relaciones;
- `buildBenchmarkContext` aparece en posición 11 con 22 relaciones;
- `materializeMarketBenchmark` aparece en posición 14 con 20 relaciones;
- `validateRootDocument` aparece en posición 15 con 20 relaciones;
- la consulta enlaza contrato, validator, estado, benchmark, vista de mercado y exclusiones;
- no se detectó un ciclo o hub F4 nuevo que bloquee por arquitectura.

Limitación conocida: `--code-only` no representa adecuadamente CSS/JSON. Se compensó con hashes, tests de contrato/privacidad, `module-graph.mjs`, responsive y navegador. `graphify-out/` y `.cache/` están ignorados; no alteran el diff versionable.

## Riesgos residuales y gaps

### Gaps bloqueantes

1. **G1 — claim global de precio incompatible con F4 (bloqueante).** Debe corregirse y volver a verificarse.

### Riesgos no bloqueantes observados

1. **Fuente Nexo `pending_review` — externa/alta, aceptada para demo.** A1 no sustituye revisión jurídica para producción o distribución adicional.
2. **Enmiendas conversacionales no persistidas — trazabilidad/media.** Las tres autorizaciones adicionales son válidas por precedencia, pero un agente nuevo no puede reconstruirlas solo desde el repositorio. Deben persistirse en P4-14 después de resolver G1.
3. **Graphify parcial para CSS/JSON — baja, conocida.** Mitigada por tests, hashes y navegador.
4. **Lector humano separado no ejecutado — evidencia/media.** Se realizó un proxy UI-only por el checker. Después de corregir G1 conviene repetir con un lector comercial distinto y registrar un tiempo humano real; el proxy actual no sustituye esa evidencia.

Los riesgos 2–4 no cambian por sí solos el veredicto; G1 ya obliga a `FAIL`.

## Conclusión y siguiente acción

La Fase 4 no puede avanzar a P4-14 en `30f0ccebf737bc0aa90c85b35aea0923fa24ba8b`.

El producto demuestra correctamente contrato 2.3, pairing fail-closed, CT-A/B/C/D/G/I/P, benchmark, comparador, conclusión, privacidad, determinismo, responsive y accesibilidad. El bloqueo está en la narrativa integrada: el shell territorial publica una referencia `lista` de 69 antes de que F4 explique que hay 0 elegibles y 68 orientativas.

Debe aprobarse una enmienda acotada, corregirse el resumen compartido, añadir el E2E negativo y repetir P4-13 completo sobre el nuevo SHA. No se debe resolver ocultando la cédula F4, reintroduciendo CT-G ni llamando elegible al cociente legacy.
