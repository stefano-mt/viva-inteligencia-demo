# Servicio interno de actualización (`@viva/ops`)

Servicio Fastify separado del API público. `POST /runs` solo valida y encola una corrida; el trabajo empieza de forma asíncrona después de responder. El servicio nunca navega Nexo ni redes sociales y nunca publica un dataset.

## Configuración

- `INGESTION_TOKEN` (requerido): valor esperado en `x-ingestion-token`. Como compatibilidad operativa también acepta `DATA_REFRESH_INTERNAL_TOKEN`.
- `DATA_REFRESH_EXECUTE` (opcional): solo `true` habilita colección controlada. Su valor por defecto es `false` y genera un dry-run sin red.
- `OPS_HOST` / `OPS_PORT`: `0.0.0.0` y `3100` por defecto.
- `INGESTION_REGISTRY_PATH`: registro que leerá `@viva/ingestion-tools`.
- `INGESTION_STAGING_DIRECTORY`: debe permanecer dentro de `data/staging`; por defecto usa `data/staging/ops`.

Antes de iniciar el servicio debe existir `tools/ingestion/dist/official-web-refresh.js` (`npm run build --workspace @viva/ingestion-tools`). El runtime carga dinámicamente esa API y usa exclusivamente `writeBatchArtifacts` para persistir la salida sanitizada y el manifiesto.

## Contrato HTTP

- `GET /health/live`: liveness sin autenticación.
- `GET /health/ready`: confirma token, API de ingesta y registro legible; no hace red externa.
- `POST /runs`: requiere `x-ingestion-token`. Payload obligatorio: `runId`, `scope`, `districtIds`, `channels`. Responde `202` inmediatamente. Si ya existe una corrida activa responde la misma corrida con `deduplicated: true`.
- `GET /runs/latest`: requiere `x-ingestion-token` y devuelve el estado en memoria más reciente.

Canales admitidos por contrato: `nexo_authorized_feed`, `official_websites` y `social_official_apis`. Solo `official_websites` tiene ejecución implementada, mediante el policy gate oficial. Nexo devuelve `AUTHORIZED_FEED_INPUT_REQUIRED` y social devuelve `SOCIAL_API_AUTHORIZATION_REQUIRED`; ninguno inventa observaciones ni cobertura. Todo resultado conserva `published: false` porque promoción y publicación requieren el flujo de revisión separado.
