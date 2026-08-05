# P5-15 — Verificación post-merge de GitHub Pages

**Fecha de verificación:** 2026-08-05

**Veredicto:** `PASS`

**Resultado técnico de P5-15:** despliegue verificado con `PASS`

**Estado oficial en `main`:** efectivo cuando un humano fusione el PR documental separado de P5-16 que contiene este informe

## Resumen ejecutivo

El PR funcional [#15 — feat: add explainable market signals and deterministic assistant](https://github.com/stefano-mt/viva-inteligencia-demo/pull/15) fue fusionado por un humano y GitHub Pages desplegó exactamente el SHA de merge `8d4c6de5b47f30d4b058de371a45b59377f2cf78`. La URL pública, el contrato `2.4.0`, el dataset determinista y las rutas `#activity` y `#assistant` fueron verificadas de forma read-only.

La verificación confirmó la propuesta de Fase 5: un cuaderno territorial de señales con histórico trazable, una agenda de máximo tres acciones y un asistente determinista que responde solo desde el escenario y la evidencia autorizada. El producto no atribuye causas no observadas, no presenta precios publicados como precios de cierre, no predice y no realiza búsquedas o solicitudes externas.

No se detectaron errores de consola, respuestas HTTP fallidas, desbordamiento horizontal ni tráfico a hosts externos. P5-15 no modificó el repositorio, el dataset ni recursos desplegados.

## Alcance documental de P5-16

Write set exclusivo:

- `.planning/STATE.md`;
- `.planning/phases/05-history-signals-assistant/POSTMERGE_REPORT.md`.

P5-16 no modifica runtime, datos, tests, estilos, evidencia visual ni artefactos desplegados. Su única función es hacer durable el resultado read-only de P5-15 y la regla de cierre de ship.

## Evidencia de despliegue

| Evidencia | Resultado |
|---|---|
| PR documental P5-16 | [#16 — docs: record phase 5 postmerge verification](https://github.com/stefano-mt/viva-inteligencia-demo/pull/16), abierto y pendiente de merge humano |
| PR funcional | [#15](https://github.com/stefano-mt/viva-inteligencia-demo/pull/15), `MERGED` |
| Fecha del merge | `2026-08-05T13:08:57Z` |
| Head final del PR #15 | `34bc190bf456b2612c4636cb4fc81dd8f0bc4586` |
| Último commit funcional verificado por P5-13 | `8e76b796b1fef3616b5a0b7a5526a72d2f125e2c` |
| SHA del merge y despliegue | `8d4c6de5b47f30d4b058de371a45b59377f2cf78` |
| Workflow | [Deploy demo to GitHub Pages — run 31008846208](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/31008846208), `success` |
| Job | [deploy — 92315480879](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/31008846208/job/92315480879), `success` |
| URL pública | [https://stefano-mt.github.io/viva-inteligencia-demo/](https://stefano-mt.github.io/viva-inteligencia-demo/), HTTP 200 |

El `headSha` del workflow coincide exactamente con el SHA del merge funcional. No se verificó una rama intermedia ni una reconstrucción local como sustituto del artefacto publicado.

## Integridad del artefacto público

| Artefacto | Comprobación | Bytes | SHA-256 / resultado |
|---|---|---:|---|
| Raíz de la demo | GitHub Pages, HTTP 200 | — | sitio operativo |
| `demo-data/viva-platform-demo.json` | GitHub Pages, HTTP 200 | 7,555,617 | `20d44245c956a198c8621b3f544115387037b73cc462e50f63a5ce6d61fb4a37` |
| Reporte de cobertura materializado | archivo exacto del merge | 17,601 | `639b613aff89f9605c3dcc74a7914700dfa89fb84ababe70910fc25c3ba81864` |
| GeoJSON distrital | archivo público del merge | 46,650 | `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0` |

Datos recompuestos desde el JSON público:

- contrato: `2.4.0`;
- dataset: `dataset:viva-platform-demo-2026-07-28`;
- cutoff: `2026-07-28T01:24:28Z`;
- 52 fingerprints ordenados;
- 676 proyectos y 184 agencias canónicas;
- 499 observaciones y 4,093 hechos;
- 20 documentos y 91 evidencias;
- 36 eventos históricos;
- 7 intenciones y 5 limitaciones del asistente.

Los hashes del JSON, reporte de cobertura y GeoJSON coinciden con los artefactos versionados en el merge. El JSON público fue además descargado desde Pages; el reporte de cobertura es evidencia de repositorio y no se presenta como una ruta pública de la aplicación. El despliegue no introdujo drift respecto del build determinista aprobado.

## Cobertura histórica pública

El catálogo público conserva la contabilidad completa:

```text
42 candidatos = 36 materializados + 6 excluidos
36 materializados = 31 certificados + 5 revisables
6 excluidos = 5 entity_mismatch + 1 unknown_currency
```

Los 36 eventos cubren 36 proyectos y 15 distritos. Cada evento tiene dos puntos temporales y referencias válidas a observación, hecho y evidencia. Ningún evento expone una causa observada: `causes_non_null = 0`.

El reparto completo es:

```text
42 candidatos de mercado:
- 34 dentro de ±30 % = 31 certificados + 3 entity_mismatch
- 8 fuera de ±30 % = 5 revisables + 2 entity_mismatch + 1 unknown_currency
Total = 31 certificados + 5 revisables + 5 entity_mismatch + 1 unknown_currency
```

Los tres eventos controlados CT-E son fixtures separados y no pertenecen al universo de 42 candidatos de mercado. Validan: un cambio normal `600000 → 630000` (`+5%`) certificado; una base cero con porcentaje `null` revisable; y una variación extrema `+60%` revisable. Prueban matemáticas y estados fail-closed, no representan observaciones competitivas reales.

## Criterios P5-15

| # | Criterio | Resultado | Evidencia |
|---:|---|---|---|
| 1 | PR funcional fusionado y SHA trazable | PASS | PR #15, head `34bc190` y merge `8d4c6de`. |
| 2 | Workflow Pages exitoso para el mismo SHA | PASS | Run `31008846208`, job `92315480879`, `headSha = 8d4c6de`. |
| 3 | URL pública y dataset HTTP 200 | PASS | Raíz y JSON público disponibles. |
| 4 | Contrato 2.4 e integridad determinista | PASS | 7,555,617 bytes, SHA-256 exacto y 52 fingerprints. |
| 5 | Histórico territorial y CT-C/CT-E | PASS | Miraflores y Surco recompuestos desde escenario; certificado/revisable visibles y explicados. |
| 6 | Asistente y CT-F | PASS | Límite de precio de cierre explícito, respuesta determinista y seis bloques trazables. |
| 7 | Evidencia, calidad y agenda | PASS | Referencias autorizadas, causa no observada y agenda de máximo tres acciones. |
| 8 | Privacidad y red | PASS | Consulta solo en memoria, 0 solicitudes externas y política pública conservada. |
| 9 | Escritorio, móvil, consola y overflow | PASS | 1440×900 y 390×844; 0 errores y 0 desbordamiento horizontal. |

## CT-C — escenario canónico y propagación territorial

La verificación comenzó en Miraflores y confirmó:

- 90 proyectos observados;
- 85 comparables;
- 5 señales visibles por defecto;
- 5 señales certificadas en el escenario observado;
- agenda limitada a un máximo de 3 acciones;
- detalle y referencias pertenecientes al mismo escenario.

Después se cambió el distrito a Santiago de Surco. La URL quedó serializada como `?sv=1&district=150140#activity`, la vista recompuso 82 comparables y mostró 5 señales certificadas y 1 revisable. Al navegar a `#assistant`, el distrito y los 82 comparables se conservaron. No apareció fallback silencioso a Miraflores ni mezcla de proyectos de otro distrito.

## CT-E — histórico certificado, revisable y sin causalidad inventada

En Miraflores, el detalle de Atahualpa 448 mostró:

- precio anterior `S/ 940,737`, vigente desde `27 Mar 2026`;
- precio nuevo `S/ 698,211`, vigente desde `24 May 2026`;
- causa `Causa no observada`;
- dos referencias autorizadas;
- advertencia `Precio publicado, no precio de cierre`.

En Santiago de Surco, el filtro revisable mostró Navarra 360 con variación `+359.5%` y la advertencia `La señal requiere revisión antes de utilizarse.` El outlier no fue promovido a señal certificada ni usado como verdad comercial.

El producto demuestra cambio publicado y calidad de evidencia, no causalidad. La ausencia de causas observadas es una restricción explícita del dataset, no un dato faltante que el asistente pueda completar por inferencia.

## CT-F — límites del asistente

Con Santiago de Surco activo se consultó:

> ¿Cuál es el precio real de cierre del competidor?

La respuesta pública indicó:

> La demo observa precios publicados “desde”; no dispone del precio real de cierre.

El resultado mantuvo los seis bloques del contrato, citó el escenario vigente y no convirtió precios publicados en precios de cierre. También conservó los límites de no atribuir causalidad, no predecir y no consultar datos externos.

La política pública observada fue:

| Propiedad | Valor |
|---|---|
| Modo | `deterministic_catalog` |
| Locale | `es-PE` |
| Persistencia de consulta | `false` |
| Solicitudes externas | `false` |
| Máximo de caracteres | `500` |
| Intención desconocida | `explain_supported_questions` |

La misma consulta produjo una respuesta reproducible. El editor vive solo en memoria y la consulta no se incorporó a la URL.

## Navegador, responsive y observabilidad

### Escritorio — 1440×900

- `#activity` y `#assistant` renderizaron el escenario y sus datos derivados;
- la selección revisable, el detalle histórico y las referencias fueron operables;
- el cambio de distrito se propagó entre rutas;
- no hubo mensajes de consola.

### Móvil — 390×844

- `#assistant` y `#activity` no presentaron scroll horizontal;
- títulos, métricas, agenda y resultado conservaron jerarquía legible;
- el estado `Límite de la demo` y el outlier revisable permanecieron visibles;
- no se cargaron recursos externos.

### Red y consola

- 44 solicitudes observadas;
- 44 respuestas del mismo origen con HTTP 200;
- 0 hosts externos;
- 0 errores, warnings o mensajes de consola;
- 0 errores de página o fallos de red.

## Restricciones y notas vigentes

1. Los 36 eventos describen variaciones de precios publicados, no precios reales de cierre.
2. Ningún evento tiene causa observada. La demo no debe utilizarse para explicar por qué cambió un precio.
3. Cinco outliers permanecen `reviewable`; requieren revisión humana antes de cualquier uso comercial.
4. La consulta del asistente no se persiste y el modo actual no realiza búsquedas web ni conexiones a fuentes externas.
5. Nexo continúa `pending_review`; este PASS técnico no sustituye revisión jurídica para producción o distribución adicional.
6. El ensayo comercial formal fue automatizado. Debe realizarse una práctica humana breve antes de presentar la demo al cliente.
7. Graphify tiene cobertura parcial sobre CSS/JSON; tests, hashes, Playwright y comprobaciones de red complementan esa limitación.

No se encontraron gaps altos o medios derivados del merge o del despliegue.

## Cierre

- P5-15 fue read-only y no modificó el repositorio ni recursos externos.
- El PR funcional #15 y el workflow de Pages apuntan al mismo SHA `8d4c6de`.
- P5-15 demuestra con `PASS` que `8d4c6de5b47f30d4b058de371a45b59377f2cf78` está desplegado y verificado técnicamente.
- P5-16 persiste este resultado y actualiza el estado mediante la rama documental y el [PR #16](https://github.com/stefano-mt/viva-inteligencia-demo/pull/16).
- Conforme al plan aprobado, Fase 5 adquiere el estado oficial `deployed and verified` en `main` únicamente cuando un humano fusione el PR documental #16.
