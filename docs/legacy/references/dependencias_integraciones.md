# Readiness de integraciones, fuentes publicas y cumplimiento

Fecha de evaluacion: 2026-05-25T17:35:53.906Z

## Resumen

- Componentes evaluados: 7.
- Listos para prueba: 0.
- Bloqueados por insumos: 7.
- Archivo de configuracion base: config/integration_access.sample.json.

| Componente | Clasificacion | Estado | Faltantes | Siguiente accion |
|---|---|---|---|---|
| Meta Ads | Fase 2 / condicionado | bloqueado_por_insumos | META_ACCESS_TOKEN \| ad_account_id | Solicitar a Viva: META_ACCESS_TOKEN, ad_account_id |
| Google Ads | Fase 2 / condicionado | bloqueado_por_insumos | GOOGLE_ADS_DEVELOPER_TOKEN \| GOOGLE_ADS_CUSTOMER_ID \| GOOGLE_ADS_OAUTH_CLIENT_JSON | Solicitar a Viva: GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_OAUTH_CLIENT_JSON |
| GA4 | Fase 2 / condicionado | bloqueado_por_insumos | GA4_PROPERTY_ID \| GOOGLE_APPLICATION_CREDENTIALS | Solicitar a Viva: GA4_PROPERTY_ID, GOOGLE_APPLICATION_CREDENTIALS |
| Base Viva | MVP / dependencia critica | bloqueado_por_insumos | viva_base.export_path \| viva_base.dictionary_path | Solicitar a Viva: viva_base.export_path, viva_base.dictionary_path |
| INEI | Fase 2 | bloqueado_por_insumos | public_sources.inei_urls | Solicitar a Viva: public_sources.inei_urls |
| Portal transparencia | Fase 2 | bloqueado_por_insumos | public_sources.transparency_urls | Solicitar a Viva: public_sources.transparency_urls |
| Azure | MVP tecnico | bloqueado_por_insumos | azure.subscription_id \| azure.resource_group \| azure.key_vault_name | Solicitar a Viva: azure.subscription_id, azure.resource_group, azure.key_vault_name |

## Exclusiones de cumplimiento

- No scraping de perfiles personales.
- No uso de datos sensibles sin base legal.
- No automatizaciones que incumplan terminos de uso.
- No prometer atribucion por distrito/proyecto sin UTMs, landing pages o CRM que lo soporten.
- No presentar ingresos estimados como ingresos reales.

## Criterio de cierre

Un componente pasa de bloqueado a validable cuando sus accesos o fuentes concretas estan disponibles, la consulta es read-only/agregada y Legal/Compliance no bloquea el metodo.
