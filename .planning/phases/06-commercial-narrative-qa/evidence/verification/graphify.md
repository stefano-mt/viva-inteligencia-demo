# P6-15 — Evidencia Graphify

**Fecha:** 2026-08-10

## Comandos

```powershell
$env:UV_CACHE_DIR = "$PWD\.cache\uv"
uvx --from graphifyy graphify extract . --code-only --no-cluster
uvx --from graphifyy graphify god-nodes --top 15
uvx --from graphifyy graphify query "frontend navigation views state data rendering" --budget 3000
uvx --from graphifyy graphify query "buildJourneyContext renderJourney journeyContext" --budget 3000
```

## Resultado

- 114 archivos de código cambiados o reextraídos y 111 sin cambios.
- 284 archivos no código omitidos.
- Grafo: **3,762 nodos** y **7,556 relaciones**, sin clustering.
- Baseline F5 registrado: 3,425 nodos y 6,536 relaciones.
- `journey.js` y `views/journey.js` aparecen como fronteras separadas.
- `escapeHtml`, `formatNumber`, `escapeAttr`, `buildDemoBundle`, `state`, `initializeScenarioData`, `render` y `bindEvents` permanecen entre los nodos más conectados.
- `buildJourneyContext`, `renderJourney`, `state.js` y `app.js` son alcanzables, pero la revisión directa confirmó que `renderJourney` no recibe el `journeyContext` materializado.
- No aparece un nuevo god node de Journey entre los 15 primeros; el hallazgo bloqueante es una integración ausente, no concentración excesiva.

## Límites y observaciones

- Graphify sigue sin cubrir CSS/JSON con fidelidad suficiente; el gate se complementó con hashes, Playwright, imports y revisión directa.
- Se mantuvo el warning histórico por SQL sin `tree_sitter_sql`; no afecta el runtime F6.
- La extracción raíz enumeró un `session-metadata.json` como archivo que produjo cero nodos. No se usó como evidencia, no apareció en `graphify-out` y no se versionó contenido de la carpeta de ensayo del usuario. Esta enumeración se registra como nota operativa del checker.
