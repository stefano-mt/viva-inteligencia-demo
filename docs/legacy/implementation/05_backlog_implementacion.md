# Backlog tecnico sugerido

## Prioridad 1 - Base productiva

1. Crear repositorio de frontend/API.
2. Implementar autenticacion y roles basicos.
3. Definir base de datos usando `model_schema_mvp.sql` como punto de partida.
4. Cargar `viva_minimum_dataset_latest.csv` en tablas normalizadas.
5. Crear endpoints para dashboard, catalogo, mercado, comparador, confianza y asistente.
6. Reimplementar UI del prototipo conectada a API real.

## Prioridad 2 - Historico y calidad

1. Persistir snapshots por fecha.
2. Calcular nuevos proyectos, proyectos retirados y cambios de precio.
3. Implementar alertas de duplicados.
4. Implementar alertas de valores atipicos.
5. Crear bandeja de revision humana para casos con baja confianza.
6. Registrar origen y fecha de cada dato mostrado.

## Prioridad 3 - Ingesta automatizada

1. Productivizar captura recurrente de fuente base.
2. Activar inmobiliarias en estado `Listo para piloto`.
3. Incorporar inmobiliarias `Requiere validacion` por oleadas.
4. Guardar evidencia cruda en almacenamiento barato.
5. Agregar monitoreo de fallos y cambios de estructura.

## Prioridad 4 - Asistente comercial

1. Crear capa semantica de preguntas permitidas.
2. Implementar respuestas sobre vistas certificadas.
3. Bloquear consultas con datos personales o datos no disponibles.
4. Mostrar fuentes, filtros usados y advertencias en cada respuesta.
5. Validar respuestas contra metricas del dashboard.

## Prioridad 5 - Integraciones corporativas

1. Conectar Power BI/Fabric si Viva lo requiere.
2. Integrar CRM/base interna cuando exista contrato de datos.
3. Integrar Meta Ads/Google Ads/GA4 solo con permisos y UTMs disponibles.
4. Incorporar fuentes publicas adicionales bajo revision legal.

## Riesgos principales

- Cambios en estructura de fuentes externas.
- Restricciones legales/operativas de sitios web.
- Baja disponibilidad de campos sensibles como stock, fecha de entrega o precio.
- Confusion entre precio publicado e ingreso real.
- Falta de datos internos de Viva para ventas reales, leads o conversion.

## Criterios de aceptacion MVP

- Dashboard responde con filtros principales.
- Catalogo de proyectos muestra ficha completa y URL de publicacion.
- Estados de inmobiliarias son entendibles para usuarios comerciales.
- Comparador muestra coincidencias y casos por revisar.
- Alertas de datos separan duplicados, outliers y campos faltantes.
- Asistente responde solo sobre datos disponibles y con advertencias.
- Sistema registra fecha/origen de cada dato.
