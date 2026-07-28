# Fase 2 — Plan de ejecución

## Estado

`REVIEWED — PASS WITH RISKS; pendiente HUMAN-GATE-A y P2-00C; implementación no iniciada`

## Objetivo verificable

Implementar un escenario geográfico estático, reproducible y compartible que permita seleccionar distrito, cuadrante analítico o radio; derive un único conjunto de comparables para todos los módulos; presente un mapa accesible; explique el score; y diagnostique un precio simulado Viva frente a precios publicados compatibles.

## Alcance funcional

La fase cubre:

- HU-DEMO-101, 102 y 103;
- HU-DEMO-201 a 205;
- HU-DEMO-301 y 302;
- CT-C y CT-I.

La fase no certifica todavía el benchmark cualitativo de F4, no resuelve la discrepancia tarjeta/plano de F3 y no amplía el histórico o asistente documental de F5.

## Historias y criterios de aceptación

### HU-DEMO-101 — Barra global de contexto

Como analista comercial, quiero ver y modificar el escenario activo desde cualquier sección para saber qué universo alimenta la lectura.

Aceptación:

1. La barra muestra distrito, alcance territorial, fecha de corte, cobertura territorial y suficiencia de comparabilidad como ejes separados.
2. Distrito, cuadrante/radio y filtros de producto pertenecen a un único `scenario`.
3. No existen tres valores independientes de distrito con capacidad de divergir.
4. Cambiar el escenario actualiza mapa, lectura de mercado, comparador y asistente.
5. La URL reproduce el escenario después de recargar.
6. `sv` o distrito inválidos reinician todo; dependencias territoriales inválidas vuelven a distrito; cada filtro de producto inválido vuelve únicamente a su default; ningún caso rompe la aplicación.
7. Reiniciar elimina el estado serializado y restaura el preset versionado.
8. Los controles tienen nombre accesible, foco visible y funcionan con teclado.

### HU-DEMO-102 — Fecha de corte, cobertura y suficiencia

Como usuario de la demo, quiero ver vigencia y cobertura para interpretar las cifras con prudencia.

Aceptación:

1. La fecha proviene de `metadata.cutoff_at`, no de texto fijo.
2. Se muestra incluidos/total y porcentaje de cobertura geográfica.
3. La cobertura territorial y la elegibilidad de precio se muestran como denominadores separados.
4. Los excluidos se agrupan por etapa y motivo: alcance, geografía, reconciliación, producto o precio.
5. Los ejes `scenario_status`, `geography_status`, `comparability_status` y `price_status` no se fusionan.
6. La información está visible sin abrir un tooltip.
7. La fuente cartográfica, fecha del snapshot y carácter referencial se pueden consultar.

### HU-DEMO-103 — Estados vacíos y datos insuficientes

Como analista, quiero que la plataforma degrade de forma honesta para no interpretar un fallback como resultado real.

Aceptación:

1. Radio sin resultados muestra cero y no vuelve al distrito en silencio.
2. Menos de tres precios compatibles bloquea el diagnóstico fuerte.
3. Geometría ausente conserva la lista y explica la limitación.
4. Coordenadas inválidas se excluyen y cuentan; nunca se convierten a `(0,0)`.
5. Carga, error, vacío e insuficiencia tienen contenido y acción clara.
6. Ningún cálculo produce `NaN`, infinito o texto engañoso.

### HU-DEMO-201 — Selección de cuadrante o radio

Como analista, quiero acotar la zona para comparar proyectos que compiten territorialmente.

Aceptación:

1. El usuario puede elegir distrito, cuadrante analítico o radio.
2. Cuadrante solo está disponible para distritos `high_load`.
3. Radio admite 500, 1,000 y 1,500 m.
4. El punto Viva está dentro del distrito o produce validación explícita.
5. Distancia usa Haversine con resultado determinista.
6. Cambiar alcance conserva filtros de producto compatibles.
7. El alcance textual y el conteo se actualizan juntos.

### HU-DEMO-202 — Mapa geográfico de competidores

Como analista, quiero ver la ubicación de competidores para reconocer concentración y proximidad.

Aceptación:

1. El mapa usa geometría versionada y puntos del dataset.
2. No realiza llamadas externas durante la demo.
3. Distingue incluido, seleccionado, excluido y escenario Viva por forma, borde y texto.
4. Click y teclado abren un detalle persistente.
5. Hover es complementario.
6. La leyenda, escala, norte, atribución y fecha del snapshot son legibles.
7. La lista accesible contiene la misma selección relevante del mapa.
8. El mapa mantiene tamaño útil en los tres viewports.
9. Los observados no reconciliados se distinguen y no reciben score.

### HU-DEMO-203 — Score explicable de comparabilidad

Como analista, quiero entender el score para no tratar un ranking opaco como verdad.

Aceptación:

1. El score total está entre 0 y 100.
2. Cada componente muestra peso disponible, puntos y dato comparado.
3. Geografía, área, dormitorios, tipología, entrega y precio están separados.
4. Faltantes reducen cobertura y se muestran como no evaluados.
5. Cobertura menor a 60% produce etiqueta `orientativo`.
6. El orden es estable ante inputs equivalentes.
7. Cantidad de unidades no aporta puntos de similitud.
8. Tests cubren coincidencia exacta, parcial, faltantes y empate.

### HU-DEMO-204 — Alternar mapa y posicionamiento

Como analista, quiero alternar lectura territorial y área/precio sin cambiar el escenario.

Aceptación:

1. El panel inicia en mapa geográfico.
2. El control de vista es accesible y conserva el mismo conjunto de IDs.
3. El posicionamiento muestra ejes, ticks, unidades, leyenda y mediana.
4. El punto seleccionado tiene detalle persistente.
5. El target Viva solo aparece cuando área y precio permiten calcularlo.
6. Cambiar de visualización no modifica filtros.

### HU-DEMO-205 — Cuadrantes para distritos de alta carga

Como responsable de Viva, quiero dividir los distritos de mayor oferta para obtener una lectura más accionable.

Aceptación:

