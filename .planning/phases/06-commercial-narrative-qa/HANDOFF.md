# Handoff — P6-16

## Estado

`P6-16 done — PASS WITH RISKS técnico; memoria y cuerpo del PR funcional preparados; revisión humana, merge, verificación pública y aceptación humana final pendientes`

## Resultado

La Fase 6 está implementada y verificada en `feat/phase-6-commercial-narrative-qa`.

El checker independiente cerró P6-15 sobre el candidato funcional:

```text
a94f25159fb20770599b97c8fdfa37a2dabe551b
```

El informe final se versionó en:

```text
8ca5aab1e9333a2e326e538dcfed8d3cdfeb3fa2
```

El SHA del commit documental de P6-16 se genera al versionar este mismo handoff y, por tanto, no se fija dentro del archivo. La entrega de P6-16 debe comunicarlo junto con el comando de publicación. El revisor usa como HEAD esperado la punta remota de la rama después de esa publicación y confirma que, después de `a94f251`, solo existen el cierre independiente y la memoria de P6-16.

El veredicto es `PASS WITH RISKS`. G1–G5 están cerrados y no existen gaps técnicos abiertos. El único riesgo residual es `R6-H1 — validación humana diferida`, aceptado mediante D-042 exclusivamente para continuar P6-15–P6-19. P6-20 sigue siendo bloqueante para declarar la demo `ready for client`.

## Alcance de P6-16

P6-16 modifica únicamente:

- [SUMMARY.md](SUMMARY.md);
- [HANDOFF.md](HANDOFF.md);
- [STATE.md](../../STATE.md).

No modifica código, datos, tests, estilos, assets, contrato, writer, fingerprints, motores, navegación, workflow o comportamiento. Tampoco abre, completa ni incorpora los archivos no rastreados de una sesión humana preliminar.

Si después de `a94f251` cambia código, datos, tests, estilos, activos o comportamiento, un checker independiente debe repetir P6-15 antes del merge. Cambios exclusivamente documentales de P6-15/P6-16 no invalidan el candidato funcional.

## Resultado observable

- La demo abre en `#journey/scale` y presenta seis etapas comerciales.
- Cada etapa responde una pregunta, muestra una lectura, conserva respaldo y límite, y ofrece una acción siguiente.
- Escala distingue 184 agencias modeladas de los niveles 30/22/5 del piloto.
- Geografía usa el mismo escenario territorial que Radar y Proyectos.
- Calidad presenta Tipo 7 como caso transversal de Miraflores y conserva 104.15/53.37/50.78 m² con exclusión.
- Profundidad enlaza benchmark, comparación por filas, denominadores y evidencia.
- Movimiento muestra cambios publicados sin atribuir causa.
- Decisión reproduce la respuesta vigente de seis bloques o muestra checklist + CTA sin consulta implícita.
- La estación territorial aparece una sola vez y el mapa recibe prioridad en Radar.
- Proyectos usa inventario compacto por filas y Comparador coloca la conclusión antes de la matriz.
- Las ocho rutas expertas permanecen disponibles y tienen retorno canónico al recorrido.
- Reinicio termina en `/#journey/scale`, restablece Tipo 7 y vacía comparación.
- Contratos 2.0–2.4 degradan de forma explícita y sin cifras fabricadas.

## Criterios

| Criterio | Estado | Evidencia |
|---|---|---|
| HU-DEMO-103/104/801–804 | PASS | [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md) |
| CT-A–I/P | PASS | Gate integral, fixtures, E2E y navegador |
| Paridad Journey ↔ estado | PASS | Seis etapas y browser adversarial independiente |
| Contrato y compatibilidad | PASS | Reader 2.0–2.4 y capacidad acumulativa por etapa |
| Navegación y reset | PASS | Deep-links, recarga, atrás/adelante, URL final y foco |
| Privacidad | PASS | Cero persistencia de consultas o PII; cero solicitudes externas |
| Smoke | PASS | 8 rutas expertas × 3 viewports |
| Responsive/a11y | PASS | 14 superficies × 3 viewports, zoom 200 %, teclado, AA y 44 × 44 |
| Graphify | PASS | 3,791 nodos / 7,624 aristas; sin nuevo god node |
| Write set P6-15A | PASS | 8 paths y 0 violaciones |
| P6-14 / P6-20 | PENDING/DEFERRED | Riesgo aceptado `R6-H1`; aceptación humana final no ejecutada |
| HUMAN-GATE-B | No aplica | No existe un riesgo técnico adicional; D-042 cubre solo R6-H1 |

