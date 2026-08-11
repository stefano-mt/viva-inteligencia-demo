# P6-15 — Verificación formal independiente final

**Fecha:** 2026-08-10

**Rama:** `feat/phase-6-commercial-narrative-qa`

**Candidato:** `a94f25159fb20770599b97c8fdfa37a2dabe551b`

**Baseline correctivo auditado:** `8740182bd0ebac64aaf7ea163dd184b5e90b6815`

**Veredicto:** **PASS WITH RISKS**

## Conclusión

P6-15 cierra técnicamente. La repetición independiente verificó que la superficie visible consume el estado autoritativo, que los dos gaps detectados en la repetición anterior quedaron corregidos y que el correctivo final respeta el write set aprobado de P6-15A.

El único riesgo residual es `R6-H1`: el ensayo humano independiente permanece `PENDING/DEFERRED` por D-042 y debe ejecutarse en P6-20 sobre GitHub Pages. Este veredicto no equivale a aceptación humana, `ready for client`, merge ni despliegue verificado.

## Historias y criterios

| Historia | Resultado | Evidencia principal |
|---|---|---|
| HU-DEMO-103 | PASS | carga/error, 2.0–2.4, vacíos, insuficiencia, CTA correctiva y faltantes sin cifras fabricadas |
| HU-DEMO-104 | PASS | ayuda para 6 etapas + 8 rutas, teclado y red cerrada |
| HU-DEMO-801 | PASS | seis etapas, estado DOM=estado autoritativo y recorrido UI-only |
| HU-DEMO-802 | PASS | primera pantalla 1280×720, máximo tres grupos, divulgación progresiva y tipografía crítica de 16 px |
| HU-DEMO-803 | PASS | reset, URL, foco, recarga y ausencia de persistencia oculta |
| HU-DEMO-804 | PASS | handoffs canónicos, rutas expertas y CTA autoritativas |

## Gate ejecutado

### Suite integral

`npm.cmd run verify` terminó con exit `0` e incluyó:

- sintaxis, propiedad de estilos y arquitectura;
- dominio, navegación, vista, shell, estado, paridad, ayuda y reset del Journey;
- integración F6, CT-A–I/P, carga/error, contratos 2.0–2.4 y vacíos;
- contratos, referencias, determinismo, privacidad y compatibilidad 2.0–2.4;
- Inspector, Benchmark, comparación, histórico y asistente;
- E2E UI-only, responsive y zoom 200%;
- smoke de 8 rutas × 3 viewports;
- accesibilidad de 14 superficies × 3 viewports.

Resultados finales relevantes:

- `Journey DOM parity OK`: seis etapas, faltantes de Escala, respuesta real de seis bloques, vacío geográfico, capacidad 2.1 y error global 2.0;
- `Phase 6 responsive OK`: 14 superficies × 3 viewports, teclado, foco, objetivos 44×44, AA, reduced motion y cero overflow/truncamiento;
- `A11y smoke OK`: landmarks, nombres accesibles y teclado en 14 superficies × 3 viewports.

### Navegador adversarial independiente

El script de evidencia `p6-15-repeat-browser.mjs` ejecutó una sesión Chromium separada y comprobó:

1. `data-journey-state === state.journeyContext.stages[stageId].status` en las seis etapas;
2. Escala canónica: `184` y `30 / 22 / 5`;
3. Escala con `canonical_agencies` y `pilot.base_count` ausentes: estado `insufficient`, `No disponible / 22 / 5` y ningún `0` fabricado;
4. Calidad: `104.15 m²`, `53.37 m²`, `50.78 m²` y exclusión del benchmark;
5. Decisión sin respuesta: checklist autoritativo y CTA a `#assistant`;
6. Decisión con respuesta real: los seis bloques `answer`, `data`, `interpretation`, `limitations`, `references` y `next_step` quedan representados;
7. la divulgación de referencias inicia cerrada, abre por interacción real y contiene las 4/4 etiquetas autoritativas;
8. límite, `summary` y referencias computan `16 px`;
9. límite y CTA permanecen dentro de `1280×720`; para Decisión con respuesta, el CTA termina en `665.09 px` de un viewport de `720 px`;
10. geografía vacía usa `empty` y `Ajustar escenario → #dashboard`;
11. contrato 2.1 usa `capability_unavailable` y `Formular consulta en el asistente → #assistant`;
12. contrato 2.0 conserva el error global y no renderiza Journey;
13. cero errores de consola/página y cero solicitudes externas.

## Cierre de gaps

| Gap | Estado final | Comprobación |
|---|---|---|
| G1 — estado reducido antes de llegar a la vista | CERRADO | seis etapas contrastadas DOM↔`journeyContext` |
| G2 — regresión insuficiente | CERRADO | `journey-dom-parity.mjs` cubre estados, datos y acciones; browser independiente repite los casos |
| G3 — drift histórico de write sets | CERRADO | `8740182..a94f251` contiene 8 paths y 0 violaciones |
| G4 — `null` presentado como cero en Escala | CERRADO | `No disponible / 22 / 5`, sin cero fabricado, en test de vista y navegador |
| G5 — respuesta incompleta en Decisión | CERRADO | seis bloques visibles/representados y 4/4 referencias verificadas tras abrir la divulgación |

## Graphify

Graphify se ejecutó sobre un snapshot limpio creado desde el SHA candidato, sin incluir archivos no rastreados:

- 182 archivos de código;
- 3,791 nodos;
- 7,624 aristas;
- hubs principales estables: `escapeHtml` 95, `formatNumber` 83, `escapeAttr` 81, `scripts` 74 y `state` 39;
- la consulta alcanzó `state`, `buildJourneyContext`, `decisionStage`, `navigation.js`, vistas y regresiones;
- no apareció un nuevo god node atribuible al correctivo.

## Auditoría de alcance

El diff `8740182..a94f251` contiene exactamente 8 paths y 0 violaciones del write set P6-15A. Los paths protegidos de contrato, datos, writer, dataset público, fuentes relevantes y workflow de Pages no cambiaron. `git diff --check` terminó con exit `0`.

La ejecución de pruebas regeneró temporalmente un artefacto responsive no determinista; el checker lo restauró exactamente a `HEAD` y no lo incluye en su write set.

## Paquete humano y riesgo residual

`tests/rehearsal-packet.mjs` pasó y confirmó que el paquete continúa pendiente, no destructivo y sin rúbrica inventada. No se abrió, modificó, añadió al stage ni usó como evidencia formal la carpeta no rastreada `evidence/rehearsal/run-2026-08-10-lector01/`.

### Riesgo residual aceptado

- `R6-H1 — validación humana diferida`: aceptado únicamente para continuar P6-15–P6-19 por D-042. P6-20 sigue siendo bloqueante para la aceptación final.

No se identificaron otros gaps técnicos o riesgos residuales nuevos.

## Evidencia escrita

- `evidence/verification/technical-gate.md`;
- `evidence/verification/adversarial-ui-state.md`;
- `evidence/verification/graphify.md`;
- `evidence/verification/write-set-audit.md`;
- `evidence/verification/browser-repeat/result.json` y capturas asociadas;
- `evidence/verification/p6-15-repeat-browser.mjs`.

## Decisión de avance

P6-15 cumple su Definition of Done técnica con **PASS WITH RISKS** exclusivamente por `R6-H1`. P6-16 puede iniciar; el estado máximo antes de P6-20 permanece `deployed and technically verified; human acceptance pending`.
