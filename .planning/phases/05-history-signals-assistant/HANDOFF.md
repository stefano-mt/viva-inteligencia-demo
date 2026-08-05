# Handoff — P5-14

## Estado

`P5-14 done — PASS técnico; memoria versionada y PR funcional #15 abierto como borrador; revisión humana, merge y cierre de ship pendientes`

## Resultado

La Fase 5 está implementada y verificada en `feat/phase-5-history-signals-assistant`.

El checker independiente `/root/p5_13_checker` emitió `PASS` sobre el último commit funcional:

```text
8e76b796b1fef3616b5a0b7a5526a72d2f125e2c
```

El informe se versionó en `a24ed1333dccbde61a28634122be615d177edfff`. No existen gaps bloqueantes y no se requiere HUMAN-GATE-B.

La rama incorpora contrato 2.4, policy y catálogo, fixtures CT-C/D/E/F/G/I/P, materializador histórico, dataset público, motores puros, estado derivado, cuaderno de señales, agenda, asistente determinista, E2E, responsive, accesibilidad y evidencia portable. P5-14 modifica únicamente memoria documental; no cambia código, datos, tests, estilos, activos ni comportamiento después del veredicto.

## Alcance de P5-14

P5-14 solo modifica:

- [SUMMARY.md](SUMMARY.md);
- [HANDOFF.md](HANDOFF.md);
- [STATE.md](../../STATE.md);
- [ROADMAP.md](../../ROADMAP.md);
- [PLAN.md](PLAN.md).

No modifica el artefacto público ni exige repetir P5-13. Si después de `8e76b79` cambia código, datos, tests, estilos, activos o comportamiento, un checker independiente debe repetir P5-13 sobre el nuevo SHA antes del merge.

## Resultado observable

- `#activity` muestra únicamente cambios de proyectos pertenecientes al escenario canónico.
- Cada señal expone precio publicado anterior/nuevo, delta, porcentaje, fechas, vigencia, estado y referencias.
- Una variación revisable no desplaza a una certificada por magnitud.
- El detalle abre dos observaciones y evidencia autorizada sin perder el escenario.
- La agenda conserva el orden del motor y tiene máximo tres acciones.
- `#assistant` declara `Lectura determinista · sin IA generativa`.
- La respuesta usa seis bloques, datos autoritativos y referencias navegables.
- CT-F rechaza precio real de cierre; causalidad, predicción, PII y búsqueda externa también fallan de forma cerrada.
- La consulta no se guarda ni genera tráfico externo.
- Contratos 2.0–2.3 degradan Fase 5 explícitamente y no reconstruyen autoridad legacy.
- Navegación por teclado, móvil y reflow 200% están verificados.

## Criterios

| Criterio | Estado | Evidencia |
|---|---|---|
| HU-DEMO-601–603 | PASS | [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md) |
| HU-DEMO-701–703 | PASS | [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md) |
| CT-C/D/E/F/G/I/P | PASS | Fixtures, contrato, dominio, integración, E2E y navegador |
| Contrato y compatibilidad | PASS | 2.4 público; reader 2.0–2.4; degradación explícita |
| Historial | PASS | 42 candidatos = 36 eventos materializados (31 certificados + 5 revisables) + 6 candidatos excluidos |
| Trazabilidad | PASS | 36 eventos × 2 cortes = 72 puntos; cada punto aporta observación, hecho y evidencia |
| Asistente | PASS | 7 intenciones, 5 limitaciones y 6 bloques de respuesta |
| Privacidad | PASS | 0 PII/rutas/consultas; 0 red externa; evidencia fail-closed |
| Determinismo | PASS | Dos builds; JSON, cobertura y GeoJSON con hashes estables |
| Smoke y accesibilidad | PASS | 8 rutas × 3 viewports |
| Responsive F5 | PASS | 1440×900, 1280×720, 390×844 y reflow 200% |
| Recorrido UI-only | PASS | Chrome headless, ocho momentos, sin errores ni red |
| HUMAN-GATE-B | No aplica | P5-13 emitió PASS |

## Verificación ejecutada

