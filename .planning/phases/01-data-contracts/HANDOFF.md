# Handoff — P1-10

## Estado

`done — PASS WITH RISKS`

## Resultado

La Fase 1 está completada y verificada de forma independiente. El repositorio dispone de un contrato de datos v2, un modelo autoritativo trazable, una proyección legacy compatible, un piloto canónico 30/22/5, fixtures ejecutables, validadores semánticos, un build determinista y un reporte de cobertura ligado al SHA del JSON público.

No hay bloqueos de Fase 1. Los riesgos confirmados se transfieren explícitamente a F2–F5 y no deben ocultarse en la narrativa comercial.

## Cambios

- Archivos modificados por P1-10:
  - `.planning/phases/01-data-contracts/SUMMARY.md`
  - `.planning/phases/01-data-contracts/HANDOFF.md`
  - `.planning/STATE.md`
  - `.planning/DECISIONS.md`
  - `.planning/ROADMAP.md`
- Decisiones aplicadas:
  - 90 es el conteo reproducible vigente de Miraflores; 88 queda registrado como drift documental.
  - `deep` significa profundidad estructurada demostrada, no dossier visual público.
  - Los aliases ambiguos permanecen `manual_review` y sus 42 proyectos no entran al modelo canónico.
  - La moneda ambigua `$` se normaliza como `unknown`, nunca como USD por inferencia.
  - PII y activos no autorizados permanecen fuera del artefacto público.
  - El build usa metadata fija, fingerprints y serialización determinista.
- Comportamiento no modificado:
  - P1-10 no cambia contrato, generador, tests, fixtures, datos ni UI.
  - No inicia ni marca como completa ninguna fase futura.

## Criterios

| Criterio | Estado | Evidencia |
|---|---|---|
| Historias HU-DEMO-001–006 y 902 | pass | [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md) |
| Dataset v2 y proyección legacy | pass | 714 legacy, 676 autoritativos y SHA reproducible. |
| Cobertura canónica | pass | 180 de mercado, 184 en modelo y piloto 30/22/5. |
| Referencias y privacidad | pass | 0 referencias rotas, 0 PII pública y 0 activos restringidos expuestos. |
| Fixtures CT-A/B/D/E/G/H | pass | Schema, cálculos, exclusiones y referencias verificados. |
| Build determinista | pass | Dos builds adicionales reprodujeron el mismo SHA. |
| Memoria y handoff P1-10 | pass | Los cinco archivos del write set quedaron actualizados. |

## Verificación ejecutada

Para una máquina que necesite resolver Playwright desde el runtime compartido:

```powershell
$env:NODE_PATH='C:\Users\Stefano\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
```

Desde `prototipo_ejecutable/`, el checker ejecutó:

| Comando/recorrido | Resultado |
|---|---|
| `npm.cmd run check` | PASS |
| `npm.cmd run test:architecture` | PASS |
| `npm.cmd run test:data` | PASS — 714 legacy, 676 autoritativos y 7 rutas. |
| `npm.cmd run test:data:validator` | PASS |
| `npm.cmd run test:data:schema` | PASS — root v2 y CT-A/B/D/E/G/H. |
| `npm.cmd run test:data:references` | PASS — 42 proyectos ambiguos excluidos prudentemente. |
| `npm.cmd run test:data:agencies` | PASS — 180 de mercado y piloto 30/22/5. |
| `npm.cmd run test:data:evidence` | PASS |
| `npm.cmd run test:data:measures` | PASS — 5 tipologías, 26 hechos, 5 issues y 3 eventos. |
| `npm.cmd run test:data:determinism` | PASS |
| `npm.cmd run data:build` | PASS |
| `npm.cmd run verify` | PASS — privacidad, smoke y accesibilidad incluidos. |
| Build adicional ×2 y comparación SHA-256 | PASS — `a7f68af35d97c6fbc066b4213ebb12d525d630fa366a0e75826d2349087d8141`. |

## Evidencia

