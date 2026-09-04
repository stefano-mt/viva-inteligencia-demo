# Plan ejecutable — Fase 8

## Objetivo

Entregar un monorepo comprensible y desplegable con frontend Vite/TypeScript, API Fastify/TypeScript, snapshot determinista encapsulado en backend, contratos compartidos, contenedores OCI, CI y documentación para negocio y tecnología.

## Historias

- **HU-PLAT-801:** como desarrollador, puedo clonar, instalar y ejecutar todo desde la raíz.
- **HU-PLAT-802:** como frontend, consumo una API versionada sin descargar el snapshot completo.
- **HU-PLAT-803:** como backend, cargo y valido un snapshot inmutable y expongo consultas/cálculos públicos de solo lectura.
- **HU-PLAT-804:** como equipo de datos, genero el mismo artefacto desde los mismos insumos y detecto privacidad o referencias inválidas.
- **HU-PLAT-805:** como operador, construyo y despliego web y API como imágenes OCI sin acoplarme a un proveedor.
- **HU-PLAT-806:** como integrante de negocio o tecnología, encuentro propósito, límites, datos, responsables y operación desde una portada canónica.

## Olas y write sets

| Paso | Resultado | Write set principal |
|---|---|---|
| P8-00 | baseline, tag, contexto y aprobación | `.planning/phases/08-*` |
| P8-01 | workspaces, estructura, higiene y comandos raíz | raíz, `apps/`, `tools/`, `data/`, `tests/` |
| P8-02 | contratos y dominio puro | `packages/contracts`, `packages/domain`, pruebas unitarias |
| P8-03 | API vertical y snapshot repository | `apps/api`, `packages/snapshot`, pruebas de integración |
| P8-04 | casos de uso completos en API | API, dominio y contratos |
| P8-05 | Vite y cutover incremental del frontend | `apps/web`, pruebas de paridad/E2E |
| P8-06 | contenedores y CI | `infra/`, `.github/workflows/` |
| P8-07 | documentación y traspaso | `README.md`, `docs/`, `AGENTS.md`, `CODEOWNERS` |
| P8-08 | verificación, memoria y handoff | pruebas y `.planning/phases/08-*` |

## Protegidos

- Semántica comercial, contrato 2.4, dataset fuente, fingerprints, elegibilidad y privacidad.
- URLs y navegación de las 14 superficies.
- Evidencia local ajena y el historial Git.
- Resultado visual de Fase 7, salvo ajustes técnicos indispensables para el empaquetado Vite.

## Criterios de aceptación

1. `npm ci`, `npm run check`, `npm test`, `npm run e2e` y `npm run verify` funcionan desde la raíz.
2. La API entrega health, metadata, bootstrap, proyectos, inspector, escenario, comparación, histórico y asistente bajo `/api/v1`.
3. Ningún endpoint ordinario expone el documento completo ni datos restringidos.
4. El frontend final obtiene su snapshot y cálculos a través de la API; no existe una copia bajo `apps/web/public/demo-data`.
5. Las 14 superficies y CT-A–I/P conservan paridad observable.
6. Dos builds de datos producen el mismo checksum.
7. `docker compose up --build` inicia web y API con health checks.
8. CI bloquea lint/tipos, unitarias, contratos, integración, E2E y build de imágenes.
9. La documentación diferencia claramente producto, negocio, arquitectura, datos y operación.

## Rollback

- Antes del cutover: revertir el PR atómico afectado.
- Después del cutover: desplegar las imágenes del SHA anterior.
- Recuperación histórica: usar la etiqueta `demo-static-v1` sin reescribir ramas ni datos.