1. `high_load` se deriva de los siete distritos con más proyectos georreferenciados.
2. La lista actual coincide con 90, 88, 67, 63, 43, 42 y 40 proyectos.
3. Cada distrito `high_load` tiene cuatro cuadrantes analíticos versionados.
4. Cada punto válido pertenece exactamente a uno.
5. La suma de cuadrantes coincide con el total geográfico del distrito.
6. Método, snapshot y carácter no oficial son visibles.
7. Distritos fuera del top siete no reciben cuadrantes inventados.
8. El conteo observado y el subconjunto autoritativo se muestran separados.

### HU-DEMO-301 — Configurar escenario Viva

Como analista, quiero definir ubicación y producto Viva para contrastarlo con el mercado observado.

Aceptación:

1. Se puede definir punto, área, precio, dormitorios, tipología y entrega.
2. El punto y precio se etiquetan `simulated`.
3. No se solicita una dirección personal ni se llama a geocodificación.
4. El precio/m² se calcula solo con precio y área positivos.
5. Campos faltantes no se convierten en cero.
6. El escenario puede compartirse y reiniciarse.
7. El preset base queda versionado.

### HU-DEMO-302 — Diagnóstico de precio observado/estimado

Como analista, quiero comparar el precio simulado con publicaciones compatibles para preparar una hipótesis comercial prudente.

Aceptación:

1. Solo usa PEN, precio de lista publicado y denominador compatible.
2. Excluye `unknown`, simulados e inconsistentes.
3. Muestra mediana, P25, P75, tamaño de muestra y fecha de corte.
4. Muestra diferencia absoluta y relativa del escenario.
5. Distingue entrada, alineado, premium e insuficiente.
6. Con menos de tres comparables no emite diagnóstico fuerte.
7. Incluye la advertencia de que no representa precio real de cierre.
8. `price_reference_project_ids` alimenta todas las cifras y explicaciones de precio; el mapa mantiene visibles los proyectos geográficos fuera de esa muestra.

## Casos transversales

### CT-C — Microzona/radio

1. Fixture con un ID dentro, uno fuera y uno geográficamente inválido.
2. Incluye un ID observado dentro del alcance pero no reconciliado.
3. Mapa, lectura de mercado, comparador y asistente devuelven el mismo ID comparable incluido.
4. El ID fuera no aparece como comparable.
5. El inválido y el no reconciliado aparecen en exclusiones con motivo.
6. El mapa puede mostrar el no reconciliado solo como cobertura excluida.
7. El resultado es independiente del orden de inputs.
8. Reset restaura el alcance distrital.

### CT-I — Miraflores de alta carga

1. El baseline distrital contiene 90 proyectos.
2. `high_load=true`.
3. Existen cuatro cuadrantes.
4. No hay IDs duplicados o sin cuadrante entre puntos válidos.
5. `coordinate_valid_count` es 90; P2-03 debe confirmar `polygon_valid_count=90` para aprobar CT-I y la suma de cuadrantes debe coincidir con ese valor.
6. El contexto identifica 85 proyectos autoritativos y cinco no reconciliados antes de filtros de producto.
7. Seleccionar un cuadrante propaga exactamente el mismo subconjunto comparable.
8. Reset restaura 90 observados y 85 comparables antes de filtros de producto.

## Contratos normativos que el checker debe congelar antes de UI

La extensión se publicará como contrato `2.1.0`: cambio aditivo compatible con lectores `2.x`. Ningún campo requerido de `2.0.0` se elimina o cambia de significado.

### Geografía

- CRS público: `EPSG:4326`.
- IDs de distrito: UBIGEO cuando esté disponible; alias separado del nombre de UI.
- Método de alta carga: top 7 por conteo geográfico, desempate por ID.
- Método de cuadrante: medianas de latitud/longitud del snapshot.
- Distancia: Haversine en metros.
- Radio terrestre: `6,371,008.8 m`.
- Inclusión por radio: distancia completa `<= radius_meters`.
- Borde exterior dentro; borde de hueco fuera; soporte `Polygon` y `MultiPolygon`.
- Epsilon punto-segmento: `1e-10` grados.
- Geometría simplificada: topología válida, hash y tolerancia registrados.
- Tolerancia máxima `0.00005°`, desplazamiento validado <=10 m y variación de área <0.5%.
- Se versionan exactamente los siete distritos `high_load`.
- Presupuesto inicial del GeoJSON público simplificado: 750 KB sin comprimir. Superarlo requiere justificar precisión y rendimiento.

### Escenario

- `scenario_version=1`.
- Modos permitidos: `district`, `quadrant`, `radius`.
- Radios permitidos: 500, 1,000 y 1,500.
- No hay geocodificación.
- URL como persistencia reproducible.
- Parámetros y orden: `sv,district,scope,quadrant,lat,lon,radius,typology,bedrooms,area,price,delivery,viz`.
- `source` se deriva y no se serializa.
- `sv`/distrito inválidos reinician todo; dependencias geográficas inválidas vuelven a distrito; filtros de producto inválidos vuelven individualmente a default.
- Controles territoriales hacen commit inmediato; formulario de producto/precio hace commit atómico al enviar.
- Catálogos F2 publicados en `scenario_catalogs`:
  - tipología: `all|casa|departamento|lote|oficina`;
  - dormitorios: `all|0|1|2|3|4|5`;
  - entrega: `all|2019|2022|2023|2024|2025|2026|2027|2028|2029`.
- La normalización de tipología usa `trim`, NFKD, eliminación de diacríticos, minúsculas y colapso de espacios/guiones; el score compara el slug canónico.
- Área URL: decimal finito `>0` y `<=10000`; precio URL: decimal finito `>0` y `<=1000000000`.
- Preset de reset:
  - Miraflores;
  - modo `district`;
  - sin cuadrante, punto o radio;
  - producto `Todos`;
  - sin área o precio objetivo;
  - sin año de entrega;
  - visualización `geographic`.

### Universos

- `observed_scope_project_ids`: proyectos observados dentro del alcance territorial.
- `geography_valid_project_ids`: observados con geografía válida.
- `comparable_project_ids`: intersección con proyectos autoritativos y filtros de producto.
- `price_reference_project_ids`: comparables con referencia provisional de precio compatible.
- `excluded_projects`: ID observado, motivo y campos bloqueantes.
- La reconciliación usa el identificador estable de fuente (`nexo_project_id`/`project:nexo-*`), nunca nombre aproximado.
- Densidad y cuadrantes reportan observados; score, precio, comparador y asistente reportan comparables.

