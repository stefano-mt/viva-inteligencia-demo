# Plan correctivo — Harness compatible con base path

## Objetivo

Corregir el único fallo de P2-18 sin modificar la demo ni sus datos: el harness debe conservar el `pathname` de `BASE_URL` cuando la aplicación se publica como GitHub Pages de proyecto.

## Alcance

La corrección cubre el criterio P2-18.6 y añade una regresión automatizada. No cambia historias, cálculos, interfaz, dataset, GeoJSON ni workflow de despliegue.

## Write-set

- `.planning/phases/02-geography-scenario/CORRECTIVE-PLAN.md`
- `prototipo_ejecutable/tests/helpers/app-url.mjs`
- `prototipo_ejecutable/tests/helpers/demo-browser.mjs`
- `prototipo_ejecutable/tests/scenario-context.mjs`
- `prototipo_ejecutable/tests/scenario-e2e.mjs`

## Archivos protegidos

- `prototipo_ejecutable/public/**`
- `prototipo_ejecutable/scripts/**`
- `prototipo_ejecutable/contracts/**`
- `datos_relevantes/**`
- `.github/workflows/**`
- `.planning/STATE.md`
- `.planning/ROADMAP.md`

## Tareas atómicas

### C2-01 — Resolver rutas dentro del base path

- Extraer una función pura para normalizar `BASE_URL` como directorio.
- Resolver rutas de aplicación eliminando únicamente el slash inicial lógico.
- Conservar pathname, query y hash esperados.
- Mantener el comportamiento local en `/`.

### C2-02 — Integrar el resolver en Playwright

- Usar el resolver en `openPath`.
- Hacer que las aserciones canónicas comparen la ruta desplegada completa.
- Conservar el base path al esperar navegación.
- Reemplazar el fetch absoluto del dataset por una URL relativa a la aplicación.

### C2-03 — Regresión y verificación

- Probar base raíz, base con subdirectorio y base sin slash final.
- Ejecutar `npm.cmd run verify`.
- Ejecutar el comando exacto de P2-18 contra GitHub Pages:

```powershell
$env:BASE_URL='https://stefano-mt.github.io/viva-inteligencia-demo/'
node tests/scenario-e2e.mjs --case ct-c-public
```

## Criterios de aceptación

1. `resolveAppUrl("http://127.0.0.1:4177", "/?x=1#dashboard")` conserva la ruta raíz.
2. `resolveAppUrl("https://example.test/demo/", "/?x=1#dashboard")` produce `/demo/?x=1#dashboard`.
3. Una base `/demo` sin slash final se trata como directorio `/demo/`.
4. El comando remoto P2-18 pasa usando el descriptor versionado, sin inyectar datos.
5. CT-C y CT-I conservan sus conteos y consumidores.
6. No hay solicitudes externas, errores HTTP, errores de consola ni fallos de página.
7. `npm.cmd run verify` pasa completo.
8. El diff no modifica archivos protegidos.

## Roles y handoff

- Maker: un único implementador para los cuatro archivos de test.
- Checker: agente independiente, read-only, después del primer resultado verificable.
- Integrador: valida write-set, gate completo y prepara el PR.

## Riesgos

- Cambiar la semántica de rutas locales al corregir Pages.
- Resolver query/hash correctamente pero comparar un pathname incompleto.
- Corregir `openPath` y dejar un fetch absoluto que vuelva a escapar del proyecto.

## Rollback

Revertir el commit correctivo o cerrar el PR. El deployment vigente permanece operativo y sin cambios hasta que el PR sea fusionado por un humano.

## Evidencia de ejecución

**Fecha:** 2026-07-29  
**Maker efectivo:** `/root`; el delegado inicial fue detenido sin producir cambios.  
**Revisor estático independiente:** `/root/phase2_plan_reader`, `PASS`.

- `npm.cmd run test:scenario`: PASS.
- `node tests/scenario-e2e.mjs --case ct-c-public` local: PASS.
- comando exacto P2-18 con `BASE_URL=https://stefano-mt.github.io/viva-inteligencia-demo/`: PASS.
- `npm.cmd run verify`: PASS completo.
- CT-C, CT-I, teclado, móvil, smoke 7 × 3 y accesibilidad: PASS.
- determinismo conservado: JSON `fa9365ff83c9c72aefa15bf5f6fee952b83efdd6ba23c524cf2f92c88b78ada4`; GeoJSON `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0`.
- ningún archivo protegido modificado.

La evidencia previa al merge demuestra que el harness corregido puede verificar el deployment vigente. P2-18 debe repetirse formalmente después del merge correctivo y del nuevo workflow de Pages.
