# P5-01 — Contrato público 2.4 y compatibilidad

## Resultado

**COMPLETADO** el 2026-08-04. El schema conoce la revisión `2.4.0`, define índices cerrados `history` y `assistant`, y conserva la lectura estructural de 2.0–2.3. Writer, dataset público, runtime, vistas y estilos permanecen sin cambios.

## Matriz de revisiones

| Contrato | Escenario | Inspector | Benchmark | History | Assistant |
|---|---|---|---|---|---|
| 2.0 | no exigido | no exigido | no exigido | prohibido | legacy |
| 2.1 | exigido | no exigido | no exigido | prohibido | legacy |
| 2.2 | exigido | exigido | no exigido | prohibido | legacy |
| 2.3 | exigido | exigido | exigido | prohibido | legacy |
| 2.4 | exigido | exigido | exigido | exigido/cerrado | exigido/cerrado |

El reader de datos admite 2.0–2.4. `scenario.js` conserva deliberadamente su allowlist 2.1–2.3 hasta P5-06; P5-01 no altera runtime.

## Contrato `history`

- `version = 1`.
- Política fija: precio publicado desde/mínimo a nivel proyecto, PEN, cutoff explícito, vigencia 30/90, máximo certificado absoluto 30%, orden reproducible y causalidad solo observada.
- Evento cerrado con dos observaciones, dos hechos, valores, delta, porcentaje nullable, fechas, estado, vigencia, reason codes, evidencia y causa.
- Una causa no nula exige evidencia causal; causa nula exige lista vacía.
- Índices por proyecto y distrito contienen únicamente IDs de eventos.
- Cobertura separa candidatos, materializados, certificados, revisables, excluidos y razones.
- Fingerprints reutilizan el contrato cerrado de inputs.

P5-01 valida forma y gates de revisión. Identidad, matemáticas, fechas, particiones, referencias y política profunda corresponden a P5-02/P5-03.

## Contrato `assistant`

- `version = 1`.
- Modo `deterministic_catalog`, locale `es-PE`, consulta no persistida, sin solicitudes externas, máximo 500 caracteres y fallback cerrado.
- Familias de intención cerradas para escenario, cambios, prioridad, calidad, evidencia cualitativa, comparación y límites.
- Las intenciones declaran capacidades, tipo de respuesta y política de referencias; no contienen cifras precalculadas.
- El contrato de respuesta exige referencia de escenario, hechos para números y evidencia para cualitativos.
- Limitaciones cerradas para precio de cierre, causalidad, predicción, datos personales y fuentes externas.
- En 2.0–2.3 la capacidad F5 se degrada a `contract_unavailable`.

## Pruebas

### PASS

- `npm.cmd run check`.
- `npm.cmd run test:data` — dataset público 2.3 vigente continúa válido.
- `npm.cmd run test:data:compatibility` — reader 2.0–2.4 y gates por revisión.
- `npm.cmd run test:data:validator` — regresiones de schema/semántica previas.
- `npm.cmd run test:data:schema` — formas F1–F4 conservadas.
- Test nuevo `data-history-assistant-contract.mjs`: forma cerrada, propiedad adicional, causa/evidencia, assistant legacy rechazado en 2.4 y history prohibido antes de 2.4.

### Drift esperado y acotado

`npm.cmd run test:data:determinism` falla únicamente porque el schema versionado cambió y el JSON público 2.3 conserva el fingerprint anterior. El build lógico calcula para el schema nuevo `89c2f400c2a67d71c0335ef6b1a73813f4d0ca1e33486a486a464f8b261ebad6`; el artefacto público conserva `e68fac27bc16aa8af1492d8358a7e11944fcedc1226f7f258f48fe2da09be39a`.

No se corrige en P5-01 porque regenerar el dataset o actualizar fingerprints pertenece exclusivamente a P5-04. El resto del documento generado es idéntico; la aserción muestra solo esa entrada de fingerprint.

## Archivos modificados

- `prototipo_ejecutable/contracts/demo-v2.schema.json`.
- `prototipo_ejecutable/contracts/README.md`.
- `prototipo_ejecutable/tests/data-history-assistant-contract.mjs`.
- `prototipo_ejecutable/package.json` para integrar sintaxis y prueba de compatibilidad.
- Memoria documental de Fase 5.

## Archivos protegidos comprobados

- Sin cambios en `scripts/build-demo-data.js`.
- Sin cambios en `scripts/data/validate.js`.
- Sin cambios en `public/demo-data/viva-platform-demo.json`.
- Sin cambios en `public/js/scenario.js` ni otras rutas runtime.
- Sin cambios en datos fuente, activos o estilos.

## Handoff

P5-02 puede codificar policy, catálogo y fixtures CT-C/D/E/F/G/I/P contra estos `$defs`. No debe materializar `history` en el payload público ni actualizar fingerprints; esas responsabilidades siguen en P5-03/P5-04.
