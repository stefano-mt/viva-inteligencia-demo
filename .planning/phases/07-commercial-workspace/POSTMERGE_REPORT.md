# P7-13 — Verificación post-merge de GitHub Pages

**Fecha de verificación:** 2026-08-27

**Veredicto técnico:** `PASS`

**Estado habilitado tras fusionar P7-14:** `deployed and verified`

**Alcance del estado:** verificación técnica; no implica aceptación humana o validación por usuarios

## Resumen ejecutivo

El PR funcional [#20 — feat: simplify the Viva commercial workspace](https://github.com/stefano-mt/viva-inteligencia-demo/pull/20) fue fusionado por Stefano. El merge `5e4cfd064c6b008fcce43ea0e78792e13b1cedd5` avanzó `main` y activó [Deploy demo to GitHub Pages — run 33095830231](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/33095830231), que terminó en `success` para exactamente el mismo SHA.

La [URL pública](https://stefano-mt.github.io/viva-inteligencia-demo/) respondió HTTP `200`, cargó el workspace comercial en `#journey/scale` y consumió el JSON público con contrato `2.4.0`. P7-13 recorrió las seis etapas y las ocho rutas expertas en la publicación, confirmó un único `h1` y un `main` por superficie, comprobó el trabajo principal en la primera pantalla de `1280×720`, verificó la paleta local `Ctrl+K`, ejecutó el reinicio canónico y revisó consola y dependencias visibles.

No se detectaron rutas rotas, errores o warnings de consola, desbordamiento horizontal, pérdida del escenario, fallos del reinicio ni URLs HTTP(S) externas declaradas por la interfaz.

La herramienta de inspección pública no aplicó el override móvil solicitado y mantuvo `1280×720`. P7-13 no presenta esa tentativa como una comprobación móvil. La cobertura responsive permanece sustentada por P7-10 sobre `3211482804081b31405131d6a39b7ccd8180f80d`: el tree de ese commit y el tree del merge desplegado son idénticos (`049aed75720427402a3c45704681e35eddde473d`).

P7-13 fue read-only. P7-14 hace durable el resultado en esta rama documental y no modifica runtime, datos o el artefacto desplegado.

## Alcance documental de P7-14

P7-14 modifica únicamente:

- `.planning/phases/07-commercial-workspace/POSTMERGE_REPORT.md`;
- `.planning/phases/07-commercial-workspace/evidence/postmerge/*`;
- `.planning/STATE.md`;
- `.planning/ROADMAP.md`.

Quedan fuera del write set el runtime, contrato `2.4`, dataset, writer, fingerprints, motores, elegibilidad, scoring, pruebas, estilos, activos de evidencia y workflow de Pages.

## Trazabilidad del despliegue

| Evidencia | Resultado |
|---|---|
| PR funcional | [#20](https://github.com/stefano-mt/viva-inteligencia-demo/pull/20), `MERGED` |
| Head final del PR | `3211482804081b31405131d6a39b7ccd8180f80d` |
| Fecha del merge | `2026-08-27T16:56:32Z` |
| Autor del merge | `stefano-mt` |
| SHA del merge y de `main` | `5e4cfd064c6b008fcce43ea0e78792e13b1cedd5` |
| Tree del head funcional | `049aed75720427402a3c45704681e35eddde473d` |
| Tree del merge | `049aed75720427402a3c45704681e35eddde473d` |
| Workflow Pages | [run 33095830231](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/33095830231), `success` |
| Evento y commit del run | `push`; `5e4cfd064c6b008fcce43ea0e78792e13b1cedd5` |
| Ventana observada del run | `2026-08-27T16:56:35Z` → `2026-08-27T16:56:53Z` |
| Job de despliegue | [deploy 98600352791](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/33095830231/job/98600352791), `success` |
| URL pública | [https://stefano-mt.github.io/viva-inteligencia-demo/](https://stefano-mt.github.io/viva-inteligencia-demo/) |
| Ruta inicial canónica | `#journey/scale` |

El SHA de `main`, el merge del PR y el `headSha` del workflow coinciden exactamente. La igualdad de trees demuestra además que Pages desplegó el mismo contenido funcional que pasó P7-10.

## Integridad pública

| Recurso | HTTP | Tipo | Bytes observados | Resultado |
|---|---:|---|---:|---|
| Raíz de la demo | `200` | `text/html; charset=utf-8` | 421 | operativa |
| `demo-data/viva-platform-demo.json` | `200` | `application/json; charset=utf-8` | 7,555,617 | contrato `2.4.0` |

El JSON público conserva:

- dataset `dataset:viva-platform-demo-2026-07-28`;
- SHA-256 `20d44245c956a198c8621b3f544115387037b73cc462e50f63a5ce6d61fb4a37`;
- contrato `2.4.0` y compatibilidad del runtime aprobada para 2.0–2.4;
- la misma semántica de escenario, claims, evidencia y límites verificada antes del merge.

## Matriz pública de superficies

P7-13 recorrió catorce rutas públicas a `1280×720`. En cada una confirmó hash, contenido, un único `h1`, un `main` visible y ausencia de overflow horizontal.

| Grupo | Ruta | `h1` observado | Resultado |
|---|---|---|---|
| Recorrido | `#journey/scale` | ¿Qué mercado observable sostiene la lectura? | PASS |
| Recorrido | `#journey/geography` | ¿Dónde compite el proyecto? | PASS |
| Recorrido | `#journey/quality` | ¿Qué dato puede utilizarse? | PASS |
| Recorrido | `#journey/depth` | ¿Cómo se diferencia la oferta? | PASS |
| Recorrido | `#journey/movement` | ¿Qué cambió en el mercado? | PASS |
| Recorrido | `#journey/decision` | ¿Qué hacemos y qué no podemos afirmar? | PASS |
| Experto | `#dashboard` | Radar comercial | PASS |
| Experto | `#projects` | Proyectos comparables | PASS |
| Experto | `#inspector/case/f3-ct-g-pardo` | Inspector de evidencia | PASS |
| Experto | `#market` | Benchmark de microzona | PASS |
| Experto | `#compare` | Comparador comercial | PASS |
| Experto | `#trust` | Checklist comercial | PASS |
| Experto | `#assistant` | Asistente de estrategia | PASS |
| Experto | `#activity` | Señales del mercado | PASS |

## Primera pantalla en `1280×720`

La medición se realizó con `scrollY = 0`, antes de cualquier scroll. La lectura y el comienzo del trabajo aparecen dentro de la primera pantalla en las ocho rutas expertas:

| Ruta | Inicio de lectura | Inicio de trabajo | Resultado |
|---|---:|---:|---|
| `#dashboard` | 180 px | 424 px | PASS |
| `#projects` | 180 px | 539 px | PASS |
| `#inspector/case/f3-ct-g-pardo` | 436 px | 707 px | PASS |
| `#market` | 345 px | 366 px | PASS |
| `#compare` | 295 px | 465 px | PASS |
| `#trust` | 666 px | 666 px | PASS |
| `#assistant` | 409 px | 653 px | PASS |
| `#activity` | 355 px | 713 px | PASS |

Ninguna de estas ocho superficies expertas presentó más de una acción primaria visible que compitiera en el viewport.

## Navegación y reinicio

### Paleta local

`Ctrl+K` abrió el diálogo `Ir a…` y presentó exactamente nueve destinos:

1. Recorrido;
2. Panorama;
3. Proyectos;
4. Decidir;
5. Seguimiento;
6. Inspector;
7. Benchmark;
8. Comparador;
9. Checklist.

El diálogo conservó el aviso `Solo navega secciones; no busca datos.` y cerró con Escape.

### Reinicio canónico

Desde `#compare`, `Cambiar escenario` expuso el editor y `Reiniciar escenario` produjo:

- URL final `#journey/scale`;
- un único `h1` de Escala;
- foco en `h1#journey-title`;
- escenario `Miraflores · Distrito completo`;
- cero selecciones en la comparación.

## Consola, red y privacidad

| Comprobación | Resultado |
|---|---|
| Errores de consola observados | 0 |
| Warnings de consola observados | 0 |
| URLs HTTP(S) externas en `src`/`href` | 0 |
| Raíz y JSON público | mismo origen de Pages, HTTP 200 |
| Persistencia o transmisión introducida por P7 | ninguna |

El DOM solo expuso una URL `data:,` interna del navegador, no un host externo. P7-10 ya había verificado cero solicitudes externas y privacidad sobre el tree idéntico al desplegado.

## Cobertura responsive y limitación de la comprobación pública

P7-10 certificó las catorce superficies en `1440×900`, `1280×720`, `390×844` y reflow equivalente a 200 %, además de teclado, foco, 44×44, contraste AA, movimiento reducido, solapes y truncamiento.

Durante P7-13, el navegador de inspección aceptó la solicitud de viewport móvil pero mantuvo `innerWidth = 1280`. Por ello:

- P7-13 sí verifica directamente la publicación y las catorce rutas en `1280×720`;
- P7-13 no afirma haber repetido `390×844` sobre Pages;
- la cobertura móvil y 200 % se hereda de P7-10 porque el tree de `3211482` es idéntico al tree desplegado en `5e4cfd0`;
- esta limitación es de la herramienta de inspección y no un gap reproducido del producto.

## Criterios de salida de P7-13

| # | Criterio | Resultado |
|---:|---|---|
| 1 | PR funcional fusionado y SHA trazable | PASS |
| 2 | `main`, merge y workflow Pages comparten SHA | PASS |
| 3 | URL pública y JSON responden HTTP 200 | PASS |
| 4 | Contrato público 2.4.0 | PASS |
| 5 | Seis etapas y ocho rutas expertas cargan | PASS |
| 6 | Un `h1` y un `main` por superficie | PASS |
| 7 | Lectura y trabajo comienzan dentro de 1280×720 | PASS |
| 8 | `Ctrl+K`, Escape y catálogo de nueve destinos | PASS |
| 9 | Reinicio canónico, foco y comparación vacía | PASS |
| 10 | Consola limpia y sin URLs HTTP(S) externas declaradas | PASS |
| 11 | Tree desplegado idéntico al candidato responsive aprobado | PASS |

## Riesgos y afirmaciones permitidas

No existen gaps técnicos P0–P3 abiertos de Fase 7. Permanece la limitación de herramienta descrita para la repetición móvil en Pages; no cambia el veredicto porque el artefacto desplegado es bit-identical a nivel de tree con el candidato que pasó P7-10.

Una vez fusionado el PR documental de P7-14, puede declararse Fase 7 `deployed and verified` en sentido técnico. Esa declaración no equivale a `validated by users`, `human acceptance passed` ni a una UAT. La aceptación humana de Fase 6 fue eximida por D-044 y cualquier prueba futura debe tratarse como una UAT separada.

## Cierre

- P7-13 concluye `PASS` y no modificó `main` ni Pages.
- P7-14 persiste el resultado mediante `docs/phase-7-postmerge-report`.
- El usuario conserva la revisión y el merge del PR documental.
- Solo después de ese merge se completa la Definition of Done documental de Fase 7.
