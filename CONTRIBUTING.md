# Contribuir

1. Parte de `main` sincronizado y usa una rama o worktree por cambio.
2. Lee `AGENTS.md`, `docs/START_HERE.md` y el ADR relacionado.
3. Mantén contratos, dominio, snapshot, API y presentación en fronteras separadas.
4. No añadas datos personales, payloads crudos, inferencias causales ni fuentes no autorizadas.
5. Ejecuta `npm run verify` antes de solicitar revisión.
6. El PR debe explicar intención, contratos afectados, pruebas, riesgos y rollback.

## Definition of Done

- `npm ci` y `npm run verify` terminan sin errores desde la raíz.
- Los cambios de contrato incluyen schema, tipos y pruebas de API.
- Los cambios de dominio incluyen casos deterministas y no importan DOM, Fastify ni archivos.
- Los cambios visuales conservan teclado, contraste, responsive y zoom 200%.
- Ninguna respuesta ordinaria supera 1 MB y ningún endpoint expone el snapshot completo.
- No se versionan snapshots generados, logs, resultados Playwright ni capturas temporales.

La CI bloquea el merge si falla tipado, contrato, dominio, integración, E2E o construcción OCI. La prueba humana integral se realiza al final de una fase, no como sustituto de los gates automáticos.

Los cálculos pertenecen a `packages/domain`; el frontend no debe duplicarlos. El acceso a datos pasa por la interfaz de `packages/snapshot` y la API no debe entregar el snapshot completo.
