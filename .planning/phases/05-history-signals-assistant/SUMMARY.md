# Fase 5 — Resumen de histórico, señales y asistente

**Fecha de cierre técnico:** 2026-08-04

**Estado:** implementación y verificación independiente completadas; P5-14 versionada y PR funcional [#15](https://github.com/stefano-mt/viva-inteligencia-demo/pull/15) abierto como borrador; revisión humana, merge y verificación de GitHub Pages pendientes

**Veredicto independiente:** `PASS`

## Resultado

La Fase 5 convierte observaciones históricas compatibles en señales comerciales prudentes y reemplaza el asistente heredado por una lectura determinista del escenario activo. La demo permite explicar qué precio publicado cambió, entre qué cortes se observó, qué tan vigente y confiable es la señal y qué evidencia la respalda, sin convertir publicaciones en ventas ni atribuir causas no observadas.

Las rutas `#activity` y `#assistant` ofrecen ahora:

- un cuaderno vertical limitado a la muestra canónica del escenario;
- valores anterior y nuevo, delta, porcentaje válido, fechas, vigencia, estado y razón;
- detalle de dos observaciones y evidencias autorizadas sin depender del hover;
- una agenda reproducible de hasta tres acciones, ordenada por calidad antes que magnitud;
- un asistente local de catálogo cerrado, con siete familias y seis bloques trazables;
- referencias navegables hacia proyecto, señal, benchmark, comparador o Inspector;
- rechazos explícitos para precio real de cierre, causalidad, predicción, PII y búsqueda externa;
- degradación honesta para contratos 2.0–2.3 y escenarios sin eventos elegibles;
- experiencia responsive, operable por teclado y verificada a reflow equivalente al 200%.

La consulta del asistente vive únicamente en memoria. No se persiste en URL o almacenamiento, no ejecuta solicitudes externas y no utiliza IA generativa.

## Historias entregadas

| Historia | Resultado confirmado |
|---|---|
| HU-DEMO-601 | Línea de tiempo de cambios publicados, limitada al escenario y con valores, fechas, vigencia, estado y referencias. |
| HU-DEMO-602 | Estados `certified`, `reviewable` e insuficiente/excluido explicados; la calidad y vigencia preceden a la magnitud. |
| HU-DEMO-603 (`Should`) | Agenda de seguimiento determinista de máximo tres filas, con origen visible y fallback prudente. |
| HU-DEMO-701 | Asistente basado en el mismo escenario, benchmark, histórico, comparador e Inspector de la demo. |
| HU-DEMO-702 | Respuestas cualitativas solo con hechos y evidencias autorizadas; desconocido o restringido devuelve insuficiencia. |
| HU-DEMO-703 | Rechazo explícito y trazable de precio real de cierre y demás preguntas no sostenibles. |

Los criterios completos y su evidencia están en [PLAN.md](PLAN.md) y [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md).

## Contrato, datos y determinismo

| Dimensión | Resultado | Alcance / autoridad |
|---|---:|---|
| Contrato público | `2.4.0` | `metadata.contract_version` del payload público |
| Compatibilidad del reader | `2.0`–`2.4` | Schema y reader de la demo |
| Fecha de corte | `2026-07-28T01:24:28Z` | `metadata.cutoff_at` y `history.policy.cutoff_at` |
| Proyectos / agencias | 676 / 184 | Totales autoritativos de `model` en el payload 2.4 |
| Piloto | 30 base / 22 enriched / 5 deep | Selección acumulativa: cobertura, multifuente e inspección profunda |
| Observaciones / hechos | 499 / 4,093 | Totales de `model` en el payload 2.4 |
| Documentos / evidencias | 20 / 91 | Totales de `model` en el payload 2.4 |
| Candidatos con cambio | 42 | Universo final auditado por el materializador |
| Eventos materializados | 36 | 31 `certified` + 5 `reviewable` |
| Candidatos excluidos | 6 | 5 por identidad y 1 por moneda desconocida; no son eventos |
| Puntos temporales nuevos | 72 | 36 eventos × 2 cortes |
| Registros históricos nuevos | 216 | Cada punto tiene 1 observación + 1 hecho + 1 evidencia |
| Catálogo del asistente | 7 intenciones / 5 limitaciones | Índice autoritativo `assistant` |
| Fingerprints ordenados | 52 | Entradas reproducibles del build, no eventos históricos |
| Causas atribuidas | 0 | `cause = null` en los 36 eventos |

Artefactos verificados:

| Artefacto | SHA-256 |
|---|---|
| [viva-platform-demo.json](../../../prototipo_ejecutable/public/demo-data/viva-platform-demo.json) | `20d44245c956a198c8621b3f544115387037b73cc462e50f63a5ce6d61fb4a37` |
| [coverage-report.json](../../../datos_relevantes/demo-pilot/coverage-report.json) | `639b613aff89f9605c3dcc74a7914700dfa89fb84ababe70910fc25c3ba81864` |
| [GeoJSON territorial](../../../datos_relevantes/geography/district-boundaries-source.geojson) | `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0` |

Dos builds consecutivos produjeron el mismo resultado. Los contratos 2.0–2.3 no reconstruyen histórico desde `projects[].price_delta_pct`; muestran capacidad limitada de forma explícita.

### Linaje de conteos históricos

Los 34 preliminares son el subconjunto de los 42 cambios no nulos cuya variación estaba dentro de ±30%. De esos 34, 31 tenían identidad canónica y se certificaron; 3 se excluyeron por identidad. Los 8 candidatos restantes estaban fuera de ese umbral: 5 outliers canónicos se conservaron como `reviewable` y 3 se excluyeron. Los tres eventos controlados de CT-E son fixtures de prueba separados y no pertenecen a este universo de 42. La policy produjo exactamente:

```text
42 candidatos = 36 eventos materializados + 6 candidatos excluidos
36 materializados = 31 certified + 5 reviewable
6 excluidos = 3 del subconjunto preliminar + 3 fuera del umbral
36 eventos × 2 cortes = 72 puntos temporales
72 puntos × (observación + hecho + evidencia) = 216 registros nuevos
```

Los 52 fingerprints pertenecen a los inputs del build reproducible; no son proyectos, candidatos ni eventos.

## Cuaderno de señales

La lectura histórica separa tres universos:

1. eventos materializados por policy;
2. eventos visibles por pertenecer a `scenarioContext.comparableProjectIds`;
3. eventos certificados o revisables según calidad y vigencia.

Para Miraflores, el escenario de distrito completo conserva 90 proyectos observados y 85 comparables. La vista muestra cinco cambios certificados por defecto y permite ampliar la lista sin scroll infinito. Cada fila expone precio publicado anterior y nuevo, ambas fechas, delta, porcentaje, vigencia, estado y acciones de evidencia/proyecto.

Los cinco outliers auditados permanecen `reviewable`; una variación extrema no supera a una señal certificada por magnitud. Los seis candidatos excluidos no reaparecen en la lectura. La causa de los 36 eventos permanece `null`.

## Agenda de seguimiento

La agenda consume el orden del motor y presenta hasta tres acciones después de la línea de tiempo. Cada acción conserva evento de origen, proyecto, fecha y conteos de hechos/evidencias. Si el escenario no tiene señal elegible, la agenda propone revisar filtros o cobertura; no inventa una oportunidad ni afirma actividad semanal.

## Asistente determinista

El asistente publica una promesa explícita: `Lectura determinista · sin IA generativa`. Reconoce un catálogo cerrado de siete familias: resumen del escenario, cambios observados, señal prioritaria, cobertura y calidad, atributos documentados, comparación de proyectos y límites de la demo.

Cada respuesta utiliza seis bloques:

1. respuesta breve;
2. datos usados;
3. lectura;
4. límites;
5. referencias;
6. siguiente paso.

Las cifras provienen de los motores puros que alimentan el escenario, benchmark, histórico y comparador. Una afirmación cualitativa exige proyecto dentro del escenario, hecho elegible, observación relacionada y evidencia autorizada. Las preguntas desconocidas muestran alternativas compatibles.

El guardrail tiene precedencia sobre la clasificación. Precio real de cierre, causalidad, predicción, datos personales y búsqueda externa producen un rechazo determinista antes de generar una lectura afirmativa.

## Casos transversales

| Caso | Resultado |
|---|---|
| CT-C | Señales y asistente usan exactamente el subconjunto canónico; mencionar otro distrito no cambia el escenario. |
| CT-D | Un claim cualitativo requiere fact ID y evidence ID autorizados y permite abrir la evidencia. |
| CT-E | Anterior/nuevo, delta, porcentaje nullable, fechas, vigencia, estado y causa nula permanecen trazables. |
| CT-F | El asistente rechaza precio real de cierre y no genera una estimación automática. |
| CT-G | Tipo 7 conserva 104.15 m², 53.37 m², diferencia 50.78 m² y exclusión; evidencia restringida falla cerrada. |
| CT-I | Miraflores conserva 90/85 y los estados desconocidos no se convierten en evidencia positiva. |
| CT-P | PII/geolocalización se rechazan; la consulta no se guarda y no existe red externa. |

## Privacidad y narrativa

La verificación confirmó:

- cero PII, secretos o rutas locales en el payload público;
- cero consultas persistidas;
- cero solicitudes externas desde Histórico o Asistente;
- cero evidencia restringida convertida en claim positivo;
- precios nombrados como publicados, nunca como venta o cierre;
- cambios descritos como observados/detectados entre cortes;
- cero causas atribuidas sin evidencia;
- contenido del usuario escapado y no reflejado como HTML.

La demo permanece estática y reproducible. No incorpora LLM, RAG, web search, CRM, scraping, OCR o backend.

## UI, responsive y accesibilidad

Fase 5 sustituye la sobrecarga de tarjetas por progresión vertical:

1. contexto territorial compacto;
2. propósito de la ruta;
3. resumen de calidad o preguntas compatibles;
4. lectura principal por filas;
5. detalle y evidencia bajo demanda;
6. agenda o siguiente paso.

P5-12 y P5-13 verificaron:

- 1440×900, 1280×720 y 390×844;
- reflow equivalente a 200%;
- texto principal ≥16 px y metadata ≥14 px;
- contraste AA ≥4.5:1 y foco visible;
- targets relevantes ≥44×44;
- `prefers-reduced-motion`;
- navegación completa por teclado y retorno de foco;
- ausencia de overflow, solapamiento o truncamiento crítico;
- cero errores de consola, página, HTTP o red externa.

## Evidencia portable

La evidencia visual está versionada en [evidence/p5-12](evidence/p5-12/) e incluye trece capturas:

- actividad y asistente en los tres viewports obligatorios;
- reflow 200% para ambas rutas;
- actividad vacía, solo revisable y contrato legacy;
- asistente CT-F y contrato legacy.

La comparación con [evidence/baseline](evidence/baseline/) demuestra que desaparecieron los distritos ajenos, los outliers legacy sin estado y el asistente sin referencias. Las capturas P5-07, P5-08 y P5-10 documentan la evolución intermedia.

El smoke recorre estas ocho rutas: Radar, Proyectos, Inspector, Benchmark, Comparador, Checklist, Señales y Asistente. Los comandos y resultados completos están en [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md).

## Verificación independiente

El checker `/root/p5_13_checker`, sin autoría en la fase, evaluó el commit funcional:

```text
8e76b796b1fef3616b5a0b7a5526a72d2f125e2c
```

Resultado:

- `npm.cmd run verify`: PASS en aproximadamente 7 min 45 s;
- CT-C/D/E/F/G/I/P: PASS;
- contrato 2.4, compatibilidad, determinismo y privacidad: PASS;
- smoke y accesibilidad: 8 rutas × 3 viewports;
- responsive y 200%: PASS;
- Graphify: 3,425 nodos y 6,536 relaciones, sin hub nuevo bloqueante;
- recorrido UI-only en Chrome: PASS, sin errores ni red externa.

**Veredicto vigente:** `PASS`.

No se requiere HUMAN-GATE-B.

## Commits de la fase

| Tarea | Commit |
|---|---|
| Plan | `ae55fa5` |
| HUMAN-GATE-A | `8182509` |
| P5-00D | `550d845` |
| P5-01 | `29175f6` |
| P5-02 | `1ac4b40` |
| P5-03 | `e136e91` |
| P5-04 | `642e567` |
| P5-05 | `af41a34` |
| P5-06 | `1c1175e` |
| P5-07 | `4e2b0b3` |
| P5-08 | `d722645` |
| P5-09 | `9dfd953` |
| P5-10 | `89e9b15` |
| P5-11 | `25c1c0c` |
| P5-12 | `8e76b79` |
| P5-13 | `a24ed13` |

## Decisiones consolidadas

- D-033: A1–A12 y HUMAN-GATE-A.
- D-034: contrato 2.4 con `history` y `assistant` autoritativos.
- D-035: calidad histórica separada de visibilidad territorial.
- D-036: 34 preliminares explicados y 36 eventos materializados por policy.
- D-037: adopción 2.4 sin duplicar escenario.
- D-038: columna de evidencia y divulgación nativa.
- D-039: agenda que conserva la prioridad del motor.
- D-040: catálogo cerrado y referencias estructuradas.

No hubo enmiendas técnicas de Fase 5 que ampliaran contrato, runtime o dataset después de HUMAN-GATE-A.

## Riesgos y notas no bloqueantes

1. El recorrido comercial del checker fue automatizado; se recomienda un ensayo humano breve antes de presentar al cliente. No es un gate técnico de merge.
2. Graphify representa parcialmente CSS/JSON; se complementó con contratos, hashes, imports, pruebas y navegador.
3. Persisten helpers legacy no alcanzables en `domain.js` y `views/assistant.js`; su limpieza corresponde a Fase 6 con prueba de paridad.
4. Seis hard-breaks Markdown históricos en P5-10/P5-11 no afectan comportamiento ni reproducibilidad.

No existen gaps altos o medios. Ninguna nota altera el `PASS` ni exige HUMAN-GATE-B.

## Estado de ship

- P5-01–P5-12: implementación completada.
- P5-13: checker independiente `PASS`.
- P5-14: memoria versionada y PR funcional #15 abierto como borrador.
- Merge: exclusivamente humano y pendiente.
- P5-15: verificación read-only de GitHub Pages, bloqueada hasta el merge.
- P5-16: persistencia post-merge en rama/PR documental separados, pendiente.
- Despliegue de Fase 5: **no demostrado todavía**.
