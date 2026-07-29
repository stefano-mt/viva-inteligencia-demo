# Handoff — P2-17

## Estado

`documentos P2-17 preparados en el worktree — PASS WITH RISKS; versionado, PR, merge y cierre de ship pendientes`

## Resultado

La Fase 2 está implementada y verificada en la rama `feat/phase-2-geography-scenario`. El checker independiente `/root/phase2_final_checker` emitió `PASS WITH RISKS` sobre el HEAD funcional `606452569040d0489685a3c26b16e15da0c476ac`; el informe quedó versionado en `49bf8de`.

Stefano aceptó los cinco riesgos y autorizó el gate con la declaración exacta:

> Acepto R1–R5 y autorizo HUMAN-GATE-B.

**Timestamp de sesión:** `2026-07-29T08:01:09.8984344-05:00`.

HUMAN-GATE-B autoriza preparar el cierre documental y un PR. No autoriza a un agente a fusionar el PR, no demuestra despliegue y no reemplaza P2-18/P2-19. El cierre técnico está verificado; el cierre de ship no lo está.

## Alcance de P2-17

P2-17 solo modifica:

- [SUMMARY.md](SUMMARY.md);
- [HANDOFF.md](HANDOFF.md);
- [STATE.md](../../STATE.md);
- [DECISIONS.md](../../DECISIONS.md);
- [ROADMAP.md](../../ROADMAP.md).

No modifica código, datos, fixtures, CSS, contratos ejecutables ni evidencia binaria. En esta ejecución no se crea commit, push, PR ni merge. Por tanto, estos cinco documentos están preparados en el worktree y deben versionarse en la rama antes de crear el PR.

## Registro P2-01–P2-15

La identidad del maker no quedó versionada por tarea. El autor Git `Stefano <stefano@a4f.ai>` no permite inferir quién fue el agente implementador. Para evitar una atribución inventada, el registro es:

| Tarea | Maker | Commit(s) verificables | Alcance confirmado por P2-16 |
|---|---|---|---|
| P2-01 | no verificable desde el repositorio | `fc6160e` | Fuente OSM dentro del `write_set`. |
| P2-02 | no verificable desde el repositorio | `70f74e1`, `f18e5ac` | Contrato, fixtures y remediación dentro del conjunto permitido. |
| P2-03 | no verificable desde el repositorio | `079f9ac` | Motor y tests geográficos dentro del `write_set`. |
| P2-04 | no verificable desde el repositorio | `080cc61` | Build geográfico completo, con desviaciones registradas abajo. |
| P2-05 | no verificable desde el repositorio | `223f1ea` | Dominio de escenario puro dentro del `write_set`. |
| P2-06 | no verificable desde el repositorio | `3f0fccd` | Comparabilidad determinista dentro del `write_set`. |
| P2-07 | no verificable desde el repositorio | `86ee414`, `d6ea5a4`, `736140a` | Estado/controlador/dominio y dos remediaciones permitidas. |
| P2-08 | no verificable desde el repositorio | `ec6e6e9` | Barra/contexto, con desviación registrada abajo. |
| P2-09 | no verificable desde el repositorio | `8d9aa77`, `3fc8c44` | Mapa, posicionamiento y estabilización accesible. |
| P2-10 | no verificable desde el repositorio | `85c337a` | Dashboard/controlador conforme a D-021. |
| P2-11 | no verificable desde el repositorio | `6dfd27e` | Lectura de mercado conforme al plan. |
| P2-12 | no verificable desde el repositorio | `3b158f2` | Catálogo, comparador y test puro dentro del conjunto ampliado. |
| P2-13 | no verificable desde el repositorio | `da09c82` | Checklist, asistente, controlador y test puro dentro del conjunto ampliado. |
| P2-14 | no verificable desde el repositorio | `9f0aed5` | E2E y descriptor público dentro del `write_set`. |
| P2-15 | no verificable desde el repositorio | `6064525` | Cuatro CSS autorizados; sin cambios en tokens globales o HTML/JS. |

Los comandos ejecutados históricamente por cada maker P2-01–P2-15 tampoco son verificables individualmente desde el repositorio. No se sustituyen por los comandos previstos del plan. La cobertura técnica final sí fue ejecutada y registrada por P2-16.

## Checker independiente

| Rol | Identidad | Evidencia |
|---|---|---|
| Checker P2-16 | `/root/phase2_final_checker` | [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md) |

El checker declaró no haber implementado P2-01–P2-15. Su veredicto permanece `PASS WITH RISKS`.

## Comandos verificables

P2-16 registró como ejecutados:

```powershell
npm.cmd run verify
node tests/scenario-e2e.mjs
uvx --from graphifyy graphify extract . --code-only --no-cluster
uvx --from graphifyy graphify god-nodes --top 15
git diff --check a8f0284..HEAD
```

También registró:

- medición Playwright independiente en 1440×900, 1280×720, 390×844 y viewport efectivo 720×450;
- validación SHA-256 de JSON, GeoJSON, fuente y 42 capturas finales P2-15;
- ausencia de listeners en los puertos de prueba al finalizar.

Los contratos ejecutables relevantes son:

- [scenario-domain.mjs](../../../prototipo_ejecutable/tests/scenario-domain.mjs);
- [scenario-context.mjs](../../../prototipo_ejecutable/tests/scenario-context.mjs);
- [comparability.mjs](../../../prototipo_ejecutable/tests/comparability.mjs);
- [geographic-map.mjs](../../../prototipo_ejecutable/tests/geographic-map.mjs);
- [projects-compare.mjs](../../../prototipo_ejecutable/tests/projects-compare.mjs);
- [checklist-assistant.mjs](../../../prototipo_ejecutable/tests/checklist-assistant.mjs);
- [scenario-e2e.mjs](../../../prototipo_ejecutable/tests/scenario-e2e.mjs);
- [browser-smoke.mjs](../../../prototipo_ejecutable/tests/browser-smoke.mjs);
- [browser-a11y.mjs](../../../prototipo_ejecutable/tests/browser-a11y.mjs);
- [ct-c-public.json](../../../prototipo_ejecutable/tests/e2e-scenarios/ct-c-public.json).

