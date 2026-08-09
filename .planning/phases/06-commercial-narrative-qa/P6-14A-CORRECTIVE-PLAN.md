# P6-14A — Simplificación correctiva del shell y escenario

**Fecha:** 2026-08-08

**Estado:** completado y verificado
**Origen:** revisión cualitativa de 14 páginas posterior a P6-13

## Objetivo

Reducir la carga cognitiva global sin debilitar la trazabilidad. La configuración territorial debe existir una sola vez en la barra lateral; la cabecera debe identificar el módulo y el contenido debe comenzar con su tarea principal.

Esta enmienda no cierra P6-14. Corrige hallazgos antes de repetir el ensayo con un lector independiente nuevo.

## Usuario, trabajo y dirección visual

- **Usuario:** analista o responsable comercial de Viva Inmobiliaria.
- **Trabajo principal:** elegir una microzona y comenzar una lectura comercial sin interpretar primero estados técnicos.
- **Dirección:** interfaz editorial sobria, blanca y verde Viva; una sola “estación territorial” compacta en la barra lateral y una cabecera silenciosa.
- **Firma visual:** el escenario se reconoce por una línea territorial verde y un resumen de alcance, no por una cuadrícula adicional de tarjetas.
- **Paleta conservada:** verde Viva, verde petróleo, blanco, gris de superficie y ámbar únicamente para advertencias.
- **Tipografía:** se conserva el sistema vigente para evitar un cambio visual transversal; la jerarquía se corrige mediante tamaño, peso y espacio.

## Historias cubiertas

### HU-01 — Configuración territorial única

Como usuario comercial, quiero configurar distrito y alcance desde un único lugar para no encontrar controles repetidos en cada sección.

### HU-02 — Cabecera orientada al módulo

Como usuario comercial, quiero que la cabecera me diga dónde estoy y cuál es el escenario activo, sin mostrar estados técnicos antes del contenido.

### HU-03 — Trazabilidad bajo demanda

Como usuario que necesita justificar una lectura, quiero conservar la URL, cobertura y elegibilidad en un detalle secundario para consultarlos sin que dominen la pantalla.

## Criterios de aceptación observables

1. En escritorio, distrito, alcance, control dependiente, `Ver comparables` y `Reiniciar escenario` aparecen una sola vez dentro de la barra lateral.
2. La cabecera elimina el eyebrow repetido y solo muestra título, contexto breve y un chip no interactivo con el alcance activo.
3. La barra lateral sigue disponible como drawer en móvil; sus controles miden al menos 44 px y son operables por teclado.
4. Los IDs y atributos `data-scenario-*` conservan el contrato del controlador.
5. El resumen global deja de exponer tres tarjetas de estado y cuatro métricas simultáneas.
6. La lectura primaria muestra alcance y máximo tres cifras: observados, comparables y por revisar.
7. Corte, cobertura geográfica, comparabilidad, precio y URL canónica se conservan dentro de `Ver detalle técnico`.
8. La URL canónica permanece seleccionable y reproducible; ninguna cifra se fija manualmente.
9. Los estados loading, invalid, unavailable y sin cuadrantes conservan una explicación accionable.
10. Las ocho rutas expertas, el recorrido, reset, back/forward y recarga conservan estado canónico.
11. No hay overflow a 1440×900, 1280×720, 390×844 ni con reflow equivalente a 200 %.
12. No se modifica dataset, contrato 2.4, motores, cálculos, fuentes ni claims de evidencia.

## Write set permitido

- `.planning/phases/06-commercial-narrative-qa/P6-14A-CORRECTIVE-PLAN.md`
- `.planning/phases/06-commercial-narrative-qa/P6-14A-HANDOFF.md`
- `prototipo_ejecutable/public/app.js`
- `prototipo_ejecutable/public/js/views/index.js`
- `prototipo_ejecutable/public/js/views/journey.js`
- `prototipo_ejecutable/public/js/views/scenario-context.js`
- `prototipo_ejecutable/public/styles/20-shell.css`
- `prototipo_ejecutable/public/styles/25-scenario-context.css`
- `prototipo_ejecutable/public/styles/61-journey.css`
- `prototipo_ejecutable/public/styles/90-responsive.css`
- `prototipo_ejecutable/tests/scenario-context.mjs`
- `prototipo_ejecutable/tests/scenario-e2e.mjs`
- `prototipo_ejecutable/tests/journey-shell.mjs`
- `prototipo_ejecutable/tests/journey-view.mjs`
- `prototipo_ejecutable/tests/browser-a11y.mjs`
- `prototipo_ejecutable/tests/inspector-responsive.mjs`
- `prototipo_ejecutable/tests/phase6-responsive.mjs`
- `prototipo_ejecutable/tests/phase5-responsive.mjs`
- `prototipo_ejecutable/package.json`, solo si se necesita registrar una prueba nueva
- `.planning/phases/06-commercial-narrative-qa/evidence/corrective-shell/*`
- `.planning/phases/06-commercial-narrative-qa/evidence/functional/*`
- `.planning/phases/06-commercial-narrative-qa/evidence/responsive/*`

## Archivos protegidos

- Dataset público, schema, writer y scripts de datos.
- Motores `benchmark.js`, `history.js`, `assistant-engine.js` y `evidence-inspector.js`.
- Vistas de Radar, Proyectos y Comparador; pertenecen a P6-14B/C.
- Evidencia y plantillas existentes de `evidence/rehearsal/`.
- Contrato de navegación y estado canónico salvo adaptación estrictamente necesaria ya cubierta por pruebas.

## Tareas atómicas

1. Añadir un renderizador puro del escenario lateral y reducir `renderScenarioBar` a cabecera.
2. Integrar el renderizador lateral en `app.js` sin duplicar controles.
3. Convertir el resumen global en una lectura compacta con detalle técnico expandible.
4. Ajustar CSS del shell, escenario y responsive sin crear otra cuadrícula de tarjetas.
5. Actualizar pruebas de marcado, eventos, ocho rutas, teclado y reflow.
6. Capturar antes/después en los tres viewports y revisar consola/red.

## Verificación

Desde `prototipo_ejecutable/`:

```powershell
node tests/scenario-context.mjs
node tests/scenario-e2e.mjs
npm.cmd run test:a11y
npm.cmd run test:phase6:responsive
npm.cmd run verify
```

Además: inspección visual de dashboard, proyectos, comparador e inspector; navegación con teclado dentro del drawer móvil; reset desde una ruta distinta de dashboard.

## Riesgos y mitigaciones

- **Sidebar sobrecargada:** controles compactos, progresión vertical y detalle técnico fuera de la navegación.
- **Pérdida de contexto al colapsar navegación:** chip de alcance activo en cabecera y bloque de escenario visible al abrir el drawer.
- **Regresión de IDs/eventos:** conservar selectores existentes y cubrirlos con E2E.
- **Ocultamiento indebido de evidencia:** solo se aplica divulgación progresiva; no se elimina contenido ni semántica.
- **CSS legacy por vista:** selectores nuevos acotados; no depender de `:has()` para comportamiento esencial.

## Rollback

Revertir el commit atómico de P6-14A y ejecutar `npm.cmd run verify`. El rollback debe restaurar `renderScenarioBar` y `renderScenarioSummary` anteriores juntos; no puede dejar controles duplicados, ausentes o desconectados del controlador.

## Condición de cierre

P6-14A finaliza con criterios 1–12 demostrados y evidencia visual portable. Después continúa P6-14B; el ensayo humano P6-14 se repite únicamente al terminar P6-14A–D.
