# Fase 6 — Contexto de narrativa comercial, accesibilidad y QA

**Estado:** cerrado por D-044; P6-14 y P6-20 `WAIVED / NOT RUN`.

**Rama:** `feat/phase-6-commercial-narrative-qa`.

**Base:** `25300b1f7f3669fd1f5cc66567a589b69dcb93c2`, merge documental de Fase 5.

## 1. Objetivo

Convertir una demo técnicamente completa en un recorrido comercial que un lector nuevo pueda comprender, operar y recordar sin recibir instrucciones externas. La fase no añade una nueva fuente de datos ni un motor analítico: organiza los resultados de Fases 1–5 en una secuencia de decisión verificable.

La secuencia aprobada por el roadmap es:

```text
escala → geografía → calidad → profundidad → movimiento → decisión
```

## 2. Problema observable

La demo ya contiene ocho módulos correctos, ayudas por sección y navegación accesible. Sin embargo:

- los ocho módulos aparecen al mismo nivel y agrupados solo como `Análisis`/`Decisión`;
- no existe una entrada explícita al recorrido comercial ni un indicador de etapa;
- no hay una acción global de `Anterior`/`Continuar` que conecte la tesis;
- la lente territorial se repite con alta jerarquía en todas las vistas;
- varias páginas superan cinco pantallas de laptop y obligan a descubrir el orden mediante scroll;
- el usuario puede abrir evidencia, pero debe inferir por qué ese hallazgo conduce al siguiente módulo;
- el reinicio recompone el escenario, pero no existe un contrato explícito para reiniciar el recorrido;
- al inicio de la fase, el gate narrativo vigente era automatizado y el plan exigía un ensayo humano integral; D-044 eximió posteriormente ese gate y aceptó el riesgo residual.

## 3. Baseline técnico y de producto

- Fases 0–5: `deployed and verified`.
- Contrato público: `2.4.0`; runtime compatible con 2.1–2.4. Un payload 2.0 debe degradar globalmente a `contract_unavailable`.
- Dataset determinista: 676 proyectos, 184 agencias, 36 eventos históricos y siete intenciones del asistente.
- Rutas expertas: `dashboard`, `projects`, `inspector`, `market`, `compare`, `trust`, `assistant`, `activity`.
- Estado territorial único y serializado en URL.
- GitHub Pages estático; sin backend, autenticación, analítica o persistencia de consultas.
- Mapa, inspector Tipo 7, benchmark, comparador, señales y asistente ya tienen pruebas de dominio, integración, accesibilidad y responsive.

## 4. Hipótesis de solución

Crear una nueva puerta de entrada `Recorrido ejecutivo` con seis etapas enlazadas y reproducibles. Cada etapa responde una pregunta comercial, presenta una sola lectura principal, muestra la evidencia mínima necesaria y ofrece una acción primaria hacia la siguiente decisión.

Los ocho módulos actuales permanecen disponibles como `Explorar análisis`. El recorrido no duplica motores ni fija cifras en el HTML: deriva sus lecturas del escenario y de los índices públicos vigentes.

## 4.1. Autoridad de datos por etapa

El recorrido solo adapta resultados ya calculados. No vuelve a contar, clasificar, comparar ni inferir cifras. Cada claim visible debe tener una prueba de paridad con su superficie experta.

