# Estado del proyecto

**Actualizado:** 2026-07-29

**Milestone:** demo vNext orientada a venta

**Última fase completada:** Fase 1 — datos, contratos y cobertura

**Estado:** Fase 0 y Fase 1 completadas. El cierre técnico de Fase 2 está implementado y verificado con `PASS WITH RISKS`; HUMAN-GATE-B está aprobada. Los documentos P2-17 están preparados en el worktree, pero todavía deben versionarse; el PR, el merge humano, P2-18 y el merge del PR P2-19 siguen pendientes. El cierre de ship no está completo y el despliegue no está demostrado ni verificado.

**Rama activa de planificación:** `feat/phase-2-geography-scenario`, creada desde `main` en el merge `a8f0284`.

## Baseline vigente

- Base de Fase 2: `a8f0284`, merge de Fase 1 en `main`.
- HEAD funcional verificado por P2-16: `606452569040d0489685a3c26b16e15da0c476ac`.
- Informe P2-16 versionado en `49bf8de`.
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
- Visual: 42 capturas finales P2-15 verificadas por SHA-256; su persistencia durable en el PR sigue pendiente.
- HUMAN-GATE-B: Stefano declaró “Acepto R1–R5 y autorizo HUMAN-GATE-B.” en `2026-07-29T08:01:09.8984344-05:00`.
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
- R2: la evidencia visual final se verificó en `%TEMP%`; debe adjuntarse o enlazarse de forma durable durante la preparación/revisión del PR y antes de solicitar merge.
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
- Memoria P2-17: preparada en el worktree; su commit/versionado queda pendiente porque esta ejecución no crea commit, push, PR o merge.
- PR funcional: pendiente.
- Cierre de ship: pendiente del merge humano, P2-18 y el merge humano del PR documental P2-19.
- Despliegue y Pages: no demostrados ni verificados.

## Próxima acción recomendada

1. Versionar los cinco documentos P2-17 en la rama antes de crear el PR.
2. Abrir el PR contra `main` y adjuntar o enlazar la evidencia durable antes de solicitar merge, manteniendo `PASS WITH RISKS`.
3. Realizar la comprobación humana breve de Chrome al 200% antes de la demo.
4. Fusionar el PR funcional solo por decisión humana.
5. Tras el merge, ejecutar P2-18 read-only sobre GitHub Pages con el workflow `Deploy demo to GitHub Pages`, la URL esperada `https://stefano-mt.github.io/viva-inteligencia-demo/` —a confirmar por P2-18— y el workflow run/SHA reales del merge.
6. Persistir el resultado mediante P2-19 en una rama y PR documental separados; el merge de ese PR también es humano.

## Regla para actualizar este archivo

Registrar solo estado vigente, decisiones, bloqueos y siguiente acción. El detalle histórico de Fase 2 vive en su resumen, handoff e informe de verificación.
