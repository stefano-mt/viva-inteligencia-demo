# Fase 1 — Informe de verificación independiente

**Fecha:** 2026-07-28
**Checker:** agente independiente; no implementó P1-01 a P1-08
**Base:** `e7c9fb3` (`main` después del PR #5)
**HEAD verificado:** `4775228` (`feat/phase-1-data-contracts`)
**Veredicto:** `PASS WITH RISKS`

## Resumen ejecutivo

La Fase 1 cumple su objetivo verificable: entrega un contrato v2 ejecutable, fixtures trazables, un piloto canónico de 30 inmobiliarias, un modelo multifuente, reglas prudentes de áreas/precios/elegibilidad, un generador determinista, una proyección legacy compatible y un reporte de cobertura reproducible.

Todos los comandos del `PLAN.md` pasaron, incluido `npm.cmd run verify` con Playwright, smoke de siete rutas por tres viewports y accesibilidad. Dos ejecuciones adicionales de `data:build` produjeron exactamente el mismo SHA-256 que el artefacto versionado:

```text
a7f68af35d97c6fbc066b4213ebb12d525d630fa366a0e75826d2349087d8141
```

No se encontraron errores bloqueantes, PII pública, activos restringidos expuestos, referencias rotas, agregados incompatibles ni drift entre el generador y el JSON versionado.

El veredicto incluye riesgos porque todavía existe una contradicción documental sobre Miraflores (88 en `CONTEXT.md` frente a 90 en el snapshot y `REQUIREMENTS.md`) y porque los cinco tiers `deep` representan profundidad estructurada de fuente, no cinco dossiers visuales públicos. Ambos puntos deben mantenerse explícitos en el handoff y la narrativa posterior.

## Historias verificadas

| Historia | Resultado | Evidencia principal |
|---|---|---|
| HU-DEMO-001 — Dataset piloto controlado | PASS | Contrato `2.0.0`, dataset/cutoff fijos, 27 fingerprints, build offline, fallos estrictos y SHA estable. |
| HU-DEMO-002 — Modelo multifuente y trazabilidad | PASS | Root schema y referencias válidas entre 8 fuentes, 17 observaciones, 26 hechos, 4 documentos y 4 evidencias. |
| HU-DEMO-003 — Áreas prudentes | PASS | CT-A separa `built`, `total` y `free`; precios/m² declaran denominador y no mezclan tipos. |
| HU-DEMO-004 — Precio y moneda | PASS | CT-B conserva ambas fuentes; `$` queda `unknown`; agregados separan moneda, `price_type` y denominador. |
| HU-DEMO-005 — Atributos y documentos | PASS | CT-D distingue `unknown` de `false`; fragmento autorizado verificable y documento restringido no publicable. |
| HU-DEMO-006 — Histórico y eventos | PASS | CT-E conserva hechos, fechas, delta, base porcentual, causa nula y revisión de casos extremos/base cero. |
| HU-DEMO-902 — 30 inmobiliarias | PASS | 180 agencias de mercado, piloto 30/22/5, aliases conservados y T&C/TyC consolidados. |

## Commit y diff

Los commits funcionales son atómicos y respetan los `write_set` del plan:

| Commit | Tarea | Resultado de alcance |
|---|---|---|
| `c03ef69` | P1-01 contrato | Solo esquema y documentación del contrato. |
| `ac15c96` | P1-02 fixtures | Solo CT-A/B/D/E/G/H y README de fixtures. |
| `ab48706` | P1-04 evidencia | Solo catálogos, evidencia, módulo y test autorizados. |
| `83163dc` | P1-03 agencias | Solo registro/piloto, módulo y test autorizados. |
| `0d0d4b2` | P1-06 validador | Solo validador y test unitario. |
| `41012e3` | P1-05 medidas | Solo tipologías, hechos, issues, eventos, módulo y test. |
| `4c79e84` | P1-07 integración | Solo generador, JSON público, package y tests de integración. |
| `4775228` | P1-08 cobertura | Solo `coverage-report.json`. |

Comprobaciones:

- `git diff --check e7c9fb3..4775228`: PASS.
- No hay cambios de Fase 1 en `public/app.js`, `public/js/**`, `public/styles/**` o `.github/workflows/**`.
- El árbol estaba limpio antes de crear este informe.
- La única escritura de P1-09 es este archivo.

## Checks ejecutados

Todos los comandos se ejecutaron desde `prototipo_ejecutable/`. Para Playwright se configuró:

```powershell
$env:NODE_PATH='C:\Users\Stefano\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
```

| Comando | Resultado |
|---|---|
| `npm.cmd run check` | PASS |
| `npm.cmd run test:architecture` | PASS — 14 módulos alcanzables, sin ciclos hacia `app.js`. |
| `npm.cmd run test:data` | PASS — 714 legacy, 676 autoritativos, 7 rutas. |
| `npm.cmd run test:data:validator` | PASS — schema, referencias, tiers, elegibilidad, monedas, permisos, eventos y privacidad. |
| `npm.cmd run test:data:schema` | PASS — root v2 y CT-A/B/D/E/G/H. |
| `npm.cmd run test:data:references` | PASS — referencias integradas y 42 proyectos no resueltos excluidos prudentemente. |
| `npm.cmd run test:data:agencies` | PASS — 180 de mercado, piloto 30/22/5, procedencia byte a byte y mutaciones negativas. |
| `npm.cmd run test:data:evidence` | PASS — permisos, hashes, privacidad y orden determinista. |
| `npm.cmd run test:data:measures` | PASS — 5 tipologías, 26 hechos, 5 issues y 3 eventos. |
| `npm.cmd run test:data:determinism` | PASS — builds iguales y fallos estrictos ante input ausente/corrupto. |
| `npm.cmd run data:build` | PASS |
| `npm.cmd run verify` | PASS — incluye privacidad, smoke y accesibilidad. |

También se ejecutó `data:build` dos veces adicionales:

```text
SHA antes:   a7f68af35d97c6fbc066b4213ebb12d525d630fa366a0e75826d2349087d8141
SHA build 1: a7f68af35d97c6fbc066b4213ebb12d525d630fa366a0e75826d2349087d8141
SHA build 2: a7f68af35d97c6fbc066b4213ebb12d525d630fa366a0e75826d2349087d8141
```

El contenido generado coincide byte a byte con `public/demo-data/viva-platform-demo.json`. El archivo tiene 3,382,916 bytes y su hash coincide con `coverage-report.json`.

## Evidencia visual y regresión

- Smoke browser: PASS en 7 rutas × 3 viewports.
- Viewports: 1440×900, 1280×720 y 390×844.
- Capturas generadas: 21 PNG y un manifiesto SHA-256.
- Se inspeccionaron manualmente las capturas representativas de dashboard en escritorio y móvil: contenido visible, sin solapamientos ni truncamiento crítico.
- No se detectaron errores de consola ni recursos críticos faltantes.
- Las siete rutas preservadas son `dashboard`, `projects`, `market`, `compare`, `trust`, `assistant` y `activity`.
- La Fase 1 no modificó componentes o estilos de UI; las capturas prueban compatibilidad del nuevo JSON con la experiencia existente.

## Accesibilidad

`npm.cmd run test:a11y` pasó en las siete rutas:

- landmarks presentes;
- controles con nombre accesible;
- recorrido por teclado operativo;
- sin regresiones automatizadas de accesibilidad causadas por el dataset v2.

La Fase 1 no introduce controles o componentes visuales nuevos.

## Casos de datos

### CT-A — Áreas y precio/m²

- Área techada: 98 m².
- Área total: 206 m².
- Área libre derivada: 108 m².
- Precio/m² built: S/ 10,000.00.
- Precio/m² total: S/ 4,757.28.
- Denominadores: `built` y `total`, separados.
- Ambos precios/m² permanecen no elegibles porque usan precio de escenario `simulated`.

### CT-B — Precio discrepante

- Fuente A: PEN 600,000.
- Fuente B: PEN 625,000.
- Delta: PEN 25,000.
- Diferencia relativa: 4.17%, con base PEN 600,000.
- Issue: `PRICE_SOURCE_CONFLICT`.
- No existe selección automática de “verdad”.

### CT-D — Evidencia cualitativa

- `countertop_material = "cuarzo"` con fragmento autorizado y hash válido.
- `air_conditioning = "unknown"`, no `false`.
- Documento restringido: `public_asset_path = null`.
- Evidencia restringida/pending no expone fragmento.

### CT-E — Histórico

- Cambio normal: PEN 600,000 → 630,000; delta 30,000; 5%; causa `null`.
- Base cero: porcentaje `null` e issue `PERCENT_BASE_ZERO`.
- Cambio extremo: 60% e issue `EXTREME_CHANGE_REVIEW`.
- Eventos ordenados por fecha/ID y enlazados a observaciones válidas.

### CT-G — Tarjeta/plano incompatibles

- Tarjeta: 104.15 m² con `area_type = unknown`.
- Plano: “Área Total 53.37 m2” con `area_type = total`.
- Delta: 50.78 m².
- Diferencia relativa: 48.76%.
- Issues: `AREA_SOURCE_CONFLICT` y `FLOOR_RANGE_CONFLICT_REVIEW`.
- Calidad `inconsistent`; `benchmark_eligible = false`.
- El caso no contiene `project:nexo-3992`/Park 55.
- No se publica el plano ni la tarjeta completa sin autorización.

### CT-H — Cobertura

- Mercado bruto: 192 nombres fuente.
- Registro canónico de mercado: 180 agencias.
- Modelo integrado: 184 agencias, incluyendo 4 controladas.
- Piloto: 30 base, 22 enriched acumuladas y 5 deep.
- GRUPO T&C y GRUPO TyC resuelven a `agency:grupo-tyc`, conservando ambos aliases.
- 11 aliases quedan `manual_review`.

## Universo, referencias y exclusiones

- Proyección legacy: 714 proyectos.
- Modelo autoritativo: 676 proyectos.
- Reconciliación: 672 proyectos Nexo resolubles + 4 controlados.
- Exclusión prudente: 42 proyectos legacy ligados a 11 aliases `manual_review`.
- Referencias entre fuentes, agencias, proyectos, tipologías, observaciones, hechos, documentos, evidencia, issues y eventos: PASS.
- IDs únicos y orden determinista: PASS.

Monedas legacy:

| Moneda | Proyectos |
|---|---:|
| PEN | 677 |
| USD | 0 |
| unknown | 37 |

Los 37 valores originalmente ambiguos no se convierten a USD. Ningún agregado certificado usa moneda `unknown`.

Los dos hechos `price_per_m2` son de escenario, uno con denominador `built` y otro `total`; ambos son no elegibles. Los agregados certificados agrupan por tipo semántico, unidad, moneda, `price_type`, `area_type` y `denominator_area_type`.

## Privacidad y publicación

- `validatePrivacy()` sobre el root público: 0 errores.
- Campos legacy de contacto encontrados: 0.
- Emails, teléfonos, WhatsApp, raw payloads y rutas locales: 0.
- Documentos no autorizados con ruta pública: 0.
- Evidencias no autorizadas con fragmento público: 0.
- El generador no contiene reloj de ejecución (`new Date`/`Date.now`) ni llamadas de red.
- Los 27 inputs requeridos tienen fingerprint SHA-256.
- Mutaciones adversariales de PII, ruta local, raw payload, alias desordenado y documento restringido con activo público son rechazadas por el validador.
- Inputs faltantes, JSON corrupto, catálogos alterados y orden manipulado fallan explícitamente.

## Verificación de P1-08

El reporte de cobertura fue recomputado contra los bytes del JSON público:

- dataset, cutoff, SHA y longitud: coinciden;
- universo 714/676 y 42 no resueltos: coinciden;
- piloto 30/22/5: coincide;
- distribuciones de fuentes, observaciones, documentos y evidencias: coinciden;
- calidad/elegibilidad de hechos, monedas, tipos de precio, denominadores, issues y eventos: coinciden;
- fixtures CT-A/B/D/E/G/H: presentes;
- gaps para F2/F3/F4/F5: presentes y respaldados por el modelo;
- 25 comprobaciones independientes del reporte: 25 PASS.

## Definition of Done

| Criterio | Estado | Nota |
|---|---|---|
| Criterios de aceptación de historias | PASS | HU-DEMO-001–006 y 902 cubiertas. |
| Checks dirigidos y gate de fase | PASS | Todos los comandos del plan pasaron. |
| Navegación y filtros | PASS | Smoke en siete rutas y tres viewports. |
| Consola | PASS | Sin errores en smoke automatizado. |
| Viewports soportados | PASS | 1440×900, 1280×720 y 390×844. |
| Estados vacío/error/carga/insuficiencia | PASS para alcance de datos | Faltantes/corruptos fallan; `insufficient` y `unknown` se conservan. |
| Teclado | PASS | A11y smoke en siete rutas. |
| Estado no depende solo de color | SIN CAMBIO | Fase 1 no modificó UI; baseline preservado. |
| Cálculos con fixtures conocidos | PASS | CT-A/B/D/E/G y CT-H. |
| Fuente/fecha/confianza | PASS | Observaciones/hechos/evidencia trazables. |
| Evidencia de checker independiente | PASS | Este informe y ejecución completa. |
| Estado, decisiones y documentación | PENDIENTE P1-10 | Debe completarse después de este veredicto. |
| PR revisable por historia/tarea | PASS | Commits atómicos y write sets disjuntos. |

## Riesgos residuales

### R1 — Drift documental de Miraflores

**Severidad:** media; no bloquea Fase 1, sí debe resolverse antes de usar CT-I.

`CONTEXT.md` afirma que el snapshot contiene 88 proyectos en Miraflores, mientras que el CSV versionado, el JSON generado, `coverage-report.json`, la UI y `REQUIREMENTS.md` contienen 90. La recomputación directa del snapshot da 90.

**Acción:** registrar en P1-10 que 90 es el conteo reproducible vigente y abrir una corrección controlada de `CONTEXT.md` si su write set no está autorizado.

### R2 — Significado comercial de `deep`

**Severidad:** media; no bloquea el contrato de Fase 1.

Las cinco agencias `deep` tienen matching alto, tipología Nexo inspeccionable y al menos tres valores estructurados respaldados por snapshots versionados. Sin embargo, el modelo público contiene solo una tipología de mercado, un fragmento autorizado disponible y ningún activo visual público. No deben presentarse como cinco dossiers visuales completos.

**Acción:** mantener la advertencia de P1-08 y exigir activos autorizados/neutrales y navegación proyecto→tipología en Fase 3.

### R3 — Benchmark de mercado todavía no materializado

**Severidad:** alta para Fase 4; no bloquea Fase 1.

Existen seis hechos elegibles, pero ningún precio/m² de mercado elegible. Los dos precios/m² actuales provienen de CT-A simulado. También permanecen 37 proyectos con moneda `unknown`.

**Acción:** Fase 4 debe materializar precio y área compatibles del mercado seleccionado y agrupar por moneda, tipo de precio y denominador.

### R4 — Cobertura geográfica y temporal pendiente

**Severidad:** alta para Fases 2 y 5; no bloquea Fase 1.

No existen microzonas/cuadrantes; 42 proyectos siguen fuera del modelo canónico por alias ambiguo. Solo hay tres eventos controlados y ninguno posee causa observada.

**Acción:** conservar estos gaps sin inferir asignaciones o causas; resolverlos únicamente con fuentes/versiones autorizadas en sus fases.

### R5 — Reporte P1-08 ligado a un SHA

**Severidad:** baja.

`coverage-report.json` está correctamente fijado al SHA actual, pero no posee un generador dedicado dentro de P1-08.

**Acción:** cualquier cambio futuro del JSON público debe recomputar el reporte y actualizar su SHA; un mismatch debe bloquear el PR.

## Gaps y severidad

| Gap | Severidad actual | Bloquea Fase 1 | Fase objetivo |
|---|---|---:|---:|
| Contradicción 88/90 en documentación | Media | No | P1-10 / preparación F2 |
| Microzona y cuadrantes ausentes | Alta para la fase destino | No | F2 |
| Activos/dossiers visuales insuficientes | Alta para la fase destino | No | F3 |
| Precio/m² de mercado elegible ausente | Alta para la fase destino | No | F4 |
| Histórico amplio y causas evidenciadas ausentes | Alta para la fase destino | No | F5 |
| Handoff/memoria final | Procedimental | No para P1-09 | P1-10 |

## Conclusión

La implementación de Fase 1 está técnicamente aprobada. Puede avanzar a P1-10 y preparación del pull request, manteniendo los riesgos anteriores visibles y sin presentar los tiers `deep`, los datos ambiguos o los fixtures controlados como cobertura productiva más profunda de la que realmente existe.
