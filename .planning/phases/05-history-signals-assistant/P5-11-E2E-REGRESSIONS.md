# P5-11 — E2E y regresiones integrales

**Fecha:** 2026-08-04  
**Rama:** `feat/phase-5-history-signals-assistant`  
**Estado:** completado; pendiente P5-12  
**Contrato público:** `2.4.0`, sin cambios

## Objetivo cerrado

P5-11 incorporó las pruebas de histórico y asistente al manifiesto oficial, demostró CT-C/D/E/F/G/I/P en capas de contrato, dominio y navegador, y preservó las ocho rutas de la demo. No modificó runtime, dataset, schema, writer, fingerprints, activos ni estilos.

## Recorridos verificados

| Recorrido | Resultado observable | Prueba principal |
|---|---|---|
| Cambio de distrito y alcance | Señales y respuesta se recomponen; URL y escenario muestran el distrito y cuadrante vigentes | `phase5-integral-e2e.mjs` |
| Señal → evidencia → regreso | El detalle abre con dos observaciones, evidencia autorizada y causa no observada; cerrar restaura el foco | `phase5-integral-e2e.mjs`, `activity-e2e.mjs` |
| Pregunta → respuesta → evidencia → regreso | La referencia histórica abre la señal seleccionada y volver conserva la respuesta | `assistant-e2e.mjs` |
| Rechazo de precio real de cierre | Estado `refused` y limitación explícita; no se genera una estimación | `assistant-e2e.mjs`, `assistant-engine.mjs` |
| Contrato 2.3 | Histórico y asistente muestran `contract_unavailable` sin reconstruir autoridad legacy | `phase5-integral-e2e.mjs`, `assistant-state.mjs` |
| Evidencia restringida | No aparece una afirmación positiva ni una referencia al Inspector | `assistant-e2e.mjs`, `assistant-engine.mjs`, `inspector-e2e.mjs` |
| Escenario sin eventos | Señales muestra estado vacío y asistente responde insuficiencia sin IDs de otro alcance | `phase5-integral-e2e.mjs`, `scenario-e2e.mjs` |

Todos los recorridos se ejecutaron con Chromium headless, espera de red completa, captura de errores de consola/página/HTTP y bloqueo de solicitudes externas.

## Matriz CT-C/D/E/F/G/I/P

| Caso | Evidencia ejecutable | Veredicto |
|---|---|---|
| CT-C | URL canónica, cambio de distrito/cuadrante, IDs del escenario y estado cero | PASS |
| CT-D | Hecho cualitativo certificado con evidencia autorizada; Inspector abre el fragmento permitido | PASS |
| CT-E | Valores anterior/nuevo, delta, fechas, estado, evidencia y causa `null` | PASS |
| CT-F | Cierre real y causalidad no observada se rechazan antes de clasificar | PASS |
| CT-G | Incompatibilidad/restricción permanece visible y falla de forma cerrada | PASS |
| CT-I | Evidencia desconocida e intención no soportada no se convierten en evidencia positiva | PASS |
| CT-P | Preguntas sobre ubicación personal se rechazan; scanner de privacidad sin hallazgos | PASS |

La matriz combina fixtures congelados, motores puros y recorridos de navegador. No depende de texto documental como sustituto de comportamiento.

## Integración al manifiesto

`package.json` incorpora:

- `check:phase5`, que valida sintaxis del motor y las cinco suites nuevas;
- `test:assistant:domain`, `test:assistant:state`, `test:assistant:view` y `test:assistant:e2e`;
- `test:assistant`, agregado a `verify`;
- `test:phase5:e2e`, para compatibilidad, recomposición y estados vacíos;
- `test:e2e` ampliado con el E2E del asistente y el recorrido integral P5-11.

No se eliminó ni debilitó ningún comando previo.

## Verificación ejecutada

```text
npm.cmd run check:phase5         PASS
npm.cmd run test:assistant       PASS
npm.cmd run test:phase5:fixtures PASS
npm.cmd run test:assistant:e2e   PASS
npm.cmd run test:phase5:e2e      PASS
npm.cmd run test:e2e             PASS
npm.cmd run verify               PASS
git diff --check                 PASS
```

El gate completo confirmó:

- contrato 2.4, 36 eventos referenciados y compatibilidad 2.0–2.4;
- hashes deterministas del JSON, reporte de cobertura y GeoJSON sin cambios;
- privacidad sin hallazgos y cero solicitudes externas;
- Inspector CT-D/CT-G, Benchmark, Comparador, Histórico y Asistente sin regresiones;
- smoke y accesibilidad en ocho rutas × tres viewports.

## Revisión independiente

El checker `/root/p5_11_checker_fast` inspeccionó el diff sin editar archivos y reprodujo `check:phase5`, las unidades del asistente, fixtures, el E2E integral y el E2E del asistente.

**Veredicto final:** `PASS`, sin riesgos abiertos.

El checker confirmó que los siete recorridos están representados, que cada CT tiene una prueba ejecutable, que el manifiesto integra las nuevas suites y que el diff no toca runtime, dataset, schema, writer ni activos. Esta revisión es el checker proporcional de P5-11 y no sustituye el gate formal de fase P5-13.

## Resultado y límites

P5-11 cumple su Definition of Done. El reflow a 200%, contraste AA, densidad y evidencia visual específica de 1440×900, 1280×720 y 390×844 pertenecen a P5-12. El gate independiente de toda la Fase 5 permanece asignado a P5-13.

## Siguiente paso

Ejecutar P5-12: responsive, contraste, densidad, teclado y zoom 200% para `#activity` y `#assistant`, conservando el gate P5-11 integrado.
