# P5-13 — Verificación independiente formal de Fase 5

**Fecha:** 2026-08-04

**Checker:** `/root/p5_13_checker`, sin autoría en los commits de Fase 5

**Rama verificada:** `feat/phase-5-history-signals-assistant`

**Baseline:** `47a794ca00b451355a181acf5c20feeee0fdccb4`

**HEAD verificado:** `8e76b796b1fef3616b5a0b7a5526a72d2f125e2c`

## Veredicto

**PASS**

Fase 5 cumple HU-DEMO-601–603 y HU-DEMO-701–703, el contrato público `2.4.0`, CT-C/D/E/F/G/I/P y la Definition of Done aprobada. El gate completo pasó de forma independiente, el recorrido UI-only reprodujo los ocho momentos comerciales sin errores ni solicitudes externas, y no se encontraron defectos funcionales, de datos, privacidad, accesibilidad o narrativa que requieran volver al maker.

El resultado habilita **P5-14: memoria, handoff y preparación del pull request funcional**. No se requiere HUMAN-GATE-B.

## Alcance y método

El checker leyó las fuentes de verdad obligatorias, la aprobación A1–A12, la evaluación técnica, la especificación UI, el plan y los reportes P5-01 a P5-12. Revisó el rango completo `47a794c..8e76b79`, su manifiesto de pruebas, el dataset construido, el grafo vigente, imports y rutas de runtime. No modificó código, datos, tests, estilos, estado ni evidencia; el único archivo creado es este informe.

La verificación combinó:

- gate integral reproducido desde `prototipo_ejecutable/`;
- inspección adversarial de contrato, imports, términos prohibidos, referencias y hashes;
- revisión visual directa de las 13 capturas P5-12 y las cuatro capturas baseline;
- recorrido comercial automatizado en Google Chrome headless, usando únicamente controles y texto visibles durante el recorrido;
- contraste de los límites de Graphify con `rg`, imports y las suites ejecutables.

## Commit y diff

- Rama limpia y sincronizada con `origin/feat/phase-5-history-signals-assistant` al iniciar y al cerrar.
- 15 commits de fase desde `ae55fa5` hasta `8e76b79`, ordenados por plan, aprobación, baseline y P5-01–P5-12.
- Rango funcional revisado: 103 archivos, 18,950 inserciones y 1,153 eliminaciones.
- Los cambios se mantienen dentro de los write sets aprobados: contrato/datos, writer, motores, integración, dos vistas, estilos, tests, evidencia y memoria.
- No se modificaron logos, activos de producto, geometría, fuentes F2–F4 ni semántica territorial/benchmark/Inspector fuera de las extensiones compatibles aprobadas.
- `git diff --check` sobre el working tree: PASS.
- Auditoría adicional `git diff --check 47a794c..HEAD`: seis advertencias de espacios finales en encabezados Markdown de P5-10/P5-11 usados como saltos de línea. No afectan código, datos, render ni reproducibilidad; se registran como higiene documental de severidad baja para P5-14.

## Checks ejecutados

### Gate integral

`npm.cmd run verify`: **PASS**, exit code 0, duración aproximada 7 min 45 s.

La ejecución independiente incluyó, sin omitir suites previas:

| Capa | Resultado |
|---|---|
| Sintaxis y `check:phase5` | PASS |
| Grafo modular | PASS — 24 módulos alcanzables, contexto único 90/85 y una recomposición por cambio |
| Escenario, CT-C y CT-I | PASS |
| Contrato y compatibilidad 2.0–2.4 | PASS |
| Schema y validator | PASS |
| Geografía y referencias | PASS |
| Agencias 30/22/5 | PASS |
| Evidencia, medidas e Inspector | PASS |
| Policy, fixtures y materializador F5 | PASS |
| Dataset público 2.4 | PASS |
| Motores/estado/vistas de histórico | PASS |
| Motores/estado/vistas de asistente | PASS |
| Determinismo y fingerprints | PASS |
| Privacidad | PASS |
| Benchmark y Comparador F4 | PASS |
| E2E escenario/Inspector/Benchmark/Comparador/F5 | PASS |
| Responsive F5 y reflow 200% | PASS |
| Smoke y accesibilidad 8 rutas × 3 viewports | PASS |

No se relajó ni omitió una prueba para obtener el resultado.

### Controles complementarios