### Comparabilidad

Pesos máximos normativos para F2:

| Componente | Peso |
|---|---:|
| Geografía/distancia | 30 |
| Área | 20 |
| Dormitorios | 15 |
| Tipología | 10 |
| Entrega | 10 |
| Precio publicado/m² | 15 |
| **Total** | **100** |

Cada componente define `available_weight`, `earned_points`, explicación y hechos usados. El score normalizado se acompaña siempre de `evidence_coverage`.

Fórmulas congeladas para implementación:

| Componente | Fórmula |
|---|---|
| Geografía | Distrito/cuadrante incluido: 30. Radio: `30 × max(0, 1 - distancia_m/radio_m)`. |
| Área | `20 × max(0, 1 - abs(proyecto-objetivo)/objetivo)`. |
| Dormitorios | 15 si coincide o el rango contiene el objetivo; 0 si es incompatible. |
| Tipología | 10 si la categoría normalizada coincide; 0 si es incompatible. |
| Entrega | 10 mismo año; 5 diferencia de un año; 0 mayor diferencia. |
| Precio/m² | `15 × max(0, 1 - abs(proyecto-objetivo)/objetivo)`. |

- Una dimensión sin datos compatibles no suma a `available_weight`.
- `score = round(raw_points / available_weight × 100, 1)`.
- `evidence_coverage = round(available_weight, 1)`.
- Menos de 60 de cobertura produce `orientative`.
- Etiquetas con cobertura >=60: Alta >=80, Media >=60, Baja <60.
- Orden: score descendente, cobertura descendente, distancia ascendente cuando exista y `project_id` ascendente.
- Área de score: `total_area` positivo; un rango sin valor puntual no se promedia.
- Redondeo de score: `half away from zero` a una cifra.
- Precio legacy provisional elegible: proyecto reconciliado, PEN, `list_price_avg`, `total_area` y precio/m² positivos, URL, fecha no posterior al corte, sin faltante de precio/área y ratio consistente dentro de 0.5%.

### Estadística de precio

- F2 usa la única fila legacy del snapshot; no selecciona entre múltiples fuentes.
- P25, mediana y P75: interpolación lineal R-7.
- Muestra mínima: tres `price_reference_project_ids`.
- Entrada: `target < P25`.
- Alineado: `P25 <= target <= P75`.
- Premium: `target > P75`.
- Diferencia absoluta: `target - mediana`.
- Diferencia relativa: `(target - mediana) / mediana`.
- Presentación: PEN sin decimales, precio/m² con dos y porcentaje con una cifra.

### Estados independientes

- `scenario_status = valid | invalid`.
- `geography_status = ready | partial | unavailable`.
- `comparability_status = ready | orientative | insufficient`.
- `price_status = ready | insufficient`.
- `evidence_coverage_pct`: número de 0 a 100.

## Archivos protegidos durante la fase

- `.github/workflows/**`
- activos y evidencias reservados de Fase 3;
- fixtures CT-A/B/D/E/G/H, salvo actualización de referencias exigida por schema;
- módulos de histórico que no consumen comparables;
- fuentes crudas no autorizadas;
- `main`.

Los cambios del contrato v2 deben ser aditivos o incluir migración y pruebas de compatibilidad. No se debilitan validadores de Fase 1.

## Olas y dependencias

```text
Ola 2.0  P2-00A preflight fuente ─→ P2-00B plan/drift/checker ─→ HUMAN-GATE-A ─→ P2-00C registro
                                                                                         ↓
Ola 2.1  P2-01 fuente aprobada ─→ P2-02 contrato/fixtures ─→ P2-03 motor geográfico ─→ P2-04 build
                                                                  ↓
Ola 2.2              P2-05 escenario puro ║ P2-06 comparabilidad
                                           └───────→ P2-07 estado/controlador
                                                                  ↓
Ola 2.3              P2-08 barra global ║ P2-09 componente mapa
                                           └───────→ contrato UI congelado
                                                                  ↓
Ola 2.4   P2-10 dashboard ║ P2-11 mercado ║ P2-12 catálogo/comparador ║ P2-13 checklist/asistente
                                                                  ↓
Ola 2.5              P2-14 integración E2E ─→ P2-15 responsive/a11y
                                                                  ↓
Ola 2.6              P2-16 checker ─→ HUMAN-GATE-B ─→ P2-17 memoria/PR
                                                                  ↓ merge humano
Post-merge                                          P2-18 Pages read-only ─→ P2-19 persistencia/PR
```

Las tareas de una misma ola pueden ejecutarse en paralelo únicamente cuando el contrato anterior está congelado y los `write_set` permanecen disjuntos.

## Roles y registro de delegación

- Cada tarea P2-01 a P2-15 registra `maker`, commit(s), archivos modificados y comandos ejecutados en el handoff de la ola.
- El maker de una tarea no puede aprobar su propio resultado.
- P2-16 se asigna a un checker que no haya escrito código, datos, fixtures o CSS de F2.
- HUMAN-GATE-A y HUMAN-GATE-B pertenecen al usuario/responsable de producto; ningún agente puede autoaprobarlas.
- P2-17 pertenece al integrador documental y de Git; no puede ocultar un `FAIL` ni convertir `PASS WITH RISKS` en `PASS`.
- P2-18 pertenece al verificador post-merge y es read-only.
- P2-19 pertenece al integrador documental post-merge; persiste el resultado en una rama/PR separado cuyo merge vuelve a ser humano.

## Ola 2.0 — Preparación

### P2-00A — Preflight cartográfico y legal

- `depends_on`: ninguno.
- Tipo: planificación read-only respecto de datos/código; no descarga ni versiona geometría.
- `read_set`:
  - licencia y copyright de OpenStreetMap;
  - guía de atribución OSMF y política de Nominatim;
  - relaciones OSM de los siete distritos;
  - RENLIM;
  - fuentes INEI/IDEP descartadas;
  - `CONTEXT.md`.
- `write_set`:
  - `.planning/phases/02-geography-scenario/SOURCE-ASSESSMENT.md`
- Entrega:
  1. fuente primaria exacta;
  2. términos de redistribución y atribución;
  3. fecha de adquisición/CRS/formato;
  4. siete distritos requeridos;
  5. fallback candidato o recomendación de detener;
  6. riesgos que requieren decisión humana.
