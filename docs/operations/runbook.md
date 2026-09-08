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

## Actualización controlada

El entorno normal debe mantener `DATA_REFRESH_ENABLED=false`. Con ese valor, `Actualizar Data` abre un estado bloqueado y no despacha trabajos. No afecta el tablero, que continúa leyendo el último snapshot aprobado.

Habilitarlo requiere clave de operador, despliegue privado de `apps/ops`, token interno, fuentes individualmente autorizadas y un proceso de publicación/rollback probado. `apps/ops` usa `DATA_REFRESH_EXECUTE=false` por defecto: acepta el job, genera un plan sin red y nunca publica. La recolección real requiere habilitar ese segundo gate además del API. Sigue `docs/operations/data-dashboard-and-refresh.md` para prerrequisitos, ejecución, aceptación y riesgos.

Ante un incidente, vuelve a `DATA_REFRESH_ENABLED=false`, rota secretos cuando corresponda y detén `apps/ops`. Reiniciar el API limpia su estado de corrida en memoria, pero no cancela un job ya aceptado.

## Rollback

Despliega las imágenes `web` y `api` del SHA anterior. No existen migraciones ni estado persistente. Para recuperar la experiencia estática histórica, usa la etiqueta `demo-static-v1`; no la mezcles con la API vigente.

Si el incidente afecta datos publicados, selecciona además el snapshot aprobado anterior y valida su checksum. No borres staging, manifiestos, observaciones ni capturas privadas necesarias para auditoría.

## Cierre

```powershell
docker compose down
```
