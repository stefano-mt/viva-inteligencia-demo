# API pública v1

Base: `/api/v1`. Las consultas comerciales son públicas y de solo lectura. Los `POST` de evaluación son cálculos idempotentes y no crean recursos. La excepción operativa es el despacho protegido de actualización: está deshabilitado por defecto, exige clave de operador y solo solicita un job privado; no recolecta ni publica datos en el request path.

| Método | Ruta | Responsabilidad |
|---|---|---|
| GET | `/health/live` | Disponibilidad del proceso. |
| GET | `/health/ready` | Snapshot cargado y validado. |
| GET | `/api/v1/meta` | Versiones, corte, checksum y cobertura. |
| GET | `/api/v1/bootstrap` | Catálogos, navegación y escenario inicial. |
| POST | `/api/v1/workspace/evaluate` | Escenario normalizado y lectura comercial. |
| GET | `/api/v1/projects` | Consulta paginada; máximo 100 registros. |
| GET | `/api/v1/projects/:projectId` | Ficha y trazabilidad. |
| GET | `/api/v1/geography/districts/:districtId` | Geometría distrital versionada y procedencia. |
| GET | `/api/v1/source-coverage` | Cobertura por canal, inmobiliaria y distrito del snapshot publicado. |
| GET | `/api/v1/data-refresh/status` | Configuración habilitada, última publicación y estado en memoria del último despacho. |
| POST | `/api/v1/data-refresh` | Despacho protegido a un orquestador privado; requiere `x-data-refresh-key`. |
| GET | `/api/v1/inspector/cases/:routeSlug` | Expediente autorizado. |
| POST | `/api/v1/comparisons/evaluate` | Comparación determinista. |
| GET | `/api/v1/history` | Señales paginadas. |
| POST | `/api/v1/assistant/answer` | Respuesta semántica determinista. |

OpenAPI se publica en `/openapi.json` y su interfaz en `/docs`. Los errores usan `code`, `message`, `requestId` y `details`. El límite de body es 256 KB y el rate limit de referencia es 120 solicitudes por minuto.

`POST /api/v1/data-refresh` solo se habilita cuando están presentes `DATA_REFRESH_ENABLED=true`, `DATA_REFRESH_OPERATOR_KEY`, `DATA_REFRESH_DISPATCH_URL` y `DATA_REFRESH_INTERNAL_TOKEN`. El API envía el token interno únicamente al orquestador configurado y nunca al navegador. `apps/ops` implementa `POST /runs` fuera del request path, con `dry-run` como valor predeterminado. Su estado es en memoria y no publica datos; consulta `docs/operations/data-dashboard-and-refresh.md` antes de habilitar el endpoint.
