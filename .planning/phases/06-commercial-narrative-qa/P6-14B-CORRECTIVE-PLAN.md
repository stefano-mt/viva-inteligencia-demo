# P6-14B — Radar mapa primero e inventario comparable

**Fecha:** 2026-08-08

**Estado:** completado y verificado

**Dependencia:** P6-14A, commit `685ff86`

## Objetivo

Diferenciar las dos superficies de análisis territorial que el ensayo humano percibió como repetitivas:

- **Radar comercial:** explicar dónde compite el escenario mediante un único lienzo geográfico prioritario.
- **Proyectos comparables:** permitir filtrar, seleccionar y profundizar candidatos mediante un inventario compacto por filas.

La intervención reduce resúmenes duplicados y densidad antes del trabajo principal. No altera datos, escenario, elegibilidad, benchmark, puntuaciones ni navegación canónica.

## Dirección visual

- **Paleta:** conserva verde Viva, verde petróleo, blanco, gris de superficie y ámbar solo para advertencias.
- **Tipografía:** conserva el sistema local vigente; la diferencia entre superficies se produce con estructura y ritmo, no con otra fuente.
- **Radar:** un único lienzo territorial grande. El selector mapa/posicionamiento cambia el contenido del mismo espacio, evitando dos visualizaciones completas en la página.
- **Proyectos:** lista editorial compacta, con líneas y jerarquía tipográfica; no una galería de cards.
- **Firma:** el mapa es el momento visual memorable de Radar; toda la interfaz restante permanece silenciosa.

Esta dirección evita el patrón genérico de hero + tarjetas KPI: la geografía real ocupa la primera posición y el inventario adopta la forma de una herramienta de revisión.

## Historias

### HU-01 — Radar orientado a geografía

Como responsable comercial, quiero que Radar abra con un mapa grande y una sola visualización activa para comprender la microzona antes de configurar producto o leer scores.

### HU-02 — Proyectos orientado a selección

Como analista, quiero revisar comparables en filas compactas para encontrar candidatos sin leer mensajes repetidos ni recorrer otra cuadrícula de resúmenes.

### HU-03 — Profundidad bajo demanda

Como usuario que necesita justificar una selección, quiero abrir score, factores y fuente cuando los necesito sin que ese detalle desplace el mapa o el inventario inicial.

## Criterios de aceptación

1. Radar comienza con el mapa o posicionamiento activo; no muestra antes otro resumen territorial visual.
2. Solo existe una visualización completa de geografía/posicionamiento en el DOM de Radar.
3. El switch conserva IDs, teclado, foco, URL `viz`, recarga y back/forward.
4. El mapa mantiene proyectos observados, comparables, exclusiones, selector accesible, leyenda, fuente y detalle seleccionado.
5. Producto y diagnóstico aparecen después del lienzo territorial.
6. Score y lista prioritaria permanecen disponibles dentro de una profundización secundaria cerrada por defecto.
7. Proyectos elimina la segunda cuadrícula de tres cifras y abre con una orientación compacta y un único CTA primario.
8. La cabecera del inventario no repite alcance, universo y precio que ya aparecen en la orientación y el escenario global.
9. Cada fila elimina la explicación repetida de elegibilidad y conserva nombre, inmobiliaria, score, precio/m², área, evidencia y metadatos útiles.
10. El detalle del proyecto conserva comparabilidad, evidencia, atributos y fuente mediante divulgación progresiva.
11. Estados vacíos, filtros locales, paginación, selección, comparación y retorno al recorrido mantienen su comportamiento.
12. Laptop, móvil y zoom 200 % no presentan overflow, truncamiento ni objetivos táctiles menores a 44 × 44 px.
13. No se modifican dataset, contrato 2.4, motores, cálculos, fuentes, claims ni semántica de elegibilidad.

## Write set permitido

