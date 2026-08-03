# Fase 4 — Informe de verificación independiente P4-13, repetición P4-13A

## Veredicto

**PASS**

El gap G1 del informe anterior está cerrado en el SHA `be05fdc456e3ab85da01df26b4cd22daa426dac6`. `#market` y `#compare` ya no contienen `Referencia de precio lista` ni `precios publicados compatibles` en texto visible o accesible. Ambas rutas muestran primero `Referencia de precio no demostrada`, conservan las 69 publicaciones raw con una cautela explícita de pairing, y después presentan de forma coherente 0 referencias elegibles y 68 cocientes orientativos tras excluir CT-G.

No se encontraron gaps bloqueantes en HU-DEMO-501–504, CT-A/B/C/D/G/I/P, contrato 2.3, datos, permisos, privacidad, determinismo, responsive, accesibilidad, regresiones, Graphify o recorrido comercial. HU-DEMO-505 permanece diferida por A10 y no bloquea.

No se requiere `HUMAN-GATE-B`. Las limitaciones ya aceptadas o notas operativas no alteran el veredicto.

Este veredicto cubre la rama funcional antes del PR. No equivale a merge, despliegue ni verificación de GitHub Pages; esos estados corresponden a P4-14, P4-15 y P4-16.

## Identidad y baseline evaluado

- Checker: `/root/phase4_gate_checker`, distinto de los makers.
- Fecha: `2026-08-03`.
- Rama: `feat/phase-4-benchmark-comparator`.
- Commit evaluado: `be05fdc456e3ab85da01df26b4cd22daa426dac6`.
- Commit corto/asunto: `be05fdc fix(ui): align territorial price status with benchmark`.
- Árbol inicial: limpio.
- Commit anterior con informe `FAIL`: `7e5f703675320ea53a157909dc53d1ace7b4e6cb`.
- Baseline del hallazgo G1: `30f0ccebf737bc0aa90c85b35aea0923fa24ba8b`.
- `git diff --check`: PASS.

La enmienda P4-13A está persistida y su commit toca exactamente:

- `.planning/phases/04-benchmark-comparator/AMENDMENT-P4-13A.md`;
- `prototipo_ejecutable/public/js/views/scenario-context.js`;
- `prototipo_ejecutable/tests/scenario-context.mjs`;
- `prototipo_ejecutable/tests/benchmark-e2e.mjs`;
- `prototipo_ejecutable/tests/comparison-e2e.mjs`.

No modifica motor, estado, contrato, dataset, pairing, CT-G, estilos, configuración, inspector o semántica territorial. Este informe es el único path versionable escrito por el checker en la repetición.

## Alcance y método

Se releyeron íntegramente `AMENDMENT-P4-13A.md`, las skills `webapp-testing` y `doc-coauthoring`, y se conservaron como marco los documentos normativos ya auditados en la primera ejecución P4-13:

- `AGENTS.md`;
- `.planning/STATE.md`;
- `.planning/PROJECT.md`;
- `.planning/ROADMAP.md`;
- `.planning/REQUIREMENTS.md`;
- `.planning/VERIFICATION.md`;
- `.planning/GRAPHIFY.md`;
- `CONTEXT.md`, `DATA-ASSESSMENT.md`, `UI-SPEC.md`, `PLAN.md` y `PLAN_REVIEW.md`;
- `HUMAN-GATE-A-REQUEST.md`, `APPROVAL.md` y `AMENDMENT-P4-01.md`;
- `BASELINE_BROWSER.md`;
- el informe P3 como estructura de referencia.

La repetición combinó:

1. auditoría del SHA y write set correctivo;
2. gate automatizado completo;
3. prueba responsive F4 separada;
4. recomposición independiente de payload, hash, particiones, CT-G y permisos;
5. inspección DOM independiente de texto visible y accesible en `#market` y `#compare`;
6. recorrido UI-only cronometrado por escenario, muestra, benchmark, exclusión, comparación y conclusión;
7. Graphify incremental, god nodes y consulta dirigida;
8. revisión final del único diff versionable producido por P4-13.

## Cierre de G1 — coherencia del estado de precio

**PASS**

### Resultado observable

