# Contexto — Fase 8: productización lean

## Intención

Convertir la demo estática verificada en un MVP desplegable como frontend y backend independientes, sin perder el recorrido comercial, la trazabilidad ni el comportamiento determinista acumulado en las fases 0–7.

## Decisiones aprobadas

- Arquitectura cloud-agnostic mediante imágenes OCI.
- Monorepo con npm workspaces y TypeScript estricto.
- Migración incremental del frontend actual a Vite, sin incorporar React, Vue u otro framework.
- API pública de solo lectura sobre un snapshot inmutable; los `POST` son cálculos idempotentes sin persistencia.
- Sin PostgreSQL, autenticación, scraping vivo, CRM, LLM ni rediseño visual en este MVP.
- El contrato público 2.4 y los casos CT-A–I/P se conservan como autoridades de paridad.
- Los gates humanos intermedios se reemplazan por gates automáticos; la UAT humana se realiza al final.

## Restricciones operativas

- La ejecución parte de un worktree limpio creado desde el head documental de PR #21 (`6210e5b`).
- La etiqueta `demo-static-v1` preserva el baseline anterior.
- El checkout histórico con evidencias locales de Fase 6 no se toca.
- GitHub no fue alcanzable al iniciar la fase; el head documental local contiene el contenido ya fusionado y no incluye cambios locales sin commit.