- Verificación: un revisor puede responder si el archivo derivado puede publicarse en GitHub Pages y bajo qué atribución.
- Stop rule: no inventar permiso a partir de que el portal sea accesible.

### P2-00B — Cerrar planificación, drift y checker

- `depends_on`: P2-00A.
- `read_set`:
  - `AGENTS.md`
  - `.planning/STATE.md`
  - `.planning/DECISIONS.md`
  - `.planning/PROJECT.md`
  - `.planning/phases/01-data-contracts/**`
  - `.planning/phases/02-geography-scenario/**`
- `write_set`:
  - `.planning/PROJECT.md`
  - `.planning/STATE.md`
  - `.planning/DECISIONS.md`
  - `.planning/ROADMAP.md`
  - `.planning/phases/01-data-contracts/CONTEXT.md`
  - `.planning/phases/02-geography-scenario/CONTEXT.md`
  - `.planning/phases/02-geography-scenario/UI-SPEC.md`
  - `.planning/phases/02-geography-scenario/PLAN.md`
  - `.planning/phases/02-geography-scenario/SOURCE-ASSESSMENT.md`
  - `.planning/phases/02-geography-scenario/PLAN_REVIEW.md`
- Implementación:
  1. corregir la referencia documental 88 a 90 sin cambiar el dataset;
  2. incorporar el assessment de fuente;
  3. ejecutar checker del plan;
  4. registrar hallazgos y resolución;
  5. marcar `REVIEWED` solo con `PASS` o riesgos explícitos.
- Verificación:
  - `rg -n "Miraflores|88|90" .planning`
  - revisión de cobertura y write sets.
- Rollback: revertir solo documentos de planificación.

### HUMAN-GATE-A — Aprobación previa a implementación

El usuario aprueba:

- contrato y UI de F2;
- fuente cartográfica exacta;
- términos/atribución;
- riesgos del checker;
- inicio de P2-01.

Sin esta aprobación no se descarga/versiona geometría y no se edita código funcional.
Si el usuario prefiere una fuente alternativa o retirar polígonos, HUMAN-GATE-A no autoriza implementación: devuelve el paquete a P2-00B para revisar Context/UI/Plan/assessment, ejecutar otro checker y solicitar una nueva HUMAN-GATE-A.

### P2-00C — Persistir la aprobación humana

- `depends_on`: P2-00B, HUMAN-GATE-A favorable.
- Tipo: documentación; no descarga geometría ni edita código funcional.
- `write_set`:
  - `.planning/phases/02-geography-scenario/APPROVAL.md`
  - `.planning/DECISIONS.md`
  - `.planning/STATE.md`
- Entrega:
  1. ruta cartográfica aprobada y URL exacta;
  2. licencia/permiso verificable con URL, archivo o identificador y fecha;
  3. texto de atribución aceptado;
  4. riesgos aceptados individualmente y riesgos rechazados;
  5. responsable y timestamp ISO-8601 de la aprobación;
  6. veredicto del checker y versión/hash de los documentos aprobados.
- Verificación:
  - no contiene placeholders ni una aprobación inferida del chat;
  - coincide con `SOURCE-ASSESSMENT.md`, `PLAN_REVIEW.md` y HUMAN-GATE-A;
  - `git diff --check`;
  - el commit documental queda disponible para P2-01.
- Rollback: retirar el registro si la evidencia o aprobación fue revocada; P2-01 vuelve a quedar bloqueada.

## Ola 2.1 — Datos y contrato geográfico

### P2-01 — Adquirir y registrar la fuente cartográfica aprobada

- `depends_on`: P2-00C.
- `read_set`:
  - relaciones OSM y lookup aprobados;
  - licencia ODbL, guía de atribución y política de Nominatim;
  - RENLIM;
  - `.planning/phases/02-geography-scenario/APPROVAL.md`;
  - `.planning/phases/02-geography-scenario/SOURCE-ASSESSMENT.md`;
  - `datos_relevantes/viva_minimum_dataset_latest.csv`.
- `write_set`:
  - `datos_relevantes/geography/source-manifest.json`
  - `datos_relevantes/geography/district-boundaries-source.geojson`
  - `datos_relevantes/geography/README.md`
- Implementación:
  1. comprobar que URL/términos coinciden con el assessment aprobado;
  2. adquirir una sola vez las siete relaciones, con `User-Agent` identificable, caché y sin uso runtime;
  3. calcular SHA-256 y registrar CRS, timestamp, productor, ODbL y atribución;
  4. comprobar exactamente 7/7 polígonos, relation IDs, aliases y UBIGEO de contraste;
  5. mantener la base geométrica ODbL separada de los datos inmobiliarios;
  6. documentar cualquier diferencia con RENLIM.
- Verificación:
  - hash reproducible;
  - archivo abre y contiene UBIGEO/nombre/geometría;
  - fuente no incluye credenciales o datos personales.
- Stop rule: términos o procedencia insuficientes.
- Rollback: retirar el artefacto; no usar fallback no aprobado.
- Contingencia: si falla la fuente primaria, volver a P2-00A, evaluar la alternativa, repetir checker de delta y solicitar una nueva HUMAN-GATE-A.

### P2-02 — Extender contrato y crear CT-C/CT-I

- `depends_on`: P2-01.
- `read_set`:
  - `prototipo_ejecutable/contracts/demo-v2.schema.json`
  - `datos_relevantes/demo-pilot/fixtures/README.md`
  - `CONTEXT.md`
- `write_set`:
  - `prototipo_ejecutable/contracts/demo-v2.schema.json`
  - `prototipo_ejecutable/contracts/README.md`
  - `datos_relevantes/demo-pilot/fixtures/ct-c.json`
  - `datos_relevantes/demo-pilot/fixtures/ct-i.json`
  - `datos_relevantes/demo-pilot/fixtures/README.md`
  - `prototipo_ejecutable/tests/data-schema.mjs`
  - `prototipo_ejecutable/tests/data-contract-compatibility.mjs`
- Entrega:
  - contrato de `geography`, `scenario_defaults`, cuadrantes y exclusiones;
  - contrato `2.1.0` aditivo y compatible con `2.x`;
  - fixtures con resultados esperados.
