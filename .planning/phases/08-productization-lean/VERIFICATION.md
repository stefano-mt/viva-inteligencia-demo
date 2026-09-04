# Verificación — Fase 8

## Estado

La implementación técnica P8-00–P8-07 y la verificación automatizada de P8-08 están completas en `feat/phase-8-productization-lean`. La validación humana integral permanece pendiente y se ejecutará una sola vez sobre el entorno publicado, conforme al plan aprobado.

## Resultado automatizado

Ejecutado desde la raíz del worktree de Fase 8:

```powershell
npm.cmd ci --cache .npm-cache --prefer-offline
npm.cmd run verify
```

Resultado: **PASS** en instalación limpia; 190 paquetes auditados y cero vulnerabilidades reportadas.

La ejecución incluyó:

- generación determinista y validación de privacidad del snapshot;
- TypeScript estricto y builds de contratos, dominio, snapshot, API y web;
- pruebas unitarias de contratos, dominio, repositorio, API y cliente web;
- regresión del contrato 2.0–2.4, CT-A–I/P y del oráculo estático;
- E2E de las 14 superficies, 1440×900, 1280×720, 390×844, teclado y zoom 200%;
- estados de API caída, timeout, contrato incompatible, respuesta vacía y snapshot corrupto;
- ausencia de llamadas a hosts externos y de descarga del dataset por el navegador;
- build productivo de web y API;
- `npm audit --audit-level=high`: cero vulnerabilidades reportadas.

Checksums registrados:

| Artefacto | SHA-256 |
|---|---|
| Snapshot 2.4 | `cc3634fe33e96c1e3411f7cb80fec8483ef6aff4bdd8161b03977e03d9871267` |
| Geografía | `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0` |
| Cobertura | `f9ba69f1d21bca43b68d90a10503a668730b48f07b02e6a3d679304e0bad7fb4` |

## Contenedores

Estas configuraciones fueron validadas correctamente:

```powershell
docker compose config --quiet
docker compose -f compose.yml -f compose.prod.yml config --quiet
```

La construcción y ejecución local de imágenes no pudo realizarse porque el host de verificación no tenía un daemon Docker activo. No es un fallo del repositorio: el pipeline `ci.yml` construirá ambas imágenes antes del merge y `publish-images.yml` las publicará después del merge. La aceptación de contenedores solo puede cerrarse cuando ese CI esté en verde.

## Higiene y compatibilidad

- El snapshot no existe bajo `apps/web/public` y no se entrega al navegador.
- Los generadores viven en `tools/data` y los casos CT en `data/fixtures`.
- Las evidencias pesadas se retiraron del árbol activo sin reescribir historial; la etiqueta `demo-static-v1` conserva el baseline.
- El repositorio original con evidencias locales no fue usado como checkout de implementación.

## Pendientes de aceptación

1. Publicar la rama y abrir el pull request.
2. Confirmar CI verde, incluida la construcción OCI.
3. Hacer merge y desplegar las dos imágenes del mismo SHA.
4. Ejecutar la única prueba humana integral y registrar el resultado con las plantillas canónicas.
