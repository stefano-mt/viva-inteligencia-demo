# Handoff — Fase 8

## Resultado entregado

La productización lean está integrada en `main` mediante el PR [#22](https://github.com/stefano-mt/viva-inteligencia-demo/pull/22). El merge `65334e7fb2acbff0ca1fd0e225690c16269a4bf1` pasó CI, verificación independiente y publicación de las imágenes OCI de web y API.

La entrega separa frontend Vite, BFF Fastify, dominio puro, contratos, repositorio de snapshot, herramientas de datos, pruebas y documentación. El navegador ya no recibe el snapshot ni ejecuta reglas comerciales duplicadas.

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
| Validación humana | `docs/business/human-validation` |
| Verificación P8-08 | `.planning/phases/08-productization-lean/VERIFICATION.md` |

## Artefacto que debe desplegarse

- Web: `ghcr.io/stefano-mt/viva-inteligencia-web:sha-65334e7fb2acbff0ca1fd0e225690c16269a4bf1`
- API: `ghcr.io/stefano-mt/viva-inteligencia-api:sha-65334e7fb2acbff0ca1fd0e225690c16269a4bf1`

No mezclar `latest` con tags SHA ni desplegar servicios de revisiones distintas.

## Próximo operador

1. Abrir Docker Desktop y esperar a que el motor esté disponible.
2. Levantar `compose.yml` + `compose.prod.yml` con `IMAGE_TAG=sha-65334e7fb2acbff0ca1fd0e225690c16269a4bf1`.
3. Registrar health checks, metadata y recorrido crítico.
4. Entregar el paquete externo preparado a una persona independiente y ejecutar una sola sesión humana, sin asistencia explicativa.
5. Incorporar el resultado literal y el veredicto real en el reporte; si todo pasa, preparar el PR documental final. El usuario realiza el merge.

## Decisiones protegidas

- El snapshot 2.4 es backend-only.
- Toda regla comercial reside en `packages/domain`.
- `packages/contracts` es la fuente única de DTO, schemas y OpenAPI.
- La API es pública, de solo lectura y no persiste escenarios ni respuestas.
- PostgreSQL, autenticación, scraping vivo, CRM y LLM quedan fuera de esta fase.
- `demo-static-v1` es el rollback histórico; no se reescribe el historial Git.

## Estado de cierre

`PASS técnico; despliegue Compose y validación humana pendientes`.

No declarar P8-08 como completado ni el MVP como validado por usuarios mientras esos campos sigan pendientes.
