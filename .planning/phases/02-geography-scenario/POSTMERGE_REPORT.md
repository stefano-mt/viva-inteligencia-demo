# P2-18 — Verificación post-merge y reverificación final

**Primer intento:** 2026-07-29T09:11:04.1638666-05:00

**Reverificación final:** 2026-07-29T09:38:52.0731735-05:00

**Veredicto final:** `deployed and verified`

## Resumen ejecutivo

El primer intento de P2-18 detectó que el harness no conservaba el subdirectorio de GitHub Pages. El resultado `merged, deployment verification failed` se persistió mediante el PR #8. La corrección aislada fue implementada y fusionada mediante el PR #9.

La reverificación sobre el merge correctivo `ebe9795e408c190af8bc0881b98e4fd3389da59e` pasó los siete criterios de P2-18. GitHub Pages, el contrato `2.1.0`, los hashes y los recorridos CT-C/CT-I quedaron verificados desde una copia exacta del merge, sin inyectar datos y sin solicitudes externas no aprobadas.

## Evidencia final

| Evidencia | Resultado |
|---|---|
| PR correctivo | [#9](https://github.com/stefano-mt/viva-inteligencia-demo/pull/9), `MERGED` |
| Fecha del merge correctivo | `2026-07-29T14:34:18Z` |
| Head correctivo | `2b734a4db0efa5384257cfdbd0b01655d05b0ad2` |
| SHA verificado | `ebe9795e408c190af8bc0881b98e4fd3389da59e` |
| Workflow | [Deploy demo to GitHub Pages — run 30461539884](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/30461539884) |
| Job | [deploy — 90608583121](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/30461539884/job/90608583121), `success` |
| Inicio / fin del workflow | `2026-07-29T14:34:28Z` / `2026-07-29T14:34:45Z` |
| Deployment exitoso | `2026-07-29T14:34:46Z` |
| URL pública | [https://stefano-mt.github.io/viva-inteligencia-demo/](https://stefano-mt.github.io/viva-inteligencia-demo/) |
| Checker independiente | `/root/phase2_plan_reader`, PASS |

## Criterios finales P2-18

| # | Criterio | Resultado | Evidencia |
|---:|---|---|---|
| 1 | PR fusionado y SHA trazable | PASS | PR #9 y merge `ebe9795e408c190af8bc0881b98e4fd3389da59e`. |
| 2 | Workflow Pages exitoso para ese SHA | PASS | Run `30461539884`, job `90608583121`, conclusión `success`. |
| 3 | URL pública HTTP 200 | PASS | La raíz pública coincide con `public/index.html` del merge. |
| 4 | JSON HTTP 200 y contrato `2.1.0` | PASS | 3,588,986 bytes; dataset `dataset:viva-platform-demo-2026-07-28`. |
| 5 | GeoJSON HTTP 200 y hash igual al manifiesto | PASS | 46,650 bytes; SHA-256 coincidente. |
| 6 | Comando CT-C público versionado | PASS | Ejecutado desde la copia exacta del merge, sin inyección de datos. |
| 7 | CT-C/CT-I sin red externa no aprobada | PASS | `assertClean` pasó en escritorio y móvil. |

## Integridad final de artefactos

| Artefacto | HTTP | Bytes | SHA-256 |
|---|---:|---:|---|
| `index.html` | 200 | 421 | `a4c3e0a98aa2686fc380a8bf516a4b65006294e130e1f03f0b63bb456c2a8111` |
| `demo-data/viva-platform-demo.json` | 200 | 3,588,986 | `fa9365ff83c9c72aefa15bf5f6fee952b83efdd6ba23c524cf2f92c88b78ada4` |
| `demo-data/district-boundaries.geojson` | 200 | 46,650 | `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0` |

El JSON y el GeoJSON públicos coinciden con los artefactos del merge. El hash del GeoJSON coincide además con `source-manifest.json#/derived/public_geojson_sha256`.

## Comando final

```powershell
$env:BASE_URL='https://stefano-mt.github.io/viva-inteligencia-demo/'
node tests/scenario-e2e.mjs --case ct-c-public
```

```text
Scenario E2E OK: CT-C canónico, CT-I, teclado, móvil, propagación y cero resultados.
```

## Historial: primer intento fallido

El primer intento se conserva a continuación para mantener trazabilidad. Su veredicto fue `merged, deployment verification failed`; quedó superado por la corrección y reverificación descritas arriba.

## Evidencia del primer merge y despliegue

| Evidencia | Resultado |
|---|---|
| PR funcional | [#7](https://github.com/stefano-mt/viva-inteligencia-demo/pull/7), `MERGED` |
| Fecha del merge | `2026-07-29T14:01:46Z` |
| Head funcional | `ac3e564d8b898db4a3e7f740ea43396a5ba56e02` |
| SHA del merge | `69fbfc220caccb887fe61763e4f9c747233211f2` |
| Workflow | [Deploy demo to GitHub Pages — run 30458840428](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/30458840428) |
| Job | [deploy — 90599328873](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/30458840428/job/90599328873), `success` |
| Inicio / fin del workflow | `2026-07-29T14:01:53Z` / `2026-07-29T14:02:26Z` |
| Deployment | `github-pages`, `success` |
| URL pública | [https://stefano-mt.github.io/viva-inteligencia-demo/](https://stefano-mt.github.io/viva-inteligencia-demo/) |

El workflow, el deployment y el PR apuntan al mismo SHA de merge.

## Resultados del primer intento

| # | Criterio | Resultado | Evidencia |
|---:|---|---|---|
| 1 | PR fusionado y SHA trazable | PASS | PR #7 y merge `69fbfc220caccb887fe61763e4f9c747233211f2`. |
| 2 | Workflow Pages exitoso para ese SHA | PASS | Run `30458840428`, job `90599328873`, conclusión `success`. |
| 3 | URL pública HTTP 200 | PASS | La raíz del proyecto respondió HTTP 200. |
| 4 | JSON HTTP 200 y contrato `2.1.0` | PASS | `demo-data/viva-platform-demo.json`, 3,588,986 bytes, dataset `dataset:viva-platform-demo-2026-07-28`. |
| 5 | GeoJSON HTTP 200 y hash igual al manifiesto | PASS | 46,650 bytes; SHA-256 coincidente. |
| 6 | Comando CT-C público versionado | **FAIL** | Timeout esperando `#main-content` porque la URL pierde el base path del proyecto. |
| 7 | CT-C/CT-I públicos sin red externa no aprobada | PASS | Recorrido equivalente sobre el base path correcto: 0 solicitudes externas y 0 errores de navegador. |

## Integridad de artefactos en el primer intento

| Artefacto | HTTP | Bytes | SHA-256 |
|---|---:|---:|---|
| `demo-data/viva-platform-demo.json` | 200 | 3,588,986 | `fa9365ff83c9c72aefa15bf5f6fee952b83efdd6ba23c524cf2f92c88b78ada4` |
| `demo-data/district-boundaries.geojson` | 200 | 46,650 | `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0` |

El hash público del GeoJSON coincide exactamente con `source-manifest.json#/derived/public_geojson_sha256`.

## Falla reproducida

Comando requerido por [PLAN.md](PLAN.md):

```powershell
$env:BASE_URL='https://stefano-mt.github.io/viva-inteligencia-demo/'
node tests/scenario-e2e.mjs --case ct-c-public
```

Resultado:

```text
locator.waitFor: Timeout 30000ms exceeded.
waiting for locator('#main-content') to be visible
at openPath (.../tests/helpers/demo-browser.mjs:121:39)
```

La ruta canónica del descriptor [ct-c-public.json](../../../prototipo_ejecutable/tests/e2e-scenarios/ct-c-public.json) empieza con `/`. [demo-browser.mjs](../../../prototipo_ejecutable/tests/helpers/demo-browser.mjs) la resuelve mediante `new URL(relativeUrl, baseUrl)`, por lo que:

```text
Esperado:
https://stefano-mt.github.io/viva-inteligencia-demo/?sv=1&scope=radius...

Real:
https://stefano-mt.github.io/?sv=1&scope=radius...
```

La URL real del harness respondió HTTP 404. Además, [scenario-e2e.mjs](../../../prototipo_ejecutable/tests/scenario-e2e.mjs) solicita `fetch("/demo-data/viva-platform-demo.json")`, que también ignora el base path de un GitHub Pages de proyecto.

## Recorrido público equivalente

Una comprobación read-only con la URL correctamente prefijada confirmó:

- CT-C: 3 observaciones exactas y `project:nexo-2417` como comparable canónico;
- CT-I: 90 observaciones y 85 comparables;
- cuadrante NW: 37 comparables, sin ampliar el universo distrital;
- catálogo, comparador, checklist y asistente consumen IDs compatibles;
- 0 solicitudes a orígenes externos;
- 0 respuestas HTTP 4xx/5xx, fallos de red, errores de consola o errores de página.

Este PASS equivalente demuestra que el despliegue funciona, pero no sustituye el criterio 6.

## Cierre

- El PR funcional #7, el reporte inicial #8 y la corrección #9 fueron fusionados por un humano.
- La reverificación P2-18 fue read-only y no modificó recursos externos.
- Fase 2 puede declararse `deployed and verified` para el SHA `ebe9795e408c190af8bc0881b98e4fd3389da59e`.
- Falta únicamente fusionar por decisión humana el PR documental que contiene este resultado para actualizar la memoria oficial de `main`.
