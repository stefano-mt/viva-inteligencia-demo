# Mapa de cambio y propietario

| Necesito cambiar… | Carpeta | Revisión requerida |
|---|---|---|
| Copy o recorrido comercial | `docs/business`, `docs/product`, `apps/web/src` | Negocio + frontend |
| Un DTO o endpoint | `packages/contracts`, `apps/api` | Backend + consumidores |
| Una regla de comparabilidad | `packages/domain` | Producto + datos + QA |
| Filtros o índices del snapshot | `packages/snapshot` | Backend + datos |
| Fuente, normalización o policy | `data/source`, `tools/data` | Datos + privacidad |
| Autorizar una fuente o programar una ingesta | `data/source/ingestion`, `tools/ingestion`, `apps/ops` | Datos + legal + plataforma |
| Tablero de cobertura o control `Actualizar Data` | `apps/web/src`, `packages/contracts/src/api.ts`, `apps/api/src`, `packages/snapshot/src` | Producto + frontend + backend + datos + seguridad |
| Estilos o accesibilidad | `apps/web/src` | Frontend + QA |
| Contenedores o pipeline | `infra`, `.github/workflows` | Plataforma + seguridad |
| Cobertura de regresión | `tests`, pruebas de cada workspace | QA + propietario del dominio |

Los alias actuales en `CODEOWNERS` apuntan al dueño del repositorio y deben sustituirse por los equipos reales durante el traspaso.

El mapa detallado por necesidad, propietario y archivo exacto del flujo de actualización está en `docs/operations/data-dashboard-and-refresh.md`.