- Hash directo del JSON público: `20d44245c956a198c8621b3f544115387037b73cc462e50f63a5ce6d61fb4a37`.
- Hash directo del reporte de cobertura: `639b613aff89f9605c3dcc74a7914700dfa89fb84ababe70910fc25c3ba81864`.
- Hash directo del GeoJSON: `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0`.
- Dos builds lógicos y comparación byte a byte: PASS mediante `test:data:determinism`.
- Escáner de privacidad: PASS, cero hallazgos en payload, benchmark, reporte, manifiesto y 15 activos autorizados.
- Búsqueda dirigida en motores F5: cero DOM, reloj del dispositivo, storage, geolocalización, red, SDK de IA o proveedor externo.
- Navegador independiente: cero errores de consola, página, HTTP o requests fallidos; cero hosts externos durante el recorrido funcional.

## Contrato, dataset y trazabilidad

| Control | Resultado observado |
|---|---|
| Contrato público | `2.4.0` |
| Dataset | `dataset:viva-platform-demo-2026-07-28` |
| Inputs fingerprinted | 52, únicos y ordenados |
| Proyectos autoritativos | 676 |
| Agencias canónicas/control | 184 |
| Piloto | 30 base, 22 enriched, 5 deep |
| Observaciones | 499 totales; 72 históricas nuevas |
| Hechos | 4,093 totales; 72 históricos nuevos |
| Evidencias | 91 totales; 72 históricas estructuradas |
| Documentos | 20 totales; un snapshot histórico nuevo |
| Candidatos con cambio | 42 |
| Eventos materializados | 36 |
| Certificados / revisables | 31 / 5 |
| Excluidos | 6: 5 `entity_mismatch`, 1 `unknown_currency` |
| Índice por proyecto / distrito | 36 / 15 |
| Causas atribuidas | 0 |
| Catálogo del asistente | 7 intenciones, 5 limitaciones |

Cada evento histórico resuelve dos observaciones, dos hechos y evidencia estructurada. Los hechos históricos permanecen fuera del benchmark certificado. Las 36 causas son `null`; las vigencias se calculan contra el cutoff versionado. El asistente declara `deterministic_catalog`, `query_persistence=false`, `external_requests=false` y límite de 500 caracteres.

## Matriz CT-C/D/E/F/G/I/P

| Caso | Capas comprobadas | Resultado |
|---|---|---|
| CT-C — escenario único | Fixture, escenario, history engine, assistant engine, E2E, cambio de distrito/alcance | PASS: actividad y respuesta usan `comparable_project_ids`; mencionar otro distrito no muta el escenario |
| CT-D — cualitativo autorizado | Fixture, Inspector, assistant engine, E2E | PASS: el claim requiere fact ID y evidence ID autorizados y abre su evidencia |
| CT-E — cambio histórico | Fixture, materializador, history engine, UI y recorrido | PASS: anterior/nuevo, delta, porcentaje nullable, fechas, vigencia, estado, referencias y causa nula |
| CT-F — cierre real | Fixture, assistant engine, UI móvil y recorrido | PASS: rechazo explícito; no calcula ni sugiere precio real de cierre |
| CT-G — incompatibilidad/restricción | Inspector, history engine, assistant engine, E2E | PASS: Tipo 7 conserva 104.15/53.37/50.78 y la exclusión; evidencia restringida falla cerrada |
| CT-I — alta carga/desconocido | Escenario, Miraflores 90/85, history engine, assistant engine | PASS: estados desconocidos no se vuelven positivos y toda la muestra conserva paridad |
| CT-P — privacidad | Fixtures, scanner, motor y navegador | PASS: PII/geolocalización se rechazan; sin persistencia ni red externa |

## Historias verificadas

### HU-DEMO-601 — Línea de tiempo de cambios

**PASS.** La vista usa únicamente el escenario canónico, orden estable y hasta cinco señales iniciales. Cada fila muestra precio publicado anterior/nuevo, delta, porcentaje válido o ausencia explicada, fechas, vigencia, estado, proyecto y evidencia. Base cero no produce infinito; cronología, moneda, semántica y referencias inválidas degradan fail-closed. Proyecto y evidencia se abren preservando escenario.

### HU-DEMO-602 — Validez y estado

**PASS.** Certificada, por revisar e insuficiente tienen texto, icono, razón y contraste. La vigencia usa cutoff fijo. Calidad y vigencia preceden a magnitud; el estado Santiago de Surco demuestra que `+359.5%` queda por revisar y no lidera sobre señales certificadas. La banda muestra detectados, certificados, revisables y cobertura; filtros locales no mutan escenario.