## Verificación ejecutada

| Comando o recorrido | Resultado |
|---|---|
| `npm.cmd run verify` | PASS, exit 0 |
| Browser adversarial P6-15A | PASS para seis estados, faltantes honestos, Tipo 7, checklist, respuesta de seis bloques y referencias |
| `git diff --check` | PASS |
| Graphify | PASS; 3,791 nodos y 7,624 aristas |
| Auditoría `8740182..a94f251` | PASS; ocho paths, cero violaciones |
| Paquete de ensayo | PASS técnico como paquete `PENDING/DEFERRED`; no equivale a ensayo humano |

## Evidencia

- Contexto: [CONTEXT.md](CONTEXT.md).
- Auditoría UX: [UX-AUDIT.md](UX-AUDIT.md).
- Especificación UI: [UI-SPEC.md](UI-SPEC.md).
- Plan: [PLAN.md](PLAN.md).
- Aprobación: [APPROVAL.md](APPROVAL.md).
- Informe independiente: [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md).
- Resumen: [SUMMARY.md](SUMMARY.md).
- Recorrido funcional: [evidence/functional](evidence/functional/).
- Matriz responsive: [evidence/responsive](evidence/responsive/).
- Repetición adversarial: [evidence/verification/browser-repeat](evidence/verification/browser-repeat/).
- Gate técnico: [evidence/verification/technical-gate.md](evidence/verification/technical-gate.md).
- Graphify: [evidence/verification/graphify.md](evidence/verification/graphify.md).
- Auditoría de write set: [evidence/verification/write-set-audit.md](evidence/verification/write-set-audit.md).

## Contratos que debe conservar el siguiente rol

1. El contrato público sigue en 2.4; P6 no modifica schema, dataset, writer o fingerprints.
2. El escenario serializado continúa como única fuente territorial para Journey y las ocho rutas expertas.
3. La etapa visible consume `state.journeyContext`; la vista no recompone estados o claims.
4. Escala distingue el total modelado 184 de los subconjuntos acumulativos 30/22/5.
5. Tipo 7 es transversal, pertenece a Miraflores y no contamina el escenario activo.
6. Calidad conserva ambos valores originales y excluye la incompatibilidad sin inventar una verdad.
7. Decisión nunca ejecuta una consulta implícita; reproduce `assistantResponse` o muestra checklist + CTA.
8. Los faltantes permanecen faltantes; `null` no se presenta como cero.
9. Los precios son publicados u orientativos según su autoridad; nunca precios de cierre.
10. Los cambios históricos no prueban causalidad ni ventas.
11. Las consultas del asistente no se persisten ni provocan red externa.
12. `/` abre `#journey/scale`; hashes expertos, aliases, recarga y atrás/adelante siguen vigentes.
13. El reset termina en `/#journey/scale`, mueve foco al `h1`, vacía comparación y restaura Tipo 7.
14. La evidencia extensa usa divulgación progresiva; límites, referencias y exclusiones no se ocultan.
15. P6-14 continúa `PENDING/DEFERRED`; ninguna plantilla o sesión preliminar equivale a aceptación.
16. El estado máximo antes de P6-20 es `deployed and technically verified; human acceptance pending`.
17. El merge de P6-17 es exclusivamente humano.
18. Un cambio funcional posterior al candidato `a94f251` exige repetir P6-15.

## Riesgo residual y notas operativas no bloqueantes

