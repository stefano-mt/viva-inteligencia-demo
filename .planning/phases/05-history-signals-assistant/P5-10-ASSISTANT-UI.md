# P5-10 — Integración e interfaz del asistente

**Fecha:** 2026-08-04  
**Rama:** `feat/phase-5-history-signals-assistant`  
**Estado:** completado; pendiente P5-11  
**Contrato público:** `2.4.0`, sin cambios

## Objetivo cerrado

`#assistant` dejó de usar la respuesta legacy calculada al iniciar la aplicación. La ruta ahora integra el motor semántico de P5-09 con el escenario, benchmark, histórico, comparación y expediente vigentes, y presenta su contrato de seis bloques sin recalcular cifras en la vista.

## Flujo implementado

1. La vista obtiene las siete preguntas compatibles desde `data.assistant.intents`; `config.js` conserva únicamente un fallback equivalente.
2. Elegir una pregunta completa el editor y mantiene el foco en él; todavía no genera una respuesta.
   Si el usuario edita el texto, la intención sugerida se invalida y el motor vuelve a clasificar la consulta completa.
3. `Generar lectura` o `Ctrl + Enter` entregan al estado la consulta y la intención seleccionada.
4. `state.js` construye una sola respuesta con `buildAssistantResponse`, el `scenarioContext`, `historyContext`, `benchmarkContext`, comparación y dossier vigentes.
5. La vista consume el resultado ya derivado y muestra, en orden, respuesta breve, datos, lectura, límites, referencias y siguiente paso.
6. Las referencias y acciones navegan a Radar, Proyectos, Inspector, Benchmark, Comparador, Checklist, Señales o de vuelta al catálogo del asistente, según la ruta cerrada del motor. El alias semántico `benchmark` se resuelve a la ruta pública `market`.

Enter sin Ctrl permanece como salto de línea. La consulta vive solo en memoria, no se serializa en la URL, no se guarda en storage y no produce solicitudes externas.

## Dirección UX/UI

- concepto visual: cuaderno de lectura comercial, no chatbot;
- paleta: tokens Viva ya aprobados, con verde activo `#00943b` como columna de evidencia;
- jerarquía: escenario visible, tres preguntas iniciales, editor principal y respuesta vertical;
- densidad: cinco referencias visibles como máximo y el resto bajo divulgación progresiva;
- contraste: CTA principal verde sólido, límites en ámbar y estados no disponibles en gris;
- responsive: las dos columnas superiores se apilan, las filas complejas cambian a lectura vertical y los valores no se truncan;
- accesibilidad: nombres persistentes, contador, `aria-describedby`, `aria-live="polite"`, foco programático en el título de respuesta, controles de al menos 44 px y `prefers-reduced-motion`.

## Estados honestos

- `idle`: explica los seis bloques antes de responder;
- `ready`: lectura reproducible con referencias;
- `insufficient`: conserva el escenario y declara cobertura insuficiente;
- `refused`: muestra el límite cerrado, sin estimar el dato solicitado;
- `unknown_intent`: devuelve las preguntas compatibles;
- `invalid_input`: explica el ajuste requerido;
- `contract_unavailable`: degrada explícitamente contratos anteriores a 2.4.

Un escenario con cero comparables lo declara antes de generar la lectura; no introduce referencias de otro alcance.

## Integración y compatibilidad

- `app.js` deja de sembrar una respuesta legacy al arranque; este cambio puntual era necesario para que el motor P5-09 sea la fuente de runtime.
- Cambiar escenario, alcance, comparación o expediente vuelve a derivar una respuesta existente.
- Reiniciar escenario elimina consulta, intención y respuesta.
- La prueba CT-C ahora genera una pregunta antes de revisar IDs canónicos, alineándose con el nuevo estado inicial vacío.
- Dataset, schema, writer, fingerprints, activos y motor P5-09 permanecieron sin cambios.

## Pruebas incorporadas

- `tests/assistant-state.mjs`: estado de sesión, no mutación, recomposición y fallback 2.3.
- `tests/assistant-view.mjs`: catálogo, seis bloques, escape, enlaces, CSS y divulgación progresiva.
- `tests/assistant-e2e.mjs`: Enter/Ctrl+Enter, foco, respuesta, navegación a señales, URL limpia, red cerrada y móvil.
- `tests/scenario-e2e.mjs`: adaptación acumulativa para generar la lectura antes de inspeccionar referencias canónicas.

Evidencia portable:

- `evidence/p5-10/assistant-ready-1440x900.png`;
- `evidence/p5-10/assistant-ready-390x844.png`.

## Graphify posterior

Extracción `--code-only --no-cluster`:

- 3,425 nodos;
- 6,536 relaciones;
- `state` conserva 29 relaciones y `bindEvents` 24;
- `buildAssistantResponse` aparece con 23 relaciones, como motor central del flujo;
- la consulta dirigida confirma el recorrido `assistant.js → controller.js → state.js → assistant-engine.js` y las salidas hacia navegación.

No apareció un hub nuevo bloqueante. Graphify omite CSS y parte de JSON, por lo que sus resultados se complementaron con pruebas de vista y Playwright.

## Verificación ejecutada

```text
node tests/assistant-engine.mjs     PASS
node tests/assistant-state.mjs      PASS
node tests/assistant-view.mjs       PASS
node tests/assistant-e2e.mjs        PASS
node tests/checklist-assistant.mjs  PASS
npm.cmd run test:e2e                PASS
npm.cmd run verify                  PASS
git diff --check                    PASS
```

El gate integral preservó determinismo, privacidad, inspector, benchmark, ocho rutas × tres viewports, smoke y accesibilidad. `tests/assistant-e2e.mjs` permanece como prueba focalizada directa hasta que P5-11 la incorpore al manifiesto integral.

## Revisión independiente

El checker `/root/p5_10_checker` emitió inicialmente `FAIL` al reproducir dos defectos de integración: una intención sugerida quedaba fijada después de editar el texto, y los destinos semánticos `benchmark`/`assistant` caían en Radar. Ambos defectos se corrigieron, se añadieron al E2E adversarial y el checker repitió la revisión sobre el working tree vigente.

**Veredicto final:** `PASS`.

- consulta editada → reclasificación o fallback prudente;
- `benchmark` → `#market`;
- acción `assistant` → `#assistant`, estado vacío y foco en la primera pregunta;
- cero errores de navegador y cero solicitudes externas;
- cambio de `app.js` aceptado como extensión necesaria, mínima y contenida.

## Resultado y límites

P5-10 cumple su Definition of Done: escenario visible, modo determinista explícito, consulta no guardada, respuesta por bloques, límites, enlaces, `aria-live` y foco. Las pruebas integrales de todos los casos CT-C/D/E/F/G/I/P, el reflujo equivalente a 200% y el gate independiente pertenecen a P5-11, P5-12 y P5-13 respectivamente.

## Siguiente paso

Ejecutar P5-11: integrar las nuevas pruebas al manifiesto de scripts y demostrar los recorridos completos pregunta → respuesta → evidencia, rechazo de cierre, contrato 2.3, evidencia restringida y ausencia de eventos, preservando las ocho rutas.
