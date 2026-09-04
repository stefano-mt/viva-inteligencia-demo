# Mapa de cambio y propietario

| Necesito cambiar… | Carpeta | Revisión requerida |
|---|---|---|
| Copy o recorrido comercial | `docs/business`, `docs/product`, `apps/web/src` | Negocio + frontend |
| Un DTO o endpoint | `packages/contracts`, `apps/api` | Backend + consumidores |
| Una regla de comparabilidad | `packages/domain` | Producto + datos + QA |
| Filtros o índices del snapshot | `packages/snapshot` | Backend + datos |
| Fuente, normalización o policy | `data/source`, `tools/data` | Datos + privacidad |
| Estilos o accesibilidad | `apps/web/src` | Frontend + QA |
| Contenedores o pipeline | `infra`, `.github/workflows` | Plataforma + seguridad |
| Cobertura de regresión | `tests`, pruebas de cada workspace | QA + propietario del dominio |

Los alias actuales en `CODEOWNERS` apuntan al dueño del repositorio y deben sustituirse por los equipos reales durante el traspaso.
