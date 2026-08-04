# P5-07 — Interfaz del cuaderno de señales

**Estado:** completado.

**Rama:** `feat/phase-5-history-signals-assistant`.

## Objetivo

Reemplazar el feed legacy de `#activity` por una línea de tiempo explicable que consume exclusivamente `state.historyContext`, conserva el escenario canónico y hace visibles valores, fechas, vigencia, calidad y evidencia sin depender del hover.

P5-07 implementa HU-DEMO-601 y la superficie visual de HU-DEMO-602. La agenda reproducible de HU-DEMO-603 permanece reservada a P5-08.

## Dirección aplicada

La vista adopta el concepto aprobado de **cuaderno de señales comerciales**:

- verde profundo `#016150` para acciones y lectura certificada;
- verde Viva `#00943b` para la columna de evidencia;
- fondo operativo `#eff0f0` y papel documental `#f8f5ec` reservado al detalle;
- Aptos Display para jerarquía, Aptos para lectura y numerales tabulares para valores;
- una banda continua de calidad en lugar de cuatro cards;
- una lista vertical en lugar del mosaico legacy;
- detalle dentro de la señal, lateral en la lectura amplia y apilado en móvil.

La firma visual es una columna verde con nodos que conecta observaciones. El patrón no es decorativo: comunica secuencia temporal y trazabilidad. El ámbar solo identifica revisión y el rojo sobrio insuficiencia; icono y texto acompañan siempre al color.

## Comportamiento implementado

1. Encabezado compacto con distrito, alcance, fecha de corte y aclaración de que se observan precios publicados, no ventas.
2. CTA primario `Revisar señal prioritaria` únicamente cuando existe una señal certificada.
3. Banda accesible con eventos detectados, certificados, por revisar y cobertura temporal; cada valor abre su explicación.
4. Filtros de calidad, vigencia y dirección conectados a `setHistoryFilters`.
5. Hasta cinco señales visibles inicialmente; las adicionales usan divulgación progresiva nativa.
6. Cada fila muestra proyecto, inmobiliaria, observación nueva, anterior → nuevo, variación anunciada verbalmente, vigencia, calidad y razón.
7. `Ver evidencia` selecciona o cierra el evento con `aria-expanded` y conserva el foco.
8. El detalle resuelve las dos observaciones, calidad, causa, evidencia autorizada y fuente pública; no muestra hashes ni inventa causa.
9. Evidencia restringida o no disponible se presenta como insuficiente y no ofrece enlace público.
10. `Ver proyecto` conserva el escenario y lleva al proyecto comparable.
11. Estados explícitos para carga, contrato legacy, error de integridad, filtros sin resultados y escenario sin cambios elegibles.
12. La vista escapa contenido dinámico y no lee `projects[].price_delta_pct` ni reconstruye el motor.

## Ciclo rojo → verde

Las pruebas nuevas fallaron inicialmente porque no existía `58-history-signals.css` y la vista usaba `marketEvents`, `weeklyRecommendations` y un benchmark legacy. Tras la implementación quedaron verdes:

- pureza del render y consumo único de `state.historyContext`;
- CT-C con cinco señales de los 85 comparables de Miraflores y cero distritos ajenos;
- valores, fechas, calidad, vigencia y ausencia de causa inventada;
- detalle autorizado, evidencia restringida fail-closed y escape de HTML;
- contrato 2.3 degradado explícitamente;
- filtros, selección, foco, navegación a proyecto y reflow móvil;
- import ordenado de la hoja de estilo y reglas de accesibilidad/responsive.

## Evidencia visual

- [Escritorio 1440×900](evidence/p5-07/desktop-activity.png)
- [Laptop 1280×720](evidence/p5-07/laptop-activity.png)
- [Móvil 390×844 con detalle](evidence/p5-07/mobile-activity-detail.png)
- Baseline previo: [escritorio](evidence/baseline/activity-1440x900.png) y [móvil](evidence/baseline/activity-390x844.png)

La comparación demuestra que desaparecen proyectos de otros distritos, recomendaciones genéricas y variaciones extremas sin estado. La nueva interfaz conserva una lectura principal por fila y evidencia bajo demanda.

## Verificación

PASS:

```text
npm.cmd run check
npm.cmd run test:history
npm.cmd run test:history:e2e
npm.cmd run test:smoke
npm.cmd run test:a11y
npm.cmd run verify
git diff --check
```

El navegador cubrió filtros, foco restaurado, detalle, navegación a proyecto, ausencia de requests externos y scroll horizontal. Smoke y accesibilidad cubrieron ocho rutas × tres viewports.

## Archivos modificados

- `prototipo_ejecutable/public/js/views/activity.js`
- `prototipo_ejecutable/public/js/controller.js`
- `prototipo_ejecutable/public/styles/58-history-signals.css`
- `prototipo_ejecutable/public/styles.css`
- `prototipo_ejecutable/tests/activity-view.mjs`
- `prototipo_ejecutable/tests/activity-e2e.mjs`
- `prototipo_ejecutable/package.json`
- evidencia y memoria de P5-07

## Archivos protegidos

Sin cambios en dataset, schema, writer, policy, `history.js`, `state.js`, geografía, Inspector, Benchmark, Comparador, Assistant, activos o semántica de elegibilidad.

## Handoff a P5-08

P5-08 debe renderizar `state.historyContext.agenda` debajo de la línea de tiempo como lista vertical numerada de máximo tres filas. Debe conservar el orden del motor, explicar el origen mediante `references.history_event_ids` y reutilizar la selección/navegación existentes. No debe volver a calcular prioridades ni introducir lenguaje semanal no demostrado.