| Comando/recorrido | Resultado |
|---|---|
| `npm.cmd run verify` | PASS, aproximadamente 7 min 45 s |
| `git diff --check` | PASS sobre el working tree verificado |
| Dos builds y hashes | PASS |
| Graphify + imports/tests | PASS; 3,425 nodos / 6,536 relaciones |
| Revisión de 13 capturas P5-12 | PASS |
| Recorrido comercial UI-only | PASS, automatizado |

## Evidencia

- Contexto: [CONTEXT.md](CONTEXT.md).
- Evaluación técnica y de datos: [DATA-ASSESSMENT.md](DATA-ASSESSMENT.md).
- Especificación UI: [UI-SPEC.md](UI-SPEC.md).
- Plan: [PLAN.md](PLAN.md).
- Aprobación: [APPROVAL.md](APPROVAL.md).
- Informe independiente: [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md).
- Resumen: [SUMMARY.md](SUMMARY.md).
- Dataset: [viva-platform-demo.json](../../../prototipo_ejecutable/public/demo-data/viva-platform-demo.json).
- Reporte de cobertura: [coverage-report.json](../../../datos_relevantes/demo-pilot/coverage-report.json).
- Policy histórica: [history-policy.json](../../../datos_relevantes/demo-pilot/history-policy.json).
- Catálogo del asistente: [assistant-intent-catalog.json](../../../datos_relevantes/demo-pilot/assistant-intent-catalog.json).
- Evidencia final: [evidence/p5-12](evidence/p5-12/).
- Baseline: [evidence/baseline](evidence/baseline/).

Las trece capturas finales están dentro del repositorio y son portables para un revisor remoto. No dependen de rutas temporales locales.

## Contratos que debe conservar el siguiente rol

1. `$.model`, `$.inspector`, `$.benchmark`, `$.history` y `$.assistant` son índices autoritativos; `$.projects` continúa como proyección legacy.
2. El escenario serializado es la única fuente territorial para las ocho rutas.
3. Histórico significa cambios observados en precios publicados a nivel proyecto entre dos cortes compatibles; no ventas, cierres ni momento causal exacto.
4. `cause` permanece `null` sin evidencia causal autorizada.
5. Vigencia se calcula contra el cutoff versionado, no contra el reloj del dispositivo.
6. Calidad y vigencia preceden a magnitud; un outlier `reviewable` nunca lidera por ser extremo.
7. Los filtros y selección del cuaderno son locales y no mutan el escenario.
8. La agenda consume el orden del motor, contiene máximo tres filas y no afirma periodicidad semanal.
9. El asistente es local, determinista y de catálogo cerrado; no se convierte en chatbot generativo.
10. Las cifras provienen de motores puros; la vista no duplica reglas o cálculos.
11. Una afirmación cualitativa exige hecho, observación, evidencia autorizada y pertenencia al escenario.
12. Precio real de cierre, causalidad, predicción, PII y búsqueda externa siempre se rechazan.
13. La consulta no se persiste en URL/storage ni provoca requests externos.
14. CT-G conserva Pardo Coast territorial, Tipo 7 incompatible y exclusión analítica.
15. El reader 2.0–2.4 degrada Fase 5 en contratos anteriores; no reconstruye autoridad desde legacy.
16. Un cambio funcional posterior a P5-13 exige una nueva verificación independiente.

## Decisiones consolidadas

P5-14 conserva las decisiones D-033–D-040 de [DECISIONS.md](../../DECISIONS.md):

1. HUMAN-GATE-A bajo A1–A12.
2. Contrato 2.4 y reader 2.0–2.4.
3. Calidad histórica separada de visibilidad territorial.
4. Auditoría de 34 preliminares y 36 eventos materializados por policy.
5. Estado 2.4 derivado sin duplicar escenario.
6. Columna de evidencia y divulgación nativa.
7. Agenda que conserva prioridad del motor.
8. Catálogo cerrado y referencias estructuradas.

No hubo enmiendas técnicas de Fase 5 que ampliaran contrato, runtime o dataset después de HUMAN-GATE-A.

## Notas y deuda deliberada

