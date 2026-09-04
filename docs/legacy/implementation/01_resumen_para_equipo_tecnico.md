# Resumen para equipo tecnico

## Objetivo

Implementar una plataforma de inteligencia comercial inmobiliaria para Viva que permita al equipo comercial:

- Monitorear proyectos publicados por distrito e inmobiliaria.
- Revisar precios, unidades, areas, estados y amenities.
- Identificar cambios relevantes de precio.
- Priorizar inmobiliarias para seguimiento.
- Consultar informacion mediante un asistente comercial controlado.
- Revisar alertas de calidad antes de usar informacion en reportes.

## Estado actual de la entrega

Esta carpeta incluye:

- Prototipo visual interactivo listo para correr localmente.
- Dataset demo generado desde datos reales del PoC.
- CSV/JSON relevantes para implementar modelo de datos, dashboard y asistente.
- Documentos de arquitectura, alcance, riesgos y contratos de datos.

## Datos disponibles

La base principal contiene:

- 714 proyectos observados.
- 192 inmobiliarias en el universo evaluado.
- 45 distritos.
- Matriz de 192 inmobiliarias por estado de seguimiento.
- 800 filas de comparacion entre publicaciones.
- 3,404 registros de disponibilidad/cobertura por campo.

## Modulos del prototipo

| Modulo | Proposito funcional |
|---|---|
| Resumen | KPIs, rankings, movimientos de precio y estado de seguimiento. |
| Proyectos | Catalogo con ficha comercial por proyecto. |
| Mercado | Priorizacion de inmobiliarias y lectura por distrito. |
| Comparador | Coincidencias entre publicaciones de diferentes fuentes. |
| Confianza | Alertas, duplicados, valores atipicos y disponibilidad de datos. |
| Asistente | Simulacion de preguntas/respuestas comerciales. |
| Actividad | Explicacion simple del flujo de actualizacion y uso del sistema. |

## Recomendacion de implementacion

1. Convertir el prototipo en una app web productiva con autenticacion corporativa.
2. Implementar API de consulta sobre una base historica.
3. Cargar datos normalizados desde jobs de ingesta.
4. Crear modelo semantico para dashboard y asistente.
5. Mantener revision humana para datos con baja confianza o cambios extremos.
6. Integrar fuentes internas de Viva solo cuando existan contratos de datos claros.

## Principales restricciones

- Los precios publicados no son precios finales de venta.
- Las unidades publicadas no equivalen necesariamente a stock real.
- Las fuentes publicas no deben usarse si incumplen terminos, bloqueo tecnico o restricciones legales.
- Las integraciones de marketing, CRM, GA4, Meta Ads o Google Ads requieren credenciales y permisos de Viva.
