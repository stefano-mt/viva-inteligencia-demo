# Revisión estructural del plan — Fase 5

**Tipo:** auto-revisión del orquestador previa a HUMAN-GATE-A. No sustituye el checker independiente P5-13.

**Veredicto:** `READY FOR HUMAN-GATE-A`.

## Controles realizados

| Control | Resultado | Evidencia |
|---|---|---|
| Historias 601–603/701–703 mapeadas | PASS | seis historias con criterios en `PLAN.md` |
| CT-C/D/E/F/G/I/P asignados | PASS | fixtures, dominio, E2E y navegador |
| Escenario único | PASS de diseño | intersección obligatoria con IDs canónicos |
| Semántica histórica | PASS con decisión | precio publicado proyecto; A2–A4 |
| Contrato y compatibilidad | PASS con decisión | 2.4 + reader 2.0–2.4; A1 |
| Asistente prudente | PASS con decisión | determinista, catálogo cerrado; A9–A12 |
| UX/UI y densidad | PASS de diseño | timeline/agenda vertical, contexto compacto |
| Accesibilidad | PASS de diseño | teclado, semántica, `aria-live`, 200% |
| Write sets | PASS | propietario único en archivos compartidos |
| Rollback/stop conditions | PASS | definidos por tarea y semántica |

## Hallazgos que el plan corrige

1. `#activity` mezcla distritos ajenos al escenario activo.
2. Variaciones extremas legacy aparecen como señales ejecutivas sin estado de revisión.
3. El feed actual muestra porcentajes sin par de valores/fechas/evidencia.
4. El resumen de gerencia es genérico y está sobrecargado en cards.
5. El asistente cita nombres de proyectos, pero no hechos/observaciones/evidencias.
6. Las sugerencias pueden mencionar territorios distintos al activo.
7. El objeto público `assistant` es legacy y carece de contrato semántico autoritativo.

## Ambigüedades convertidas en gate

- Volumen y origen del histórico: A2.
- Significado comercial: A3.
- Umbrales de vigencia: A5.
- Inclusión del Should 603: A8.
- Expectativa de IA conversacional: A9/A10.
- Rechazo frente a estimación: A12.

## Riesgo residual antes de ejecución

La cifra de 34 candidatos es preliminar y puede disminuir tras validar referencias exactas. El plan prohíbe compensar una cobertura menor relajando semántica o umbrales; la interfaz deberá mostrar el denominador real.

## Criterio de salida

El plan puede pasar a P5-00C cuando el usuario acepte A1–A12. La revisión independiente de implementación permanece obligatoria en P5-13.