No se crea `TEST_CONTRACTS.md` porque no pertenece al `write_set` de P2-17.

## Desviaciones de `write_set`

P2-16 identificó tres deltas que escribieron fuera de la lista publicada antes de la tarea:

1. `20f282a`: modificó `.planning/DECISIONS.md`, `.planning/STATE.md` y `SOURCE-ASSESSMENT.md` como memoria posterior a P2-03; el contenido fue factual, pero no pertenecía al `write_set` de P2-03.
2. `080cc61`: además de la entrega funcional P2-04, modificó `.planning/DECISIONS.md` y `tests/data-contract-compatibility.mjs`, fuera del `write_set` publicado.
3. `ec6e6e9`: además de P2-08, añadió una línea de restauración de foco en `controller.js`, fuera de su `write_set`.

Las desviaciones fueron acotadas y cubiertas por el gate funcional, pero siguen siendo riesgo procedimental R1. No deben usarse como precedente: una ampliación futura debe aprobarse antes de escribir.

## Evidencia

- Veredicto independiente: [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md).
- Resumen: [SUMMARY.md](SUMMARY.md).
- Plan y contratos normativos: [PLAN.md](PLAN.md).
- Aprobación de fuente/HUMAN-GATE-A: [APPROVAL.md](APPROVAL.md).
- Dataset público: [viva-platform-demo.json](../../../prototipo_ejecutable/public/demo-data/viva-platform-demo.json).
- GeoJSON público: [district-boundaries.geojson](../../../prototipo_ejecutable/public/demo-data/district-boundaries.geojson).
- Manifiesto de fuente: [source-manifest.json](../../../datos_relevantes/geography/source-manifest.json).
- Reporte de cobertura: [coverage-report.json](../../../datos_relevantes/demo-pilot/coverage-report.json).

La evidencia visual final se verificó en `%TEMP%` durante P2-16. Es válida para el veredicto, pero no durable; debe adjuntarse o enlazarse desde el PR antes de solicitar merge.

## HUMAN-GATE-B y riesgos aceptados

| Riesgo | Aceptación | Mitigación/condición vigente |
|---|---|---|
| R1 — makers y desviaciones | Aceptado | No inventar makers; conservar tabla de commits y desviaciones; ampliar `write_set` antes de futuros cambios. |
| R2 — evidencia temporal | Aceptado | Adjuntar o enlazar evidencia durable durante la preparación/revisión del PR y antes de solicitar merge. |
| R3 — contratos dispersos | Aceptado | Enlazar PLAN, informe y tests ejecutables; no crear `TEST_CONTRACTS.md` fuera del alcance. |
| R4 — Graphify limitado en CSS/JSON | Aceptado | Mantener Graphify complementado por tests de datos, hashes, Playwright, contraste y revisión visual. |
| R5 — zoom automatizado | Aceptado | Realizar una comprobación humana breve al 200% antes de la demo; puede hacerse durante la revisión del PR solo si la revisión ocurre primero. |

## Dependencias y próximos gates

1. **Antes de crear el PR:** versionar estos cinco documentos P2-17 en la rama; esta ejecución no realiza ese commit.
2. **Durante la preparación/revisión del PR y antes de solicitar merge:** adjuntar o enlazar de forma durable la evidencia visual y sus mediciones. No añadir binarios al repositorio fuera de un `write_set` aprobado.
3. **Antes de la demo:** realizar y registrar la comprobación humana breve de Chrome al 200%.
4. **PR:** abrir contra `main` con historias, fuentes, pruebas, capturas, riesgos R1–R5 y veredicto `PASS WITH RISKS`.
5. **Merge:** exclusivamente humano. P2-17 no fusiona.
6. **P2-18:** después del merge, verificar GitHub Pages de forma read-only: merge SHA, workflow, HTTP 200, contrato `2.1.0`, hash del GeoJSON y CT-C público. El workflow versionado [deploy-pages.yml](../../../.github/workflows/deploy-pages.yml) se llama `Deploy demo to GitHub Pages`, se dispara con un push a `main`, publica `prototipo_ejecutable/public` en el environment `github-pages` y tiene como owner operativo a GitHub Actions. La URL esperada por convención del repositorio es `https://stefano-mt.github.io/viva-inteligencia-demo/`, pero queda **a confirmar por P2-18** junto con el workflow run y SHA reales del merge.
7. **P2-19:** persistir el resultado de P2-18 en una rama y PR documental separados. El PR P2-19 debe ser revisado y fusionado por un humano; solo entonces la memoria del repositorio puede declarar `deployed and verified` si P2-18 pasó, o `merged, deployment verification failed` si falló.

Hasta completar el merge funcional, P2-18 y el merge humano del PR P2-19, la Fase 2 no debe presentarse como cierre de ship. En el estado actual, el despliegue no está demostrado ni verificado.

## Qué no asumir

- No asumir que `PASS WITH RISKS` equivale a `PASS`.
- No asumir que HUMAN-GATE-B equivale a merge o despliegue.
- No asumir que la evidencia temporal ya está preservada en GitHub.
- No atribuir makers a partir del autor Git.
- No presentar cuadrantes analíticos como zonas oficiales.
- No presentar el escenario Viva simulado como precio observado o de cierre.
- No afirmar que Graphify verifica CSS o contenido JSON.
- No declarar GitHub Pages verificado antes de P2-18.
