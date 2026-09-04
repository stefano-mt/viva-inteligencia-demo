# Verificación — Fase 8

## Estado

P8-00–P8-07 están integrados en `main` mediante el PR [#22](https://github.com/stefano-mt/viva-inteligencia-demo/pull/22). La verificación técnica independiente de P8-08 terminó en `PASS` sobre el merge inmutable `65334e7fb2acbff0ca1fd0e225690c16269a4bf1`.

P8-08 permanece **abierto** hasta completar dos actividades deliberadamente no simuladas:

1. levantar el par de imágenes OCI del mismo SHA en el entorno Compose de referencia y verificar health, metadata y recorrido crítico;
2. ejecutar la única validación humana integral con una persona independiente.

## Evidencia post-merge

- PR funcional: [#22](https://github.com/stefano-mt/viva-inteligencia-demo/pull/22), fusionado el `2026-09-04T22:09:56Z`.
- Merge verificado: `65334e7fb2acbff0ca1fd0e225690c16269a4bf1`.
- CI de `main`: [run 33924328654](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/33924328654), jobs `verify` e `images` en `success`.
- Publicación OCI: [run 33924328603](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/33924328603), `success`.

Imágenes inmutables publicadas:

| Servicio | Tag | Digest |
|---|---|---|
| API | `ghcr.io/stefano-mt/viva-inteligencia-api:sha-65334e7fb2acbff0ca1fd0e225690c16269a4bf1` | `sha256:db10415b53de38ee85fd1c1f67e92f76e7d7396f6afef765ce5f8f38a563c3d9` |
| Web | `ghcr.io/stefano-mt/viva-inteligencia-web:sha-65334e7fb2acbff0ca1fd0e225690c16269a4bf1` | `sha256:2d538fcfc35f0e4e97188dc12725ec575ba91eb78affccce48d2b83b86ad4c12` |

## Resultado automatizado independiente

Ejecutado desde una rama documental limpia creada desde el merge de `main`:

```powershell
npm.cmd ci --cache .npm-cache --prefer-offline
npm.cmd run verify
docker compose -f compose.yml -f compose.prod.yml config --quiet
```

Resultado: **PASS**. La instalación añadió 183 paquetes, auditó 190 y reportó cero vulnerabilidades.

La ejecución cubrió:

- generación determinista y privacidad del snapshot;
- TypeScript estricto y builds de contratos, dominio, snapshot, API y web;
- pruebas unitarias, contrato, integración, paridad y regresiones CT-A–I/P;
- E2E de 14 superficies en 1440×900, 1280×720 y 390×844, teclado y zoom 200%;
- API caída, timeout, contrato incompatible, respuesta vacía y snapshot corrupto;
- ausencia de dependencias externas y de descarga del snapshot por el navegador;
- configuración Compose productiva válida.

Checksums post-merge:

| Artefacto | SHA-256 |
|---|---|
| Snapshot 2.4 | `d8937532109bab7ca72794f103359b41b9d9e12e1618bb3014aa90cb12121ce9` |
| Geografía | `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0` |
| Cobertura | `82afd4bb75dc14033769b6a60e19398a2d803403efc54a463224b6c3ef8f6478` |

## Despliegue de referencia pendiente

Docker está instalado, pero el daemon no está disponible en esta sesión y Windows no permitió iniciar `com.docker.service` desde el agente. Esto no invalida CI ni las imágenes publicadas; impide únicamente afirmar que el entorno Compose local fue ejecutado.

Una vez abierto Docker Desktop, el cierre debe usar el mismo SHA para ambos servicios:

```powershell
$env:IMAGE_OWNER="stefano-mt"
$env:IMAGE_TAG="sha-65334e7fb2acbff0ca1fd0e225690c16269a4bf1"
docker compose -f compose.yml -f compose.prod.yml up -d
```

Luego deben comprobarse `/health/live`, `/health/ready`, `/api/v1/meta` y el recorrido crítico en `http://localhost:8080`.

## Veredicto

**PASS técnico post-merge / P8-08 pendiente de despliegue ejecutado y aceptación humana.**

No se declara la Fase 8 cerrada ni validada por usuarios hasta incorporar evidencia real de ambas actividades pendientes.