| Criterio P4-13A | `#market` | `#compare` |
|---|---|---|
| No contiene `Referencia de precio lista` | PASS visible y accesible | PASS visible y accesible |
| No contiene `precios publicados compatibles` | PASS visible y accesible | PASS visible y accesible |
| Label cauteloso | `Referencia de precio no demostrada` | `Referencia de precio no demostrada` |
| Símbolo/tono | `!`, cautela | `!`, cautela |
| Conteo raw | 69 publicaciones | 69 publicaciones |
| Explicación de pairing | `no prueban que ambos valores pertenezcan a la misma oferta` | misma explicación |
| Benchmark F4 | 0 parejas elegibles; 68 orientativas | conclusión sin precio/m² elegible |
| CT-G | territorial y excluido por `blocking_issue`; enlace al inspector | no rehabilitado |

La caja visible del nuevo label mide aproximadamente 247×16 px en 1440×900; no es texto escondido. `innerText` y `textContent` devuelven la misma cautela. La URL canónica de cada escenario sigue presente en el árbol accesible.

Los universos quedan correctamente separados:

- `69` es el conteo territorial raw de publicaciones que declaran precio y área total;
- `68` son cocientes orientativos seguros de Miraflores después del overlay CT-G;
- `0` es la muestra elegible `source_paired`.

Ninguno se rotula como compatible, elegible o listo por volumen. G1 queda cerrado sin cambiar datos ni rehabilitar Pardo Coast.

## Resultado por historia

| Historia | Resultado | Evidencia |
|---|---|---|
| HU-DEMO-501 — benchmark de microzona | PASS | Miraflores muestra 85 comparables, 0 parejas elegibles, 68 orientativas y 82 cualitativas; R-7, corte, precio `from`, área total, denominadores, particiones, composición y exclusiones son visibles. El shell previo ahora es coherente. |
| HU-DEMO-502 — benchmark cualitativo | PASS | Estados anunciado/documentado/unknown/restricted/excluded, texto original, cobertura y umbral `n >= 5` pasan dominio, vista y E2E. La UI muestra 82/85 informados; `No informado` no significa ausencia. CT-D abre evidencia y no se extrapola. |
| HU-DEMO-503 — comparador agrupado | PASS | 2/3/3+Viva, máximo tres, universo canónico, nueve grupos, estados por celda, selección reparada, CT-G/inspector, responsive y render puro pasan. La matriz usa filas agrupadas y detalle bajo demanda. |
| HU-DEMO-504 — conclusión ejecutiva | PASS | Hasta tres hallazgos derivados separan hallazgo, implicancia, acción y limitación. El primer CTA enfoca la fila `comparison-row-price-price-per-m2-total`; no hay contradicción previa con el resumen territorial. |
| HU-DEMO-505 — exportación (`Could`) | Diferida, aceptada | A10 la difiere expresamente; no se observó implementación parcial ni dependencia nueva. |

## Casos transversales

| Caso | Resultado | Evidencia |
|---|---|---|
| CT-A | PASS | Área built 98 m² y total 206 m² permanecen separadas; los precios simulados no entran al benchmark de mercado y F4 no infiere built/free. |
| CT-B | PASS | Ambos precios incompatibles se conservan; ninguno se selecciona como verdad o agregado. |
| CT-C | PASS | Escenario, mapa, benchmark y comparador consumen el mismo subconjunto canónico, sin fallback silencioso. |
| CT-D | PASS | Cuarzo abre fuente/fragmento/fecha; `air_conditioning = unknown` no se convierte en `false` ni sustenta prevalencia territorial. |
| CT-G | PASS | Pardo Coast permanece territorial; Tipo 7 y ocho hechos siguen excluidos. El índice marca el proyecto `conflicting`, sin precio/m², y coverage lo excluye por `blocking_issue`; `Abrir inspector` permanece disponible. |
| CT-I | PASS | Miraflores conserva 90 observados, 85 comparables, 5 por revisar y cuadrantes 40/5/5/40. |
| CT-P | PASS | `source_paired`, no emparejado, duplicado, conflicto, restricted, particiones y estados n=0–5 pasan fixtures, reader, dominio y E2E. |

## Contrato, datos y determinismo

**PASS**

Recomposición independiente del JSON público:

- contrato: `2.3.0`;
- dataset: `dataset:viva-platform-demo-2026-07-28`;
- bytes: `7,387,136`, bajo el límite de 10 MB;
- SHA-256: `5d8a13b3e0af73d8dc8cee674f83cea541136b4c49bd444780bac3508f562041`;
- inputs/fingerprints: 50, ordenados;
- modelo: 676 proyectos, 184 agencias, 427 observaciones, 4,021 hechos, 19 documentos, 19 evidencias, 10 issues y 3 eventos;
- benchmark: 397 entradas y 37 atributos;
- partición global de precio/m²: `397 = 0 usados + 26 faltantes + 371 excluidos`;
- 370 cocientes no comparables en Top 7;
- Miraflores: 68 orientaciones seguras y 82 registros cualitativos;
- reporte SHA-256: `3e8fbdb8d3ce73b3a58ea9c70e7b289dc1f5df0d44c0f18f67e445d19c8f4b24`;
- GeoJSON SHA-256: `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0`.

