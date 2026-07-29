# P2-18 — Verificación post-merge de GitHub Pages

**Fecha de verificación:** 2026-07-29T09:11:04.1638666-05:00  
**Veredicto:** `merged, deployment verification failed`

## Resumen ejecutivo

El PR funcional de Fase 2 fue fusionado y GitHub Pages publicó correctamente la demo. La aplicación, el contrato `2.1.0`, el GeoJSON y los recorridos públicos equivalentes CT-C/CT-I funcionan sin errores ni solicitudes externas.

P2-18 se declara **FAIL** porque el comando automatizado exigido por el plan no conserva el subdirectorio `/viva-inteligencia-demo/` al resolver rutas absolutas. El harness navega a la raíz del dominio, que responde HTTP 404, y termina por timeout esperando `#main-content`. Este resultado no se eleva a PASS por el funcionamiento manual o equivalente.

## Evidencia del merge y despliegue

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

## Resultados de los criterios P2-18

| # | Criterio | Resultado | Evidencia |
|---:|---|---|---|
| 1 | PR fusionado y SHA trazable | PASS | PR #7 y merge `69fbfc220caccb887fe61763e4f9c747233211f2`. |
| 2 | Workflow Pages exitoso para ese SHA | PASS | Run `30458840428`, job `90599328873`, conclusión `success`. |
| 3 | URL pública HTTP 200 | PASS | La raíz del proyecto respondió HTTP 200. |
| 4 | JSON HTTP 200 y contrato `2.1.0` | PASS | `demo-data/viva-platform-demo.json`, 3,588,986 bytes, dataset `dataset:viva-platform-demo-2026-07-28`. |
| 5 | GeoJSON HTTP 200 y hash igual al manifiesto | PASS | 46,650 bytes; SHA-256 coincidente. |
| 6 | Comando CT-C público versionado | **FAIL** | Timeout esperando `#main-content` porque la URL pierde el base path del proyecto. |
| 7 | CT-C/CT-I públicos sin red externa no aprobada | PASS | Recorrido equivalente sobre el base path correcto: 0 solicitudes externas y 0 errores de navegador. |

## Integridad de artefactos públicos

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

## Siguiente acción requerida

1. Fusionar este reporte P2-19 solo mediante revisión humana.
2. Crear una rama y PR correctivos separados para hacer el harness consciente del `pathname` de `BASE_URL`.
3. Evitar rutas/fetch absolutos cuando la demo se publica bajo un subdirectorio.
4. Añadir una regresión automatizada para un base path equivalente a GitHub Pages de proyecto.
5. Fusionar el PR correctivo únicamente por decisión humana.
6. Repetir P2-18 contra el nuevo SHA y persistir el resultado final en un nuevo PR documental.

P2-18 no modificó el repositorio ni recursos externos. La demo está desplegada y operativa, pero Fase 2 no puede declararse `deployed and verified` hasta que el comando versionado pase.
