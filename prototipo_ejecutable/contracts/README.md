# Contrato público de datos v2

`demo-v2.schema.json` es la fuente ejecutable de estructura para el dataset estático de Viva Inteligencia Comercial. Usa JSON Schema Draft 2020-12, es autocontenido y no requiere una dependencia de runtime.

## Alcance

El contrato distingue tres capas:

1. `model`: modelo autoritativo de fuentes, inmobiliarias, aliases, proyectos, tipologías, observaciones, hechos, documentos, evidencia, issues y eventos.
2. `inspector`: índice opcional de casos y activos que solo referencia IDs nativos de `model`; no duplica hechos ni evidencia.
3. `projects` y las secciones legacy superiores: proyección temporal consumida por la UI existente.

La proyección legacy no es una fuente de verdad y no debe utilizarse para reconstruir observaciones o hechos. Se conserva para que la Fase 1 pueda cambiar el contrato sin modificar las siete rutas actuales.

La revisión `2.1.0` añade tres secciones de Fase 2 sin modificar las colecciones de `2.0.0`:

1. `scenario_catalogs`: listas blancas y orden canónico para tipología, dormitorios, entrega, alcance, cuadrante, radio y visualización.
2. `scenario_defaults`: escenario inicial completo, incluidos los `null` que desactivan cuadrante o radio.
3. `geography`: procedencia cartográfica, distritos, cuadrantes analíticos, asignaciones y exclusiones trazables.

Estas tres secciones son obligatorias cuando `metadata.contract_version` es `2.1.0` o `2.2.0`.

La revisión `2.2.0` exige además `inspector`. El reader `2.2` admite documentos `2.0.0`, `2.1.0` y `2.2.0`; `inspector` solo es obligatorio para `2.2.0`.

## Índice del Evidence Inspector 2.2

`inspector.version` es `1`. `default_case_id` resuelve a un elemento de `cases`; cada `InspectorCase` es cerrado y enlaza proyecto, tipología, fuentes, observaciones, hechos, documentos, evidencias e issues mediante IDs de `model`. `required_fact_ids` es un subconjunto no vacío de `fact_ids` y `primary_evidence_id`, cuando existe, pertenece a `evidence_ids`.

`InspectorAsset` refleja el manifiesto público: ruta bajo `assets/evidence/`, SHA-256, MIME permitido, tamaño, dimensiones, procedencia `controlled_original`, permiso `authorized` y nota de licencia. Un activo visual autorizado debe resolver a un documento autorizado y a evidencia disponible con `fragment` no vacío. Una representación controlada nunca se presenta como original observado.

`coverage` declara conteos exactos de casos por procedencia, tipologías inspeccionables y activos visuales autorizados. La forma local se valida con JSON Schema; resolución de referencias, subconjuntos y conteos exactos pertenecen a la validación semántica.

## Convenciones

### IDs

Los IDs autoritativos son estables, en minúsculas y namespaced:

```text
source:nexo
agency:grupo-tyc
project:nexo-2951
typology:pardo-coast-tipo-7
observation:pardo-coast-card
fact:pardo-coast-card-area
```

El esquema valida la forma del ID. La existencia del destino y la unicidad global pertenecen al validador semántico posterior.

### Fingerprints de inputs

`metadata.input_fingerprints[].path` es una ruta lógica relativa a la raíz del repositorio y usa `/` como único separador:

```text
datos_relevantes/viva_minimum_dataset_latest.csv
datos_relevantes/demo-pilot/agencies.json
```

No es una ruta de acceso del sistema operativo. Se rechazan drives, rutas absolutas, backslashes, segmentos vacíos, `.`/`..` y cualquier segmento llamado `outputs`. El generador debe normalizar y validar la ruta antes de calcular o publicar el fingerprint.

### Valores y trazabilidad

Cada hecho conserva:

