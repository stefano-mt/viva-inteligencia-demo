# Handoff — Fase 8

## Resultado entregado

La demo dejó de ser un sitio estático acoplado al dataset. La rama implementa un monorepo Node.js 24/TypeScript con frontend Vite, BFF Fastify, dominio puro, contratos compartidos, repositorio de snapshot, dos imágenes OCI y documentación separada para negocio, producto, datos, arquitectura y operación.

## Fuentes de verdad

| Tema | Ubicación |
|---|---|
| Entrada al proyecto | `README.md` y `docs/START_HERE.md` |
| Contrato funcional | `docs/product/product-contract.md` |
| Arquitectura | `docs/architecture/overview.md` |
| API y errores | `docs/architecture/api.md` y `/docs` en la API |
| Datos | `docs/data/snapshot.md` |
| Operación | `docs/operations/runbook.md` |
| Responsables | `CODEOWNERS` y `docs/operations/ownership-map.md` |
| Instrucciones para agentes | `AGENTS.md` |
| Release | `docs/operations/release-checklist.md` |

## Comandos

```powershell
npm ci
npm run data:build
npm run dev
npm run verify
docker compose up --build
```

## Decisiones que no deben revertirse accidentalmente

- El snapshot 2.4 es backend-only; no copiarlo a `apps/web/public`.
- Toda regla comercial reside en `packages/domain`; ni Fastify ni la vista deben duplicarla.
- `packages/contracts` es la fuente única de DTO, schemas y OpenAPI.
- La API es pública, de solo lectura y no persiste escenarios ni respuestas.
- PostgreSQL, autenticación, scraping vivo, CRM y LLM están fuera de esta fase.
- La etiqueta `demo-static-v1` es el rollback histórico; no reescribir Git para reducir tamaño.

## Próximo operador

Debe publicar `feat/phase-8-productization-lean`, abrir un PR contra `main`, esperar todos los checks y revisar especialmente los jobs de imágenes. Tras el merge, debe desplegar `web` y `api` del mismo SHA y completar la única validación humana final documentada en `docs/business/human-validation`.

No se debe declarar P8-08 totalmente aceptado hasta completar el CI OCI y esa validación humana.
