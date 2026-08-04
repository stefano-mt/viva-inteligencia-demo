# Fase 5 — Histórico, señales y asistente

**Estado:** planificación; HUMAN-GATE-A pendiente.

**Rama:** `feat/phase-5-history-signals-assistant`.

**Base:** `main` en `47a794ca00b451355a181acf5c20feeee0fdccb4`, después del merge documental de Fase 4 (PR #14).

## Objetivo

Convertir observaciones históricas verificables en señales comerciales prudentes y permitir que el usuario consulte el escenario activo mediante un asistente determinista, sin atribuir causas no observadas, sin inventar precios reales de cierre y sin contradecir las cifras visibles en Radar, Benchmark, Comparador o Inspector.

## Historias incluidas

- **HU-DEMO-601 — Línea de tiempo de cambios (Must):** ver valor anterior, valor nuevo, variación, fecha de observación, vigencia y evidencia de un cambio compatible con el escenario activo.
- **HU-DEMO-602 — Señales con validez y estado (Must):** distinguir señales certificadas, revisables e insuficientes, y explicar por qué una señal puede o no usarse.
- **HU-DEMO-603 — Resumen priorizado de seguimiento (Should):** recibir una agenda breve, ordenada y reproducible para la revisión comercial; nunca afirmar que algo ocurrió “esta semana” si el dataset no lo demuestra.
- **HU-DEMO-701 — Asistente basado en el escenario activo (Must):** responder usando el mismo distrito, alcance, muestra, filtros y fecha de corte de las demás rutas.
- **HU-DEMO-702 — Preguntas cualitativas y documentales (Must):** responder sobre atributos o documentos solo cuando existan hechos y evidencias autorizadas.
- **HU-DEMO-703 — Evidencia insuficiente (Must):** rechazar o acotar preguntas que el dataset no puede sostener, incluida la solicitud de precio real de cierre.

## Línea base comprobada

- Las ocho rutas siguen pasando el smoke en escritorio, laptop y móvil.
- `#activity` y `#assistant` ya existen, pero son implementaciones heredadas anteriores a los contratos autoritativos de Fases 3 y 4.
- `#activity` usa cambios legacy de `projects[].price_delta_pct` y recomendaciones genéricas. No parte de la selección canónica del escenario ni de hechos/evidencias certificadas.
- Con Miraflores activo, la vista actual presenta proyectos de Jesús María, Santiago de Surco, La Molina y San Isidro. Esta mezcla viola CT-C y el principio de escenario único.
- La vista prioriza variaciones extremas de 841.4%, 359.5%, 202.5%, 116.8% y 106.5% sin comunicar que requieren revisión. El tamaño y el color de las tarjetas amplifican señales débiles.
- `#assistant` ya es local, determinista y protege el caso de precio real de cierre, pero sus referencias son chips con nombres de proyectos; aún no resuelve cada afirmación a IDs de hecho, observación y evidencia.
- En móvil, ambas rutas repiten el encabezado territorial completo antes de la tarea principal; la línea de tiempo se convierte en una secuencia muy larga de tarjetas y las sugerencias del asistente compiten visualmente con la respuesta.

## Problema a resolver

La demo puede mostrar números coherentes y aun así perder confianza si el usuario no sabe:

1. qué cambió exactamente;
2. cuándo se observaron ambos valores;
3. si el cambio pertenece al escenario vigente;
4. si la señal es utilizable o requiere revisión;
5. qué evidencia sustenta la afirmación;
6. qué preguntas el asistente puede contestar con seguridad.

Fase 5 cierra esa brecha con un contrato histórico explícito, una capa pura de señales y un catálogo semántico determinista.

## Alcance funcional propuesto

### Histórico y señales

- Materializar cambios de precio publicado a nivel proyecto solo cuando valor anterior y nuevo compartan semántica, moneda, entidad y orden temporal.
- Mostrar `anterior → nuevo`, delta absoluto, delta porcentual cuando sea matemáticamente válido, fechas, estado, vigencia y razón de calidad.
- Filtrar estrictamente por los IDs comparables del escenario activo.
- Mantener causas en `null` mientras no exista evidencia causal autorizada.
- Ordenar una agenda de seguimiento mediante reglas públicas y estables; no por magnitud absoluta sin control de calidad.
- Llevar al Inspector desde cada señal mediante referencias reproducibles.

### Asistente

- Resolver familias de intención cerradas: resumen del escenario, cambios observados, señal principal, cobertura/calidad, atributos documentados, comparación permitida y limitaciones.
- Generar respuestas con plantillas deterministas y valores leídos de los mismos motores puros que alimentan la interfaz.
- Adjuntar referencias de hecho/observación/evidencia a cada bloque afirmativo.
- Preservar el escenario al navegar a Benchmark, Comparador, Proyectos o Inspector.
- Rechazar preguntas fuera del catálogo y ofrecer preguntas compatibles, sin simular conversación libre.

## Fuera de alcance

- LLM, RAG, API conversacional o búsqueda web en tiempo de ejecución.
- Datos de CRM, campañas, redes sociales, leads o ubicación personal.
- Predicción de demanda, recomendación automática de precio o atribución causal.
- Precio real de cierre, absorción, ventas o stock no observado.
- Inferir que un cambio ocurrió entre capturas; solo puede afirmarse que fue detectado entre dos observaciones.
- Modificar el criterio territorial, de comparabilidad o elegibilidad aprobado en Fases 2–4.
- Exportación avanzada, notificaciones, automatizaciones o persistencia de conversaciones.

## Casos transversales obligatorios

- **CT-C:** actividad y asistente usan exactamente la selección canónica del escenario.
- **CT-D:** una afirmación cualitativa enlaza un hecho y su evidencia autorizada.
- **CT-E:** valor anterior, valor nuevo, porcentaje, fechas, validez y ausencia de causa inventada.
- **CT-F:** ante precio real de cierre, el asistente no inventa y explica la limitación.
- **CT-G:** inconsistencias de medida o evidencia permanecen visibles y bloquean conclusiones incompatibles.
- **CT-I:** estados desconocidos o restringidos no se convierten en evidencia positiva.
- **CT-P:** no se publican PII, secretos ni rutas locales.

## Restricciones heredadas

- Aplicación estática y reproducible; todo debe funcionar en GitHub Pages.
- Un solo escenario derivado gobierna las ocho rutas.
- Los datos públicos son un artefacto construido y validado, no una edición manual del JSON publicado.
- Las fuentes legacy pueden ayudar a materializar observaciones, pero no son autoridad de lectura para el runtime.
- Compatibilidad de lectura con contratos 2.0–2.3 y degradación explícita cuando Fase 5 no esté disponible.
- Sin hover obligatorio, sin contenido crítico oculto y con reflow funcional a zoom 200%.

## Riesgos principales

| Riesgo | Consecuencia | Control propuesto |
|---|---|---|
| Dos valores no representan la misma métrica | Variación falsa | Política de emparejamiento por entidad, campo, moneda y semántica |
| Fecha anterior es antigua | Señal presentada como reciente | Mostrar ambas fechas y vigencia; no usar lenguaje “esta semana” sin prueba |
| Variación extrema domina la lectura | Acción basada en outlier | Umbral de revisión, estado visible y priorización calidad-primero |
| Timeline mezcla distritos | Contradicción con escenario | Intersección obligatoria con `comparableProjectIds` |
| Asistente parafrasea sin trazabilidad | Respuesta persuasiva pero indemostrable | Cada afirmación numérica/cualitativa porta referencias |
| Free text sugiere inteligencia abierta | Expectativa falsa | Catálogo visible, fallback prudente y etiqueta “lectura determinista” |
| Contrato nuevo rompe datos antiguos | Regresión de rutas | Reader 2.0–2.4 y estado “histórico no disponible” |

## Definition of Ready

Fase 5 puede entrar a ejecución cuando:

- las decisiones A1–A12 de HUMAN-GATE-A estén aceptadas;
- el contrato histórico y el catálogo del asistente estén definidos antes del writer;
- los write sets compartidos tengan propietario único;
- CT-C/D/E/F/G/I/P tengan fixture y prueba asignados;
- se haya decidido si HU-DEMO-603 entra o queda diferida;
- el usuario acepte explícitamente que “histórico” significa observaciones publicadas y no transacciones de cierre.
