# HUMAN-GATE-A — Fase 5

**Estado:** aprobación pendiente. No se modifica runtime, writer ni dataset público hasta recibir aceptación explícita.

## Decisiones solicitadas

### A1 — Contrato público

**Recomendación:** aprobar `2.4.0` con índices autoritativos `history` y `assistant`, manteniendo lectura 2.0–2.4 y degradación explícita en contratos antiguos.

### A2 — Fuente histórica

**Recomendación:** materializar los cambios legacy que superen política estricta (34 candidatos preliminares), conservando los tres eventos controlados como fixtures de prueba.

### A3 — Semántica comercial

**Recomendación:** aprobar que “histórico” significa precio publicado desde/mínimo a nivel proyecto observado en dos cortes; no unidad, venta, transacción ni precio de cierre.

### A4 — Causalidad

**Recomendación:** mantener `cause: null` salvo evidencia causal autorizada. La demo no explicará por qué ocurrió un cambio.

### A5 — Vigencia

**Recomendación:** `current` 0–30 días, `aging` 31–90, `historical` >90 y `unknown` sin fecha válida, calculado contra el cutoff del dataset.

### A6 — Escenario único

**Recomendación:** una señal solo aparece si su proyecto pertenece a `comparableProjectIds`; el asistente no cambia de territorio por el texto de una pregunta.

### A7 — Estados y prioridad

**Recomendación:** `certified`, `reviewable` e `insufficient/excluded`; calidad y vigencia preceden a magnitud al ordenar.

### A8 — HU-DEMO-603

**Recomendación:** incluirla como “agenda de seguimiento” de máximo tres filas, sin lenguaje semanal cuando la ventana no esté demostrada.

### A9 — Naturaleza del asistente

**Recomendación:** motor local, semántico y determinista; sin LLM, RAG, web search ni API externa en runtime.

### A10 — Catálogo de preguntas

**Recomendación:** admitir solo familias cerradas y visibles; ante consulta desconocida, explicar límites y ofrecer preguntas compatibles.

### A11 — Trazabilidad de respuestas

**Recomendación:** toda afirmación numérica o cualitativa debe resolver a IDs de escenario, hecho/observación y evidencia cuando corresponda. Nombres de proyectos por sí solos no bastan.

### A12 — Precio real de cierre y estimaciones

**Recomendación:** CT-F siempre rechaza el cierre real. Fase 5 no genera una estimación automática; solo orienta a precios publicados comparables y explica la limitación.

## Qué autoriza la aprobación

- Ejecutar P5-00C a P5-14 en la rama de Fase 5.
- Evolucionar contrato, build, datos públicos, motores, estado, vistas, estilos y pruebas dentro de los write sets del plan.
- Materializar únicamente candidatos que cumplan la política aprobada.
- Preparar un PR funcional; el merge seguirá siendo humano.

## Qué no autoriza

- Integraciones externas, LLM o búsqueda web en runtime.
- Cambiar semántica territorial/benchmark/inspector aprobada.
- Publicar PII o evidencia nueva no autorizada.
- Atribuir causa, demanda o precio de cierre.
- Fusionar PR o desplegar por acción automática.

## Frase de aprobación

Para continuar, responder exactamente o de forma inequívoca:

> **Acepto A1–A12 y autorizo HUMAN-GATE-A de la Fase 5.**
