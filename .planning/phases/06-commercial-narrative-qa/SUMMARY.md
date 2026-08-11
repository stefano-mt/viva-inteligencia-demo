# Fase 6 — Resumen de narrativa comercial, accesibilidad y QA

**Fecha de cierre técnico:** 2026-08-11

**Estado:** implementación y verificación técnica independiente completadas; P6-16 preparada para el pull request funcional; revisión humana, merge, verificación de GitHub Pages y aceptación humana final pendientes

**Veredicto independiente:** `PASS WITH RISKS`

**Único riesgo residual:** `R6-H1 — validación humana diferida`

## Resultado

La Fase 6 convierte los módulos analíticos de las Fases 1–5 en un recorrido ejecutivo reproducible de seis etapas:

```text
escala → geografía → calidad → profundidad → movimiento → decisión
```

La demo abre ahora en `#journey/scale`, conserva las ocho rutas expertas y conecta cada etapa con una pregunta comercial, una lectura principal, el respaldo disponible, un límite visible y una acción siguiente. El recorrido no crea motores paralelos: consume el estado y los resultados autoritativos que ya alimentan Radar, Proyectos, Inspector, Benchmark, Comparador, Señales, Asistente y Checklist.

El cambio también reduce la sobrecarga horizontal observada en el ensayo preliminar: concentra la configuración territorial en una sola estación, prioriza el mapa en Radar, transforma Proyectos en inventario por filas, coloca la conclusión antes de la matriz del Comparador y reemplaza vocabulario interno por lenguaje comercial directo.

La demo permanece estática y reproducible. No se modificaron el contrato público 2.4, el dataset, el writer, los fingerprints, la semántica de elegibilidad, los motores analíticos ni el workflow de GitHub Pages.

## Historias entregadas

| Historia | Resultado confirmado |
|---|---|
| HU-DEMO-103 | Estados de carga, error, contrato 2.0, capacidades 2.1–2.4, vacío e insuficiencia muestran límites y acciones correctivas sin `NaN`, infinito, datos obsoletos ni ceros fabricados. |
| HU-DEMO-104 | Las seis etapas y ocho rutas explican propósito, acción, resultado, límite y siguiente paso mediante ayuda accesible por click y teclado. |
| HU-DEMO-801 | Recorrido ejecutivo de seis etapas, navegación anterior/siguiente, foco en el título, retorno experto y caso Tipo 7 transversal. |
| HU-DEMO-802 | Una acción primaria por etapa, máximo tres grupos antes del detalle, evidencia progresiva y lectura usable en laptop, móvil y zoom 200 %. |
| HU-DEMO-803 | Ruta, etapa y escenario canónicos en URL; recarga, atrás/adelante y reinicio deterministas; cero persistencia oculta. |
| HU-DEMO-804 | Sidebar separado entre `Recorrido` y `Explorar análisis`, CTA orientadas al resultado y ocho rutas expertas accesibles en máximo dos interacciones. |

Los criterios completos están en [PLAN.md](PLAN.md) y su verificación en [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md).

## Recorrido ejecutivo y autoridad

| Etapa | Pregunta que resuelve | Lectura principal | Fuente autoritativa | Profundización experta |
|---|---|---|---|---|
| Escala | ¿Qué mercado observable sostiene la lectura? | 184 agencias modeladas y piloto acumulativo 30/22/5 | metadata, piloto y contexto territorial | Benchmark |
| Geografía | ¿Dónde compite el proyecto? | incluidos, comparables, excluidos y alcance vigente | `scenarioContext` y artefacto geográfico | Radar y Proyectos |
| Calidad | ¿Qué dato puede utilizarse? | 104.15 m² frente a 53.37 m², diferencia 50.78 m² y exclusión | caso F3 `case:f3-ct-g-pardo` | Inspector |
| Profundidad | ¿Cómo se diferencia la oferta? | hallazgos, denominadores y referencias de comparación | benchmark y modelo de comparación | Benchmark, Comparador y Proyectos |
| Movimiento | ¿Qué cambió en el mercado? | cambios publicados, vigencia y calidad | `historyContext` | Señales |
| Decisión | ¿Qué hacemos y qué no podemos afirmar? | respuesta verificable existente o checklist prudente | `assistantResponse` y checklist vigentes | Asistente y Checklist |

La cifra 184 representa los registros modelados del contrato público. Los niveles 30/22/5 son subconjuntos acumulativos de cobertura, enriquecimiento e inspección profunda; no se suman ni representan inmobiliarias adicionales.