- Informe del checker: [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md)
- Resumen de fase: [SUMMARY.md](SUMMARY.md)
- Reporte de cobertura: [coverage-report.json](../../../datos_relevantes/demo-pilot/coverage-report.json)
- Dataset público: [viva-platform-demo.json](../../../prototipo_ejecutable/public/demo-data/viva-platform-demo.json)
- Capturas: 21 PNG del smoke de 7 rutas × 3 viewports, confirmadas por P1-09.
- Consola: sin errores en el smoke automatizado.
- Fixtures: CT-A/B/D/E/G/H.
- Commits P1-01–09: `c03ef69`, `ac15c96`, `83163dc`, `ab48706`, `41012e3`, `0d0d4b2`, `4c79e84`, `4775228`, `c33bda4`.
- Commit P1-10: no creado en este handoff.

## Arquitectura y dataset que recibe el siguiente rol

- `$.model` es autoritativo; el `$.projects` superior es compatibilidad legacy.
- Contrato `2.0.0`, dataset `dataset:viva-platform-demo-2026-07-28` y 27 fingerprints.
- 714 proyectos legacy; 676 autoritativos = 672 Nexo resolubles + 4 controlados.
- 180 agencias canónicas de mercado; 184 en el modelo; 30 seleccionadas, 22 enriched acumuladas y 5 deep.
- 8 fuentes, 17 observaciones, 26 hechos, 4 documentos, 4 evidencias, 5 issues y 3 eventos.
- JSON público: 3,382,916 bytes; SHA-256 `a7f68af35d97c6fbc066b4213ebb12d525d630fa366a0e75826d2349087d8141`.

## Riesgos y pendientes

- Riesgos residuales:
  - Miraflores tiene 90 proyectos en el snapshot reproducible; el valor 88 en `CONTEXT.md` es drift documental.
  - Cinco tiers `deep` no equivalen a cinco dossiers visuales públicos.
  - No existe precio por m² de mercado elegible.
  - Solo existen tres eventos controlados y ninguno tiene causa observada.
  - `coverage-report.json` debe regenerarse manualmente cuando cambie el SHA del JSON.
- Deuda deliberada:
  - La proyección legacy continúa temporalmente para no romper la UI.
  - Los activos de tarjeta/plano CT-G no se publican sin autorización.
- Gaps:
  - F2: microzonas/cuadrantes y cobertura de 42 proyectos no resueltos.
  - F3: activos autorizados o neutrales y dossier navegable.
  - F4: hechos de mercado compatibles para benchmark por moneda, precio y denominador.
  - F5: histórico más amplio y asistente trazable al mismo escenario y evidencia.

## Qué no asumir

- No asumir que `deep` significa cobertura visual completa; describe snapshots estructurados, matching alto, tipología inspeccionable y valores respaldados.
- No asumir que los 37 proyectos legacy con moneda `unknown` son USD.
- No asignar por intuición los 42 proyectos asociados a 11 aliases en `manual_review`.
- No usar fixtures controlados como prueba de precio o comportamiento real de mercado.
- No declarar causa de un evento cuando `cause = null`.
- No presentar los precios por m² de CT-A como benchmark certificado de mercado.
- No publicar tarjeta, plano o documento restringido sin autorización.

## Instrucción al siguiente rol

El siguiente rol debe planificar Fase 2 antes de editar:

1. Leer [SUMMARY.md](SUMMARY.md), [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md), [STATE.md](../../STATE.md), [DECISIONS.md](../../DECISIONS.md) y la sección F2 de [ROADMAP.md](../../ROADMAP.md).
2. Resolver de forma explícita el drift 88/90 dentro de un write set autorizado.
3. Especificar contrato de escenario, límites distritales y asignación determinista de cuadrante/microzona.
4. Mantener visibles los 42 proyectos no resueltos y no debilitar `manual_review`.
5. Definir maker, checker, write sets, fixtures CT-C/CT-I y gate de navegador antes de iniciar implementación.