Dos builds consecutivos producen los mismos hashes. El reader acepta 2.0–2.3. El runtime territorial arranca con 2.1/2.2/2.3 y conserva IDs; 2.1/2.2 degradan solo F4 a `contract_unavailable`.

P4-13A no modifica ningún byte del payload, por lo que los hashes y particiones permanecen iguales al SHA verificado en la ejecución anterior.

## Permisos, privacidad y claims

**PASS**

- `data-privacy.mjs`: payload, benchmark, reporte, manifest, 15 binarios autorizados, denylist CT-G y casos negativos pasan.
- Recomposición directa: 0 documentos restricted/pending con ruta o contenido público y 0 evidencias restricted/pending con ruta o fragmento filtrado.
- CT-G no publica binarios ni genera red externa; conserva únicamente el enlace al inspector.
- CT-D abre solo el fragmento autorizado.
- No aparecen HTML crudo, PII, rutas locales o activos restringidos en el payload público.
- El benchmark usa `Precio publicado desde`, `Área total`, `Unidades reportadas por la publicación` y `Atributos anunciados`.
- No se observaron claims de cierre, tasación, demanda, absorción o stock.
- El resumen territorial ya no promueve los campos raw a referencia elegible.

## Gate automatizado

Desde `prototipo_ejecutable/`:

```powershell
npm.cmd run verify
```

**Resultado: PASS**, exit code 0.

Resultados relevantes:

- sintaxis: PASS;
- arquitectura: 22 módulos alcanzables, sin ciclo nuevo y una recomposición por cambio de escenario;
- escenario, incluido nuevo tono/label/símbolo/detalle y negativos del copy: PASS;
- comparabilidad, mapa, proyectos y asistente: PASS;
- contrato 2.3 y compatibilidad reader/runtime: PASS;
- schema, referencias, geografía, agencias y catálogos extensibles: PASS;
- datos, privacidad y determinismo: PASS;
- inspector CT-D/CT-G: PASS;
- benchmark data/domain/state/view/events: PASS;
- benchmark E2E: CT-C/G/I/P, n=0–5, sin precio, no emparejado, restricted, error, legacy, deep-link, copy territorial y red cerrada;
- comparación E2E: 2/3/3+Viva, CT-G, unknown, evidencia, foco, Escape, reload, copy territorial, conclusión y red cerrada;
- smoke: 8 rutas × 3 viewports;
- a11y smoke: 8 rutas × 3 viewports.

Prueba adicional fuera de `verify`:

```powershell
node tests/benchmark-comparison-responsive.mjs
```

**Resultado: PASS** en 1440×900, 1280×720, 390×844 y reflow 200%, con contraste, foco, densidad, sticky, targets 44×44 y reduced motion cubiertos.

## Responsive y accesibilidad

**PASS**

- 1440×900: cédula, label cauteloso y conclusión renderizan sin overflow bloqueante.
- 1280×720: estado, denominador y CTA principal permanecen accesibles.
- 390×844: filas apiladas, nombres/estados legibles y selector operable.
- Reflow 200%: sin truncamiento o solapamiento bloqueante.
- Targets relevantes: mínimo 44×44.
- Contraste, foco visible, sticky headers y reduced motion: PASS.
- Teclado, Escape, retorno de foco y anuncios: PASS en E2E.
- El CTA de conclusión enfocó `#comparison-row-price-price-per-m2-total`, sin depender de hover.
- El copy prohibido está ausente tanto de `innerText` como de `textContent`.
- Cero errores de consola, página, HTTP, requests fallidos o red externa en el recorrido final.

## Gate narrativo — recorrido UI-only

**PASS**

El checker ejecutó el recorrido final usando controles y texto renderizados:

1. escenario Miraflores, distrito completo;
2. muestra de 85 comparables;
3. cautela territorial: 69 publicaciones raw no demuestran una pareja de la misma oferta;
4. benchmark: 0 parejas elegibles, 68 orientativas y 82 cualitativas informadas;
5. composición/exclusiones y Pardo Coast `blocking_issue` con `Abrir inspector`;
6. CTA `Comparar proyectos de esta muestra`;
7. comparador con 3/3 proyectos;
8. conclusión `No hay precio por m² elegible para posicionamiento`;
9. foco en la fila que sustenta el hallazgo.

