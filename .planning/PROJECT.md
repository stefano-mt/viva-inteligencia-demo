# Proyecto — Viva Inteligencia Comercial, demo vNext

## Objetivo

Convertir la demo actual en una experiencia comercial convincente y verificable para Viva Inmobiliaria. El usuario debe entender no solo qué ocurre en el mercado, sino por qué un proyecto es comparable, qué evidencia sustenta cada dato y cuándo una discrepancia impide usarlo en el benchmark.

## Tesis de producto

La plataforma no se limita a reunir publicaciones: reduce el riesgo de comparar información incompatible y permite abrir la evidencia que explica la decisión.

## Recorrido objetivo

1. Seleccionar distrito, cuadrante, microzona o terreno objetivo.
2. Mostrar cobertura de mercado y fecha de corte.
3. Ver competidores cercanos y comprender el score de comparabilidad.
4. Configurar un escenario Viva y estimar posición de precio.
5. Abrir un proyecto y contrastar fuentes.
6. Detectar una incompatibilidad entre tarjeta comercial y plano.
7. Excluir el dato dudoso de los agregados certificados.
8. Comparar precio, áreas, acabados, materiales y áreas comunes.
9. Revisar cambios históricos y vigencia de señales.
10. Consultar al asistente y abrir la evidencia utilizada.

## Momento distintivo

Caso Tipo 7:

- Tarjeta: Piso 1 y 104.15 m².
- Plano: departamentos 807–1007 y “Área Total 53.37 m²”.
- Diferencia: 50.78 m²; el plano es aproximadamente 48.8% menor.
- El sistema conserva ambas evidencias, detecta incompatibilidad de piso/rango y área, y excluye el dato de un benchmark certificado hasta revisión.

Este caso no debe corregirse renombrando 53.37 m² como “área techada”; la fuente no lo declara.

## Alcance de datos para la demo

### Cobertura

- 30 inmobiliarias canónicas como mínimo.
- Proyectos en los siete distritos con mayor carga observada en la base actual.
- Datos cuantitativos suficientes para mapa, radar y benchmark.

### Enriquecimiento

- 15 inmobiliarias como mínimo con web oficial o documentos.
- 30 proyectos como mínimo con dos o más fuentes.
- Evidencia de precios, áreas y atributos cuando esté disponible.

### Inspección profunda

- 5 inmobiliarias como mínimo.
- 10–15 tipologías con tarjeta y plano/imagen.
- 5 inconsistencias o validaciones relevantes.
- 2–3 observaciones históricas por proyecto seleccionado.
- 10–20 documentos/evidencias.
- 2 casos como mínimo con información insuficiente.

La amplitud de cobertura no implica igual profundidad para todas las inmobiliarias. La interfaz debe hacerlo visible.

## Baseline técnico al 27 de julio de 2026

- Aplicación estática en HTML, CSS y JavaScript.
- Despliegue automático a GitHub Pages al fusionar en `main`.
- 714 proyectos en el JSON actual.
- Navegación por hash y renderizado en cliente.
- Ocho vistas funcionales en un único `app.js`.
- Sintaxis validada con `npm.cmd run check`.
- No existen todavía tests automatizados de comportamiento, accesibilidad o regresión visual.

## Principios no negociables

- Demostrable sin servicios externos inestables.
- Trazabilidad antes que falsa precisión.
- Mismo escenario para mapa, benchmark, comparador y asistente.
- Evidencia observable para claims importantes.
- Degradación honesta ante datos faltantes.
- Mapa e inspector reciben la mayor jerarquía visual.
- Menos densidad horizontal; más progresión vertical y detalle bajo demanda.
- Accesibilidad y contraste forman parte del “done”.

## Fuera de alcance

- Arquitectura cloud productiva.
- Integraciones vivas con CRM/ERP/ads/redes sociales.
- Automatización legal, firma o cobranza.
- Localización de personas o tratamiento de datos personales.
- Inferir precio real de cierre de competidores.
- Ingesta masiva o recurrente sin evaluación legal y operativa.

## Indicadores de éxito

- El recorrido completo puede ejecutarse sin explicación externa.
- La demo muestra 30 inmobiliarias y distingue niveles de profundidad.
- Microzona/cuadrante modifica de forma consistente todos los módulos dependientes.
- El caso Tipo 7 se detecta, explica y excluye correctamente.
- Las respuestas del asistente concuerdan con cifras y evidencia visibles.
- Ninguna historia Must queda cubierta solo por texto o maqueta no interactiva.
- El equipo puede reproducir la demo desde un clon limpio.
