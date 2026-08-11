# P6-15A — Paridad visible entre Journey y estado autoritativo

**Estado:** completado; implementación `8740182` + cierre G4/G5 `a94f251`; P6-15 final `PASS WITH RISKS`.

**Origen:** P6-15 `FAIL`, commit `0003ddb`.

**Hallazgos tratados:** G1–G5 cerrados; sin gap técnico residual.

## Objetivo

Conectar la etapa activa de `state.journeyContext` con `renderJourney` y demostrar en navegador que estado, cifras, decisión, límite y acción correctiva visibles coinciden con el modelo autoritativo. La vista no recalcula datos, no consulta motores y no reintroduce sobrecarga horizontal.

G3 no requiere cambios de runtime, pero se remedia antes de repetir P6-15: este documento registra las tres desviaciones históricas, el commit P6-15A debe respetar su write set exacto y la evidencia del nuevo checker debe demostrar que no existe drift adicional. P6-16 conservará el resumen histórico, no la responsabilidad de cerrarlo.

## Alcance autorizado propuesto

### Runtime

- `prototipo_ejecutable/public/app.js`;
- `prototipo_ejecutable/public/js/views/journey.js`.

### Pruebas y manifiesto

- `prototipo_ejecutable/tests/journey-dom-parity.mjs` — nuevo;
- `prototipo_ejecutable/tests/journey-view.mjs`;
- `prototipo_ejecutable/tests/phase6-integral-e2e.mjs`;
- `prototipo_ejecutable/package.json`.

### Evidencia y estilos, solo con fallo demostrado

- `.planning/phases/06-commercial-narrative-qa/evidence/functional/*`;
- `.planning/phases/06-commercial-narrative-qa/evidence/responsive/*`;
- `prototipo_ejecutable/public/styles/61-journey.css`;
- `prototipo_ejecutable/public/styles/90-responsive.css`.

Los estilos solo pueden cambiar si una prueba o captura demuestra overflow, solape, truncamiento, pérdida de contraste o densidad superior al presupuesto aprobado. Cualquier cambio visual debe conservar la paleta Viva, objetivos táctiles, foco y reduced motion.

## Fuera de alcance

- contrato 2.4, schema, dataset, writer, fingerprints y scripts de datos;
- `state.js`, `journey.js`, motores F2–F5, elegibilidad y fuentes;
- navegación/URL, reset, persistencia, telemetría, red o backend;
- workflow de Pages;
- P6-14/P6-20 y la carpeta de evidencia creada por el usuario.

## Diseño de información

La etapa mantiene la firma visual existente: pregunta → lectura principal → límite → detalle experto → una CTA primaria. El correctivo sustituye el copy genérico por un resumen vertical derivado, sin añadir una grilla de cards.

| Etapa | Contenido visible mínimo derivado | Límite visible |
|---|---|---|
| Escala | `184` inmobiliarias modeladas; piloto `30 / 22 / 5` como niveles anidados; conteo observado y comparable del escenario | los universos no se suman y la muestra no es exhaustiva |
| Geografía | alcance, proyectos observados, comparables y excluidos | cuadrante/radio analítico, no límite legal |
| Calidad | `104.15 m²`, `53.37 m²`, diferencia `50.78 m²` y exclusión del benchmark | caso transversal de Miraflores, no parte del escenario activo |
| Profundidad | estado del benchmark, denominador elegible y conclusión comparativa disponible | precio publicado no equivale a cierre ni prueba pairing |
| Movimiento | señal prioritaria, vigencia, cobertura y referencia disponible | cambio observado sin causalidad inferida |
| Decisión | checklist si no hay respuesta; si existe, respuesta estructurada literal ya presente en estado | sin precio de cierre, causalidad o exhaustividad |

Cuando existe `journeyContext`, los estados `empty`, `insufficient`, `error` y `capability_unavailable` muestran explicación concreta y exactamente la `correctiveAction` del modelo. `loading` sigue deshabilitando la CTA. El contrato 2.0 conserva el error global vigente y no se convierte en una experiencia interna por etapa; `contract_unavailable` solo se trata como fallback defensivo si la vista recibe explícitamente ese envelope.

## Secuencia test-first

1. Añadir `journey-dom-parity.mjs` al manifiesto y demostrar fallo contra `0003ddb`.
2. Cubrir las seis etapas en 2.4 y comparar `data-journey-state` con `state.journeyContext.stages[stageId].status`.
3. Cubrir Decisión 2.1 como `capability_unavailable`, geografía vacía, estado insuficiente/error y CTA correctiva; confirmar por separado que 2.0 continúa fallando de forma global.
4. Exigir en DOM 184/30/22/5, 104.15/53.37/50.78, exclusión y checklist/respuesta sin `NaN`, infinito o dato obsoleto.
5. Pasar desde `app.js` la etapa materializada; durante carga, pasar un envelope explícito `loading` sin mutar el estado.
6. Renderizar estado, datos y acción correctiva en `views/journey.js` con escaping y formateo local de presentación; prohibido recomputar cifras o importar motores.
7. Repetir tests dirigidos, `npm.cmd run verify`, 14 superficies × 3 viewports, zoom 200 %, teclado, contraste, consola y hosts externos.
8. Regenerar solo evidencia cuyo píxel cambie y repetir P6-15 completo con checker independiente sobre el nuevo SHA.

## Criterios de aceptación

1. Para cada etapa, `data-journey-state` coincide con `state.journeyContext.stages[stageId].status`.
2. Decisión bajo contrato 2.1 muestra indisponibilidad y la acción correctiva autoritativa; nunca `ready`.
3. Geografía sin proyectos muestra `empty`, explica el vacío y enlaza `#dashboard`.
4. Escala distingue `184` de los niveles anidados `30/22/5` y no los suma.
5. Calidad muestra `104.15 m²`, `53.37 m²`, `50.78 m²` y `benchmarkEligible=false` como exclusión legible.
6. Decisión muestra checklist cuando `response=null`; si existe respuesta, representa los bloques de `state.assistantResponse` sin invocar `buildAssistantResponse`.
7. Cada estado no-ready usa `stage.correctiveAction.label/href`; no hay CTA genérica divergente.
8. Cada etapa conserva una sola CTA primaria y máximo tres grupos antes de divulgación o módulo experto.
9. La vista no importa motores, no muta estado y no genera consultas implícitas.
10. No se modifican archivos fuera del write set ni protegidos no autorizados.
11. `npm.cmd run verify`, responsive, accesibilidad y la nueva regresión DOM↔estado terminan con exit 0.
12. Un checker independiente repite P6-15. El máximo sigue siendo `PASS WITH RISKS` por `R6-H1`; cualquier riesgo nuevo requiere tratamiento separado.
13. La auditoría `base..HEAD` demuestra que P6-15A no modifica ningún path fuera del write set aprobado; con ello G3 queda cerrado como desviación histórica documentada y no como riesgo residual nuevo.

## Rollback

Revertir el commit atómico P6-15A, ejecutar `npm.cmd run verify` y confirmar que los hashes de contrato/datos siguen intactos. El rollback debe retirar conjuntamente integración, render y regresión DOM↔estado; no puede dejar pruebas relajadas ni una vista parcialmente conectada.

## Texto de autorización

`Autorizo la enmienda correctiva P6-15A para conectar app.js y views/journey.js con state.journeyContext, añadir la regresión DOM↔estado y actualizar únicamente pruebas, manifiesto, evidencia y estilos condicionados definidos en P6-15A-CORRECTIVE-PLAN.md, sin modificar datos, contrato, writer, motores, navegación ni workflow.`