- Verificación:
  - `node tests/data-schema.mjs`;
  - `node tests/data-contract-compatibility.mjs`;
  - fixtures válidos;
  - mutaciones inválidas fallan;
  - un payload mínimo `2.0.0` continúa siendo legible por el validador/reader `2.1.0`;
  - payload `2.1.0` con geografía pasa y una versión major no soportada falla;
  - no se promete que un reader estricto `2.0.0` comprenda campos nuevos de `2.1.0`; la compatibilidad garantizada es hacia atrás en el reader `2.1.0`;
  - resultados numéricos exactos para bordes, radio, cuadrantes, score y cuantiles;
  - referencias y enums completos.
- Rollback: mantener contrato 2.0.0 y publicar propuesta separada sin integrar.

### P2-03 — Motor geográfico de build

- `depends_on`: P2-02.
- `read_set`:
  - fuente geográfica;
  - fixtures CT-C/CT-I;
  - proyección legacy;
  - validador de Fase 1.
- `write_set`:
  - `prototipo_ejecutable/scripts/data/geography.js`
  - `prototipo_ejecutable/tests/data-geography.mjs`
  - `prototipo_ejecutable/tests/data-geography-source.mjs`
- Entrega:
  - normalización distrito/UBIGEO;
  - reconciliación estable observado → autoritativo;
  - validación de coordenadas;
  - punto-en-polígono;
  - Haversine;
  - top siete;
  - medianas y cuadrantes;
  - simplificación/serialización estable;
  - exclusiones deterministas.
- Verificación:
  - `node tests/data-geography-source.mjs`;
  - `node tests/data-geography.mjs`;
  - CT-C y CT-I;
  - borde exterior, borde de hueco, `MultiPolygon`, distancia igual al radio y epsilon;
  - orden invertido produce el mismo resultado;
  - ningún punto inválido cae en `(0,0)`.
- Rollback: módulo aislado sin integración al build.

### P2-04 — Integrar geografía al dataset

- `depends_on`: P2-03.
- `write_set`:
  - `prototipo_ejecutable/scripts/build-demo-data.js`
  - `prototipo_ejecutable/public/demo-data/viva-platform-demo.json`
  - `prototipo_ejecutable/public/demo-data/district-boundaries.geojson`
  - `datos_relevantes/geography/source-manifest.json`
  - `datos_relevantes/demo-pilot/coverage-report.json`
  - `prototipo_ejecutable/tests/data-contract.mjs`
  - `prototipo_ejecutable/tests/data-references.mjs`
  - `prototipo_ejecutable/tests/data-determinism.mjs`
  - `prototipo_ejecutable/tests/data-privacy.mjs`
  - `prototipo_ejecutable/package.json`
- Entrega:
  - metadata y fingerprints actualizados;
  - geografía pública separada con hash;
  - `source-manifest.json#/derived/public_geojson_sha256` y `public_geojson_bytes` actualizados por el propietario del artefacto derivado;
  - 90 Miraflores preservados;
  - 85 Miraflores autoritativos y cinco gaps visibles preservados;
  - reporte de cobertura ligado al nuevo SHA.
- Verificación:
  - `npm.cmd run test:data:geography`;
  - `npm.cmd run test:data:schema`;
  - `npm.cmd run test:data:references`;
  - `npm.cmd run test:data:determinism`;
  - dos builds con SHA idéntico;
  - GeoJSON bajo presupuesto o excepción documentada;
  - JSON/GeoJSON sin PII ni rutas locales;
  - gate completo de datos F1 continúa pasando.
- Rollback: no reemplazar artefactos públicos si falla determinismo o compatibilidad.

## Ola 2.2 — Dominio de escenario

### P2-05 — Contrato de escenario y persistencia pura

- `depends_on`: P2-04.
- `write_set`:
  - `prototipo_ejecutable/public/js/scenario.js`
  - `prototipo_ejecutable/tests/scenario-domain.mjs`
- Entrega:
  - defaults;
  - validación;
  - serialización/parsing URL;
  - reducción de estado;
  - `buildTerritorialContext` con escenario, alcance, `observed_scope_project_ids`, `geography_valid_project_ids`, exclusiones territoriales, `scenario_status` y `geography_status`;
  - no calcula score, elegibilidad de precio, `comparability_status`, `price_status` ni cobertura de evidencia.
- Verificación:
  - `node tests/scenario-domain.mjs`;
  - round-trip URL;
  - orden y omisión de defaults;
  - versión/distrito inválidos y fallbacks por campo;
  - fixtures exactos de `scenario_status` y `geography_status`;
  - geometría ausente, radio vacío 0/0 `ready`, cobertura 89/90 `partial` y hash inválido `unavailable`;
  - reset;
  - parte territorial de CT-C/CT-I en funciones puras.
- Rollback: módulo no importado.

### P2-06 — Comparabilidad y diagnóstico puros

- `depends_on`: P2-04.
- `write_set`:
  - `prototipo_ejecutable/public/js/comparability.js`
  - `prototipo_ejecutable/tests/comparability.mjs`
- Entrega:
  - score 0–100;
  - componentes y cobertura;
  - tie-break estable;
  - elegibilidad de precio;
  - diagnóstico publicado vs simulado;
  - `buildComparabilityContext` recibe la salida territorial congelada y produce `comparable_project_ids`, `price_reference_project_ids`, `comparability_status`, `price_status`, `evidence_coverage_pct` y exclusiones analíticas;
  - no parsea URL ni vuelve a calcular pertenencia territorial.
- Verificación:
  - `node tests/comparability.mjs`;
  - exacto/parcial/faltante/empate;
  - área puntual frente a rango;
  - R-7 con muestras impares y pares;
  - umbrales P25/P75 inclusivos;
  - menos de tres comparables;
  - moneda/denominador incompatible;
  - fixtures de 0/2/3 comparables, coberturas globales 80.0/60.0 y 2/3 referencias de precio;
  - sin `NaN`.
- Rollback: conservar ranking anterior hasta integración, sin ocultar la deuda.

### P2-07 — Estado y controlador únicos

- `depends_on`: P2-05, P2-06.
- `write_set`:
  - `prototipo_ejecutable/public/js/state.js`
  - `prototipo_ejecutable/public/js/controller.js`
  - `prototipo_ejecutable/public/js/domain.js`
  - `prototipo_ejecutable/tests/module-graph.mjs`
