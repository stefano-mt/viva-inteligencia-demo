# Contratos de datos — Webs propias inmobiliarias

Este documento define los archivos CSV/Markdown que debe generar la validación.

## 1. `data/nexo_web_project_universe.csv`

Universo base Nexo para matching.

Columnas:

- `project_id`
- `project_slug`
- `agency_name`
- `agency_name_normalized`
- `agency_aliases`
- `project_name`
- `project_name_normalized`
- `district`
- `address`
- `latitude`
- `longitude`
- `source_url_nexo`
- `typology`
- `bedrooms`
- `total_area`
- `unit_status`
- `unit_count`
- `list_price_avg`
- `currency`
- `delivery_year`
- `delivery_date`
- `nexo_capture_date`
- `nexo_confidence`

## 2. `data/agency_website_candidates.csv`

Todas las inmobiliarias Nexo, tengan o no web confirmada.

Columnas:

- `agency_id`
- `agency_name`
- `agency_name_normalized`
- `nexo_project_count`
- `districts_covered`
- `candidate_website_url`
- `candidate_domain`
- `candidate_source`
- `official_confidence`
- `official_confidence_reason`
- `status`
- `notes`

Estados válidos:

- `official_confirmed`
- `likely_official`
- `candidate_unconfirmed`
- `no_website_found`
- `only_nexo_profile`
- `duplicate_or_alias`

## 3. `data/agency_site_audit_raw.csv`

Auditoría técnica superficial por dominio.

Columnas mínimas: ver `data/templates/agency_site_audit_raw.csv`.

## 4. `data/agency_web_discovery_matrix_validated.csv`

Matriz final de decisión por web.

Decisiones válidas:

- `Go`
- `Go condicionado`
- `No-go técnico`
- `No-go legal/operativo`
- `Discovery pendiente`

Columnas mínimas: ver `data/templates/agency_web_discovery_matrix_validated.csv`.

## 5. `data/project_url_candidates.csv`

URLs candidatas de fichas de proyecto.

Métodos válidos:

- `sitemap`
- `wordpress_rest`
- `internal_links`
- `embedded_json`
- `playwright_dom`
- `network_api`
- `manual_seed`

## 6. `data/webs_propias_sample_dataset.csv`

Muestra normalizada de datos extraídos desde webs propias.

Debe mantener compatibilidad conceptual con `viva_minimum_dataset_latest.csv`.

## 7. `data/webs_propias_field_evidence.csv`

Evidencia por campo extraído.

Cada valor debe tener:

- URL fuente.
- método.
- selector, JSON path o endpoint.
- snippet.
- confianza.
- snapshot o referencia.

## 8. `data/nexo_web_project_match.csv`

Matching web propia vs Nexo.

Clases válidas:

- `match_high`
- `match_medium`
- `match_low`
- `unmatched_web`
- `unmatched_nexo`

## 9. `data/webs_propias_source_field_feasibility.csv`

Cobertura por fuente/campo/arquetipo.

`recommended_use` válido:

- `primary_candidate`
- `enrichment_only`
- `monitoring_only`
- `manual_review`
- `not_recommended`

## 10. `data/service_scope_matrix.csv`

Matriz de alcance final del servicio.

Niveles de alcance:

- `MVP automatizable`
- `MVP condicionado / enriquecimiento`
- `Backlog posterior`
- `Fuera de alcance`

## 11. Reportes Markdown

- `reports/service_scope_final.md`
- `reports/webs_propias_viability_report.md`
- `reports/backlog_mvp_webs_propias.md`

## Regla de oro

Un CSV puede tener más columnas que las definidas aquí, pero no menos. Toda columna nueva debe documentarse en el reporte final.
