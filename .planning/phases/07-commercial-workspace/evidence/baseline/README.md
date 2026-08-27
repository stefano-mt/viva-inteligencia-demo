# Evidencia P7-00D

Baseline portable vinculada a `53ccfefb487e92f95f334d442c2356720e2cc7ed`.

- `capture-baseline.mjs`: harness read-only sobre la aplicación.
- `manifest.json`: rutas, viewports, métricas DOM y SHA-256 de cada captura.
- `journey-*.png`: seis etapas × tres viewports.
- `expert-*.png`: ocho rutas expertas × tres viewports.

El harness inicia un servidor local, bloquea y registra solicitudes externas, espera `networkidle`, valida DOM/foco/overflow/valores no finitos y captura la página completa. No modifica runtime ni persiste estado de usuario.
