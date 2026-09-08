# Checklist de release

## Baseline integrado en `main` (`web` y `api`)

- [x] La rama partió de `main` y no incluyó archivos locales, logs, capturas ni secretos.
- [x] `npm ci` completó desde una clonación limpia.
- [x] `npm run verify` finalizó sin errores.
- [x] `docker compose config --quiet` validó la composición.
- [x] CI construyó las imágenes `web` y `api`.
- [x] El cambio de contrato incluyó pruebas compatibles y documentación OpenAPI.
- [x] Los cambios de datos conservaron determinismo, privacidad y trazabilidad.
- [x] `Publish OCI images` publicó ambos artefactos para el mismo SHA.
- [x] Se registró el SHA inmutable de `web` y `api` sin promover imágenes mezcladas.
- [x] El entorno respondió `200` en `/health/live` y `/health/ready`.
- [x] `/api/v1/meta` informó el contrato `2.4.0` y el dataset esperado.
- [x] El recorrido crítico se ejecutó sin llamadas a hosts externos ni descarga del snapshot.
- [ ] Se realiza la validación humana final con las plantillas de `docs/business/human-validation`.

## Release actual con `apps/ops`

### Antes del merge

- [ ] La rama parte de `main` y no incluye archivos locales, logs, capturas ni secretos.
- [ ] `npm ci` completa desde una clonación limpia.
- [ ] `npm run verify` finaliza sin errores.
- [ ] `docker compose config --quiet` valida la composición.
- [ ] CI construye las imágenes `web`, `api` y `ops`.
- [ ] El cambio de contrato incluye pruebas compatibles y documentación OpenAPI.
- [ ] Los cambios de datos conservan determinismo, privacidad y trazabilidad.
- [ ] `DATA_REFRESH_ENABLED` permanece en `false`, salvo que exista un cambio operativo aprobado con `apps/ops` desplegado, secretos rotables, fuentes autorizadas y rollback probado.
- [ ] Si la release incluye `apps/ops`, su build, tipado y pruebas se ejecutan explícitamente; readiness funciona primero con `DATA_REFRESH_EXECUTE=false` y cero solicitudes de red.

### Después del merge

- [ ] El workflow `Publish OCI images` publica los tres artefactos para el mismo SHA.
- [ ] Se registra el SHA inmutable de `web`, `api` y `ops`; no se promueven imágenes mezcladas.
- [ ] El entorno responde `200` en `/health/live` y `/health/ready`.
- [ ] `/api/v1/meta` informa contrato `2.4.0` y el dataset esperado.
- [ ] Se ejecuta el recorrido crítico sin llamadas a hosts externos ni descarga del snapshot.
- [ ] Se realiza la validación humana final con las plantillas de `docs/business/human-validation`.
- [ ] Si se habilitó el despacho, una corrida `dry-run` conserva `published: false`; Nexo y social permanecen bloqueados/no soportados y el tablero sigue sirviendo el snapshot aprobado.

## Rollback

Desplegar las tres imágenes del SHA anterior. No hay migraciones ni datos persistentes que recuperar. La experiencia previa a la productización está preservada por la etiqueta `demo-static-v1`.

Si se desplegó `apps/ops`, deshabilitar primero nuevos despachos con `DATA_REFRESH_ENABLED=false`, detener el worker y rotar secretos cuando corresponda. Una versión de datos defectuosa se revierte seleccionando el snapshot aprobado anterior; staging y manifiestos se conservan para auditoría.
