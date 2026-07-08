# Validacion de asistente conversacional read-only

Fecha de evaluacion: 2026-05-25T17:33:37.999Z

## Resumen

- Modo: catalog_read_only_no_llm.
- Dataset: 2026-05-24T18-37-51Z.
- Registros disponibles: 714.
- Bateria: 6/6 preguntas pasaron.
- Tasa de paso: 100%.

## Guardrails implementados

- Solo lectura: si.
- SQL libre: bloqueado.
- Llamadas externas: bloqueadas.
- PII: bloqueada.
- Tablas permitidas: multisource_sample_latest, data/model/*.csv.

## Bateria de negocio

| ID | Pregunta | Estado | Resumen respuesta | ms |
|---|---|---|---|---:|
| Q01 | Cual es el precio por m2 promedio en Miraflores para departamentos de 2 dormitorios? | Pass | avg_price_m2_list: 8380.6 (81 registros) | 2 |
| Q02 | Que inmobiliarias tienen proyectos activos en Jesus Maria? | Pass | 37 inmobiliarias | 7 |
| Q03 | Que proyectos nuevos aparecieron esta semana? | Pass | 25 proyectos | 1 |
| Q04 | Que proyectos tuvieron mayor variacion de precio publicado? | Pass | 15 proyectos | 0 |
| Q05 | Donde hay mayor stock publicado por tipologia? | Pass | 20 grupos | 1 |
| Q06 | Que fuente tiene mejor cobertura para acabados y areas comunes? | Pass | 1 fuentes | 1 |

## Recomendacion

Esta validacion prueba la capa semantica y las preguntas de negocio sin exponer SQL libre ni usar un LLM. El siguiente paso para un PoC con Azure OpenAI es reutilizar este catalogo como herramienta/semantic layer, agregar validacion SQL read-only y comparar cada respuesta contra el dashboard.
