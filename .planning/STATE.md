# Estado del proyecto

**Actualizado:** 2026-07-29

**Milestone:** demo vNext orientada a venta

**Última fase completada:** Fase 2 — contexto, geografía y escenario

**Estado:** Fases 0, 1 y 2 completadas. Fase 2 está `deployed and verified`; el PR documental final #10 fue fusionado en `main` mediante `e2667240fc38f1fb764839f32937a5e47f6f714f`. La planificación de Fase 3 pasó revisión y HUMAN-GATE-A; P3-01 está autorizado.

**Rama funcional autorizada:** `feat/phase-3-evidence-inspector`.

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
- F3 necesita activos autorizados o neutrales: cinco tiers `deep` no equivalen a cinco dossiers visuales.
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

## Fase 3 — planificación vigente

- Contexto: [phases/03-evidence-inspector/CONTEXT.md](phases/03-evidence-inspector/CONTEXT.md).
- UX/UI: [phases/03-evidence-inspector/UI-SPEC.md](phases/03-evidence-inspector/UI-SPEC.md).
- Inventario de 10 expedientes: [phases/03-evidence-inspector/CASE-INVENTORY.md](phases/03-evidence-inspector/CASE-INVENTORY.md).
- Plan: [phases/03-evidence-inspector/PLAN.md](phases/03-evidence-inspector/PLAN.md).
- Solicitud de aprobación: [phases/03-evidence-inspector/HUMAN-GATE-A-REQUEST.md](phases/03-evidence-inspector/HUMAN-GATE-A-REQUEST.md).
- Revisión independiente: [phases/03-evidence-inspector/PLAN_REVIEW.md](phases/03-evidence-inspector/PLAN_REVIEW.md), `PASS`.
- Contrato propuesto: `2.2.0`, todavía no implementado.
- HUMAN-GATE-A: [phases/03-evidence-inspector/APPROVAL.md](phases/03-evidence-inspector/APPROVAL.md), aprobada el `2026-07-29T11:03:25.5945816-05:00`.
- Código, datos y activos F3: sin cambios.

## Próxima acción recomendada

1. Ejecutar P3-01 en `feat/phase-3-evidence-inspector`: schema y reader 2.2.
2. Verificar compatibilidad 2.0/2.1/2.2 antes de P3-02.
3. Realizar la comprobación humana breve de Chrome al 200% antes de una presentación.

## Regla para actualizar este archivo

Registrar solo estado vigente, decisiones, bloqueos y siguiente acción. El detalle histórico de Fase 2 vive en su resumen, handoff e informe de verificación.
