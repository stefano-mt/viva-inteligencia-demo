# Fase 5 — Baseline preimplementación P5-00D

## Resultado

**PASS** el 2026-08-04. La base heredada no presenta regresiones técnicas previas y P5-01 puede comenzar bajo `APPROVAL.md`.

Los defectos funcionales y visuales de `#activity`/`#assistant` descritos abajo son el trabajo aprobado de Fase 5; no se consideran fallos de este baseline.

## Baseline y paridad

- Commit de aprobación y ejecución: `8182509`.
- Base post-Fase-4: `47a794ca00b451355a181acf5c20feeee0fdccb4`.
- Paridad de `prototipo_ejecutable/` contra la base: **PASS**.
- Rama: `feat/phase-5-history-signals-assistant`.
- Node: `v24.14.0`.
- npm: `11.9.0`.
- Browser: Chromium headless mediante el helper local; solicitudes externas bloqueadas.
- Dataset público vigente: contrato `2.3.0`.
- SHA-256 del JSON vigente: `5d8a13b3e0af73d8dc8cee674f83cea541136b4c49bd444780bac3508f562041`.

## Verificación integral

`npm.cmd run verify`: **PASS**.

- Sintaxis y arquitectura: PASS; 22 módulos alcanzables y un contexto canónico.
- Escenario, comparabilidad y mapa: PASS; Miraflores 90 observados/85 comparables.
- Contrato, schema y compatibilidad 2.0–2.3: PASS.
- Geografía, referencias, agencias, evidencia y medidas: PASS.
- Determinismo: PASS; 50 fingerprints ordenados.
- Privacidad: PASS; dataset, benchmark, reporte, manifiesto y 15 activos autorizados.
- Inspector y CT-D/CT-G: PASS.
- Benchmark/comparador y CT-C/G/I/P: PASS.
- E2E: escenario, inspector, benchmark y comparación: PASS.
- Smoke: ocho rutas × tres viewports: PASS.
- Accesibilidad: landmarks, nombres y teclado en ocho rutas × tres viewports: PASS.
- Consola, errores de página, HTTP >= 400 y solicitudes externas: cero.

## Evidencia visual congelada

| Vista | Viewport | Bytes | SHA-256 |
|---|---:|---:|---|
| [Señales del mercado](evidence/baseline/activity-1440x900.png) | 1440×900 | 270,520 | `5ba0a10e8fd7b4adac2c12565d4c11a65c8ba88256b0353c517067e4b5948d03` |
| [Asistente de estrategia](evidence/baseline/assistant-1440x900.png) | 1440×900 | 186,850 | `63c6de992c1f2dbb63d9a44d3105428894e4965cfed2cc650595028db4f472bb` |
| [Señales móvil](evidence/baseline/activity-390x844.png) | 390×844 | 233,951 | `812f618fd20b9fde146fd0ab2da7db6ec7e19f7213ddbf70fceca9ca40444f5b` |
| [Asistente móvil](evidence/baseline/assistant-390x844.png) | 390×844 | 140,300 | `3a7985fc0b9f7aac1d60fa044d78331eb1ee3dac9f6600dbf5143cbba58d8950` |

Las cuatro capturas fueron inspeccionadas visualmente.

## Gaps congelados para Fase 5

### Señales

1. Con Miraflores activo, el timeline muestra proyectos de Jesús María, Surco, La Molina y San Isidro; viola el escenario único.
2. Variaciones legacy de 841.4%, 359.5%, 202.5%, 116.8% y 106.5% dominan la lectura sin estado de calidad ni razón de revisión.
3. Las filas no muestran par anterior/nuevo, ambas fechas, vigencia o evidencia reproducible.
4. Los eventos distritales y de proyecto se mezclan en una misma jerarquía.
5. “Para gerencia” usa cuatro cards genéricas sin origen trazable.
6. En móvil, el contexto territorial consume varios bloques antes de la tarea y la página se convierte en una secuencia extensa de tarjetas.

### Asistente

1. Las sugerencias mencionan Surco y Jesús María mientras Miraflores está activo; pueden crear una expectativa de cambio territorial implícito.
2. La respuesta usa nombres de proyectos como referencias, pero no identifica hechos, observaciones o evidencias.
3. El modo determinista y la no persistencia de la consulta no son suficientemente visibles.
4. La entrada y la respuesta repiten información territorial extensa y conservan densidad de cards.
5. El guardrail de precio real de cierre ya existe y pasa pruebas, pero debe incorporarse al contrato semántico 2.4 y a la experiencia CT-F.

## Gate

P5-00D: **PASS**. P5-01 puede iniciar desde el commit que incluya este informe y las cuatro capturas. Cualquier cambio funcional anterior a ese commit invalida el baseline.
