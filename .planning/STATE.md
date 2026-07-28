# Estado del proyecto

**Actualizado:** 2026-07-28

**Milestone:** demo vNext orientada a venta

**Última fase completada:** Fase 1 — datos, contratos y cobertura

**Estado:** Fase 0 y Fase 1 completadas; Fase 1 cerró con veredicto independiente `PASS WITH RISKS`; Fase 2 todavía no ha iniciado.

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
- 90 es el conteo reproducible vigente de Miraflores; 88 en el contexto de Fase 1 es drift documental.
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
- El drift 88/90 debe corregirse en un write set autorizado antes de usar CT-I.

## Próxima acción recomendada

1. Abrir la discusión y planificación de Fase 2; no iniciar implementación sin contrato de escenario y write sets revisados.
2. Leer el handoff y los riesgos de Fase 1.
3. Resolver explícitamente el drift documental de Miraflores.
4. Especificar límites distritales y asignación determinista de cuadrante o microzona.
5. Definir fixtures CT-C/CT-I, maker/checker y gate independiente para F2.

## Regla para actualizar este archivo

Registrar solo estado vigente, decisiones, bloqueos y siguiente acción. El detalle histórico de Fase 1 vive en su resumen, handoff e informe de verificación.