- `.planning/phases/06-commercial-narrative-qa/P6-14B-CORRECTIVE-PLAN.md`
- `.planning/phases/06-commercial-narrative-qa/P6-14B-HANDOFF.md`
- `.planning/phases/06-commercial-narrative-qa/evidence/corrective-radar-projects/*`
- `.planning/phases/06-commercial-narrative-qa/evidence/functional/*`
- `.planning/phases/06-commercial-narrative-qa/evidence/responsive/*`
- `prototipo_ejecutable/public/app.js`
- `prototipo_ejecutable/public/js/views/dashboard.js`
- `prototipo_ejecutable/public/js/views/projects.js`
- `prototipo_ejecutable/public/styles/50-views.css`
- `prototipo_ejecutable/public/styles/62-projects.css`
- `prototipo_ejecutable/public/styles/90-responsive.css`
- `prototipo_ejecutable/tests/journey-scale-geography.mjs`
- `prototipo_ejecutable/tests/journey-projects-handoff.mjs`
- `prototipo_ejecutable/tests/journey-e2e.mjs`
- `prototipo_ejecutable/tests/projects-compare.mjs`
- `prototipo_ejecutable/tests/scenario-e2e.mjs`
- `prototipo_ejecutable/tests/phase6-responsive.mjs`
- `prototipo_ejecutable/tests/browser-a11y.mjs`
- `prototipo_ejecutable/package.json`

## Archivos protegidos

- Dataset público, schema, writer y scripts de datos.
- `state.js`, `controller.js`, `navigation.js` y contrato de URL. `app.js` solo puede omitir el resumen global en Radar y Proyectos para eliminar duplicación; no cambia estado ni eventos.
- Motores de geografía, comparabilidad, benchmark, histórico, asistente e inspector.
- Renderizadores puros `geographic-map.js` y `positioning-map.js`; P6-14B solo cambia su composición en Radar.
- Vistas de Inspector, Benchmark, Comparador, Histórico, Checklist y Asistente.
- Documentos y plantillas preexistentes de ensayo humano.

## Tareas atómicas

1. Hacer que Radar componga únicamente la visualización activa y mantener el switch canónico.
2. Eliminar el resumen territorial duplicado y añadir metadatos semánticos no visuales al lienzo.
3. Mover score y comparables prioritarios a una profundización secundaria.
4. Sustituir la conclusión-card de Proyectos por una orientación compacta.
5. Reducir cada comparable a una fila sin copy repetido y mantener el detalle bajo demanda.
6. Integrar las pruebas específicas de Escala/Geografía y handoff de Proyectos al gate `verify`.
7. Ejecutar pruebas dirigidas, E2E, responsive, accesibilidad y gate integral.
8. Capturar Radar y Proyectos en 1440 × 900, 1280 × 720 y 390 × 844.

### Enmienda técnica de verificación

El gate integral reveló una expectativa legacy en `journey-e2e.mjs` que exigía el resumen global dentro de Radar. Se autoriza adaptar únicamente esa aserción al contrato de P6-14B: el escenario continúa visible en la barra lateral del experto y Radar no vuelve a montar `#scenario-summary-title`. No se modifican runtime, datos, navegación ni estilos.

## Verificación

Desde `prototipo_ejecutable/`:

```powershell
node tests/journey-scale-geography.mjs
node tests/journey-projects-handoff.mjs
node tests/projects-compare.mjs
node tests/scenario-e2e.mjs
npm.cmd run test:phase6:responsive
npm.cmd run test:a11y
npm.cmd run verify
```

Además: activar ambas visualizaciones con ratón y teclado; recargar con `viz=positioning`; seleccionar un proyecto desde mapa y lista; abrir disclosures; revisar consola y red externa.

## Riesgos y mitigaciones

- **El switch pierde el elemento enfocado al recomponer:** conservar IDs en ambos renderizadores y cubrir foco en E2E.
- **La visualización inactiva deja de existir y rompe selectores antiguos:** migrar solo expectativas que dependían de dos paneles montados simultáneamente; el contrato de renderizadores permanece intacto.
- **El inventario compacto oculta elegibilidad:** precio no elegible sigue nombrado en su celda y el detalle conserva la explicación completa.
- **Profundización cerrada oculta información crítica:** mapa, escenario, producto, diagnóstico y CTA a comparables permanecen visibles; solo score/factores repetitivos se subordinan.
- **CSS compartido afecta otras vistas:** selectores nuevos se acotan a `.dashboard-grid--radar` y `[data-scenario-consumer="catalog"]`.

## Rollback

Revertir el commit atómico de P6-14B y repetir `npm.cmd run verify`. El rollback debe restaurar juntos composición, estilos, pruebas y evidencia para no dejar un switch sin panel o una lista sin detalle.

## Condición de cierre

P6-14B termina cuando los criterios 1–13 estén demostrados, la matriz integral esté verde y exista evidencia portable. Luego continúa P6-14C: densidad del Comparador y jerarquía de decisión.
