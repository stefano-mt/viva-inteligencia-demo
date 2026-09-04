# Checklist de release

## Antes del merge

- [ ] La rama parte de `main` y no incluye archivos locales, logs, capturas ni secretos.
- [ ] `npm ci` completa desde una clonación limpia.
- [ ] `npm run verify` finaliza sin errores.
- [ ] `docker compose config --quiet` valida la composición.
- [ ] CI construye las imágenes `web` y `api`.
- [ ] El cambio de contrato incluye pruebas compatibles y documentación OpenAPI.
- [ ] Los cambios de datos conservan determinismo, privacidad y trazabilidad.

## Después del merge

- [ ] El workflow `Publish OCI images` publica ambos artefactos para el mismo SHA.
- [ ] Se registra el SHA inmutable de `web` y `api`; no se promueven imágenes mezcladas.
- [ ] El entorno responde `200` en `/health/live` y `/health/ready`.
- [ ] `/api/v1/meta` informa contrato `2.4.0` y el dataset esperado.
- [ ] Se ejecuta el recorrido crítico sin llamadas a hosts externos ni descarga del snapshot.
- [ ] Se realiza la validación humana final con las plantillas de `docs/business/human-validation`.

## Rollback

Desplegar ambas imágenes del SHA anterior. No hay migraciones ni datos persistentes que recuperar. La experiencia previa a la productización está preservada por la etiqueta `demo-static-v1`.