- Entrega:
  - `scenario` como única fuente;
  - composición única de `buildTerritorialContext` y `buildComparabilityContext` en `scenarioContext`; ninguna de las tareas paralelas crea un segundo contexto global;
  - adaptadores de dominio;
  - eventos de distrito, modo, cuadrante, radio, punto, producto y reset;
  - URL sincronizada;
  - selección de proyectos coherente;
  - contratos de eventos para mapa, visualización, cuadrante, radio y proyecto seleccionado.
- Restricción:
  - no añadir geografía o score extensos a `domain.js`; solo adaptadores temporales.
- Verificación:
  - `npm.cmd run check`;
  - `npm.cmd run test:architecture`;
  - `node tests/scenario-domain.mjs`;
  - `node tests/comparability.mjs`;
  - arquitectura sin ciclos;
  - un cambio actualiza el contexto una vez;
  - reset y foco;
  - imports de vistas aún compatibles.
- Rollback: restaurar state/controller y mantener módulos puros sin activar.

## Ola 2.3 — Componentes base de UI

### P2-08 — Barra global y resumen de contexto

- `depends_on`: P2-07.
- `write_set`:
  - `prototipo_ejecutable/public/app.js`
  - `prototipo_ejecutable/public/js/views/scenario-context.js`
  - `prototipo_ejecutable/public/js/views/index.js`
  - `prototipo_ejecutable/public/styles.css`
  - `prototipo_ejecutable/public/styles/25-scenario-context.css`
  - `prototipo_ejecutable/tests/scenario-context.mjs`
- Entrega:
  - controles globales;
  - carga del GeoJSON público con comprobación de referencia/hash;
  - fecha, cobertura territorial y suficiencia de comparabilidad como ejes separados;
  - CTA `Ver comparables` y reinicio;
  - región `aria-live`;
  - responsive base.
- Verificación:
  - `npm.cmd run check`;
  - `node tests/scenario-context.mjs`;
  - render puro de estados válido, inválido, parcial e insuficiente;
  - el CTA cambia a `projects`, escribe `#projects`, conserva escenario y devuelve foco a `#main-content`;
  - los controles territoriales emiten commit inmediato;
  - el contrato y los hooks del formulario de producto/precio quedan definidos aquí; el commit atómico montado se verifica en P2-10/P2-14, donde viven el formulario y su listener propietario;
  - URL canónica visible y mensaje `aria-live`;
  - la interacción montada, viewports y contraste quedan como gate de P2-14/P2-15.
- Rollback: retirar import/renderer y volver a topbar anterior.

### P2-09 — Componente de mapa y posicionamiento

- `depends_on`: P2-07.
- `write_set`:
  - `prototipo_ejecutable/public/js/views/geographic-map.js`
  - `prototipo_ejecutable/public/js/views/positioning-map.js`
  - `prototipo_ejecutable/public/styles/45-geography.css`
  - `prototipo_ejecutable/tests/geographic-map.mjs`
- Entrega:
  - SVG geográfico;
  - cuadrantes/radio/target;
  - leyenda/escala/norte/atribución;
  - selección accesible de proyecto equivalente al mapa, sin convertir cada punto en una parada de tabulación;
  - detalle persistente;
  - posicionamiento con ejes y detalle;
  - control de visualización.
- Verificación:
  - `npm.cmd run check`;
  - `node tests/geographic-map.mjs`;
  - SVG y select/lista exponen exactamente los mismos IDs;
  - hover no es el único mecanismo de detalle;
  - estados sin geometría, vacío e inválido;
  - el click real, teclado, foco y Escape sobre UI montada quedan como gate de P2-14.
- Rollback: componentes aislados no montados.

## Ola 2.4 — Consumidores

### P2-10 — Radar comercial y planificador

- `depends_on`: P2-08, P2-09.
- `write_set`:
  - `prototipo_ejecutable/public/js/views/dashboard.js`
  - `prototipo_ejecutable/public/js/controller.js`
- Entrega:
  - mapa como panel principal;
  - reducción de KPI horizontales;
  - planificador conectado al escenario;
  - formulario de producto/precio con un único submit atómico gestionado por el controlador existente, sin listeners paralelos;
  - diagnóstico de precio;
  - score explicable;
  - posicionamiento más abajo.
- Verificación:
  - `npm.cmd run check`;
  - los IDs del mapa coinciden con `scenarioContext`;
  - observados y comparables se distinguen;
  - no hay métricas distritales mezcladas con cuadrante/radio;
  - estados insuficientes.
- Rollback: restaurar render anterior sin modificar el contrato.

### P2-11 — Lectura distrital y cuadrantes

- `depends_on`: P2-08, P2-09.
- `write_set`:
  - `prototipo_ejecutable/public/js/views/market.js`
- Entrega:
  - ranking distrital;
  - top siete marcado;
  - filas de cuadrantes;
  - metodología no oficial;
  - precio rotulado como `referencia publicada provisional`, nunca como benchmark certificado o precio de cierre;
  - selección que actualiza el escenario.
- Verificación:
  - `npm.cmd run check`;
  - conteos 90/88/67/63/43/42/40;
  - distrito sin cuadrante;
  - suma por cuadrantes;
  - teclado.
- Rollback: conservar ranking distrital previo.

### P2-12 — Catálogo y comparador

- `depends_on`: P2-07.
- `write_set`:
  - `prototipo_ejecutable/public/js/views/projects.js`
  - `prototipo_ejecutable/public/js/views/compare.js`
- Entrega:
  - catálogo indica alcance activo;
  - filtros locales no alteran el escenario;
  - comparador solo propone IDs del contexto;
  - score y distancia visibles;
  - máximo tres comparables.
- Verificación:
  - `npm.cmd run check`;
  - CT-C IDs;
  - búsqueda local;
  - selección/reset;
  - vacío.
- Rollback: adaptador de compatibilidad mientras se corrige, sin usar fallback distrital silencioso.

### P2-13 — Checklist y asistente coherentes

- `depends_on`: P2-07.
- `write_set`:
  - `prototipo_ejecutable/public/js/views/checklist.js`
  - `prototipo_ejecutable/public/js/views/assistant.js`