| Etapa | Selector/motor autoritativo | Claim dinámico | Procedencia visible | Aplicabilidad | Fallback y CTA correctivo | Paridad experta |
|---|---|---|---|---|---|---|
| Escala | `state.data.metadata.counts`, `state.data.pilot.counts`, `state.scenarioContext` | 184 agencias modeladas; piloto 30/22/5; cobertura del distrito activo | metadata pública, tiers del piloto y contexto territorial | 2.1–2.4 | `Cobertura no disponible`; reiniciar escenario | `#market` y resumen de escenario |
| Geografía | `state.scenarioContext` y `state.geographyArtifact` | incluidos, comparables, excluidos y alcance del escenario actual | IDs/fuente geográfica y denominadores vigentes | 2.1–2.4 | `Lectura geográfica insuficiente`; ajustar o reiniciar escenario | `#dashboard` y `#projects` |
| Calidad | caso `case:f3-ct-g-pardo` de `state.data.inspector` | discrepancia 104.15/53.37/50.78 m² y decisión de exclusión | ficha, evidencia y ledger F3 | 2.2–2.4; transversal | `Caso de calidad no disponible en este contrato`; ir a geografía | `#inspector/case/f3-ct-g-pardo` |
| Profundidad | `state.benchmarkContext` y `buildComparisonModel` | diferencias, denominadores y referencias del escenario vigente | benchmark y comparador públicos | 2.3–2.4 | `Benchmark insuficiente`; revisar comparables o metodología | `#market`, `#compare`, `#projects` |
| Movimiento | `state.historyContext` | cambios publicados, vigencia y estado del escenario vigente | eventos y referencias F5 | 2.4 | distinguir `sin eventos` de `capacidad no disponible`; volver a profundidad | `#activity` |
| Decisión | `state.assistantResponse` vigente y checklist vigente | recomendación prudente, límites y próxima acción | referencias literales de la respuesta ya generada y reglas del checklist | 2.4 | sin respuesta previa: mostrar solo resumen prudente/checklist y CTA a `#assistant`; nunca ejecutar una consulta implícita | `#assistant` y `#trust` |

La cifra 184 es el total modelado del contrato público e incluye cuatro registros controlados; 30/22/5 son niveles del piloto, no inmobiliarias adicionales ni el universo de mercado. La interfaz debe nombrar esta diferencia y no mezclar denominadores.

El caso Tipo 7 es un **caso demostrativo transversal de Miraflores**. No cambia al modificar el escenario, no alimenta sus agregados y debe rotularse como independiente del distrito activo. Si el contrato no contiene F3, el recorrido no sustituye otro proyecto ni restaura silenciosamente datos.

La etapa Decisión tampoco crea una respuesta del asistente. Si `state.assistantResponse` existe, ya fue recompuesta por el estado para el escenario/revisión vigentes y se muestra literalmente, con las mismas referencias de `#assistant`. Si es nula, se presenta únicamente el resumen prudente del checklist y un CTA para formular la consulta en `#assistant`; no se selecciona una intención ni se llama `buildAssistantResponse` desde el recorrido.

## 4.2. Matriz de compatibilidad y estados

| Contrato/estado | Escala | Geografía | Calidad | Profundidad | Movimiento | Decisión |
|---|---|---|---|---|---|---|
| Cargando | skeleton semántico; rail estable | igual | igual | igual | igual | igual |
| Error de carga | error global + `Reintentar` | error global | error global | error global | error global | error global |
| 2.0 | `contract_unavailable` global, sin cifras parciales | igual | igual | igual | igual | igual |
| 2.1 | disponible | disponible | capacidad no disponible | capacidad no disponible | capacidad no disponible | capacidad no disponible |
| 2.2 | disponible | disponible | disponible | capacidad no disponible | capacidad no disponible | capacidad no disponible |
| 2.3 | disponible | disponible | disponible | disponible | capacidad no disponible | capacidad no disponible |
| 2.4 | disponible | disponible | disponible | disponible | disponible | disponible |

Para 2.1–2.4, cada etapa también prueba su vacío/insuficiente propio: conteos ausentes, cero comparables, caso Tipo 7 ausente, benchmark con `n=0`, historial sin eventos y catálogo del asistente ausente. Todos muestran límite y CTA correctivo, y nunca `NaN`, infinito, valores de otro escenario ni contenido obsoleto.

## 5. Mapeo narrativo propuesto