### HU-DEMO-603 — Agenda de seguimiento

**PASS.** La agenda deriva del motor, tiene máximo tres filas, conserva orden y origen, y navega a la señal. En escenario vacío propone validar cobertura o filtros, no una oportunidad. No atribuye frecuencia semanal ni causalidad.

### HU-DEMO-701 — Asistente del escenario activo

**PASS.** Distrito, alcance, corte y 85 comparables provienen del escenario vigente. Las cifras se construyen en el motor puro y coinciden con Benchmark/Comparador. La navegación conserva escenario. La consulta vive solo en memoria, no entra en URL/storage y no genera red.

### HU-DEMO-702 — Preguntas cualitativas/documentales

**PASS.** Solo se resuelven las siete familias publicadas. Una afirmación cualitativa exige hecho elegible, observación relacionada, evidencia autorizada/disponible y proyecto dentro del escenario. Desconocido, restringido, contradictorio o incompatible retorna insuficiencia. Las referencias son navegables.

### HU-DEMO-703 — Insuficiencia y rechazo prudente

**PASS.** Cierre real, causalidad, predicción, PII y búsqueda externa se interceptan antes de clasificar. Intención desconocida presenta preguntas compatibles. La entrada se escapa y no se refleja como HTML. No existe cálculo automático de estimación F5.

## Arquitectura y Graphify

El mapa Graphify vigente posterior a P5-10 contiene **3,425 nodos y 6,536 relaciones**. P5-11 y P5-12 no alteraron JavaScript de runtime ni writer: añadieron tests, manifiesto, estilos y evidencia. Por ello el mapa sigue representando el recorrido lógico verificado.

Hallazgos confirmados por grafo, imports y pruebas:

- `activity.js` consume `state.historyContext` y usa `history.js` solo para resolver detalle; no llama `marketEvents`, `weeklyRecommendations` ni `price_delta_pct` legacy.
- `assistant.js` consume `state.assistantResponse`; `state.js` importa `buildAssistantResponse` exclusivamente desde `assistant-engine.js`.
- `state.js` importa `buildHistoryContext` desde `history.js` y deriva ambos contextos después del escenario/benchmark.
- Los motores F5 no leen DOM, storage, reloj, red o SDK externo.
- El recorrido efectivo es vista → controlador → estado → motor puro; no existe un hub nuevo bloqueante.

Graphify no cubre CSS/JSON con la misma fidelidad. Esa limitación se cerró con hashes, contratos, búsqueda de imports, pruebas de vista y Playwright. Permanecen helpers legacy no referenciados en `domain.js` y en la primera mitad de `views/assistant.js`; `rg` confirma que el runtime no los invoca. Se registra como deuda técnica baja, no como dependencia funcional.

## Evidencia visual, responsive y accesibilidad

Se revisaron directamente las 13 capturas de `evidence/p5-12/`:

- actividad y asistente en 1440×900, 1280×720 y 390×844;
- reflow equivalente a 200% de ambas rutas;
- actividad vacía, solo revisable y contrato legacy;
- asistente CT-F y contrato legacy.

También se revisaron las cuatro capturas baseline y evidencia P5-07/P5-08/P5-10 referenciada por los reportes. La comparación confirma:

- desaparición de distritos ajenos y outliers legacy sin estado;
- reemplazo del mosaico por progresión vertical;
- valores antes/después y calidad visibles sin hover;
- agenda limitada a tres acciones;
- asistente en seis bloques con referencias, límites y siguiente paso;
- degradación explícita en contrato 2.3;
- sin scroll horizontal, solapes o truncamiento crítico en la evidencia final.

La suite responsive verificó cuerpo ≥16 px, metadata ≥14 px, contraste AA ≥4.5:1, objetivos ≥44×44, foco visible, `prefers-reduced-motion`, reflow 200% y preservación de foco. Smoke/a11y pasó ocho rutas × tres viewports con landmarks, nombres accesibles y teclado.

## Recorrido comercial UI-only

El checker realizó un recorrido **automatizado** en Chrome headless, 1440×900, sin consultar código durante la navegación. Se usaron los ocho botones visibles del menú y cada uno produjo la ruta y `h1` esperados:

1. `#dashboard` — Radar comercial;
2. `#projects` — Proyectos comparables;
3. `#inspector` — Inspector de evidencia;
4. `#market` — Benchmark de microzona;
5. `#compare` — Comparador comercial;
6. `#trust` — Checklist comercial;
7. `#activity` — Señales del mercado;
8. `#assistant` — Asistente de estrategia.