Tipo 7 permanece rotulado como `Caso demostrativo transversal · Miraflores`. No cambia con el distrito activo, no alimenta sus agregados y no se sustituye silenciosamente si el contrato carece de esa capacidad.

## Navegación, URL y reinicio

- `/` sin hash resuelve a `/#journey/scale`.
- Las etapas usan `#journey/scale`, `#journey/geography`, `#journey/quality`, `#journey/depth`, `#journey/movement` y `#journey/decision`.
- Los deep-links de las ocho rutas expertas permanecen vigentes.
- Anterior, siguiente, salida experta y retorno preservan el escenario canónico.
- Recarga y atrás/adelante reproducen URLs reales.
- `Reiniciar escenario` termina en `/#journey/scale`, mueve el foco al `h1`, vacía comparación y restaura el expediente Tipo 7 canónico.
- Las consultas del asistente continúan solo en memoria: no aparecen en URL, cookies o almacenamiento local.

## Compatibilidad y degradación honesta

| Contrato | Capacidades visibles del recorrido |
|---|---|
| 2.0 | Error global `contract_unavailable`; no se muestran cifras parciales. |
| 2.1 | Escala y Geografía. |
| 2.2 | Escala, Geografía y Calidad. |
| 2.3 | Escala, Geografía, Calidad y Profundidad. |
| 2.4 | Las seis etapas. |

Cada etapa también conserva un estado vacío o insuficiente propio. Si faltan conteos de Escala, la interfaz muestra `No disponible` en lugar de fabricar cero. Si Decisión no tiene respuesta previa, presenta checklist y CTA al Asistente; nunca ejecuta una consulta implícita.

## Mejoras de UX/UI derivadas del feedback

### Shell y escenario

- Una única estación territorial en el lateral agrupa distrito, alcance, control dependiente, acceso a comparables y reinicio.
- La cabecera identifica el módulo y el escenario sin duplicar controles.
- El resumen global prioriza tres cifras comerciales y desplaza corte, URL, elegibilidad y detalle técnico a divulgación progresiva.
- El drawer móvil conserva Escape, retorno de foco y objetivos táctiles de al menos 44 × 44 px.

### Radar y Proyectos

- Radar abre con el mapa como momento principal y usa un solo lienzo para alternar mapa/posicionamiento.
- Producto y diagnóstico aparecen después del mapa.
- Proyectos abre con un inventario por filas y detalle bajo demanda, sin una cuadrícula KPI redundante.
- El escenario permanece visible en la estación lateral, pero no se repite como bloque dominante dentro de ambas rutas.

### Comparador

- La conclusión sustentada precede a la selección, los denominadores y la matriz.
- Un hallazgo principal y hasta dos apoyos conservan implicancia, límite, siguiente revisión y enlace a la fila correspondiente.
- `Revisar movimiento` es la única acción primaria cuando la comparación está lista.
- La base de lectura inicia cerrada y la matriz conserva sus nueve grupos y diez criterios.
- Precio inicia abierto; cualquier hallazgo puede abrir y enfocar el grupo que lo respalda.

### Lenguaje comercial

- Las guías usan el rótulo `Cómo usarla` y explican para qué sirve cada superficie.
- La interfaz prioriza zona, muestra, base de comparación, fuente, límite y siguiente acción.
- Vocabulario interno como `dataset`, `snapshot`, `fallback`, `ledger`, `motor` o `denominadores` dejó de aparecer por defecto cuando no aporta a la decisión.
- Publicaciones, referencias orientativas, simulaciones, certificaciones, revisiones y exclusiones conservan significados distintos.

## Verificación independiente

El checker independiente evaluó el candidato funcional:

```text
a94f25159fb20770599b97c8fdfa37a2dabe551b
```

El informe final quedó versionado en:

```text
8ca5aab1e9333a2e326e538dcfed8d3cdfeb3fa2
```

Resultado:

- `npm.cmd run verify`: PASS, exit 0;
- HU-DEMO-103/104/801–804: PASS;
- CT-A–I y CT-P: PASS;
- carga, error, contratos 2.0–2.4 y vacíos por etapa: PASS;
- paridad DOM ↔ `journeyContext` para las seis etapas: PASS;
- respuesta real de Decisión con seis bloques y referencias progresivas: PASS;
- reinicio, URL, recarga, atrás/adelante y foco: PASS;
- smoke: 8 rutas expertas × 3 viewports;
- responsive y accesibilidad: 14 superficies × 3 viewports, zoom 200 %, teclado, foco, 44 × 44, AA, reduced motion y cero overflow/truncamiento;
- privacidad y red: cero persistencia de consultas y cero solicitudes externas;
- `git diff --check`: PASS;
- Graphify: 3,791 nodos y 7,624 aristas, sin nuevo god node atribuible al cambio.

