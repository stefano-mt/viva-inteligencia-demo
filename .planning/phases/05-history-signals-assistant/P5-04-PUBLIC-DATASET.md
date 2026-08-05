# P5-04 — Dataset público 2.4, referencias, cobertura y fingerprints

**Estado:** completado.

**Rama:** `feat/phase-5-history-signals-assistant`.

## Objetivo

Integrar la policy histórica, el materializador de P5-03 y el catálogo semántico del asistente al writer determinista; materializar referencias reales en `model`; publicar `history` y `assistant` bajo contrato `2.4.0`; y cerrar determinismo, cobertura y privacidad sin alterar la semántica de Fases 2–4.

## Ciclo rojo → verde

1. Se creó `tests/data-history-public.mjs` antes de modificar el writer.
2. El primer resultado falló porque el build todavía publicaba `2.3.0`.
3. Se integraron policy, catálogo, materializador, referencias, índices y fingerprints.
4. Se regeneró el JSON únicamente mediante `npm.cmd run data:build`.
5. Dos builds en memoria resultaron byte-idénticos y el artefacto versionado quedó igual a la salida del writer.

## Contrato público resultante

- Contrato: `2.4.0`.
- Dataset: `dataset:viva-platform-demo-2026-07-28`.
- Cutoff fijo: `2026-07-28T01:24:28Z`.
- Fingerprints de entrada: 52, únicos y ordenados.
- Fingerprints específicos de histórico: 3.
- Catálogo de asistente: 7 familias y 5 limitaciones, idéntico al artefacto aprobado.
- SHA-256 del JSON: `20d44245c956a198c8621b3f544115387037b73cc462e50f63a5ce6d61fb4a37`.
- SHA-256 del reporte de cobertura: `639b613aff89f9605c3dcc74a7914700dfa89fb84ababe70910fc25c3ba81864`.
- GeoJSON sin cambios: `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0`.

## Histórico materializado

| Métrica | Resultado |
|---|---:|
| Candidatos con cambio | 42 |
| Eventos materializados | 36 |
| Certificados | 31 |
| Revisables | 5 |
| Excluidos | 6 |
| Índices por proyecto | 36 |
| Índices distritales | 15 |
| Causas atribuidas | 0 |

Las exclusiones permanecen explicadas: 5 por `entity_mismatch` y 1 por `unknown_currency`. Los 36 eventos conservan vigencia `aging` contra el cutoff fijo y no contra el reloj del dispositivo.

## Referencias autoritativas creadas

Cada evento enlaza dos puntos temporales completos:

- 72 observaciones `observation:history-*`;
- 72 hechos `fact:history-*`;
- 72 evidencias estructuradas `evidence:history-*`;
- 1 documento de snapshot `document:history-nexo-snapshot`.

Las evidencias apuntan al snapshot Nexo versionado mediante SHA-256. Los hechos históricos son observados, pero siempre `benchmark_eligible=false`: no duplican ni contaminan el benchmark vigente. Los cinco outliers reciben calidad `reviewable`; los demás, `certified`.

## Cobertura

El reporte derivado incorpora `history_coverage` con conteos por evento, proyecto, distrito, estado y razón; referencias por colección; fingerprints específicos; y rutas autoritativas de `history` y `model`.

El gap restante de Fase 5 ya no pide crear histórico. Ahora registra que faltan los motores puros, la integración de escenario y las interfaces de P5-05–P5-10.

## Privacidad y publicación

- `validatePrivacy(payload)`: cero hallazgos.
- Cero rutas locales o perfiles de usuario.
- Cero payloads crudos nuevos.
- Cero campos de contacto incorporados desde el CSV.
- Cero activos binarios nuevos o evidencia restringida publicada.
- El documento histórico no expone el CSV como asset público; solo materializa valores estructurados aprobados para la demo y su fingerprint.

## Regresiones adaptadas

Las pruebas legacy continúan verificando sus registros originales sin exigir que los catálogos públicos permanezcan cerrados a nuevas familias:

- P1-04 conserva 30 observaciones, 19 documentos y 19 evidencias originales;
- F4 conserva 397 observaciones de benchmark;
- P1-05 conserva 40 hechos originales;
- F4 conserva 3,981 hechos de benchmark;
- F5 agrega únicamente namespaces `history-*`.

Los payloads sintéticos 2.1–2.3 de compatibilidad eliminan explícitamente `history`, porque esa capacidad está prohibida antes de 2.4. No se relajó el schema ni el validator.

## Verificación

PASS:

```text
npm.cmd run check
npm.cmd run test:phase5:data
npm.cmd run test:data
npm.cmd run test:data:compatibility
npm.cmd run test:data:validator
npm.cmd run test:data:schema
npm.cmd run test:data:geography
npm.cmd run test:data:references
npm.cmd run test:data:agencies
npm.cmd run test:data:evidence
npm.cmd run test:data:measures
npm.cmd run test:data:determinism
npm.cmd run test:data:privacy
npm.cmd run test:inspector:data
npm.cmd run test:benchmark:data
```

P5-04 no modifica `public/js/**`, vistas ni estilos. La adopción del contrato 2.4 por motores de runtime y la nueva experiencia están asignadas a P5-05–P5-10; el gate integral de navegador corresponde a esas tareas y al checker P5-13.

`npm.cmd run test:architecture` queda temporalmente rojo en `createScenarioEnvironment`: el runtime territorial aún acepta hasta 2.3 y recibe el nuevo artefacto 2.4. Es una frontera explícita, no un error oculto del writer; P5-06 es el propietario aprobado de esa adopción. No se amplió P5-04 sobre `public/js/scenario.js`, `state.js` ni `controller.js`.

## Archivos protegidos

Sin cambios en:

- `scripts/data/history.js`, policy y catálogo aprobados;
- `scripts/data/validate.js` y schema 2.4;
- `public/js/**`, vistas y estilos;
- fuentes, geografía, Inspector, Benchmark y activos de evidencia;
- semántica de precio publicado, comparabilidad o elegibilidad.

## Handoff a P5-05

P5-05 debe consumir exclusivamente `payload.history`, sus índices y las referencias de `model`. No debe reconstruir eventos desde `projects[].price_delta_pct`, alterar el cutoff, atribuir causas o convertir hechos históricos en insumos elegibles del benchmark.