Durante el recorrido:

- Inspector mostró 104.15 m², 53.37 m², diferencia 50.78 m² y la exclusión correspondiente;
- Se abrió y cerró una señal mediante `Ver evidencia`, con dos observaciones, precio publicado y causa no observada;
- El asistente recibió “¿Cuál es el precio real de cierre del competidor?” y mostró el rechazo CT-F, modo sin IA generativa, consulta no guardada y los seis bloques;
- no hubo errores de consola, página, HTTP ni solicitudes externas.

El recorrido demuestra el gate narrativo de forma reproducible. Por tratarse de un checker automatizado, se conserva la recomendación ya vigente de realizar un ensayo humano breve antes de presentar al cliente; no bloquea P5-14.

## Narrativa y privacidad

**PASS.** La interfaz y motores usan “precio publicado” y aclaran que no representa venta, transacción o cierre. Un cambio se describe como observado/detectado entre dos cortes, no como acción ocurrida en una fecha exacta. No se atribuyen causas sin evidencia. Las señales revisables no se presentan como oportunidades certificadas.

El asistente declara de forma prominente “Lectura determinista · sin IA generativa”, no promete búsqueda libre y ofrece catálogo cerrado. CT-F, causalidad, predicción, datos personales y fuentes externas tienen rechazo explícito. El payload no contiene PII, secretos, rutas locales, consultas ni activos restringidos.

## Regresiones

**PASS.** Fases 2–4 mantienen:

- escenario canónico y selección territorial;
- 90/85 en Miraflores;
- mapa y comparabilidad;
- Inspector CT-D/CT-G y 15 activos autorizados;
- Benchmark 397 entradas, 37 atributos y política de pairing;
- Comparador, checklist y navegación;
- contratos 2.1–2.3 con degradación F5 explícita;
- ocho rutas en los tres viewports soportados.

## Trazabilidad de Definition of Done

| Criterio de PLAN §1 | Evidencia | Resultado |
|---|---|---|
| CT-C/D/E/F/G/I/P en todas las capas | Fixtures, dominio, integración, E2E, navegador | PASS |
| Contrato 2.4 determinista, privado, trazable y reader 2.0–2.4 | Contract/schema, hashes, privacy, compatibility | PASS |
| Activity limitada a muestra canónica | History engine, state, E2E y captura Miraflores | PASS |
| Evento con valores, fechas, vigencia, estado y referencias | Dataset, motor, UI y detalle | PASS |
| Causa solo con evidencia causal | 0 causas, schema y mutaciones | PASS |
| Asistente usa motores y coincide con rutas | Imports, state, domain/E2E y recorrido | PASS |
| Cualitativo autorizado o rechazo | CT-D/G/I, engine y evidencia | PASS |
| CT-F rechaza cierre real | Fixture, engine, captura y recorrido | PASS |
| 8 rutas × 3 viewports, teclado, contraste, 200% | verify, responsive, smoke, a11y | PASS |
| Checker independiente | Este informe | PASS |
| Memoria/handoff/PR | Pertenece a P5-14 | HABILITADO |

## Gaps y severidad

| Gap | Severidad | Impacto | Tratamiento |
|---|---:|---|---|
| Ensayo comercial final no humano | Baja / gobernanza | No afecta comportamiento; reduce confianza operativa antes de una presentación real | Realizar ensayo humano breve en revisión de PR o antes de la demo |
| Helpers legacy muertos en `domain.js`/`views/assistant.js` | Baja / deuda técnica | No son alcanzables por el runtime F5, pero aumentan superficie de mantenimiento | Considerar limpieza en F6 con prueba de paridad; no ampliar P5-14 |
| Seis hard-breaks Markdown reportados por diff histórico | Baja / documentación | Sin efecto funcional | Normalizar durante P5-14 si no se desea conservar el salto explícito |
| Graphify omite CSS/JSON | Baja / herramienta | No cubre por sí solo estilos ni datos | Ya compensado con hashes, imports, contratos, Playwright y revisión visual |

No hay gaps altos o medios ni riesgos que requieran aceptación humana especial.

## Recomendación de gate

**Continuar con P5-14.** Preparar `SUMMARY.md`, `HANDOFF.md`, evidencia portable y el pull request funcional. Mantener `npm.cmd run verify` verde y no introducir cambios funcionales durante la memoria. HUMAN-GATE-B no aplica al veredicto `PASS`.