- `original_value` y `normalized_value`;
- `observation_id` y entidad propietaria;
- unidad y tipo semántico;
- `observed`, `derived` o `simulated`;
- confianza y estado de calidad;
- elegibilidad y motivo de exclusión;
- fórmula, inputs y redondeo cuando es derivado.

Un hecho derivado no queda certificado solo por declarar una fórmula. El validador debe comprobar que todos sus inputs existen, son compatibles y elegibles.

### Área, precio y moneda

Los enums son cerrados:

- área: `built | free | total | unknown`;
- precio: `list | from | sale | estimated | scenario`;
- moneda: `PEN | USD | unknown`;
- calidad: `certified | reviewable | inconsistent | illegible | insufficient`.

`$` no es un valor válido de moneda. Sin evidencia contextual se normaliza como `unknown` y el hecho debe quedar excluido.

Un `price_per_m2` exige `denominator_area_type`; no existe un precio/m² neutro cuando built y total son distintos. El validador posterior debe comprobar que unidad, moneda y denominador coinciden con sus hechos de entrada.

### Elegibilidad

El esquema exige:

- `benchmark_eligible=true` solo con calidad `certified`, sin motivo de exclusión y con valor observado o derivado;
- todo valor simulado fuera del benchmark;
- calidad `inconsistent`, `illegible` o `insufficient` fuera del benchmark;
- `unknown` en área, moneda o denominador fuera del benchmark;
- motivo no vacío para todo hecho excluido.

El validador semántico debe propagar conservadoramente la inelegibilidad de inputs, issues bloqueantes, monedas y denominadores incompatibles.

## Evidencia y publicación

El artefacto cubierto por este esquema es público. `metadata.publication` declara obligatoriamente:

- ausencia de PII de contacto;
- ausencia de raw payloads;
- ausencia de activos restringidos.

Un documento sin permiso `authorized`, o no disponible, debe tener `public_asset_path=null`. Las únicas rutas públicas aceptadas están bajo `assets/evidence/`.

Una evidencia restringida conserva metadatos y hash, pero su `fragment` debe ser `null`. El esquema no puede detectar por sí solo emails, teléfonos, nombres personales o rutas locales dentro de cualquier string; el test de privacidad debe recorrer claves y valores recursivamente.

Campos deliberadamente prohibidos en cada proyecto legacy, mediante `additionalProperties=false`:

```text
project_contact
project_email
project_phone
project_whatsapp
```

## Compatibilidad legacy

Cada elemento de `projects[]` superior exige los campos documentados en `DATA-SPEC.md` y rechaza propiedades adicionales. Los valores faltantes compatibles se expresan como `null`; nunca se sustituyen por cero.

La proyección legacy raíz es obligatoria y no vacía (`minItems: 1`). El generador no puede publicar únicamente el modelo autoritativo mientras la UI siga consumiendo `projects[]`.

La moneda legacy también debe ser `PEN`, `USD` o `unknown`. Las secciones:

```text
executive, rankings, sourceScope, scopeSummary, matching,
coverage, quality, assistant, pipeline, deployment
```

se mantienen estructuralmente durante la Fase 1. Sus contratos internos continuarán siendo legacy hasta que las fases funcionales migren cada consumidor.

## Contrato geográfico y de escenario 2.1

El reader `2.1` admite payloads `2.0.0` sin campos geográficos y payloads `2.1.0` completos. No se promete que un reader estricto `2.0` entienda campos nuevos, ni se aceptan versiones futuras o majors desconocidos de manera silenciosa.

`scenario_defaults.scope_mode` congela dependencias:

- `district`: cuadrante, punto y radio son `null`;
- `quadrant`: exige `NW | NE | SW | SE` y no admite punto o radio;
- `radius`: exige latitud, longitud y `500 | 1000 | 1500`, sin cuadrante.

Área y precio objetivo son opcionales, pero si existen deben ser positivos y no superar `10000 m2` y `1000000000 PEN`. El catálogo exacto se publica en `scenario_catalogs`; alterar valores u orden rompe el contrato.

