# Fase 5 — HUMAN-GATE-A

## Estado

**APROBADA** el 2026-08-04. Habilita P5-00C, P5-00D y, si el baseline pasa, P5-01. No equivale a implementación completa, verificación independiente, merge o despliegue.

## Registro de aprobación

- Responsable: Stefano.
- Fecha y hora de sesión: `2026-08-04T10:50:13.4321329-05:00`.
- Declaración exacta:

> Acepto A1–A12 y autorizo HUMAN-GATE-A de la Fase 5.

- Plan aprobado: commit `ae55fa5fa1670fd471921b74dba8dfa7bfad048e`.
- Solicitud: `HUMAN-GATE-A-REQUEST.md`.
- Revisión estructural: `READY FOR HUMAN-GATE-A`; el checker independiente de implementación permanece en P5-13.

## Condiciones aceptadas

1. **Contrato:** se autoriza proponer y materializar `2.4.0` con índices autoritativos `history` y `assistant`, reader 2.0–2.4 y degradación explícita en payloads anteriores.
2. **Fuente histórica:** se auditan los 34 candidatos legacy preliminares; solo se materializan los que cumplan política estricta. Los tres eventos controlados permanecen como fixtures.
3. **Semántica:** histórico significa precio publicado desde/mínimo a nivel proyecto observado en dos cortes; no unidad, venta, transacción ni cierre.
4. **Causalidad:** `cause` permanece `null` sin evidencia causal autorizada.
5. **Vigencia:** `current` 0–30 días, `aging` 31–90, `historical` más de 90 y `unknown` sin fecha válida, calculado contra el cutoff.
6. **Escenario único:** señales y respuestas se limitan a la selección canónica; el texto de la consulta no cambia silenciosamente de territorio.
7. **Estados:** `certified`, `reviewable` e `insufficient/excluded`; calidad y vigencia preceden a magnitud.
8. **Agenda:** HU-DEMO-603 se incluye como agenda de seguimiento de máximo tres filas, sin afirmar actividad semanal no demostrada.
9. **Asistente:** local, semántico y determinista; sin LLM, RAG, web search ni API externa en runtime.
10. **Preguntas:** catálogo cerrado y visible; consultas desconocidas reciben límites y alternativas compatibles.
11. **Trazabilidad:** toda afirmación numérica o cualitativa resuelve a escenario y a hechos/observaciones/evidencias cuando corresponda.
12. **CT-F:** precio real de cierre siempre se rechaza; Fase 5 no calcula estimaciones automáticas.

## Límites

La aprobación no autoriza:

- relajar política para aumentar cobertura histórica;
- atribuir causa, demanda, absorción o precio de cierre;
- integrar servicios externos o persistir conversaciones;
- publicar PII, secretos, rutas locales o evidencia no autorizada;
- modificar la semántica territorial, de comparabilidad, benchmark o inspector de Fases 2–4;
- ampliar write sets sin enmienda cuando cambie contrato, runtime o dataset;
- omitir P5-13, HUMAN-GATE-B si aplica, merge humano o verificación post-merge.

## Condición de validez

P5-00D parte del commit que contiene esta aprobación. P5-01 solo comienza si baseline, regresiones preimplementación y paridad con `ae55fa5` pasan. Un cambio material a A1–A12, fuente, semántica, umbrales, catálogo, contrato o write sets invalida el gate y exige enmienda/revisión.
