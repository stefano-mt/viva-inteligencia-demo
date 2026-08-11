# P6-15 final — Graphify

Graphify se ejecutó con los comandos prescritos por `.planning/GRAPHIFY.md` sobre un snapshot limpio generado mediante `git archive --format=zip` desde `a94f25159fb20770599b97c8fdfa37a2dabe551b`.

Este aislamiento excluyó deliberadamente archivos no rastreados y evitó abrir o enumerar la carpeta de ensayo del usuario.

## Resultado

- código detectado: 182 archivos;
- nodos: 3,791;
- aristas: 7,624;
- clustering: deshabilitado.

God nodes principales:

1. `escapeHtml()` — 95;
2. `formatNumber()` — 83;
3. `escapeAttr()` — 81;
4. `scripts` — 74;
5. `buildDemoBundle()` — 46;
6. `state` — 39;
7. `initializeScenarioData()` — 37;
8. `withDemoBrowser()` — 33;
9. `render()` — 31.

La consulta `frontend navigation journey state data rendering decision references` alcanzó `state`, `decisionStage`, `buildJourneyContext`, `stageEnvelope`, `navigation.js`, `app.js`, las vistas y las regresiones. No se observó un nuevo god node atribuible al correctivo G4/G5.

Las limitaciones conocidas permanecen: CSS/JSON no tienen la misma cobertura semántica que JavaScript y Graphify no prueba corrección funcional; esas áreas quedaron cubiertas por diff, hashes, tests y Playwright.