`geography.crs` es siempre `EPSG:4326`. Los cuadrantes son analíticos, no oficiales: se derivan de las medianas de latitud y longitud de puntos válidos del distrito mediante `district_valid_point_coordinate_medians_v1`. Cada cuadrante separa IDs observados de IDs autoritativos. Las exclusiones conservan el `project_id`, la etapa (`scope`, `geography`, `reconciliation`, `product` o `price`), un motivo cerrado y si el elemento sigue visible como cobertura.

La geometría OSM y sus derivados permanecen separados del dataset inmobiliario. `source_id`, ruta y SHA-256 enlazan el artefacto con `datos_relevantes/geography/source-manifest.json`; `null` en el hash solo se permite mientras el derivado controlado o de build todavía no está materializado.

## Validaciones semánticas fuera de JSON Schema

JSON Schema valida forma y reglas locales, pero el validador de P1-06/P1-07 debe comprobar:

1. Unicidad global por colección y de aliases normalizados.
2. Todas las referencias entre fuentes, agencias, proyectos, tipologías, observaciones, hechos, documentos, evidencia, issues y eventos.
3. Cada alias resuelve a cero o un solo `agency_id`; `manual_review` puede quedar sin resolver.
4. `pilot.agency_ids` coincide con inmobiliarias seleccionadas y sus conteos.
5. `base_count`, `enriched_count` y `deep_count` reflejan los tiers reales.
6. Las fechas inicial/final y rangos min/max tienen orden válido.
7. Hechos observados conservan fuente, fecha, URL cuando aplica y evidencia disponible o motivo de ausencia.
8. Fórmulas derivadas usan inputs existentes y propagan calidad/elegibilidad.
9. Moneda, unidad, tipo de precio y denominador son compatibles.
10. Agregados nunca mezclan PEN, USD, `unknown` o tipos de área.
11. Eventos enlazan dos hechos comparables, ordenados por fecha e ID.
12. Una causa no nula tiene evidencia real; causa ausente permanece `null`.
13. Issues bloqueantes excluyen todos los hechos afectados.
14. Los fixtures CT-A/B/C/D/E/G/H/I producen exactamente sus resultados esperados.
15. La proyección legacy deriva del modelo autoritativo y no contiene PII.
16. Inputs y colecciones se ordenan de forma determinista y sus hashes coinciden.
17. Dos builds consecutivos producen el mismo SHA-256.
18. Los casos de `inspector` resuelven exclusivamente a registros nativos de `model`, sin duplicarlos; observaciones, hechos, documentos, evidencias e issues deben pertenecer al proyecto o tipología seleccionados y conservar sus enlaces internos.
19. `required_fact_ids` y `primary_evidence_id` pertenecen a sus listas de caso y `coverage` coincide con el índice.
20. Cada activo visual autorizado resuelve a un documento autorizado y conserva evidencia disponible con `fragment` no vacío.

Hasta que P3-04 actualice el writer y regenere el dataset, `npm run verify` puede fallar por el fingerprint esperado del schema. P3-01 exige que sus pruebas dirigidas y `npm run check` permanezcan verdes sin modificar writer, build o dataset.

## Uso por roles posteriores

- P1-02 debe construir fixtures contra `$defs` y las reglas semánticas anteriores.
- P1-03 a P1-05 deben conservar IDs namespaced y no relajar enums.
- P1-06 implementa las validaciones cruzadas sin corregir datos.
- P1-07 genera el documento raíz completo y la proyección legacy.
- P2-03 materializa asignaciones, medianas, cuadrantes y exclusiones sin cambiar sus enums.
- P2-04 publica el GeoJSON y sustituye el hash geográfico pendiente por el SHA-256 verificable.
- El checker independiente valida el resultado; el implementador del contrato no emite el veredicto de fase.
