# P5-08 — Agenda priorizada de seguimiento

**Estado:** completado.

**Rama:** `feat/phase-5-history-signals-assistant`.

## Objetivo

Implementar HU-DEMO-603 como una lista de seguimiento reproducible, limitada a tres acciones y derivada exclusivamente de `state.historyContext.agenda`.

La vista conserva el orden calculado por el motor, muestra la procedencia de cada acción y evita convertir la agenda en una promesa de urgencia, periodicidad o causalidad no demostrada.

## Dirección aplicada

- Una sola hoja vertical con separadores, no una nueva cuadrícula de cards.
- Numeración 1–3 con significado real de prioridad del motor.
- Verde profundo para posición y navegación; el CTA permanece secundario frente a la evidencia.
- Título, descripción, proyecto, fecha y conteos de hechos/evidencias visibles sin hover.
- Reflow a dos columnas en tablet y acción a ancho completo en móvil.
- Tipografía mínima de 14 px y objetivos interactivos de al menos 44 px.

## Comportamiento implementado

1. La agenda se presenta debajo de la línea de tiempo y consume como máximo los tres primeros elementos recibidos.
2. La vista no ordena, puntúa ni recalcula acciones.
3. Cada fila con evento referenciado muestra `Señal de origen`, proyecto, fecha, hechos y evidencias.
4. `Abrir señal de origen` selecciona el evento existente, abre su detalle y restaura el foco en `Ver/Cerrar evidencia`.
5. Si no existen señales certificadas o revisables, se presenta la acción canónica `Validar cobertura o ampliar el escenario`.
6. `Revisar filtros` enfoca y desplaza al filtro de calidad sin mutar el escenario.
7. Si el contrato no entrega agenda, la vista muestra indisponibilidad honesta y no inventa una acción.
8. Títulos, descripciones, IDs y nombres dinámicos se escapan antes de renderizar.
9. No se introducen expresiones de frecuencia periódica ni causas no observadas.

## Ciclo rojo → verde

Las pruebas nuevas fallaron inicialmente porque la vista P5-07 no renderizaba la agenda. La implementación cerró:

- límite defensivo de tres filas;
- orden y posiciones 1–3;
- procedencia y conteos referenciados;
- navegación por teclado hacia la señal de origen;
- fallback operativo hacia filtros;
- escape de contenido dinámico;
- responsive de lista, número y acción.

## Evidencia visual

- [Escritorio 1440×900](evidence/p5-08/desktop-activity.png)
- [Laptop 1280×720](evidence/p5-08/laptop-activity.png)
- [Móvil con detalle de evidencia](evidence/p5-08/mobile-activity-detail.png)

La agenda queda deliberadamente después de la lectura principal: primero se comprende el cambio y luego se actúa. En móvil conserva la secuencia, los metadatos y un único CTA por fila sin scroll horizontal.

## Verificación

PASS:

```text
node tests/activity-view.mjs
node tests/activity-e2e.mjs
npm.cmd run check
npm.cmd run test:history
npm.cmd run test:history:e2e
npm.cmd run test:smoke
npm.cmd run test:a11y
npm.cmd run verify
git diff --check
```

La primera ejecución encadenada de smoke coincidió con el cierre de otro servidor local y recibió `ERR_CONNECTION_REFUSED`; la repetición aislada pasó las ocho rutas × tres viewports. No hubo cambio de código para obtener ese resultado.

## Archivos modificados

- `prototipo_ejecutable/public/js/views/activity.js`
- `prototipo_ejecutable/public/js/controller.js`
- `prototipo_ejecutable/public/styles/58-history-signals.css`
- `prototipo_ejecutable/tests/activity-view.mjs`
- `prototipo_ejecutable/tests/activity-e2e.mjs`
- evidencia y memoria de P5-08

## Archivos protegidos

Sin cambios en dataset, schema, writer, policy, motor histórico, estado, geografía, Inspector, Benchmark, Comparador, Assistant, activos o semántica de elegibilidad.

## Handoff a P5-09

P5-09 debe construir el motor semántico puro del asistente sobre el catálogo autoritativo 2.4. Sus respuestas deben ser deterministas, portar referencias, rechazar precio de cierre y PII, preservar el escenario y no depender del DOM, reloj o red. La interfaz permanece reservada a P5-10.
