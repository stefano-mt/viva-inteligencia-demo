# Runbook de operación

## Desarrollo local

```powershell
npm ci
npm run data:build
npm run dev
```

Web: `http://localhost:5173`. API: `http://localhost:3000`. OpenAPI: `http://localhost:3000/docs`.

## Entorno empaquetado

```powershell
docker compose up --build
docker compose ps
```

Accede por `http://localhost:8080`. El navegador no debe llamar directamente al contenedor API.

Para usar imágenes publicadas:

```powershell
$env:IMAGE_OWNER="stefano-mt"
$env:IMAGE_TAG="sha-<commit-completo>"
docker compose -f compose.yml -f compose.prod.yml up -d
```

## Diagnóstico

1. `/health/live` distinto de 200: proceso o red no disponible.
2. `/health/ready` en 503: revisar ruta, permisos, schema o checksum del snapshot en logs JSON.
3. `CONTRACT_INCOMPATIBLE`: desplegar web y API del mismo SHA.
4. `API_TIMEOUT` o `API_UNAVAILABLE`: comprobar proxy, DNS del servicio `api` y límites del entorno.
5. Respuesta vacía: confirmar escenario y cobertura antes de tratarlo como incidente.

No se deben imprimir payloads fuente ni datos personales en logs. Usa `requestId` para correlación.

## Rollback

Despliega las imágenes `web` y `api` del SHA anterior. No existen migraciones ni estado persistente. Para recuperar la experiencia estática histórica, usa la etiqueta `demo-static-v1`; no la mezcles con la API vigente.

## Cierre

```powershell
docker compose down
```
