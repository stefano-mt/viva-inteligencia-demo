# P4-15 — Verificación post-merge de GitHub Pages

**Fecha de verificación:** 2026-08-03

**Veredicto:** `PASS`

**Resultado técnico de P4-15:** despliegue verificado con `PASS`

**Estado oficial en `main`:** pendiente de fusionar el PR documental P4-16

## Resumen ejecutivo

El PR funcional #13 fue fusionado por un humano y GitHub Pages desplegó exactamente el SHA de merge `e2c953fa36de49c658393669a4a2d40e469e5790`. La URL pública, el contrato `2.3.0`, el dataset determinista, los quince activos autorizados y los recorridos CT-C, CT-G y CT-I fueron verificados de forma read-only.

El despliegue conserva la tesis prudente de Fase 4: Miraflores presenta 69 publicaciones raw con precio y área total declarados, 68 cocientes orientativos después del overlay CT-G y 0 parejas precio–área elegibles. Benchmark y comparador no rehabilitan hechos incompatibles ni convierten mínimos no emparejados en recomendación de precio.

No se detectaron errores de consola, página, HTTP o red externa. P4-15 no modificó el repositorio ni recursos desplegados.

## Evidencia de despliegue

| Evidencia | Resultado |
|---|---|
| PR documental P4-16 | [#14 — docs: record phase 4 postmerge verification](https://github.com/stefano-mt/viva-inteligencia-demo/pull/14), `OPEN / READY TO MERGE`, pendiente de merge humano |
| PR funcional | [#13 — feat: add explainable benchmark and project comparison](https://github.com/stefano-mt/viva-inteligencia-demo/pull/13), `MERGED` |
| Fecha del merge | `2026-08-03T23:19:02Z` |
| Head final del PR #13 | `bd631bf0d02c7deffda7e00434c459f5e5de9151` |
| SHA del merge y despliegue | `e2c953fa36de49c658393669a4a2d40e469e5790` |
| Workflow | [Deploy demo to GitHub Pages — run 30861830772](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/30861830772), `success` |
| Job | [deploy — 91845256955](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/30861830772/job/91845256955), `success` |
| Despliegue completado | `2026-08-03T23:19:22Z` |
| URL pública | [https://stefano-mt.github.io/viva-inteligencia-demo/](https://stefano-mt.github.io/viva-inteligencia-demo/), HTTP 200 |
| Última modificación HTTP observada | `Mon, 03 Aug 2026 23:19:18 GMT` |

El `headSha` del workflow coincide exactamente con el SHA del merge funcional.

## Integridad del artefacto público

| Artefacto | HTTP | Bytes descargados | SHA-256 / resultado |
|---|---:|---:|---|
| Raíz de la demo | 200 | 421 | GitHub Pages operativo |
| `demo-data/viva-platform-demo.json` | 200 | 7,387,136 | `5d8a13b3e0af73d8dc8cee674f83cea541136b4c49bd444780bac3508f562041` |
| `styles.css` | 200 | 542 | CSS principal disponible |
| `app.js` | 200 | 10,785 | Orquestador disponible |
| `js/benchmark.js` | 200 | 52,915 | Motor F4 disponible |
| `js/views/market.js` | 200 | 35,873 | Vista benchmark disponible |
| `js/views/compare.js` | 200 | 22,875 | Vista comparador disponible |

Datos recompuestos desde el JSON público:

- contrato: `2.3.0`;
- dataset: `dataset:viva-platform-demo-2026-07-28`;
- 50 fingerprints ordenados;
- 676 proyectos y 184 agencias;
- 427 observaciones y 4,021 hechos;
- 19 evidencias;
- 397 entradas benchmark y 37 atributos;
- 15 activos visuales autorizados.

Los quince activos de `inspector.assets` respondieron HTTP 200. Sus bytes y SHA-256 coincidieron individualmente con el manifest público: 15/15 PASS, 0 discrepancias.

## Criterios P4-15

| # | Criterio | Resultado | Evidencia |
|---:|---|---|---|
| 1 | PR fusionado y SHA trazable | PASS | PR #13, head `bd631bf` y merge `e2c953f`. |
| 2 | Workflow Pages exitoso para el mismo SHA | PASS | Run `30861830772`, job `91845256955`, `headSha = e2c953f`. |
| 3 | URL pública, módulos y dataset HTTP 200 | PASS | Raíz, JSON, CSS, app, motor y vistas disponibles. |
| 4 | Contrato 2.3 e integridad determinista | PASS | 7,387,136 bytes y SHA-256 exacto; 50 fingerprints. |
| 5 | CT-C y CT-I públicos | PASS | Escenario canónico, propagación, móvil, 90 observados, 85 comparables y cuadrantes conservados. |
| 6 | CT-G público en benchmark | PASS | Pardo Coast territorial; pairing `conflicting`, `blocking_issue`, sin precio/m² y con enlace al inspector. |
| 7 | Benchmark y comparador públicos | PASS | 69 raw / 68 orientativos / 0 elegibles; nueve grupos y conclusión prudente. |
| 8 | Activos y privacidad | PASS | 15/15 activos autorizados; cero contenido CT-G restringido solicitado. |
| 9 | Escritorio, móvil, consola y red | PASS | Smoke/a11y 8×3, benchmark/comparador desktop+mobile y observabilidad limpia. |

## CT-C y CT-I públicos

El E2E de escenario se ejecutó directamente contra GitHub Pages mediante `BASE_URL` y confirmó:

- URL canónica CT-C y persistencia en recarga;
- mismo conjunto canónico en mapa, proyectos y consumidores;
- propagación de escenario sin fallback silencioso;
- CT-I con 90 observados, 85 comparables y 5 por revisar;
- navegación por teclado y viewport móvil;
- estado de cero resultados sin recuperar comparables de otro escenario.

El contrato remoto leído durante el recorrido fue `2.3.0`. La compatibilidad histórica del descriptor CT-C se conserva sin degradar F2/F3.

## Benchmark público

En `#market`, escritorio y móvil mostraron:

- `Benchmark de microzona`;
- estado `orientative_noncomparable`;
- 85 comparables;
- 68 cocientes orientativos;
- partición `85 entrada = 0 usados + 16 faltantes + 69 excluidos`;
- resumen territorial `Referencia de precio no demostrada`;
- detalle que explica que 69 publicaciones declaran precio y área total, pero no prueban pertenencia a la misma oferta;
- ausencia de `Referencia de precio lista` y `precios publicados compatibles`.

La auditoría desplegada conserva `project:nexo-2951`, razón `blocking_issue` y enlace a `#inspector/case/f3-ct-g-pardo`.

## CT-G público

La entrada remota de Pardo Coast conserva:

```text
project_id: project:nexo-2951
pairing_status: conflicting
pairing_basis: none
total_area_fact_id: null
price_per_m2_fact_id: null
```

Resultado visible:

- Pardo Coast permanece en el universo territorial y es seleccionable en el comparador;
- Tipo 7 y sus ocho hechos incompatibles no se rehabilitan;
- el benchmark explica la exclusión mediante `blocking_issue`;
- el comparador no muestra 104.15 m² ni 53.37 m² como verdad seleccionada;
- el inspector sigue accesible;
- no se publicó ni solicitó ningún original CT-G.

## Comparador público

La ruta `#compare` pasó el E2E desplegado y la comprobación desktop/mobile:

- estados 2/3/3+Viva;
- máximo tres proyectos canónicos;
- nueve grupos de comparación;
- estados unknown/restricted/excluded sin convertir faltantes en ausencia;
- Pardo Coast seleccionable territorialmente, con precio y áreas no informados;
- evidencia permitida y enlace al inspector;
- foco, Escape, retorno de foco, deep-link y recarga;
- conclusión `No hay precio por m² elegible para posicionamiento`;
- cero errores de consola, página, HTTP o red externa.

## Navegador, responsive y accesibilidad

Sobre la URL pública pasaron:

- smoke de 8 rutas × 3 viewports;
- accesibilidad de 8 rutas × 3 viewports;
- CT-C/CT-I con teclado y móvil;
- comparador E2E completo;
- benchmark y comparador en 1440×900 y 390×844;
- navegación, foco y estados accesibles;
- carga sin solicitudes externas.

Resultado de observabilidad:

- 0 errores de consola;
- 0 errores de página;
- 0 respuestas HTTP 4xx/5xx;
- 0 fallos de red;
- 0 solicitudes externas no aprobadas.

## Restricciones y notas vigentes

1. Nexo continúa `pending_review`; este PASS no sustituye revisión jurídica para producción o distribución adicional.
2. El benchmark elegible de precio/m² permanece con `n = 0`. Es el resultado prudente esperado, no un fallo de despliegue.
3. HU-DEMO-505/exportación permanece diferida.
4. El recorrido cronometrado de P4-13 fue automatizado. El checker independiente lo aceptó dentro de su veredicto `PASS`, pero no demuestra por sí mismo comprensión por un lector comercial nuevo. Se conserva como gap residual de gobernanza y debe realizarse un ensayo humano breve antes de presentar la demo al cliente; no invalida las comprobaciones técnicas post-merge de P4-15.
5. P4-15 fue read-only y no reejecutó Graphify porque no hubo cambio de código posterior al checker P4-13.

No se encontraron gaps o riesgos nuevos derivados del merge o del despliegue.

## Cierre

- P4-15 fue read-only y no modificó el repositorio ni recursos externos.
- El PR funcional #13 y el workflow de Pages apuntan al mismo SHA `e2c953f`.
- P4-15 demuestra con `PASS` que `e2c953fa36de49c658393669a4a2d40e469e5790` está desplegado y verificado técnicamente.
- Conforme al contrato de P4-16, Fase 4 solo adquiere el estado oficial `deployed and verified` en `main` cuando un humano fusione el [PR documental #14](https://github.com/stefano-mt/viva-inteligencia-demo/pull/14) que contiene este informe.