### Correctivo P6-15A

La primera ejecución de P6-15 detectó divergencia entre el estado autoritativo y el DOM. P6-15A cerró cinco gaps:

1. la vista recibe la etapa completa de `state.journeyContext`;
2. una regresión adversarial prueba estado, datos y acción correctiva en DOM;
3. el write set correctivo quedó auditado;
4. los faltantes de Escala ya no se convierten en cero;
5. Decisión representa los seis bloques y todas las referencias de la respuesta vigente.

El diff correctivo `8740182..a94f251` contiene ocho paths y cero violaciones. Contrato, datos, writer, motores, navegación, URL, reset y workflow permanecieron protegidos.

## Evidencia portable

- Recorrido funcional: [evidence/functional](evidence/functional/).
- Matriz responsive: [evidence/responsive](evidence/responsive/).
- Corrección del shell: [evidence/corrective-shell](evidence/corrective-shell/).
- Radar y Proyectos: [evidence/corrective-radar-projects](evidence/corrective-radar-projects/).
- Repetición adversarial: [evidence/verification/browser-repeat](evidence/verification/browser-repeat/).
- Gate técnico: [evidence/verification/technical-gate.md](evidence/verification/technical-gate.md).
- Paridad visible: [evidence/verification/adversarial-ui-state.md](evidence/verification/adversarial-ui-state.md).
- Graphify: [evidence/verification/graphify.md](evidence/verification/graphify.md).
- Auditoría de alcance: [evidence/verification/write-set-audit.md](evidence/verification/write-set-audit.md).

La carpeta de ensayo humano conserva plantillas versionadas, pero su resultado sigue `PENDING/DEFERRED`. Ningún archivo preliminar no rastreado se usa como evidencia de aceptación.

## Commits de la fase

| Bloque | Commits |
|---|---|
| Plan, revisión, aprobación y baseline | `8587b44`, `bb9b5a8`, `8e760b6`, `67009b3` |
| Catálogo, URL, shell, estado y ayuda | `dbd7a44`, `d9f8872`, `b173920`, `368f0e1`, `d58ee24` |
| CSS, etapas y handoffs expertos | `50508c6`, `d48d9dd`, `7d57edc`, `ec2adae` |
| Reset, compatibilidad, E2E y responsive | `a986aa4`, `ac108cd`, `20613e5`, `0167224` |
| Correctivos UX/UI y copy | `685ff86`, `267405a`, `605de1f`, `4351adc` |
| Diferimiento humano y verificación inicial | `7a08fca`, `0003ddb` |
| Plan y autorización P6-15A | `e318bdf`, `04eb5fc` |
| Correctivo P6-15A | `8740182`, `a94f251` |
| Cierre técnico independiente | `8ca5aab` |

## Decisiones consolidadas

- D-041: HUMAN-GATE-A bajo A1–A13.
- D-042: el ensayo humano se difiere a P6-20; solo se acepta `R6-H1` para continuar P6-15–P6-19.
- D-043: P6-15A corrige la paridad visible Journey ↔ estado dentro de un write set cerrado.

## Riesgo residual y límites del veredicto

El veredicto es `PASS WITH RISKS` únicamente por `R6-H1`. P6-14 no tiene `PASS` humano y no se sustituyó por automatización. Por tanto:

- el PR funcional puede revisarse y fusionarse manualmente;
- P6-18 puede verificar Pages y P6-19 persistir el resultado técnico;
- antes de P6-20, el estado máximo es `deployed and technically verified; human acceptance pending`;
- no se puede declarar `ready for client`, `deployed and verified` ni lista para presentación final;
- un `FAIL` o `INVALID` en P6-20 reabre el ciclo correctivo.

No existen gaps técnicos abiertos adicionales.

## Estado de ship

- P6-01–P6-13: implementación completada.
- P6-14A–P6-14D: correctivos de experiencia y copy completados.
- P6-14: `PENDING/DEFERRED` a P6-20.
- P6-15/P6-15A: verificación independiente cerrada como `PASS WITH RISKS`; G1–G5 cerrados.
- P6-16: memoria y handoff preparados para el PR funcional.
- P6-17: revisión y merge exclusivamente humanos, pendientes.
- P6-18: verificación read-only de Pages, bloqueada hasta el merge.
- P6-19: persistencia post-merge en rama/PR documental separados, pendiente.
- P6-20: testing humano integral final, pendiente y bloqueante para `ready for client`.
