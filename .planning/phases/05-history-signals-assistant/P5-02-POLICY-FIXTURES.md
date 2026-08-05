# P5-02 — Policy, catálogo y fixtures CT-C/D/E/F/G/I/P

**Estado:** completado.

**Rama:** `feat/phase-5-history-signals-assistant`.

## Objetivo

Convertir A1–A12 y el contrato público 2.4 de P5-01 en artefactos ejecutables antes de materializar datos: política histórica congelada, catálogo semántico cerrado, evaluadores puros y fixtures con mutaciones que fallen por la razón esperada.

P5-02 no modifica writer, runtime, vistas ni JSON público.

## Artefactos

- `datos_relevantes/demo-pilot/history-policy.json`: cutoff fijo, semántica `published_price_from_project`, PEN, vigencia 30/90, umbral absoluto 30%, causalidad solo observada y orden calidad-primero.
- `datos_relevantes/demo-pilot/assistant-intent-catalog.json`: siete familias aprobadas, preguntas sugeridas, capacidades, políticas de referencia, guardrails locales y cinco límites explícitos.
- `datos_relevantes/demo-pilot/fixtures/phase5-policy-cases.json`: 8 casos históricos y 7 casos del asistente para CT-C/D/E/F/G/I/P.
- `scripts/data/history.js`: validación cerrada de policy y evaluación determinista de candidato.
- `scripts/data/assistant.js`: validación del catálogo y evaluación prudente de solicitudes declarativas.
- `tests/phase5-fixtures.mjs`: schema, semántica, mutaciones y privacidad.

## Decisiones semánticas aplicadas

1. **CT-C no es un reason code de calidad.** Un evento de otro distrito puede ser válido y materializable globalmente; `visible_in_scenario=false` impide que aparezca en la selección activa.
2. **Base cero:** conserva delta absoluto, usa `delta_pct=null` y estado `reviewable`.
3. **Cambio extremo:** conserva el evento como `reviewable`; no lidera ni se certifica solo por magnitud.
4. **Bloqueos:** moneda distinta de PEN, cronología invertida, semántica/entidad incompatibles, evidencia ausente/restringida, cutoff inválido o duplicado producen `insufficient`.
5. **Vigencia:** deriva exclusivamente del cutoff versionado; nunca del reloj del dispositivo.
6. **Causalidad:** una causa sin evidencia causal se descarta y permanece `null`.
7. **Asistente:** el distrito mencionado en texto no cambia el escenario; un intent desconocido devuelve las familias soportadas.
8. **Trazabilidad cualitativa:** solo `authorized` con fact IDs y evidence IDs permite respuesta afirmativa. Estados `restricted`, `unknown`, `conflicting` o `incompatible` cierran por insuficiencia.
9. **CT-F/CT-P:** cierre real, causalidad y datos personales usan limitaciones explícitas y no ejecutan red ni persistencia.

No se añadieron reason codes, topics ni propiedades al schema 2.4 aprobado; no fue necesaria una enmienda humana.

## Ciclo rojo → verde

1. Se creó primero `tests/phase5-fixtures.mjs`.
2. La ejecución inicial falló con `ERR_MODULE_NOT_FOUND` para `scripts/data/assistant.js`, confirmando que la suite precedía a la implementación.
3. Se implementaron policy, catálogo, módulos y fixtures.
4. La suite pasó y se incorporó a `check` y `verify` mediante `test:phase5:fixtures`.

## Cobertura de casos

| Caso | Evidencia ejecutable |
|---|---|
| CT-C | evento certificado fuera de la selección: materializable, no visible; texto territorial no muta escenario |
| CT-D | cualitativo autorizado exige un fact ID y un evidence ID |
| CT-E | +30,000/+5%, base cero, +60%, PEN desconocido, fecha invertida y causa nula |
| CT-F | cierre real y causalidad no observada: `refuse_and_explain` |
| CT-G | evidencia restringida/conflictiva: `insufficient` o `state_insufficient_evidence` |
| CT-I | evidencia desconocida e intent desconocido: fail-closed y catálogo soportado |
| CT-P | datos personales rechazados; scanner de privacidad sin hallazgos |

Mutaciones adicionales prueban umbrales de policy, intent ID duplicado, moneda USD, fechas iguales, evidencia autorizada→restringida y vigencias `current`/`aging`/`historical`.

## Verificación

PASS:

```text
npm.cmd run check
npm.cmd run test:phase5:fixtures
npm.cmd run test:data
npm.cmd run test:data:compatibility
npm.cmd run test:data:validator
npm.cmd run test:data:schema
npm.cmd run test:inspector:data
npm.cmd run test:benchmark:data
npm.cmd run test:architecture
npm.cmd run test:data:privacy
```

Resultados relevantes:

- contrato: 714 legacy, 676 autoritativos, 8 rutas;
- F3: 10 expedientes, 15 activos, 48 fingerprints;
- F4: 397 proyectos Top-7, 3,981 hechos, 370 ratios no comparables;
- arquitectura: 22 módulos alcanzables y contexto único 90/85;
- privacidad: cero hallazgos en payload, fixtures, reportes y activos autorizados.

`npm.cmd run test:data:determinism` conserva el único rojo ya registrado en P5-01: el JSON público 2.3 contiene el fingerprint anterior del schema (`e68fac…`) y el build lógico ve `89c2f4…`. P5-04 mantiene propiedad exclusiva de regenerar el payload 2.4. No se editó el fingerprint manualmente.

## Archivos protegidos comprobados

- `scripts/build-demo-data.js`: sin cambios.
- `scripts/data/validate.js`: sin cambios.
- `public/demo-data/viva-platform-demo.json`: sin cambios.
- `public/js/**`, vistas y estilos: sin cambios.
- datos y contratos F2–F4: sin cambio semántico.

## Handoff a P5-03

P5-03 debe leer `history-policy.json`, reutilizar `evaluateHistoryCandidate`, auditar los 34 candidatos preliminares y explicar la cifra final. Debe producir eventos normalizados con orden estable, causas nulas e idempotencia, pero aún no regenerar el JSON público: esa responsabilidad permanece en P5-04.
