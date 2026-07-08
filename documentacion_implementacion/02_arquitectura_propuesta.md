# Arquitectura propuesta de implementacion

## Vista logica

```text
Fuentes publicas / fuentes internas aprobadas
        |
        v
Jobs de ingesta y normalizacion
        |
        v
Almacenamiento de evidencia y datos normalizados
        |
        v
Base historica relacional
        |
        +--> API interna
        +--> Dashboard comercial
        +--> Asistente comercial controlado
        +--> Exportaciones BI
```

## Componentes recomendados

| Componente | Responsabilidad |
|---|---|
| Ingesta | Captura programada de fuentes aprobadas. |
| Normalizacion | Unificar nombres, distritos, precios, areas, estados y tipologias. |
| Historico | Guardar observaciones por fecha para cambios de precio, aparicion/desaparicion y trazabilidad. |
| Calidad | Detectar duplicados, outliers, campos faltantes y cambios extremos. |
| Comparador | Relacionar publicaciones equivalentes entre fuentes. |
| API | Servir datos filtrados a frontend, BI y asistente. |
| Frontend | Experiencia comercial para consultar, filtrar y priorizar. |
| Asistente | Responder preguntas sobre vistas certificadas, sin consultas libres inseguras. |

## Modelo de despliegue sugerido

La propuesta tecnica original recomienda Azure:

- Container Apps Jobs o Functions para tareas programadas.
- Blob Storage / Data Lake para evidencia cruda.
- PostgreSQL Flexible Server para historico, trazabilidad y consultas.
- Key Vault para credenciales.
- Application Insights / Monitor para observabilidad.
- App Service o Container Apps para frontend/API.
- Power BI/Fabric si Viva desea capa BI corporativa.

## Evolucion desde el prototipo

| Fase | Objetivo |
|---|---|
| 1. App productiva | Reimplementar UI con framework corporativo, autenticacion y API. |
| 2. Modelo historico | Crear tablas productivas segun `model_schema_mvp.sql`. |
| 3. Ingesta controlada | Productivizar fuentes listas para piloto. |
| 4. Calidad y revision | Agregar bandeja de alertas y aprobacion humana. |
| 5. Asistente | Conectar asistente a capa semantica read-only. |
| 6. BI e integraciones | Conectar Power BI, CRM o marketing solo con credenciales aprobadas. |

## Criterio de arquitectura

El sistema no debe depender de una sola fuente ni asumir que toda web externa ofrece los mismos campos. La plataforma debe tratar cada dato con nivel de confianza, fecha de captura, origen y estado de revision.
