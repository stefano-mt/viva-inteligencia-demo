# Evaluación técnica y de datos — Fase 5

**Estado:** propuesta para HUMAN-GATE-A.

## Veredicto

La fase es técnicamente viable dentro de la arquitectura estática, pero no debe conservar el feed legacy actual. El repositorio contiene suficiente evidencia para demostrar histórico de precio publicado a nivel proyecto, con controles estrictos, y suficiente infraestructura para un asistente determinista trazable. No existe evidencia para causas de variación ni para precios reales de cierre.

## Inventario relevante

### Contrato público vigente

- Versión `2.3.0`.
- Índices autoritativos: `model`, `inspector` y `benchmark`.
- `projects` y el objeto actual `assistant` conservan forma legacy.
- El modelo ya contiene observaciones, hechos, issues y tres eventos controlados de CT-E.
- El esquema de eventos ya obliga a que una causa no nula tenga evidencia causal; los tres eventos actuales mantienen `cause: null`.

### Fixtures controlados CT-E

Existen tres eventos deliberados:

1. cambio normal `600000 → 630000`, `+5%`, certificado;
2. base cero, porcentaje `null`, revisable;
3. variación extrema `+60%`, revisable.

Sirven para validar matemáticas y estados, pero no bastan para vender una línea de tiempo territorial rica.

### Histórico legacy materializable

El dataset legacy contiene 713 registros con campos históricos y 41 cambios positivos/no nulos. Una preevaluación conservadora deja **34 cambios plausibles** al exigir:

- valor anterior y actual mayores que cero;
- moneda PEN;
- fecha anterior menor que la fecha de captura vigente;
- variación absoluta menor o igual a 30%;
- identidad estable del proyecto;
- misma semántica de precio publicado desde/mínimo a nivel proyecto.

Distribución preliminar de esos 34 cambios: Surco 6, Miraflores 5, Surquillo 5, Jesús María 4 y otros distritos 14. En Miraflores hay cinco candidatos, suficientes para una demostración del flujo sin mezclar territorios.

Los registros con moneda desconocida o variaciones extremas —incluidos 841%, 359%, 202%, 116% y 106%— deben excluirse o quedar en estado revisable; nunca liderar el resumen.

## Semántica permitida

La afirmación máxima será:

> “Entre la observación anterior y el corte vigente, el precio publicado desde/mínimo del proyecto cambió de X a Y.”

No se podrá afirmar:

- que una unidad específica cambió de precio;
- que la inmobiliaria realizó el cambio en una fecha exacta;
- que el precio corresponde a una venta o cierre;
- que conocemos la causa;
- que el cambio implica demanda, absorción o desempeño comercial.

## Materialización propuesta

### Índice `history`

Contrato público `2.4.0` con:

- `policy`: versión, cutoff, semánticas aceptadas, moneda, umbrales y orden;
- `events`: eventos normalizados por proyecto;
- `by_project_id`: referencias ordenadas a eventos;
- `by_district_id`: referencias ordenadas a eventos;
- `coverage`: observados, certificados, revisables, excluidos y razones;
- `fingerprints`: muestra estable para auditoría.

Cada evento debe incluir como mínimo:

- `id`, `project_id`, `district_id`, `field`, `unit`, `currency`;
- `previous_observation_id`, `current_observation_id`;
- `previous_value`, `current_value`, `delta_absolute`, `delta_pct`;
- `previous_observed_at`, `current_observed_at`, `detected_at`;
- `status`, `validity`, `reason_codes`;
- `fact_ids`, `evidence_ids`;
- `cause: null`, `cause_evidence_ids: []` mientras no haya causa observada.

### Índice `assistant`

Para `2.4.0`, reemplazar la lista legacy por un catálogo autoritativo:

- `policy`: versión, modo determinista, idiomas y guardrails;
- `intents`: IDs de intención, preguntas sugeridas, prerequisitos y plantilla;
- `answer_contract`: bloques permitidos y referencias requeridas;
- `limitations`: cierres, causalidad, PII, predicción, datos externos;
- `compatibility`: estado para payloads 2.0–2.3.

Las respuestas no se precalculan con cifras duplicadas; se construyen desde los motores de escenario, benchmark, comparación, histórico e inspector.

## Política de calidad propuesta

### Elegibilidad del evento

- **certified:** valores emparejados, fechas válidas, PEN, misma semántica, evidencia autorizada y variación dentro del umbral.
- **reviewable:** matemáticas posibles, pero existe base cero, magnitud extrema, antigüedad o evidencia incompleta.
- **insufficient/excluded:** entidad, moneda, semántica, fecha o evidencia incompatibles.

### Vigencia

Se propone calcularla con respecto al `cutoff` del dataset y la observación nueva:

- `current`: 0–30 días;
- `aging`: 31–90 días;
- `historical`: más de 90 días;
- `unknown`: fecha ausente o inválida.

La vigencia no cambia la verdad del cambio; solo limita su utilidad operativa.

### Orden reproducible

1. pertenece al escenario activo;
2. certificado antes que revisable;
3. vigencia más alta;
4. evidencia más completa;
5. magnitud acotada descendente;
6. fecha reciente;
7. ID canónico como desempate.

## Cobertura y honestidad comercial

- El resumen debe declarar `N eventos mostrados de M candidatos del escenario`.
- Si no hay señales certificadas, la interfaz no fabrica actividad; ofrece revisar proyectos o ampliar el escenario.
- Si solo hay revisables, el encabezado debe decir “señales por validar”, no “oportunidades”.
- La ruta nunca usa el número total de eventos globales como si perteneciera al distrito seleccionado.
- HU-DEMO-603 se implementará como “agenda de seguimiento” y no como “resumen semanal” cuando no exista prueba de semana calendario.

## Privacidad y seguridad

- Solo IDs canónicos y URLs de fuente ya autorizadas.
- Sin consultas de usuario persistidas en el artefacto público.
- Sin historial de conversación, cookies ni analítica externa.
- Sin rutas locales, tokens, correos, teléfonos, nombres de leads o geolocalización personal.
- Texto del usuario escapado antes de renderizar.
- La respuesta se construye con plantillas cerradas, no evalúa código, SQL ni HTML.

## Compatibilidad

- Writer nuevo: `2.4.0`.
- Reader: acepta `2.0.0`–`2.4.x`.
- En 2.0–2.3, las seis rutas de Fases 2–4 siguen operativas y `#activity`/`#assistant` muestran un estado explícito de capacidad no disponible o limitada.
- No se reinterpretan `projects[].price_delta_pct` ni respuestas legacy como autoridad.

## Controles antes de publicar

- Esquema y semántica de contrato.
- Determinismo byte a byte.
- Integridad de referencias.
- Cobertura de reason codes.
- Privacidad y ausencia de rutas locales.
- Coincidencia exacta de cifras entre respuesta, interfaz y motores puros.
- Pruebas de mutación para variación extrema, base cero, moneda desconocida, fechas invertidas, evento de otro distrito y evidencia restringida.

## Conclusión

La opción recomendada es materializar los 34 cambios plausibles bajo política estricta, mantener los tres fixtures controlados para pruebas y construir un asistente semántico sin LLM. Esta combinación amplía la fuerza comercial de la demo sin presentar datos legacy como verdades no verificadas.
