# P3-04A — Revisión independiente del plan

## Veredicto

**PASS.**

P3-04A puede habilitar la implementación de sus cuatro archivos. P3-05 permanece bloqueado hasta que P3-04A termine, sus gates pasen y un checker independiente emita `PASS`.

Esta revisión fue solo lectura sobre código y datos. El único archivo creado es este informe; no se realizó commit.

## Alcance revisado

- `AGENTS.md`;
- `.planning/STATE.md`;
- `.planning/PROJECT.md`;
- `.planning/ROADMAP.md`;
- `.planning/VERIFICATION.md`;
- `CONTEXT.md`;
- `APPROVAL.md`;
- `PLAN.md`;
- `P3-04A-PLAN.md`;
- estado y diff vigentes;
- código y tests estrictamente necesarios para reproducir el trigger.

## Evidencia del trigger P0

- Rama: `feat/phase-3-evidence-inspector`.
- HEAD revisado: `3647f3061e0fd2c1888fbf64b12e308f5f3caabd`.
- El commit de aprobación `a5f3b31` es ancestro de HEAD.
- El JSON público declara `contract_version = 2.2.0`.
- El mismo JSON contiene `scenario_catalogs`, `scenario_defaults` y `geography`; además contiene 10 casos, 15 activos y 48 fingerprints.
- `npm.cmd run test:architecture` falla en `createScenarioEnvironment()` porque `scenario.js` exige literalmente `2.1.0`.
- `node tests/data-contract.mjs` falla porque espera literalmente `2.1.0` y recibe `2.2.0`.
- El fallo ocurre antes de evaluar las capacidades territoriales F2; no demuestra ausencia de dichas capacidades.

El trigger es real, reproducible y bloquea `npm.cmd run verify`. La severidad P0 y la pausa de P3-05 están justificadas.

## Evaluación del plan

| Aspecto | Resultado | Evidencia |
|---|---|---|
| Write set | PASS | Los cuatro archivos cubren runtime, prueba de dominio, contrato de integración y descriptor CT-C. Ningún quinto archivo es necesario según el fallo reproducido. |
| Baseline sucio | PASS | Los 12 cambios P3-04 están enumerados, protegidos y sujetos a hash antes/después; el diff actual de los cuatro paths P3-04A contra HEAD está vacío. |
| Bridge 2.1/2.2 | PASS | Allowlist exacta; valida capacidades F2 y prohíbe rango abierto, prefijo o aceptación automática de futuras versiones. |
| Rechazos | PASS | Exige pruebas negativas para 2.0.0, ausencia/malformación, 2.3.0, otra futura y versiones admitidas sin capacidades. |
| Reader vs runtime | PASS | No existe contradicción: el reader de esquema puede aceptar 2.0/2.1/2.2, mientras el consumidor territorial rechaza 2.0 por carecer del contrato de capacidades F2 requerido. |
| CT-C | PASS | Solo puede cambiar `contract_version`; se exige igualdad estructural y diff textual de una línea. |
| CT-I/F2 | PASS | Se conservan IDs, conteos, filtros, cuadrantes, resultados y pertenencia territorial. |
| Gates | PASS | Incluye checks dirigidos, arquitectura, dominio, E2E, smoke, a11y y `npm.cmd run verify`; un resultado parcial no habilita cierre. |
| Rollback | PASS | Revierte únicamente los cuatro archivos P3-04A, conserva P3-04 2.2 y mantiene P3-05 bloqueado. |
| A1–A8 | PASS | No cambia activos, permisos, procedencia, inventario, áreas, elegibilidad, tecnología ni publicación CT-G. |
| Alcance | PASS | No introduce funcionalidad comercial, legal, de UI, datos, red, OCR, scraping o backend. |

## Snapshot de protección P3-04

Hashes SHA-256 previos a cualquier implementación P3-04A:

| Path | SHA-256 |
|---|---|
| `prototipo_ejecutable/scripts/data/evidence.js` | `62cfaf2790426a8e4eeffab2a73b949a81a861dc263208b80428a0d61a25b846` |
| `prototipo_ejecutable/scripts/data/measures.js` | `9932efdaf71b1fb0734cad5db04fd1e0049e2b8106a3a391ca4a2441d50c0d90` |
| `prototipo_ejecutable/scripts/data/validate.js` | `45ca9b400c785eb7a2cc99338a6f108e5272282e9774d9fa8bf8169ef4c72852` |
| `prototipo_ejecutable/scripts/build-demo-data.js` | `5bba2d0dd80f30ff0664e220a1b55f9cee8a7e0d6c081f274c8d9d6313524495` |
| `datos_relevantes/demo-pilot/coverage-report.json` | `ff5e7cd93ec8410d562c36924b291c3b6c3db595f1071f9c8d58614eba5041ac` |
| `prototipo_ejecutable/public/demo-data/viva-platform-demo.json` | `9cf407c091fbb03b7d489e39079de57fd84af3fe16dc82b8ed559a7eda84646c` |
| `prototipo_ejecutable/tests/data-evidence.mjs` | `2aae956fda01e4799a34177910cecdfa2ae4255893348d2d9f8319d26cef048d` |
| `prototipo_ejecutable/tests/data-measures.mjs` | `f36f9d91f5dd81a36d5f52dad52f2d61f32d93c97fe9b578cbbfa1ef915aab0d` |
| `prototipo_ejecutable/tests/data-validator-unit.mjs` | `e58fa8ed82899f14c6e73980445996f3fa343c3b0df99254baaa0cc9d04bfdd9` |
| `prototipo_ejecutable/tests/data-determinism.mjs` | `9e241a3f8cf4aecf7b00bd497f4098fc4ba01d72a27a525287189fee4da94990` |
| `prototipo_ejecutable/tests/data-privacy.mjs` | `3e12e463d1db0afe4c9fefd06eefad72f1a0b92b140db609beb0acd49962d4ca` |
| `prototipo_ejecutable/tests/data-inspector.mjs` | `0f794ea1e236a2a831ed46e3ef2304f2e063e7843210745ae2e2e6436274dd83` |

El checker debe comparar estos valores con el snapshot posterior. Cualquier diferencia bloquea el cierre de P3-04A.

## Condiciones para conservar el PASS

1. El diff funcional queda limitado exactamente a los cuatro paths del plan.
2. CT-C cambia solo la versión 2.1.0 → 2.2.0.
3. Los 12 hashes P3-04 permanecen idénticos.
4. Las pruebas demuestran equivalencia F2 para 2.1/2.2 y rechazo de 2.0/futuras.
5. CT-C y CT-I conservan sus resultados.
6. Todos los comandos, incluido `npm.cmd run verify`, terminan con código 0.
7. No se crea commit y un checker distinto del maker revisa el resultado.

Si cualquiera de estas condiciones falla, este PASS deja de habilitar la implementación y debe aplicarse la condición de parada del plan.
