# Estado del proyecto

**Actualizado:** 2026-07-28

**Milestone:** demo vNext orientada a venta

**Última fase completada:** Fase 1 — datos, contratos y cobertura

**Estado:** Fase 0 y Fase 1 completadas; Fase 1 cerró con veredicto independiente `PASS WITH RISKS`; Fase 2 tiene plan `PASS WITH RISKS`, HUMAN-GATE-A aprobada y P2-00C registrada; P2-01 está habilitada.

**Rama activa de planificación:** `feat/phase-2-geography-scenario`, creada desde `main` en el merge `a8f0284`.

## Baseline confirmado

- Rama de Fase 1: `feat/phase-1-data-contracts`, creada desde `e7c9fb3`.
- P1-01 a P1-09 están representadas por commits atómicos entre `c03ef69` y `c33bda4`.
- Contrato de datos: `2.0.0`.
- Dataset: `dataset:viva-platform-demo-2026-07-28`.
- JSON público: 3,382,916 bytes.
- SHA-256 reproducible:

```text
a7f68af35d97c6fbc066b4213ebb12d525d630fa366a0e75826d2349087d8141
```

- Dos builds adicionales reprodujeron exactamente el JSON versionado.
- Universo legacy: 714 proyectos, 192 nombres de inmobiliaria y 45 distritos.
- Modelo autoritativo: 676 proyectos = 672 Nexo resolubles + 4 controlados.
- Cobertura canónica: 180 agencias de mercado y 184 agencias en el modelo.
- Piloto: 30 base, 22 enriched acumuladas y 5 deep.
- Exclusión prudente: 42 proyectos asociados a 11 aliases `manual_review`.
- Monedas legacy: 677 PEN, 0 USD y 37 `unknown`.
- Catálogos v2: 8 fuentes, 17 observaciones, 26 hechos, 4 documentos, 4 evidencias, 5 issues y 3 eventos.
- Graphify incremental `--code-only --no-cluster`: 56 archivos de código cambiados, 4 sin cambios, 1 eliminado, 1,373 nodos y 2,648 relaciones.
- Nuevo hub principal: `buildDemoPayload`, con 36 relaciones; Fase 1 no añadió un nuevo hub de UI.

## Verificación vigente

- Veredicto P1-09: `PASS WITH RISKS`.
- Todos los comandos de Fase 1 pasaron, incluido `npm.cmd run verify`.
- Smoke: 7 rutas × 3 viewports; 21 capturas; sin errores de consola.
- Accesibilidad automatizada: PASS en las siete rutas.
- Referencias, privacidad, permisos, determinismo y fixtures CT-A/B/D/E/G/H: PASS.
- Informe: [phases/01-data-contracts/VERIFICATION_REPORT.md](phases/01-data-contracts/VERIFICATION_REPORT.md).
- Resumen: [phases/01-data-contracts/SUMMARY.md](phases/01-data-contracts/SUMMARY.md).
- Handoff: [phases/01-data-contracts/HANDOFF.md](phases/01-data-contracts/HANDOFF.md).

## Decisiones vigentes de datos

- `$.model` es autoritativo; `$.projects` es una proyección legacy temporal.
- 90 es el conteo reproducible vigente de Miraflores; la referencia anterior a 88 en el contexto de Fase 1 era drift documental y ya fue corregida.
- Los tiers `deep` demuestran profundidad estructurada; no prometen dossiers visuales públicos.
- Los aliases ambiguos permanecen `manual_review`; no se resuelven por intuición.
- La moneda ambigua `$` permanece `unknown`; no se infiere USD.
- PII, contenido crudo, rutas locales y activos no autorizados quedan fuera del JSON público.
- El build usa metadata fija, fingerprints SHA-256 y serialización determinista.
- `buildDemoPayload` permanece como integrador serial de datos con propietario único; su impacto se reevalúa antes de paralelizar cambios en el generador.

## Riesgos y restricciones abiertas

- F2 no dispone aún de microzonas o cuadrantes; los 42 proyectos no resueltos deben mantenerse visibles como gap.
- F3 necesita activos autorizados o neutrales: cinco tiers `deep` no equivalen a cinco dossiers visuales.
- F4 no dispone de precio por m² de mercado elegible; los dos hechos actuales provienen de CT-A simulado.
- F5 solo dispone de tres eventos controlados y ninguno tiene causa observada.
- `coverage-report.json` está ligado al SHA actual y debe recomputarse cuando cambie el JSON público.
- El drift 88/90 quedó corregido documentalmente en el contexto de Fase 1; el snapshot reproducible permanece en 90.

## Planificación vigente de Fase 2

- Contexto: [phases/02-geography-scenario/CONTEXT.md](phases/02-geography-scenario/CONTEXT.md).
- Especificación UI: [phases/02-geography-scenario/UI-SPEC.md](phases/02-geography-scenario/UI-SPEC.md).
- Plan: [phases/02-geography-scenario/PLAN.md](phases/02-geography-scenario/PLAN.md).
- Evaluación de fuente: [phases/02-geography-scenario/SOURCE-ASSESSMENT.md](phases/02-geography-scenario/SOURCE-ASSESSMENT.md).
- Revisión del plan: [phases/02-geography-scenario/PLAN_REVIEW.md](phases/02-geography-scenario/PLAN_REVIEW.md).
- Fuente cartográfica aprobada: snapshot fijo de siete relaciones OpenStreetMap bajo ODbL 1.0; checker `PASS WITH RISKS`; HUMAN-GATE-A registrada en `APPROVAL.md`.
- RENLIM se usa como referencia jurídica; los cuadrantes se etiquetan como analíticos, nunca oficiales.
- Escenario propuesto: distrito, cuadrante o radio, serializado en URL y compartido por todos los consumidores.
- La revalidación independiente posterior emitió `PASS WITH RISKS`.
- P2-01 puede iniciar bajo la fuente, atribución, riesgos y stop rules de `APPROVAL.md`.

## Próxima acción recomendada

1. Commit y push de P2-00C.
2. Ejecutar P2-01 con una adquisición única y cacheada.
3. Detener si fuente, licencia, relaciones o atribución difieren de `APPROVAL.md`.

## Regla para actualizar este archivo

Registrar solo estado vigente, decisiones, bloqueos y siguiente acción. El detalle histórico de Fase 1 vive en su resumen, handoff e informe de verificación.
