# Fase 1 — Resumen de datos, contratos y cobertura

**Fecha de cierre:** 2026-07-28

**Estado:** completada

**Veredicto independiente:** `PASS WITH RISKS`

## Resultado

La Fase 1 entrega un contrato v2 ejecutable, fixtures trazables, un piloto canónico de 30 inmobiliarias, un modelo multifuente, reglas conservadoras para áreas, precios y elegibilidad, un generador determinista, una proyección legacy compatible y un reporte de cobertura reproducible.

El checker confirmó que todos los comandos del plan pasan, incluida la verificación de navegador y accesibilidad. No encontró errores bloqueantes, PII pública, activos restringidos expuestos, referencias rotas, agregados incompatibles ni diferencias entre el generador y el JSON versionado.

Fuente del veredicto: [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md).

## Commits de la fase

| Tarea | Commit | Entrega confirmada |
|---|---|---|
| P1-01 | `c03ef69` | Contrato v2 y documentación del contrato. |
| P1-02 | `ac15c96` | Fixtures CT-A/B/D/E/G/H y su README. |
| P1-03 | `83163dc` | Registro canónico y selección del piloto. |
| P1-04 | `ab48706` | Catálogos de fuentes, observaciones, documentos y evidencia. |
| P1-05 | `41012e3` | Tipologías, hechos, issues, eventos y cálculos prudentes. |
| P1-06 | `0d0d4b2` | Validador semántico y pruebas unitarias. |
| P1-07 | `4c79e84` | Generador v2, proyección legacy y suite de integración. |
| P1-08 | `4775228` | Reporte de cobertura y exclusiones. |
| P1-09 | `c33bda4` | Informe y veredicto de verificación independiente. |

Base de la fase: `e7c9fb3`, `main` después del PR #5.

## Dataset confirmado

| Dimensión | Resultado |
|---|---:|
| Proyectos en proyección legacy | 714 |
| Proyectos en modelo autoritativo | 676 |
| Proyectos Nexo resolubles | 672 |
| Proyectos controlados | 4 |
| Proyectos legacy excluidos por alias ambiguo | 42 |
| Aliases en `manual_review` | 11 |
| Agencias canónicas de mercado | 180 |
| Agencias en modelo, incluidos controles | 184 |
| Piloto base acumulado | 30 |
| Piloto enriched acumulado | 22 |
| Piloto deep | 5 |

La reconciliación confirmada es:

```text
714 legacy - 42 no resueltos + 4 controlados = 676 autoritativos
```

El JSON público tiene 3,382,916 bytes y SHA-256:

```text
a7f68af35d97c6fbc066b4213ebb12d525d630fa366a0e75826d2349087d8141
```

Dos builds adicionales reprodujeron exactamente ese hash y coincidieron byte a byte con [viva-platform-demo.json](../../../prototipo_ejecutable/public/demo-data/viva-platform-demo.json). El detalle auditable está en [coverage-report.json](../../../datos_relevantes/demo-pilot/coverage-report.json).

## Arquitectura de datos entregada

- `$.model` es el modelo autoritativo.
- `$.projects` es una proyección legacy temporal para conservar compatibilidad con la UI.
- El contrato usa versión `2.0.0` y 27 fingerprints de input.
- El modelo enlaza 8 fuentes, 17 observaciones, 26 hechos, 4 documentos, 4 evidencias, 5 issues y 3 eventos.
- El piloto conserva IDs canónicos y aliases originales; GRUPO T&C y GRUPO TyC resuelven a `agency:grupo-tyc`.
- Calidad, `value_kind`, moneda, `price_type`, tipo de área y denominador condicionan la elegibilidad.
- Datos inconsistentes, insuficientes, simulados o incompatibles quedan fuera del benchmark certificado.
- El artefacto público no contiene contactos personales, emails, teléfonos, WhatsApp, contenido crudo, rutas locales ni activos restringidos.

## Cierre Graphify

El extract incremental `--code-only --no-cluster` registró 56 archivos de código cambiados, 4 sin cambios y 1 eliminado, con 1,373 nodos y 2,648 relaciones. El nuevo hub principal es `buildDemoPayload`, con 36 relaciones; Fase 1 no creó un nuevo hub de UI.

`buildDemoPayload` se acepta como integrador serial de datos con propietario único. Su impacto debe reevaluarse antes de paralelizar cambios futuros en el generador.

