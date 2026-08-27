# Evidencia del checker independiente P7-10

Fecha: 2026-08-26

Candidato: `6a6a60ca2e607dc4768c56b139c2549b5fae41d8`

Rama: `feat/phase-7-commercial-workspace`
Verificador: agente independiente `/root/p7_10_checker`

## Ejecuciones

- `npm.cmd run verify`: **PASS**, sin fallos. Incluyó sintaxis, arquitectura, datos, privacidad, determinismo, contrato C01–C23, CT-A–I/P, compatibilidad 2.0–2.4, E2E, humo, accesibilidad y matriz responsive del repositorio.
- Checker browser adversarial independiente: **FAIL** por dos brechas únicas P2 consolidadas en el reporte formal.
- `git diff --check 6251442..HEAD`: **PASS**.
- Fixture `commercial-claims.json` entre P7-01 y HEAD: **sin cambios**; objeto Git `15429c090cdeac2bcc9b19ccff74a4849c607e0d`.
- Rutas protegidas de datos, contratos, scripts, engines y workflows: **sin cambios** frente a `6251442`.
- HEAD local, rama y `origin/feat/phase-7-commercial-workspace`: **paridad exacta** en el candidato verificado.

## Harness y alcance browser

`checker-browser.mjs` usa el harness Node Playwright del repositorio porque el helper Python de la skill `webapp-testing` no pudo arrancar desde WindowsApps. El fallback no reutiliza las aserciones de P7-09.

Se inspeccionaron 14 superficies en 1440×900, 1280×720, 390×844 y equivalente de zoom 200%, además de:

- navegación 5+4 y acceso experto en máximo dos interacciones;
- editor de escenario cerrado/visible, Enter, Escape y retorno de foco;
- Ctrl/Cmd+K, nueve destinos, búsqueda local, Escape, foco y ausencia de persistencia/red;
- reinicio y deep links;
- vacío, error, insuficiente y CTA correctiva;
- paridad DOM ↔ estado en Tipo 7;
- una acción primaria por viewport;
- overflow, truncamiento, 44×44, 16/13 px, contraste AA, foco y reduced motion;
- errores de consola, red y recursos.

El JSON contiene las mediciones completas y los hashes SHA-256 de las seis capturas representativas. Las ocurrencias por viewport se consolidan en dos brechas únicas en `VERIFICATION_REPORT.md`.

## Graphify

- `extract --code-only --no-cluster`: **PASS**; 143 archivos de código cambiados, 63 sin cambios, 4,020 nodos y 8,105 aristas en `graphify-out/graph.json`.
- `god-nodes --top 15`: **PASS**. Hubs principales: `escapeHtml()` (99), `scripts` (92), `escapeAttr()` (86), `formatNumber()` (85), `withDemoBrowser()` (48), `buildDemoBundle()` (47), `state` (46), `createObservedPage()` (45), `initializeScenarioData()` (45), `openPath()` (43), `viewports` (42), `render()` (40), `$defs` (30), `buildInspectorViewModel()` (30), `renderMarket()` (27).
- `query "frontend navigation views state data rendering" --budget 1600`: **PASS**; 692 nodos alcanzables a profundidad 2. El resultado conecta `navigation.js`, `state.js`, `domain.js`, `controller.js`, `app.js`, las ocho vistas expertas, Recorrido y sus tests.
- `affected "navigation.js" --depth 2`: **PASS**; impacto directo/indirecto sobre `app.js`, `controller.js`, `projects.js`, render, shell, editor de escenario, command palette, reset y pruebas de navegación/estado.

El grafo confirma que una corrección de shell/título o densidad debe volver a verificar `scenario-context.js`, las vistas afectadas, `app.js`, navegación/controlador y los E2E asociados.

## Archivos

- `browser-verification.json`: matriz, interacciones, capturas y hallazgos brutos.
- `checker-browser.mjs`: checker portable e independiente.
- `*.png`: seis capturas representativas con hash registrado en el JSON.

No se guardaron logs masivos. No se modificó runtime, datos, estilos, tests del producto, evidencia F6 ni el directorio de ensayo humano excluido.

## Repetición P7-10A

Fecha: 2026-08-27

Candidato: `23d350532584ead2cbad3ccb15e3ad88aecb08ce`

Verificador: `/root/p7_10a_checker`

La repetición independiente cerró G1 y G2 con **PASS**. `checker-p7-10a.mjs` midió a `scrollY = 0`, antes de cualquier foco o desplazamiento:

- Inspector y Comparador: un `h1` visible;
- Benchmark: lectura `y=345.25`, trabajo `y=366.25`;
- Comparador: lectura `y=295.83`, trabajo `y=466.00`;
- Seguimiento: lectura `y=356.55`, trabajo `y=716.03`;
- viewport: `1280×720`;
- problemas browser: 0;
- solicitudes externas: 0.

La evidencia nueva está en `p7-10a-browser-verification.json` y las cuatro capturas `p7-10a-*-1280x720.png`. El veredicto vigente se encuentra en `../../VERIFICATION_REPORT.md`.