| Nota | Severidad | Tratamiento |
|---|---|---|
| Ensayo comercial automatizado | Operativa/baja | Realizar ensayo humano breve en revisión del PR o antes de la demo. |
| Graphify parcial para CSS/JSON | Baja/conocida | Complementar con hashes, imports, contratos, navegador y evidencia. |
| Helpers legacy no alcanzables | Baja/técnica | Considerar limpieza en Fase 6 con prueba de paridad; no ampliar P5-14. |
| Seis hard-breaks Markdown históricos | Baja/documental | Sin efecto funcional; normalizar solo si no altera la memoria. |
| Dependencias en un clon nuevo | Operativa/baja | Ejecutar `npm.cmd ci` en `prototipo_ejecutable` antes del gate. |

## Pull request funcional

Base: `main`.

Compare: `feat/phase-5-history-signals-assistant`.

PR: [#15 — feat: add explainable market signals and deterministic assistant](https://github.com/stefano-mt/viva-inteligencia-demo/pull/15).

Estado observado al abrirlo: `OPEN / DRAFT / MERGEABLE / CLEAN`.

HEAD observado al abrirlo: `e4b7858af329a9a3cd9ac460d111c565f76665f4`. El commit posterior de cierre solo actualiza memoria de P5-14. El revisor debe usar el HEAD que GitHub muestre en #15 como autoridad final.

El PR debe incluir:

- HU-DEMO-601–603 y 701–703;
- contrato 2.4 y compatibilidad 2.0–2.4;
- 42 candidatos, 36 eventos, 31 certificados, 5 revisables y 6 exclusiones;
- 72 puntos temporales completos y 52 fingerprints;
- cuaderno, detalle, agenda y asistente de seis bloques;
- CT-C/D/E/F/G/I/P;
- privacidad, guardrails y ausencia de red/persistencia;
- verificación 8 rutas × 3 viewports y 200%;
- enlaces a la evidencia portable versionada;
- veredicto P5-13 `PASS`;
- notas no bloqueantes;
- condición de merge humano;
- pasos P5-15/P5-16 posteriores al merge.

El PR puede marcarse `Ready for review` cuando P5-14 esté versionada, la evidencia portable sea accesible y GitHub muestre la base/HEAD correctas. El merge permanece exclusivamente humano y exige revisar las rutas afectadas y confirmar el gate técnico. El ensayo comercial humano es una recomendación antes de presentar al cliente, no un requisito técnico de merge.

## Instrucción al siguiente rol

### Revisor humano del PR

1. Confirmar que el último commit funcional es `8e76b79` y que los commits posteriores son únicamente P5-13/P5-14 documentales.
2. Revisar `#activity` y `#assistant` en escritorio y móvil.
3. Confirmar que señales y respuesta permanecen en el escenario activo.
4. Abrir una señal, revisar dos observaciones y regresar conservando foco/escenario.
5. Probar una pregunta compatible y el rechazo CT-F de precio real de cierre.
6. Confirmar que la consulta no aparece en la URL ni provoca red externa.
7. Revisar las trece capturas portables del repositorio.
8. Confirmar que `main` es la base, que el HEAD remoto coincide con el último commit P5-14 y que el informe registra `npm.cmd run verify` en PASS.
9. Realizar el merge manual solo si GitHub muestra el PR sin conflictos y la revisión de los puntos anteriores está completa.

### P5-15 — después del merge

Verificar de forma read-only:

- PR y SHA del merge;
- workflow Pages en `success`;
- HTTP 200 y contrato 2.4;
- CT-C, CT-E y CT-F;
- `#activity` y `#assistant` en escritorio/móvil;
- consulta no persistida, consola limpia y cero red externa;
- dataset, hashes y 52 fingerprints.

### P5-16 — después de P5-15

Crear una rama y PR documental separados para:

- `POSTMERGE_REPORT.md`;
- `.planning/STATE.md`.

Solo declarar Fase 5 `deployed and verified` si P5-15 concluye `PASS` y el `POSTMERGE_REPORT.md` que registra ese PASS está fusionado en `main`.
