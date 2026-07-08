# Export de modelo historico MVP

Fecha de generacion: 2026-05-25T17:31:47.958Z

## Resumen

- Snapshots leidos: 15.
- Registros observados: 2071.
- Primera captura: 2026-05-22T23:48:59.564Z.
- Ultima captura: 2026-05-24T18:37:51.632Z.
- Proyecto logico/deduplicado: 718.
- Observaciones fuente: 2071.
- Precios historicos: 2071.
- Issues de calidad: 376.

## Tablas generadas

| Tabla | Filas | Archivo |
|---|---:|---|
| sources | 6 | data/model/sources.csv |
| scraping_runs | 15 | data/model/scraping_runs.csv |
| developers | 192 | data/model/developers.csv |
| locations | 756 | data/model/locations.csv |
| projects | 718 | data/model/projects.csv |
| typologies | 1222 | data/model/typologies.csv |
| source_observations | 2071 | data/model/source_observations.csv |
| inventory | 2071 | data/model/inventory.csv |
| prices | 2071 | data/model/prices.csv |
| quality_issues | 376 | data/model/quality_issues.csv |
| dashboard_metrics | 1345 | data/model/dashboard_metrics.csv |

## Uso en evaluacion

Este export valida el modelo logico sin requerir aun una base Azure. Los CSV pueden cargarse en PostgreSQL/Azure SQL usando el DDL preliminar `data/model_schema_mvp.sql`, o conectarse temporalmente a Power BI para validar KPIs y filtros.