- Entrega:
  - checklist usa la misma referencia publicada provisional;
  - asistente determinista consume el `scenarioContext` vigente y cita alcance y número de comparables;
  - respuesta insuficiente prudente;
  - ninguna pregunta cambia de distrito sin reflejarlo en contexto;
  - no se agregan intents, fuentes o claims nuevos del asistente en F2.
- Verificación:
  - `npm.cmd run check`;
  - CT-C;
  - cifras coinciden con UI;
  - referencias a IDs/evidencia disponibles;
  - los casos existentes de CT-F pasan solo como regresión, sin ampliar su alcance.
- Rollback: deshabilitar respuestas no migradas, no inventar un contexto.

## Ola 2.5 — Integración y calidad

### P2-14 — Pruebas E2E y recorridos CT-C/CT-I

- `depends_on`: P2-10, P2-11, P2-12, P2-13.
- `write_set`:
  - `prototipo_ejecutable/tests/browser-smoke.mjs`
  - `prototipo_ejecutable/tests/browser-a11y.mjs`
  - `prototipo_ejecutable/tests/helpers/demo-browser.mjs`
  - `prototipo_ejecutable/tests/scenario-e2e.mjs`
  - `prototipo_ejecutable/tests/e2e-scenarios/ct-c-public.json`
  - `prototipo_ejecutable/package.json`
- Entrega:
  - interacción completa;
  - round-trip URL;
  - consistencia de IDs;
  - reset;
  - click en punto, selección accesible equivalente, Enter, Espacio, Escape y retorno de foco;
  - navegación móvil;
  - escenarios vacíos.
  - descriptor `ct-c-public.json` con URL canónica y IDs esperados que existen en el artefacto público; no inyecta un fixture sintético.
- Verificación:
  - `node tests/scenario-e2e.mjs`;
  - `npm.cmd run test:smoke`;
  - `npm.cmd run test:a11y`;
  - smoke de siete rutas;
  - click/teclado/select producen el mismo ID seleccionado;
  - consola sin errores y recursos sin 404.
- Rollback: ninguna; un fallo bloquea avanzar.

### P2-15 — Responsive, contraste y densidad

- `depends_on`: P2-14.
- `write_set`:
  - `prototipo_ejecutable/public/styles/25-scenario-context.css`
  - `prototipo_ejecutable/public/styles/45-geography.css`
  - `prototipo_ejecutable/public/styles/50-views.css`
  - `prototipo_ejecutable/public/styles/90-responsive.css`
- Entrega:
  - mapa protagonista;
  - CTA inequívoco;
  - filas en lugar de exceso de cards;
  - 200% zoom;
  - tres viewports;
  - reduced motion.
- Restricción: un único escritor CSS.
- Selectores autorizados: `.scenario-*`, `.geo-*`, `.positioning-*`, `.dashboard-*` y selectores nuevos exclusivos de F2. Cambiar tokens globales, `body`, controles base o componentes compartidos requiere abrir y aprobar un gap separado.
- Verificación:
  - capturas antes/después;
  - contraste medido conforme a WCAG AA;
  - `node tests/scenario-e2e.mjs`;
  - `npm.cmd run test:smoke`;
  - `npm.cmd run test:a11y`;
  - `npm.cmd run verify` repetido después del último cambio CSS;
  - teclado, zoom 200% y textos no truncados en 1440×900, 1280×720 y 390×844.
- Rollback: revertir solo ajustes visuales que no cambian contrato.

## Ola 2.6 — Verificación, memoria y ship

### P2-16 — Checker independiente

- `depends_on`: P2-15.
- `write_set`:
  - `.planning/phases/02-geography-scenario/VERIFICATION_REPORT.md`
- No puede editar código, datos, fixtures o CSS.
- La identidad del checker queda registrada y debe ser distinta de quienes ejecutaron P2-01 a P2-15.
- Debe verificar historias, CT-C, CT-I, navegador, accesibilidad, Graphify y regresiones F1.
- Debe auditar los `write_set`, la identidad de makers/checker y los comandos ejecutados.
- Verificación mínima:
  - `npm.cmd run verify`;
  - `node tests/scenario-e2e.mjs`;
  - regenerar Graphify `--code-only --no-cluster` y revisar los 15 hubs principales;
  - cotejar la matriz de historias con evidencia y resultados, no solo con presencia de archivos.
- Veredicto: `PASS`, `PASS WITH RISKS` o `FAIL`.
- Con `FAIL`, el propio `VERIFICATION_REPORT.md` registra el plan de gaps y devuelve tareas concretas al maker; HUMAN-GATE-B y P2-17 quedan bloqueadas.
- Rollback: no aplica; un nuevo loop maker → checker parte de los gaps registrados.

### HUMAN-GATE-B — Aceptación de riesgos y autorización de cierre

- `depends_on`: P2-16.
- Con `PASS`, el usuario autoriza el cierre documental y la creación del PR.
- Con `PASS WITH RISKS`, cada riesgo, impacto y mitigación requiere aceptación humana explícita antes de P2-17.
- Con `FAIL`, P2-17 queda bloqueada y se abre un loop de corrección; no se presenta la fase como completa.

### P2-17 — Resumen, handoff y PR

- `depends_on`: P2-16, HUMAN-GATE-B.
- `write_set`:
  - `.planning/phases/02-geography-scenario/SUMMARY.md`
  - `.planning/phases/02-geography-scenario/HANDOFF.md`
  - `.planning/STATE.md`
  - `.planning/DECISIONS.md`
  - `.planning/ROADMAP.md`
- Registra únicamente hechos confirmados.
- El PR incluye historias, fuentes, capturas, pruebas y riesgos.
- Verificación:
  - `git diff --check`;
  - todos los enlaces Markdown locales resuelven;
  - el estado y roadmap coinciden con el veredicto;
  - el PR apunta a `main` y contiene solo los commits aprobados.
- Rollback: revertir únicamente el cierre documental o el PR; no reescribir commits verificados.

### P2-18 — Verificación post-merge de GitHub Pages