Registro:

- inicio: `2026-08-03T21:32:28.826Z`;
- fin: `2026-08-03T21:32:30.551Z`;
- interacción automatizada UI-only: `00:00:01.725`, menor a 5:00;
- problemas de consola/HTTP/página/red externa: 0.

El tiempo corresponde a la automatización del recorrido, no a una medición humana. La comprobación narrativa evaluó además que el texto visible permite explicar, sin resolver nada por intuición, la diferencia entre 69 raw, 68 orientativos y 0 elegibles.

## Regresiones y alcance correctivo

**PASS**

- F2 conserva CT-C/CT-I, IDs, URL, cuadrantes, radio y selección territorial.
- F3 conserva CT-D/CT-G, permisos, inspector, 19 documentos/evidencias y 15 activos autorizados.
- Las ocho rutas renderizan en tres viewports.
- `projects-compare.mjs` pasa búsqueda profunda, universo canónico, máximo tres, vacío y escaping.
- Contratos 2.1/2.2 preservan F2/F3; 2.3 añade F4.
- La corrección P4-13A no toca motor, estado, datos, contrato, pairing, CT-G, estilos o configuración.
- `git diff --check`: PASS.

Las tres ampliaciones conversacionales previas siguen cubiertas por autoridad explícita:

1. P4-04 podía actualizar tres regresiones legacy por contrato 2.3/50 fingerprints.
2. P4-04 podía adaptar dos integraciones F1 a catálogos extensibles, preservando sus registros originales.
3. P4-11 podía migrar `tests/projects-compare.mjs` e integrar los E2E F4 en `package.json`, sin cambiar runtime, datos o estilos.

P4-14 debe consolidarlas en la memoria del repositorio, pero no representan sobrealcance de P4-13A.

## Graphify

Comandos:

```powershell
$env:UV_CACHE_DIR = "$PWD\.cache\uv"
uvx --from graphifyy graphify extract . --code-only --no-cluster
uvx --from graphifyy graphify god-nodes --top 15
uvx --from graphifyy graphify query "scenario price status benchmark comparison eligibility" --budget 3000
```

Resultado:

- 3,034 nodos;
- 5,743 relaciones;
- 4 archivos de código cambiados y 116 sin cambios en la extracción incremental;
- 27 archivos, principalmente CSS, no fueron clasificados; `00-tokens.css` fue omitido por heurística sensible;
- `buildDemoBundle`: 42 relaciones;
- `buildBenchmarkContext`: posición 11, 22 relaciones;
- `materializeMarketBenchmark`: posición 14, 20 relaciones;
- `validateRootDocument`: posición 15, 20 relaciones;
- no se detectó ciclo, hub nuevo o ampliación arquitectónica bloqueante.

Limitación conocida: `--code-only` no representa adecuadamente CSS/JSON. Se compensa con hashes, contrato/privacidad, `module-graph.mjs`, responsive y navegador. `graphify-out/` y `.cache/` están ignorados y no alteran el diff versionable.

## Riesgos residuales y notas

### Gaps bloqueantes

Ninguno.

### Notas no bloqueantes

1. **Fuente Nexo `pending_review` — condición aceptada.** A1 limita su uso a la demo y no sustituye revisión jurídica para producción o distribución adicional.
2. **Memoria de enmiendas conversacionales — trazabilidad.** Las ampliaciones acotadas de P4-04/P4-11 fueron autorizadas explícitamente, pero P4-14 debe consolidarlas en la memoria portable del repositorio.
3. **Graphify parcial para CSS/JSON — baja, conocida.** Mitigada mediante tests, hashes y navegador.
4. **Cronómetro automatizado — operativo.** El journey demuestra rutas, copy, foco y ausencia de errores; antes de una presentación real sigue siendo recomendable un ensayo humano breve.

Estas notas no introducen una afirmación funcional incierta ni requieren `HUMAN-GATE-B`.

## Conclusión y siguiente acción

Fase 4 cumple P4-13 en `be05fdc456e3ab85da01df26b4cd22daa426dac6`. Puede avanzar a **P4-14 — memoria y PR funcional**.

El PR debe conservar este SHA o repetir P4-13 si cambia código, datos, tests, estilos, assets o comportamiento después de este informe. P4-15 deberá verificar Pages en modo read-only tras el merge humano y P4-16 persistirá ese resultado por separado.