| Nota | Severidad | Tratamiento |
|---|---|---|
| `R6-H1` — aceptación humana diferida | Bloqueante para venta, aceptada para integración técnica | Ejecutar P6-20 sobre Pages y el SHA desplegado; 5/5 claims, 0 prohibidos, ≤10 min y sin ayuda del maker. |
| Graphify parcial para CSS/JSON | Baja/conocida | Complementado con ownership CSS, tests, hashes, navegador y auditoría de diff. |
| Dependencias en un clon nuevo | Operativa/baja | Ejecutar `npm.cmd ci` dentro de `prototipo_ejecutable` antes del gate. |

Las dos notas de severidad baja no son riesgos residuales del veredicto y no alteran `PASS WITH RISKS`. No existen gaps técnicos P0–P2 abiertos.

## Pull request funcional

**Base:** `main`

**Compare:** `feat/phase-6-commercial-narrative-qa`

**Enlace para abrir el PR:** [comparar `main` con la rama de Fase 6](https://github.com/stefano-mt/viva-inteligencia-demo/compare/main...feat%2Fphase-6-commercial-narrative-qa?expand=1)

Después de publicar P6-16, abrir ese enlace, confirmar `base: main` y `compare: feat/phase-6-commercial-narrative-qa`, pegar el título y el cuerpo siguientes, y elegir `Create draft pull request`. Marcarlo `Ready for review` solo después de confirmar que GitHub muestra el HEAD remoto esperado, los enlaces funcionan y no existen conflictos.

**Título sugerido:**

```text
feat: add guided commercial journey and presentation QA
```

**Cuerpo listo para copiar:**

```markdown
## Resultado

Convierte la demo en un recorrido ejecutivo reproducible de seis etapas: escala → geografía → calidad → profundidad → movimiento → decisión. Mantiene las ocho rutas expertas y usa el mismo estado, escenario, motores y evidencia autoritativos.

## Historias cubiertas

- HU-DEMO-103: estados vacíos, insuficientes y compatibilidad 2.0–2.4.
- HU-DEMO-104: ayuda contextual para 6 etapas + 8 rutas.
- HU-DEMO-801: recorrido guiado y handoffs expertos.
- HU-DEMO-802: menor densidad, una CTA primaria y divulgación progresiva.
- HU-DEMO-803: URL, recarga, atrás/adelante y reinicio reproducibles.
- HU-DEMO-804: navegación orientada a la venta sin retirar análisis experto.

## Cambios principales

- Nueva entrada `Recorrido ejecutivo` con seis etapas y rutas canónicas `#journey/*`.
- Una sola estación territorial; cabecera y resumen sin controles duplicados.
- Radar prioriza mapa; Proyectos usa inventario por filas.
- Inspector conserva Tipo 7 como caso transversal y su exclusión explicable.
- Comparador presenta conclusión y hallazgos antes de la matriz.
- Señales, Asistente y Checklist quedan conectados por acciones explícitas.
- Copy comercial simplificado sin alterar datos, cálculos, fuentes o límites.
- Responsive, teclado, contraste, objetivos táctiles y zoom 200 % cubiertos.

## Contratos preservados

- Contrato público 2.4 y reader 2.0–2.4.
- Dataset, writer, fingerprints, elegibilidad y workflow sin cambios.
- Cero backend, IA generativa, telemetría, almacenamiento o red externa.
- Tipo 7 conserva 104.15/53.37/50.78 m² y no contamina el escenario activo.

## Verificación

- Candidato funcional: `a94f25159fb20770599b97c8fdfa37a2dabe551b`.
- Informe final: `8ca5aab1e9333a2e326e538dcfed8d3cdfeb3fa2`.
- `npm.cmd run verify`: PASS.
- HU-DEMO-103/104/801–804: PASS.
- CT-A–I/P: PASS.
- Browser adversarial DOM ↔ estado: PASS.
- Smoke: 8 rutas expertas × 3 viewports.
- Responsive/a11y: 14 superficies × 3 viewports + zoom 200 %.
- Graphify: 3,791 nodos / 7,624 aristas; sin nuevo god node.
- Write set P6-15A: 8 paths, 0 violaciones.

## Evidencia

- [Resumen de fase](https://github.com/stefano-mt/viva-inteligencia-demo/blob/feat/phase-6-commercial-narrative-qa/.planning/phases/06-commercial-narrative-qa/SUMMARY.md)
- [Informe independiente](https://github.com/stefano-mt/viva-inteligencia-demo/blob/feat/phase-6-commercial-narrative-qa/.planning/phases/06-commercial-narrative-qa/VERIFICATION_REPORT.md)
- [Recorrido funcional](https://github.com/stefano-mt/viva-inteligencia-demo/tree/feat/phase-6-commercial-narrative-qa/.planning/phases/06-commercial-narrative-qa/evidence/functional)
- [Matriz responsive](https://github.com/stefano-mt/viva-inteligencia-demo/tree/feat/phase-6-commercial-narrative-qa/.planning/phases/06-commercial-narrative-qa/evidence/responsive)
- [Repetición adversarial](https://github.com/stefano-mt/viva-inteligencia-demo/tree/feat/phase-6-commercial-narrative-qa/.planning/phases/06-commercial-narrative-qa/evidence/verification/browser-repeat)

## Riesgo residual

Veredicto: `PASS WITH RISKS` únicamente por `R6-H1 — validación humana diferida`.

P6-20 sigue pendiente y es bloqueante para declarar `ready for client` o `deployed and verified`. Este PR habilita integración técnica, no aceptación humana final.

## Revisión y ship

- [ ] Confirmar base `main` y compare `feat/phase-6-commercial-narrative-qa`.
- [ ] Revisar las seis etapas y las ocho rutas expertas.
- [ ] Abrir el mapa, Tipo 7, Comparador, Señales, Asistente y Checklist.
- [ ] Confirmar reset a `/#journey/scale` y deep-links existentes.
- [ ] Revisar evidencia desktop, laptop, móvil y zoom 200 %.
- [ ] Hacer merge manual únicamente si GitHub muestra el PR sin conflictos.

Después del merge: P6-18 verifica Pages de forma read-only, P6-19 persiste el resultado en otro PR documental y P6-20 ejecuta la aceptación humana integral final.
```

## Instrucción al siguiente rol

### Revisor humano — P6-17

1. Confirmar base `main`, compare `feat/phase-6-commercial-narrative-qa` y HEAD remoto con el commit documental de P6-16.
2. Verificar que el último commit funcional es `a94f251` y que `8ca5aab` más P6-16 son documentales/pruebas de cierre.
3. Abrir las seis etapas, recorrer Anterior/Siguiente y comprobar que el escenario no cambia.
4. Abrir Radar, Proyectos, Inspector, Comparador, Señales, Asistente y Checklist desde sus handoffs.
5. Confirmar 184 frente a 30/22/5 y la independencia de Tipo 7 respecto del distrito activo.
6. Probar el reset y un deep-link experto existente.
7. Revisar el informe, la evidencia funcional y la matriz responsive.
8. Confirmar que GitHub muestra el PR sin conflictos.
9. Realizar el merge manual solo después de completar la revisión.

### P6-18 — después del merge

Verificar de forma read-only:

- PR y SHA completo del merge;
- workflow Pages en `success` y `headSha` coincidente;
- HTTP 200 y contrato 2.4;
- seis etapas y ocho rutas en la URL pública;
- recorrido crítico escala → mapa → Tipo 7 → Comparador → Señal → Decisión;
- desktop, laptop, móvil y zoom 200 %;
- reinicio, consola limpia y cero red externa.

### P6-19 — después de P6-18

Crear una rama y PR documental separados para:

- `POSTMERGE_REPORT.md`;
- `.planning/STATE.md`;
- `.planning/ROADMAP.md`;
- evidencia post-merge.

Solo declarar `deployed and technically verified; human acceptance pending` si P6-18 termina en `PASS` y el resultado se integra mediante P6-19.

### P6-20 — aceptación final

Ejecutar el protocolo de [COMMERCIAL_REHEARSAL.md](COMMERCIAL_REHEARSAL.md) con una persona nueva, sobre Pages y el SHA desplegado. Solo un `PASS` reproducible habilita `ready for client` y `deployed and verified`.