## Casos verificados

### CT-A — Áreas y precio por m²

Se distinguen área `built` de 98 m², área `total` de 206 m² y área `free` derivada de 108 m². Los precios por m² usan denominadores separados. Ambos permanecen no elegibles porque parten de un precio de escenario `simulated`.

### CT-B — Precio discrepante

Se conservan PEN 600,000 y PEN 625,000 sin elegir una verdad automática. El delta es PEN 25,000 y 4.17% sobre la base anterior. El issue `PRICE_SOURCE_CONFLICT` bloquea el benchmark.

### CT-D — Evidencia cualitativa

`countertop_material = "cuarzo"` dispone de fragmento autorizado y hash válido. `air_conditioning = "unknown"` no se convierte en `false`. El documento restringido no publica activo ni fragmento.

### CT-E — Histórico

El cambio normal PEN 600,000 → 630,000 conserva delta, porcentaje y causa `null`. Base cero produce porcentaje `null` e issue `PERCENT_BASE_ZERO`; el cambio de 60% produce `EXTREME_CHANGE_REVIEW`.

### CT-G — Tarjeta y plano

La tarjeta conserva 104.15 m² con tipo de área `unknown`; el plano conserva “Área Total 53.37 m2” como `total`. El delta es 50.78 m² y 48.76%. Los issues `AREA_SOURCE_CONFLICT` y `FLOOR_RANGE_CONFLICT_REVIEW` dejan el caso `inconsistent` y no elegible. La tarjeta y el plano completos no se publican sin autorización.

### CT-H — Cobertura canónica

El mercado conserva 192 nombres fuente, 180 agencias canónicas de mercado y 184 agencias en el modelo integrado. El piloto alcanza 30/22/5 y deja 11 aliases ambiguos en `manual_review`.

## Gates ejecutados

Todos los comandos siguientes pasaron desde `prototipo_ejecutable/`:

- `npm.cmd run check`
- `npm.cmd run test:architecture`
- `npm.cmd run test:data`
- `npm.cmd run test:data:validator`
- `npm.cmd run test:data:schema`
- `npm.cmd run test:data:references`
- `npm.cmd run test:data:agencies`
- `npm.cmd run test:data:evidence`
- `npm.cmd run test:data:measures`
- `npm.cmd run test:data:determinism`
- `npm.cmd run data:build`
- `npm.cmd run verify`

El smoke cubrió siete rutas en 1440×900, 1280×720 y 390×844, produjo 21 capturas y no detectó errores de consola. Accesibilidad automatizada pasó en las siete rutas.

## Riesgos residuales

1. **Miraflores:** el conteo reproducible vigente es 90. `CONTEXT.md` conserva 88 y presenta drift documental que debe corregirse con un write set autorizado antes de CT-I.
2. **Tier `deep`:** cinco agencias tienen profundidad estructurada respaldada por snapshots, pero no equivalen a cinco dossiers visuales públicos. El modelo solo tiene una tipología de mercado, un fragmento autorizado disponible y ningún activo visual público.
3. **Benchmark:** existen seis hechos elegibles, pero ningún precio por m² de mercado elegible. Los dos actuales provienen de CT-A simulado; además, 37 proyectos legacy conservan moneda `unknown`.
4. **Geografía e histórico:** faltan microzonas/cuadrantes, 42 proyectos permanecen fuera del modelo canónico y solo existen tres eventos controlados sin causa observada.
5. **Reporte de cobertura:** está ligado al SHA actual y no tiene generador dedicado; cualquier cambio del JSON debe recomputarlo y bloquear el PR si el hash no coincide.

## Gaps transferidos

| Fase | Gap confirmado |
|---|---|
| F2 | Definir microzonas/cuadrantes y mantener visibles los 42 proyectos no resueltos. |
| F3 | Incorporar activos autorizados o neutrales y navegación proyecto → tipología → evidencia. |
| F4 | Materializar precio y área de mercado compatibles y agregar por moneda, `price_type` y denominador. |
| F5 | Ampliar observaciones históricas y hacer que el asistente use el mismo escenario, hechos y evidencia. |

La Fase 1 no autoriza presentar fixtures controlados como observaciones de mercado ni ampliar comercialmente la cobertura más allá de lo demostrado.
