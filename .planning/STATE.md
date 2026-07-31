# Estado del proyecto

**Actualizado:** 2026-07-31

**Milestone:** demo vNext orientada a venta

**Última fase completada:** Fase 3 — ficha, evidencia e inspector

**Estado:** Fases 0, 1, 2 y 3 completadas. Fase 3 está `deployed and verified`; su memoria P3-17 fue fusionada mediante el PR #12. Fase 4 inició planificación en una rama propia; no hay implementación funcional autorizada hasta completar reader-test independiente y `HUMAN-GATE-A`.

**Rama activa:** `feat/phase-4-benchmark-comparator`.

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
- Miraflores CT-I: 90 observados, 85 comparables, 5 no reconciliados, 69 referencias de precio y cuadrantes 40/5/5/40.
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
- El escenario Viva y su precio son simulados; las referencias competitivas son precios de lista publicados, no precios de cierre.
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

## Fase 4 — planificación activa

- Contexto: [phases/04-benchmark-comparator/CONTEXT.md](phases/04-benchmark-comparator/CONTEXT.md).
- Evaluación de datos: [phases/04-benchmark-comparator/DATA-ASSESSMENT.md](phases/04-benchmark-comparator/DATA-ASSESSMENT.md).
- UX/UI: [phases/04-benchmark-comparator/UI-SPEC.md](phases/04-benchmark-comparator/UI-SPEC.md).
- Plan: [phases/04-benchmark-comparator/PLAN.md](phases/04-benchmark-comparator/PLAN.md).
- Solicitud de aprobación: [phases/04-benchmark-comparator/HUMAN-GATE-A-REQUEST.md](phases/04-benchmark-comparator/HUMAN-GATE-A-REQUEST.md).
- Baseline: checks de sintaxis, arquitectura, escenario, comparabilidad, datos e inspector pasan; Playwright requiere instalar dependencias locales antes del gate de navegador.
- Restricción principal: el snapshot conserva precio mínimo y área mínima por proyecto, pero no demuestra que pertenezcan a la misma unidad/tipología. Los 371/69 cocientes solo pueden ser un índice orientativo no comparable; el benchmark elegible actual tiene `n = 0`. Tampoco sostiene precio de cierre, tasación, área techada/libre, stock, absorción ni atributos verificados.
- Reader-test P4-00B inicial: `FAIL` por compatibilidad runtime 2.3, pairing, denominadores/estados y `write_sets`; B1–B4 fueron remediados y el re-review independiente emitió `PASS WITH RISKS`.
- Estado: planificación lista para `HUMAN-GATE-A`; implementación P4-01 continúa bloqueada hasta aceptación A1–A12 y persistencia P4-00C.

## Próxima acción recomendada

1. Obtener aceptación explícita A1–A12 de `HUMAN-GATE-A-REQUEST.md`.
2. Persistir la aprobación mediante P4-00C.
3. Ejecutar P4-00D (lockfile y baseline browser) antes de iniciar P4-01.

## Regla para actualizar este archivo

Registrar solo estado vigente, decisiones, bloqueos y siguiente acción. El detalle histórico vive en el resumen, handoff e informe de verificación de cada fase.
