# API pública v1

Base: `/api/v1`. Todos los datos son públicos y de solo lectura. Los `POST` son cálculos idempotentes y no crean recursos.

| Método | Ruta | Responsabilidad |
|---|---|---|
| GET | `/health/live` | Disponibilidad del proceso. |
| GET | `/health/ready` | Snapshot cargado y validado. |
| GET | `/api/v1/meta` | Versiones, corte, checksum y cobertura. |
| GET | `/api/v1/bootstrap` | Catálogos, navegación y escenario inicial. |
| POST | `/api/v1/workspace/evaluate` | Escenario normalizado y lectura comercial. |
| GET | `/api/v1/projects` | Consulta paginada; máximo 100 registros. |
| GET | `/api/v1/projects/:projectId` | Ficha y trazabilidad. |
| GET | `/api/v1/inspector/cases/:routeSlug` | Expediente autorizado. |
| POST | `/api/v1/comparisons/evaluate` | Comparación determinista. |
| GET | `/api/v1/history` | Señales paginadas. |
| POST | `/api/v1/assistant/answer` | Respuesta semántica determinista. |

OpenAPI se publica en `/openapi.json` y su interfaz en `/docs`. Los errores usan `code`, `message`, `requestId` y `details`. El límite de body es 256 KB y el rate limit de referencia es 120 solicitudes por minuto.