| Etapa | Pregunta comercial | Momento principal | Profundización |
|---:|---|---|---|
| 1. Escala | ¿Qué mercado observable sostiene la lectura? | cobertura y carga distrital | Benchmark de microzona |
| 2. Geografía | ¿Dónde compite el proyecto? | mapa y alcance territorial | Radar y proyectos comparables |
| 3. Calidad | ¿Qué dato puede utilizarse? | caso Tipo 7 y decisión de elegibilidad | Inspector de evidencia |
| 4. Profundidad | ¿Cómo se diferencia la oferta? | comparación por filas y evidencia | Benchmark, comparador y proyectos |
| 5. Movimiento | ¿Qué cambió en el mercado? | señal certificada y vigencia | Señales del mercado |
| 6. Decisión | ¿Qué hacemos y qué no podemos afirmar? | lectura ejecutiva y límites | Asistente y checklist |

## 6. Historias dentro de alcance

- HU-DEMO-103 — estados vacíos y datos insuficientes, cierre transversal.
- HU-DEMO-104 — ayuda contextual actualizada.
- HU-DEMO-801 — recorrido guiado de la demo.
- HU-DEMO-802 — reducción de densidad y jerarquía visual.
- HU-DEMO-803 — reinicio y reproducibilidad.
- HU-DEMO-804 — navegación orientada a vender la propuesta.

Los Should ya implementados en F3–F5 se conservan. HU-DEMO-505/exportación permanece diferida.

## 7. Restricciones

1. No modificar datos, contrato 2.4, writer, fingerprints ni semántica de elegibilidad.
2. No introducir backend, analítica, autenticación, localStorage, cookies o solicitudes externas.
3. No ocultar evidencia, limitaciones, exclusiones o denominadores para acortar el relato.
4. No presentar precios publicados como precios de cierre ni atribuir causas no observadas.
5. No duplicar estado: escenario y consumidores continúan derivados de `state.js`.
6. No cargar una tipografía o librería externa.
7. No usar hover como única vía de comprensión.
8. No depender solo del color para etapa, calidad o progreso.
9. No hacer merge automático; HUMAN-GATE-A precede runtime. D-044 exime el ensayo P6-20 y conserva su ausencia como riesgo residual explícito.

## 8. Riesgos principales

| Riesgo | Severidad | Tratamiento |
|---|---:|---|
| El recorrido se convierte en una maqueta desconectada | Alta | todas las cifras se derivan de motores/estado actuales y se prueban contra las vistas expertas |
| Simplificar oculta restricciones | Alta | cada etapa incluye `Qué sabemos`, `Qué falta` y enlace a evidencia |
| Dos fuentes de navegación divergen | Alta | etapa derivada de ruta canónica; un solo catálogo de journey |
| Cambiar `/` rompe deep-links o tests | Alta | conservar aliases; probar `/`, hashes legacy, atrás/adelante y recarga |
| Un stepper genérico no mejora la venta | Media | cada etapa codifica una decisión real y produce un resultado específico |
| Densidad reaparece en móvil/200% | Media | presupuesto de contenido, divulgación progresiva y gate geométrico |
| El ensayo automatizado puede ocultar confusión humana | Alta | D-044 acepta el riesgo y traslada cualquier ensayo real a una UAT futura fuera de este plan |

## 9. Criterio de éxito original y cierre aprobado

La aceptación humana final exige que un usuario nuevo inicie el recorrido, complete seis etapas, abra mapa e inspector, llegue a una decisión prudente y pueda explicar:

1. qué cubre la muestra;
2. cómo se delimita el escenario;
3. por qué Tipo 7 queda excluido;
4. qué diferencias están respaldadas por evidencia;
5. qué cambió y qué no puede afirmar el asistente.

Debía lograrlo en no más de diez minutos, sin consultar código ni recibir instrucciones del implementador. Este criterio humano no fue ejecutado: D-044 lo exime explícitamente y cierra la versión como final técnica, sin afirmar validación humana. Una prueba posterior será UAT nueva y no una reapertura implícita del desarrollo concluido.
