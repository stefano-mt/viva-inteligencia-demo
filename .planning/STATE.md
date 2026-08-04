# Estado del proyecto

**Actualizado:** 2026-08-04

**Milestone:** demo vNext orientada a venta

**Última fase con despliegue técnico verificado:** Fase 4 — benchmark y comparador

**Estado:** Fases 0–4 están oficialmente `deployed and verified`. El PR funcional #13 fue fusionado, P4-15 verificó GitHub Pages con `PASS` para `e2c953f` y el PR documental #14 fue fusionado en `main` (`47a794c`). Fase 5 está en ejecución; P5-01–P5-08 están completos. P5-08 incorporó una agenda reproducible de máximo tres acciones con procedencia y navegación accesible.

**Rama activa:** `feat/phase-5-history-signals-assistant`.

## Baseline vigente

- Base de Fase 2: `a8f0284`, merge de Fase 1 en `main`.
- HEAD funcional verificado por P2-16: `606452569040d0489685a3c26b16e15da0c476ac`.
- Informe P2-16 versionado en `49bf8de`.
- PR funcional: [#7](https://github.com/stefano-mt/viva-inteligencia-demo/pull/7), fusionado el `2026-07-29T14:01:46Z`.
- SHA del merge funcional: `69fbfc220caccb887fe61763e4f9c747233211f2`.
- PR documental inicial: [#8](https://github.com/stefano-mt/viva-inteligencia-demo/pull/8), fusionado.
- PR correctivo: [#9](https://github.com/stefano-mt/viva-inteligencia-demo/pull/9), fusionado el `2026-07-29T14:34:18Z`.
- SHA desplegado y verificado: `ebe9795e408c190af8bc0881b98e4fd3389da59e`.
- PR documental final: [#10](https://github.com/stefano-mt/viva-inteligencia-demo/pull/10), fusionado el `2026-07-29T14:43:43Z`.
- Merge documental final en `main`: `e2667240fc38f1fb764839f32937a5e47f6f714f`.
- GitHub Pages: [URL pública](https://stefano-mt.github.io/viva-inteligencia-demo/), HTTP 200.
- Workflow Pages vigente: [run 30461539884](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/30461539884), `success`.
- Contrato de datos: `2.1.0`; el reader 2.1 acepta 2.0 y 2.1.
- Dataset: `dataset:viva-platform-demo-2026-07-28`.
- JSON público: 3,588,986 bytes.
- SHA-256 reproducible:

```text
fa9365ff83c9c72aefa15bf5f6fee952b83efdd6ba23c524cf2f92c88b78ada4
```

- Universo legacy: 714 proyectos, 192 nombres de inmobiliaria y 45 distritos.
- Modelo autoritativo: 676 proyectos = 672 Nexo resolubles + 4 controlados.
- Cobertura canónica: 180 agencias de mercado y 184 agencias en el modelo.
- Piloto: 30 base, 22 enriched acumuladas y 5 deep.
- Exclusión prudente: 42 proyectos asociados a 11 aliases `manual_review`.
- Monedas legacy: 677 PEN, 0 USD y 37 `unknown`.
- Catálogos v2: 8 fuentes, 17 observaciones, 26 hechos, 4 documentos, 4 evidencias, 5 issues y 3 eventos.
- GeoJSON público y fuente: 46,650 bytes; SHA-256 `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0`.
- Geografía: 433 asignaciones; 422 dentro/sobre polígono y 11 `outside_district_polygon`.
- Miraflores CT-I: 90 observados, 85 comparables, 5 no reconciliados, 69 publicaciones raw con precio y área total declarados —sin pairing demostrado— y cuadrantes 40/5/5/40.
- Graphify F2 `--code-only --no-cluster`: 2,066 nodos y 4,104 relaciones; no reveló un hub nuevo injustificado.

## Verificación vigente

- Veredicto P2-16: `PASS WITH RISKS`; nunca `PASS`.
- Checker independiente: `/root/phase2_final_checker`.
- `npm.cmd run verify`, E2E adicional, CT-C, CT-I, regresiones F1, accesibilidad y Graphify: PASS.
- Smoke: 7 rutas × 3 viewports; sin errores de consola, HTTP o red externa.
- Visual: evidencia completa y cuatro capturas representativas persistidas y verificadas en el PR #7.
- HUMAN-GATE-B: Stefano declaró “Acepto R1–R5 y autorizo HUMAN-GATE-B.” en `2026-07-29T08:01:09.8984344-05:00`.
- P2-18 final: **PASS**, 7/7 criterios.
- Checker post-merge independiente: `/root/phase2_plan_reader`.
- Comando CT-C público ejecutado desde una copia exacta del merge: PASS.
- CT-C/CT-I, escritorio, móvil, red externa, HTTP, consola y errores de página: PASS.
- Informe post-merge: [phases/02-geography-scenario/POSTMERGE_REPORT.md](phases/02-geography-scenario/POSTMERGE_REPORT.md).
- Informe: [phases/02-geography-scenario/VERIFICATION_REPORT.md](phases/02-geography-scenario/VERIFICATION_REPORT.md).
- Resumen: [phases/02-geography-scenario/SUMMARY.md](phases/02-geography-scenario/SUMMARY.md).
- Handoff: [phases/02-geography-scenario/HANDOFF.md](phases/02-geography-scenario/HANDOFF.md).

## Baseline funcional de Fase 3

- Rama: `feat/phase-3-evidence-inspector`.
- HEAD funcional verificado por P3-14: `c35646f1adfb4a0603c5838e32af6119ca5f66a1`.
- Informe P3-14: `599d619`; veredicto `PASS`.
- PR funcional: [#11](https://github.com/stefano-mt/viva-inteligencia-demo/pull/11), fusionado el `2026-07-30T21:38:19Z`.
- Head final del PR funcional: `a9feb0590f1d45c45f65541878441c6cab821281`.
- SHA del merge funcional, desplegado y verificado: `cc51769fbc4c0be270fc48295b8a604db0382378`.
- Workflow Pages: [run 30584187019](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/30584187019), `success`.
- GitHub Pages: [URL pública](https://stefano-mt.github.io/viva-inteligencia-demo/), HTTP 200.
- Contrato de datos en la rama: `2.2.0`; reader compatible con 2.0/2.1/2.2.
- Dataset: `dataset:viva-platform-demo-2026-07-28`.
- JSON público: 3,656,852 bytes; SHA-256 `9cf407c091fbb03b7d489e39079de57fd84af3fe16dc82b8ed559a7eda84646c`.
- Modelo: 676 proyectos, 184 agencias, 11 tipologías, 30 observaciones, 40 hechos, 19 documentos, 19 evidencias, 10 issues y 3 eventos.
- Inspector: 10 casos, 10 tipologías inspectables y 15 activos visuales autorizados.
- Procedencia: 1 observado, 9 controlados y 0 simulados.
- Calidad: 3 certificados, 1 revisable, 4 inconsistentes, 1 ilegible y 1 insuficiente.
- Elegibilidad: 3 casos elegibles y 7 excluidos.
- CT-D y CT-G: PASS visual y analítico.
- Smoke y accesibilidad: 8 rutas × 3 viewports.
- Lector comercial nuevo: PASS en `00:01:28.548`.
- Graphify F3: 2,605 nodos y 5,120 relaciones; sin ciclo o hub nuevo bloqueante.
- HUMAN-GATE-B: no requerido porque P3-14 emitió `PASS`.
- P3-16: **PASS** el `2026-07-30T16:44:37-05:00`.
- Checker post-merge independiente: `/root/phase3_checker`.
- CT-D/CT-G, activos permitidos, permisos, escritorio, móvil, zoom 200%, consola y red: PASS.
- Informe post-merge: [phases/03-evidence-inspector/POSTMERGE_REPORT.md](phases/03-evidence-inspector/POSTMERGE_REPORT.md).
- PR documental final: [#12](https://github.com/stefano-mt/viva-inteligencia-demo/pull/12), fusionado.
- Merge documental final en `main`: `e30973baa963fd4caa408aaa802803beac91dddd`.

## Decisiones vigentes de datos

- `$.model` es autoritativo; `$.projects` es una proyección legacy temporal.
- El escenario serializado en URL es la única fuente global para mapa y consumidores.
- Los cuadrantes son analíticos, derivados por medianas, y nunca oficiales.
- OSM se usa como snapshot referencial ODbL separado; RENLIM permanece como referencia jurídica.
- Los 11 puntos fuera de polígono permanecen visibles como exclusiones; no se reasignan.
- El escenario Viva y su precio son simulados; los precios competitivos raw son precios publicados `desde`, no referencias elegibles ni precios de cierre mientras no exista pairing demostrado.
- Los tiers `deep` demuestran profundidad estructurada; no prometen dossiers visuales públicos.
- Los aliases ambiguos permanecen `manual_review`; no se resuelven por intuición.
- La moneda ambigua `$` permanece `unknown`; no se infiere USD.
- PII, contenido crudo, rutas locales y activos no autorizados quedan fuera del JSON público.
- El build usa metadata fija, fingerprints SHA-256 y serialización determinista.

## Riesgos y restricciones abiertas

- R1–R5 fueron aceptados en HUMAN-GATE-B; el veredicto sigue siendo `PASS WITH RISKS`.
- R1: las identidades maker P2-01–P2-15 no son verificables desde el repositorio y hubo desviaciones en `20f282a`, `080cc61` y `ec6e6e9`.
- R3: no existe `TEST_CONTRACTS.md`; se usan PLAN, informe y tests ejecutables.
- R4: Graphify no cubre adecuadamente CSS/JSON; se complementa con tests, hashes y Playwright.
- R5: el reflujo equivalente a 200% fue automatizado; falta una comprobación humana breve antes de la demo. Puede realizarse durante la revisión del PR únicamente si la revisión ocurre primero.
- F3 mantiene tres notas no bloqueantes: posible confusión inicial entre porcentaje de evidencia y 30/22/5, cobertura parcial de Graphify para CSS/JSON y prerequisito local de instalar dependencias de desarrollo para Playwright.
- F4 no dispone de precio por m² de mercado elegible; los dos hechos actuales provienen de CT-A simulado.
- F5 solo dispone de tres eventos controlados y ninguno tiene causa observada.

## Cierre vigente de Fase 2

- Contexto: [phases/02-geography-scenario/CONTEXT.md](phases/02-geography-scenario/CONTEXT.md).
- Especificación UI: [phases/02-geography-scenario/UI-SPEC.md](phases/02-geography-scenario/UI-SPEC.md).
- Plan: [phases/02-geography-scenario/PLAN.md](phases/02-geography-scenario/PLAN.md).
- Evaluación de fuente: [phases/02-geography-scenario/SOURCE-ASSESSMENT.md](phases/02-geography-scenario/SOURCE-ASSESSMENT.md).
- Revisión del plan: [phases/02-geography-scenario/PLAN_REVIEW.md](phases/02-geography-scenario/PLAN_REVIEW.md).
- HUMAN-GATE-A: [phases/02-geography-scenario/APPROVAL.md](phases/02-geography-scenario/APPROVAL.md).
- HUMAN-GATE-B: aprobada con aceptación explícita de R1–R5.
- Implementación P2-01–P2-15 y checker P2-16: terminados.
- Memoria P2-17: versionada en `107f1bf`; normalización documental en `ac3e564`.
- PR funcional: #7 fusionado por un humano.
- Primer P2-18: `merged, deployment verification failed`, persistido mediante el PR #8.
- Corrección de base path: PR #9 fusionado.
- GitHub Pages: desplegado y verificado para `ebe9795e`.
- P2-18 final: PASS.
- Cierre de ship: `deployed and verified`; memoria documental final fusionada mediante PR #10.

## Fase 3 — cierre técnico vigente

- Contexto: [phases/03-evidence-inspector/CONTEXT.md](phases/03-evidence-inspector/CONTEXT.md).
- UX/UI: [phases/03-evidence-inspector/UI-SPEC.md](phases/03-evidence-inspector/UI-SPEC.md).
- Inventario de 10 expedientes: [phases/03-evidence-inspector/CASE-INVENTORY.md](phases/03-evidence-inspector/CASE-INVENTORY.md).
- Plan: [phases/03-evidence-inspector/PLAN.md](phases/03-evidence-inspector/PLAN.md).
- Solicitud de aprobación: [phases/03-evidence-inspector/HUMAN-GATE-A-REQUEST.md](phases/03-evidence-inspector/HUMAN-GATE-A-REQUEST.md).
- Revisión independiente: [phases/03-evidence-inspector/PLAN_REVIEW.md](phases/03-evidence-inspector/PLAN_REVIEW.md), `PASS`.
- HUMAN-GATE-A: [phases/03-evidence-inspector/APPROVAL.md](phases/03-evidence-inspector/APPROVAL.md), aprobada el `2026-07-29T11:03:25.5945816-05:00`.
- Implementación P3-01–P3-13: completada.
- Checker P3-14: [VERIFICATION_REPORT.md](phases/03-evidence-inspector/VERIFICATION_REPORT.md), `PASS`.
- Resumen: [SUMMARY.md](phases/03-evidence-inspector/SUMMARY.md).
- Handoff: [HANDOFF.md](phases/03-evidence-inspector/HANDOFF.md).
- P3-15: memoria versionada y evidencia portable adjunta; PR funcional #11 revisado y fusionado por un humano.
- Merge funcional: `cc51769fbc4c0be270fc48295b8a604db0382378`.
- GitHub Pages: desplegado y verificado mediante el run `30584187019`.
- P3-16: `PASS`; contrato `2.2.0`, CT-D, CT-G, quince activos autorizados y permisos verificados en la URL pública.
- P3-17: resultado persistido en `POSTMERGE_REPORT.md` y este estado mediante una rama/PR documental separados.
- Estado de ship de Fase 3: **`deployed and verified`**; memoria P3-17 integrada en `main` mediante PR #12.

## Fase 4 — cierre post-merge vigente

- Contexto: [phases/04-benchmark-comparator/CONTEXT.md](phases/04-benchmark-comparator/CONTEXT.md).
- Evaluación de datos: [phases/04-benchmark-comparator/DATA-ASSESSMENT.md](phases/04-benchmark-comparator/DATA-ASSESSMENT.md).
- UX/UI: [phases/04-benchmark-comparator/UI-SPEC.md](phases/04-benchmark-comparator/UI-SPEC.md).
- Plan: [phases/04-benchmark-comparator/PLAN.md](phases/04-benchmark-comparator/PLAN.md).
- Solicitud de aprobación: [phases/04-benchmark-comparator/HUMAN-GATE-A-REQUEST.md](phases/04-benchmark-comparator/HUMAN-GATE-A-REQUEST.md).
- Aprobación: [phases/04-benchmark-comparator/APPROVAL.md](phases/04-benchmark-comparator/APPROVAL.md), A1–A12 aceptadas el `2026-07-31T11:11:10.4019829-05:00`.
- Implementación P4-01–P4-12: completada; P4-10/HU-505 diferida por A10.
- Contrato público: `2.3.0`; reader compatible con 2.0–2.3 y runtime territorial probado con 2.1/2.2/2.3.
- Dataset: 7,387,136 bytes; SHA-256 `5d8a13b3e0af73d8dc8cee674f83cea541136b4c49bd444780bac3508f562041`; 50 fingerprints ordenados.
- Modelo: 676 proyectos, 184 agencias, 427 observaciones, 4,021 hechos, 19 documentos, 19 evidencias, 10 issues y 3 eventos.
- Benchmark: 397 entradas y 37 atributos; partición precio/m² `397 = 0 usadas + 26 faltantes + 371 excluidas`.
- Miraflores: 90 observados, 85 comparables, 5 por revisar, 69 publicaciones raw, 68 cocientes orientativos, 82 registros cualitativos y 0 parejas elegibles.
- P4-13 inicial: `FAIL` por G1; informe histórico versionado en `7e5f703`.
- Corrección P4-13A: `be05fdc456e3ab85da01df26b4cd22daa426dac6`.
- Checker independiente: `/root/phase4_gate_checker`; repetición P4-13 `PASS`.
- Informe vigente: [phases/04-benchmark-comparator/VERIFICATION_REPORT.md](phases/04-benchmark-comparator/VERIFICATION_REPORT.md), versionado en `6038749`.
- Resumen: [phases/04-benchmark-comparator/SUMMARY.md](phases/04-benchmark-comparator/SUMMARY.md).
- Handoff: [phases/04-benchmark-comparator/HANDOFF.md](phases/04-benchmark-comparator/HANDOFF.md).
- PR funcional: [#13](https://github.com/stefano-mt/viva-inteligencia-demo/pull/13), fusionado el `2026-08-03T23:19:02Z`.
- Head final del PR funcional: `bd631bf0d02c7deffda7e00434c459f5e5de9151`.
- SHA del merge funcional, desplegado y verificado: `e2c953fa36de49c658393669a4a2d40e469e5790`.
- Workflow Pages: [run 30861830772](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/30861830772), `success`.
- GitHub Pages: [URL pública](https://stefano-mt.github.io/viva-inteligencia-demo/), HTTP 200.
- P4-15: **PASS**; contrato `2.3.0`, CT-C/G/I, benchmark, comparador, quince activos, escritorio, móvil, consola y red verificados en la URL pública.
- Informe post-merge: [phases/04-benchmark-comparator/POSTMERGE_REPORT.md](phases/04-benchmark-comparator/POSTMERGE_REPORT.md).
- PR documental P4-16: [#14](https://github.com/stefano-mt/viva-inteligencia-demo/pull/14), fusionado por un humano.
- Merge documental P4-16 en `main`: `47a794ca00b451355a181acf5c20feeee0fdccb4`.
- Smoke y accesibilidad: 8 rutas × 3 viewports; responsive específico y reflow 200%: PASS.
- Graphify F4: 3,034 nodos y 5,743 relaciones; sin blocker arquitectónico.
- HUMAN-GATE-B: no requerido porque el veredicto final es `PASS`.
- Estado de ship: **`deployed and verified`**.
- Gap residual de gobernanza: el recorrido comercial de P4-13 fue automatizado. El checker independiente lo aceptó con `PASS`, pero debe realizarse un ensayo humano breve antes de presentar la demo al cliente.

## Fase 5 — planificación vigente

- Contexto: [phases/05-history-signals-assistant/CONTEXT.md](phases/05-history-signals-assistant/CONTEXT.md).
- Evaluación técnica y de datos: [phases/05-history-signals-assistant/DATA-ASSESSMENT.md](phases/05-history-signals-assistant/DATA-ASSESSMENT.md).
- UX/UI: [phases/05-history-signals-assistant/UI-SPEC.md](phases/05-history-signals-assistant/UI-SPEC.md).
- Plan: [phases/05-history-signals-assistant/PLAN.md](phases/05-history-signals-assistant/PLAN.md).
- Revisión estructural: [phases/05-history-signals-assistant/PLAN_REVIEW.md](phases/05-history-signals-assistant/PLAN_REVIEW.md).
- Solicitud de aprobación: [phases/05-history-signals-assistant/HUMAN-GATE-A-REQUEST.md](phases/05-history-signals-assistant/HUMAN-GATE-A-REQUEST.md).
- Historias: HU-DEMO-601–603 y 701–703; HU-DEMO-603 es Should.
- Casos obligatorios: CT-C/D/E/F/G/I/P.
- Contrato propuesto: `2.4.0`, histórico y asistente autoritativos, reader 2.0–2.4.
- Línea base visual: `#activity` mezcla proyectos de otros distritos y prioriza outliers legacy; `#assistant` aún no cita hechos/evidencias.
- HUMAN-GATE-A: [phases/05-history-signals-assistant/APPROVAL.md](phases/05-history-signals-assistant/APPROVAL.md), A1–A12 aprobadas el `2026-08-04T10:50:13.4321329-05:00` sobre `ae55fa5`.
- P5-00C: completado; decisión D-033 registrada.
- P5-00D: [phases/05-history-signals-assistant/BASELINE_BROWSER.md](phases/05-history-signals-assistant/BASELINE_BROWSER.md), `PASS`; paridad runtime, `npm run verify`, ocho rutas × tres viewports, accesibilidad y cuatro capturas portables verificadas.
- P5-01: [phases/05-history-signals-assistant/P5-01-CONTRACT.md](phases/05-history-signals-assistant/P5-01-CONTRACT.md), completado; schema 2.4, `history`/`assistant` cerrados y reader 2.0–2.4.
- Drift controlado: determinismo permanece rojo solo por el fingerprint del schema mientras el dataset público sigue en 2.3; P5-04 es el propietario exclusivo de la regeneración.
- P5-02: [phases/05-history-signals-assistant/P5-02-POLICY-FIXTURES.md](phases/05-history-signals-assistant/P5-02-POLICY-FIXTURES.md), completado; policy histórica, siete familias del asistente, 8+7 fixtures CT-C/D/E/F/G/I/P y mutaciones fail-closed.
- P5-02 preservó schema, writer, validator, runtime y JSON público; CT-C quedó modelado como visibilidad territorial, no como defecto de calidad.
- P5-03: [phases/05-history-signals-assistant/P5-03-MATERIALIZATION-AUDIT.md](phases/05-history-signals-assistant/P5-03-MATERIALIZATION-AUDIT.md), completado; reprodujo 34 preliminares y materializó 36 eventos (31 certificados, 5 revisables) con 6 exclusiones explicadas.
- P5-03 conserva causas nulas, 36 vigencias `aging`, orden/idempotencia, privacidad y schema 2.4 por evento; writer y JSON público permanecen protegidos.
- P5-04: [phases/05-history-signals-assistant/P5-04-PUBLIC-DATASET.md](phases/05-history-signals-assistant/P5-04-PUBLIC-DATASET.md), completado; writer y JSON público ahora usan contrato `2.4.0`.
- Histórico público: 36 eventos, 31 certificados, 5 revisables, 6 exclusiones; 72 observaciones, 72 hechos, 72 evidencias y un documento de snapshot con referencias válidas.
- Dataset 2.4: SHA-256 `20d44245c956a198c8621b3f544115387037b73cc462e50f63a5ce6d61fb4a37`; 52 fingerprints; reporte de cobertura SHA-256 `639b613aff89f9605c3dcc74a7914700dfa89fb84ababe70910fc25c3ba81864`.
- P5-05: [phases/05-history-signals-assistant/P5-05-HISTORY-DOMAIN.md](phases/05-history-signals-assistant/P5-05-HISTORY-DOMAIN.md), completado; motor puro sobre `payload.history` + `scenarioContext`, filtros locales, detalle referenciado, vigencia por cutoff y agenda de máximo tres filas.
- CT-C/E/G/I de dominio: PASS; 36 señales completas, orden calidad-primero, base cero sin infinito, evidencia restringida fail-closed y Miraflores limitado a los 85 comparables.
- P5-06: [phases/05-history-signals-assistant/P5-06-STATE-INTEGRATION.md](phases/05-history-signals-assistant/P5-06-STATE-INTEGRATION.md), completado; runtime territorial compatible con 2.1–2.4 e histórico derivado desde el escenario canónico.
- Estado histórico local: filtros y selección no mutan escenario ni payload; distrito, alcance y reset recomponen una vez y eliminan selecciones obsoletas.
- Compatibilidad: 2.3 conserva Benchmark y degrada histórico explícitamente; 2.4 habilita Benchmark e histórico sin cambiar la semántica de elegibilidad.
- Gate integral: `npm.cmd run verify` PASS, incluidas ocho rutas × tres viewports, E2E, accesibilidad, privacidad y determinismo.
- El gate arquitectónico está verde tras P5-06; los hashes del JSON, cobertura y GeoJSON permanecen sin cambios.
- P5-07: [phases/05-history-signals-assistant/P5-07-HISTORY-UI.md](phases/05-history-signals-assistant/P5-07-HISTORY-UI.md), completado; `#activity` consume solo `state.historyContext` y elimina el feed legacy.
- Vista histórica: banda de calidad, filtros, cinco señales por defecto, detalle con evidencia, estados legacy/vacío/error, foco preservado y navegación a proyecto.
- Evidencia visual P5-07: 1440×900, 1280×720 y 390×844; smoke y accesibilidad 8 rutas × 3 viewports PASS.
- P5-08: [phases/05-history-signals-assistant/P5-08-PRIORITIZED-AGENDA.md](phases/05-history-signals-assistant/P5-08-PRIORITIZED-AGENDA.md), completado; agenda vertical de máximo tres acciones en el orden del motor, con origen, hechos/evidencias y navegación a la señal.
- Fallback de agenda: si no hay señales elegibles, `Revisar filtros` enfoca el control canónico; la vista no inventa prioridad, frecuencia o causalidad.
- Evidencia visual P5-08: 1440×900, 1280×720 y 390×844; E2E, smoke y accesibilidad 8 rutas × 3 viewports PASS.

## Próxima acción recomendada

1. Ejecutar P5-09: construir el motor semántico puro del asistente sobre el catálogo 2.4.
2. Resolver intenciones cerradas con cifras y referencias del escenario, sin DOM, reloj o red.
3. Cerrar CT-F, fallback, XSS y rechazos de precio de cierre/PII antes de implementar la interfaz P5-10.

## Regla para actualizar este archivo

Registrar solo estado vigente, decisiones, bloqueos y siguiente acción. El detalle histórico vive en el resumen, handoff e informe de verificación de cada fase.