- `depends_on`: merge humano del PR de P2-17.
- Tipo: verificación remota read-only.
- `write_set`: ninguno.
- Verificación:
  1. el PR figura fusionado y el SHA de merge coincide con el esperado;
  2. el workflow de Pages para ese SHA termina en éxito;
  3. la URL pública responde HTTP 200;
  4. `viva-platform-demo.json` responde 200 y declara contrato `2.1.0`;
  5. `district-boundaries.geojson` responde 200 y su SHA-256 coincide exactamente con `datos_relevantes/geography/source-manifest.json#/derived/public_geojson_sha256`;
  6. desde un checkout del merge, `$env:BASE_URL='<url-pages>'; node tests/scenario-e2e.mjs --case ct-c-public` usa el descriptor versionado y pasa sin inyectar datos;
  7. el recorrido público equivalente de CT-I y CT-C no solicita recursos externos no aprobados.
- Entrega: evidencia de URLs, SHA, workflow y fecha enviada al responsable; no modifica código ni documentación del repositorio.
- Si falla: reportar el fallo y recomendar incidente/tarea; P2-18 no crea ni modifica recursos externos.
- Rollback: no aplica a esta tarea read-only; cualquier corrección requiere una rama y PR nuevos.

### P2-19 — Persistir resultado post-merge

- `depends_on`: resultado de P2-18.
- Tipo: documentación en una rama y PR nuevos; nunca escribe directamente sobre `main`.
- `write_set`:
  - `.planning/phases/02-geography-scenario/POSTMERGE_REPORT.md`
  - `.planning/STATE.md`
  - `.planning/ROADMAP.md`
- Entrega:
  - con éxito, registra `deployed and verified`, SHA del merge funcional, hash del artefacto público, URL, workflow y fecha;
  - con fallo, registra `merged, deployment verification failed`, evidencia y siguiente acción recomendada;
  - no abre incidentes ni fusiona su propio PR.
- Verificación:
  - el reporte coincide exactamente con la evidencia read-only de P2-18;
  - el PR solo cambia `.planning/**` y deja intacto `prototipo_ejecutable/public/**`;
  - el hash del artefacto público coincide con el verificado en P2-18; el estado se refiere al merge funcional, no al posterior commit documental;
  - `git diff --check`;
  - enlaces y SHA son trazables;
  - un humano revisa y fusiona o rechaza el PR documental.
- Rollback: cerrar el PR documental; el resultado remoto original no se modifica.

## Comandos de verificación previstos

Desde `prototipo_ejecutable/`:

```powershell
npm.cmd run check
npm.cmd run test:architecture
npm.cmd run test:data
npm.cmd run test:data:schema
npm.cmd run test:data:references
npm.cmd run test:data:geography
npm.cmd run test:data:determinism
npm.cmd run test:data:privacy
npm.cmd run test:scenario
npm.cmd run test:comparability
npm.cmd run test:scenario:e2e
npm.cmd run test:smoke
npm.cmd run test:a11y
npm.cmd run verify
```

Verificaciones adicionales:

- build dos veces y comparación SHA-256 de JSON y GeoJSON;
- validación GeoJSON y punto-en-polígono;
- presupuesto de peso;
- CT-C con comparación exacta de IDs en cuatro consumidores;
- CT-I con 90 proyectos, cuatro cuadrantes y reset;
- CT-I con 85 comparables autoritativos y cinco gaps visibles en el snapshot vigente;
- URL válida, parcial, manipulada y antigua;
- radio 0, 500, 1,000 y 1,500;
- menos de tres precios compatibles;
- navegación por teclado y zoom 200%;
- capturas en 1440×900, 1280×720 y 390×844;
- ausencia de red externa durante el recorrido;
- Graphify incremental y revisión de nuevos hubs.

## Evidencia requerida

- manifiesto de fuente y hashes;
- outputs CT-C/CT-I;
- tabla de IDs por consumidor;
- reporte de cobertura geográfica;
- hashes de build;
- capturas antes/después;
- contraste de CTA y textos;
- log de consola/red;
- veredicto independiente;
- resumen de hubs Graphify.

## Definition of Done

1. Todas las historias Must de Fase 2 cumplen sus criterios.
2. CT-C y CT-I pasan de forma determinista.
3. Miraflores conserva 90 observados, 85 comparables autoritativos y cinco gaps visibles antes de filtros.
4. Los siete distritos de alta carga se derivan del snapshot.
5. Cada punto geográfico válido de esos distritos pertenece a un cuadrante.
6. Mapa, lectura de mercado, catálogo/comparador y asistente comparten IDs.
7. El mapa funciona sin servicios externos.
8. El escenario se reproduce desde URL y se reinicia al baseline.
9. El score explica componentes y cobertura.
10. Precio simulado y precio publicado nunca se presentan como el mismo tipo.
11. Estados vacío, error, carga e insuficiente están diseñados.
12. No hay errores de consola, ciclos o recursos 404.
13. Los tres viewports y zoom 200% conservan el flujo.
14. Los controles principales funcionan con teclado.
15. El CTA primario y textos críticos cumplen contraste.
16. Los gates completos de Fase 1 siguen pasando.
17. Graphify no revela un nuevo hub injustificado.
18. Checker independiente emite `PASS` o `PASS WITH RISKS`; cualquier riesgo queda aceptado explícitamente en HUMAN-GATE-B.
19. Estado, decisiones, resumen y handoff quedan actualizados.
20. Makers, commits, comandos y checker distinto quedan registrados.
21. El PR se fusiona únicamente por acción humana.
22. GitHub Pages se verifica después del merge mediante P2-18.
23. P2-19 persiste el resultado en un PR documental separado; solo tras su merge el repositorio declara `deployed and verified` o `merged, deployment verification failed`.

## Condición de rollback

Si la geografía o el escenario no alcanzan el gate:

1. no fusionar la rama;
2. conservar fuente, contrato y fixtures si son válidos;
3. mantener la demo vigente en Fase 1;
4. no sustituir el mapa por datos inventados;
5. no usar fallback distrital silencioso;
6. aislar el gap en una tarea nueva;
7. repetir checker después de corregir.

## Condiciones de parada

- no se confirman términos de redistribución de la geometría;
- la geometría no puede reconciliarse con nombres/UBIGEO;
- el conteo Miraflores deja de ser reproducible sin explicación;
- puntos fuera de polígono invalidan el claim y se pretende ocultarlos;
- el score necesita datos no observados;
- se propone una API o tile externo en runtime;
- se llama “microzona oficial” a un cuadrante analítico;
- se presenta escenario Viva como precio observado;
- dos tareas paralelas comparten `write_set`;
- el checker falla tres veces sin hipótesis nueva.
