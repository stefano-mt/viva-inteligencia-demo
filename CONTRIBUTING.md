# Contribuir

1. Parte de `main` sincronizado y usa una rama o worktree por cambio.
2. Lee `AGENTS.md`, `docs/START_HERE.md` y el ADR relacionado.
3. Mantén contratos, dominio, snapshot, API y presentación en fronteras separadas.
4. No añadas datos personales, payloads crudos, inferencias causales ni fuentes no autorizadas.
5. Ejecuta `npm run verify` antes de solicitar revisión.
6. El PR debe explicar intención, contratos afectados, pruebas, riesgos y rollback.

Los cálculos pertenecen a `packages/domain`; el frontend no debe duplicarlos. El acceso a datos pasa por la interfaz de `packages/snapshot` y la API no debe entregar el snapshot completo.
