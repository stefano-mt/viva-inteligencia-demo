# P5-09 — Motor semántico del asistente

**Estado:** completado.

**Rama:** `feat/phase-5-history-signals-assistant`.

## Objetivo

Construir el motor puro y determinista que interpreta únicamente las siete familias publicadas por el catálogo `assistant` del contrato 2.4 y transforma los contextos canónicos de escenario, histórico, benchmark, comparación e Inspector en respuestas trazables.

P5-09 no integra la interfaz. `#assistant`, estado y eventos permanecen reservados a P5-10.

## Contrato de salida

`buildAssistantResponse` devuelve siempre los seis bloques, en el orden publicado por el dataset:

1. `answer` — respuesta breve;
2. `data` — cifras y filas derivadas de motores existentes;
3. `interpretation` — lectura permitida;
4. `limitations` — restricciones y desconocidos explícitos;
5. `references` — escenario, hechos, eventos y evidencias;
6. `next_step` — una acción reproducible.

La salida declara estado, intención, familia, motivo de rechazo cuando aplica, códigos de razón, escenario canónico y preguntas compatibles. La consulta original no se conserva ni se refleja en la respuesta.

## Comportamiento implementado

- Reconocimiento exacto de sugerencias y reconocimiento prudente por patrones para las siete intenciones cerradas.
- Una intención explícita puede provenir de una sugerencia UI, pero nunca evita los guardrails.
- Precio real de cierre, causalidad, predicción, datos personales y búsqueda externa se detectan antes de cualquier intención analítica.
- El texto que menciona otro distrito no cambia escenario, muestra, corte ni filtros; se añade `MENTIONED_DISTRICT_IGNORED`.
- Resumen y cobertura toman conteos del `scenarioContext` y `benchmarkContext`.
- Cambios y prioridad toman valores, fechas, calidad, vigencia y referencias del `historyContext` y su agenda.
- Comparación reutiliza filas, estados, conclusiones y hechos del `comparisonModel`.
- Una afirmación cualitativa requiere simultáneamente un hecho certificado/elegible, una observación relacionada, evidencia `authorized` + `available` y pertenencia del proyecto al escenario.
- Evidencia restringida, ausente, incompatible o fuera del escenario cierra como `insufficient` y nunca publica el valor positivo.
- Contratos anteriores a 2.4 degradan a `contract_unavailable` sin respuesta parcial.
- Consulta vacía o mayor a 500 caracteres falla de forma explícita.
- Intención desconocida muestra las siete preguntas compatibles sin ejecutar red o un fallback generativo.

## Arquitectura y seguridad

El motor no importa SDK de IA y no usa DOM, reloj del dispositivo, almacenamiento, credenciales, red o servicios externos. No depende de Claude, OpenAI, Azure OpenAI ni otro proveedor. Esta frontera conserva GitHub Pages estático, costo operativo cero y reproducción byte-a-byte para entradas iguales.

El contenido dinámico se normaliza como texto, la consulta no se refleja y la UI de P5-10 seguirá siendo responsable del escape al renderizar.

## Casos cerrados

- **CT-C:** una mención textual a Santiago de Surco conserva el escenario Miraflores y registra la corrección.
- **CT-D:** `cuarzo` solo aparece junto al hecho `fact:ct-d-countertop-material` y la evidencia autorizada `evidence:ct-d-countertop-fragment`.
- **CT-E:** valor anterior, nuevo, delta, fechas y vigencia coinciden con el motor histórico; causa permanece `null`.
- **CT-F:** precio real de cierre y causalidad producen rechazo explícito.
- **CT-G/CT-I:** evidencia restringida o no utilizable produce insuficiencia y su claim no aparece.
- **CT-P:** no se consulta ni devuelve ubicación personal; la consulta no se persiste ni refleja.

## Ciclo rojo → verde

La prueba de dominio se creó primero y falló por ausencia de `public/js/assistant-engine.js`. La implementación cerró clasificación, seis bloques, referencias, fallback, contrato legacy, determinismo, no mutación, límite de entrada y guardrails.

## Verificación

PASS:

```text
node --check public/js/assistant-engine.js
node tests/assistant-engine.mjs
npm.cmd run test:phase5:fixtures
npm.cmd run test:history:domain
npm.cmd run test:benchmark:domain
npm.cmd run test:checklist-assistant
npm.cmd run verify
git diff --check
```

El gate integral pasó las ocho rutas × tres viewports, E2E, accesibilidad, privacidad, determinismo, contratos 2.0–2.4 e Inspector/Benchmark/Histórico sin regresiones. No corresponde evidencia visual en P5-09 porque el motor aún no está conectado a la vista.

El checker independiente emitió `PASS`. Durante la revisión adversarial se ampliaron los rechazos causales para formulaciones como “a qué se debe”, “qué explica” y “qué provocó”, y se corrigió la entrada compuesta solo por espacios para devolver `INPUT_REQUIRED`; ambas regresiones quedaron cubiertas antes del veredicto.

## Archivos modificados

- `prototipo_ejecutable/public/js/assistant-engine.js`
- `prototipo_ejecutable/tests/assistant-engine.mjs`
- memoria de P5-09

## Archivos protegidos

Sin cambios en dataset, schema, writer, policy, estado, controlador, configuración, vistas, estilos, activos, contratos previos o semántica de escenario/elegibilidad.

## Handoff a P5-10

P5-10 debe integrar el motor como único constructor de respuestas de `#assistant`, construir el dossier del Inspector cuando corresponda y renderizar los seis bloques con escape, referencias navegables, `aria-live`, foco y consulta no persistente. El motor no debe duplicarse ni reinterpretarse en la vista.
