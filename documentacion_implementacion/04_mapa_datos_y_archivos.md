# Mapa de datos y archivos incluidos

## Archivos principales de datos

| Archivo | Uso recomendado |
|---|---|
| `viva_minimum_dataset_latest.csv` | Base principal de proyectos observados. Alimenta dashboard, catalogo, rankings y fichas. |
| `webs_propias_sample_dataset.csv` | Muestra de datos capturados desde sitios de inmobiliarias. Sirve para validar estructura complementaria. |
| `service_scope_matrix.csv` | Estado de seguimiento por inmobiliaria. Alimenta modulo Mercado. |
| `agency_web_discovery_matrix_validated.csv` | Evidencia consolidada de disponibilidad por inmobiliaria. |
| `nexo_web_project_match.csv` | Comparacion de publicaciones equivalentes. Alimenta modulo Comparador. |
| `webs_propias_source_field_feasibility.csv` | Disponibilidad/cobertura por campo. Alimenta modulo Confianza. |
| `data_quality_latest.json` | Duplicados, outliers y completitud. Alimenta alertas de datos. |
| `assistant_validation_latest.json` | Preguntas/respuestas base para simular asistente comercial. |
| `data_dictionary_latest.csv` | Diccionario canonico inicial. |
| `model_schema_mvp.sql` | Esquema relacional preliminar para historico productivo. |

## Snapshot del prototipo

```text
prototipo_ejecutable/public/demo-data/viva-platform-demo.json
```

Es un JSON consolidado generado a partir de los archivos anteriores. Permite que el prototipo se ejecute como app estatica sin base de datos.

## Campos clave para proyecto

| Campo | Descripcion |
|---|---|
| `agency_name` | Inmobiliaria/desarrollador. |
| `project_name` | Nombre del proyecto. |
| `district` | Distrito. |
| `address` | Direccion publicada. |
| `project_phase` / `unit_status` | Estado comercial publicado. |
| `typology` | Tipo de inmueble. |
| `bedrooms_min`, `bedrooms_max` | Rango de dormitorios. |
| `total_area_min`, `total_area_max` | Rango de area. |
| `unit_count` | Unidades publicadas. |
| `list_price_avg` / `price_min` | Precio publicado. |
| `price_per_m2_list` | Precio publicado por m2. |
| `delivery_date`, `delivery_year` | Fecha o ano de entrega. |
| `amenities` | Areas comunes/atributos publicados. |
| `financing_banks` | Bancos o financiamiento publicado. |
| `source_url` | URL de publicacion. |

## Transformaciones que requiere produccion

- Normalizacion de nombres de inmobiliaria.
- Homologacion de distritos.
- Conversion de precios y moneda.
- Deduplicacion de proyectos.
- Control de cambios historicos por fecha.
- Separacion entre dato publicado, dato inferido y dato validado.
- Registro de origen y fecha para cada observacion.

## Reglas importantes

- No tratar `income` como ingreso real de Viva. Es estimacion basada en precio publicado x unidades.
- No tratar `unit_count` como stock real cerrado.
- No usar campos con baja disponibilidad como promesa de cobertura general.
- Toda fuente externa debe tener revision legal/operativa antes de automatizarse.
