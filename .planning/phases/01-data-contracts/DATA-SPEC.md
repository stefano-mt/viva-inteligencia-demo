# Fase 1 — Especificación del contrato de datos v2

## Principios

1. El modelo autoritativo guarda observaciones y hechos; las tarjetas de proyecto son una proyección.
2. Nunca se pierde el valor original al normalizar.
3. Ningún agregado mezcla monedas o denominadores incompatibles.
4. Un dato inconsistente puede mostrarse, pero no certificarse.
5. El mismo input produce exactamente el mismo output.
6. El JSON público excluye datos personales innecesarios.

## Estructura superior

```text
metadata
model
  sources[]
  agencies[]
  agencyAliases[]
  projects[]
  typologies[]
  observations[]
  facts[]
  documents[]
  evidence[]
  issues[]
  events[]
pilot
projects[]                       ← proyección legacy temporal
executive, rankings, sourceScope, scopeSummary,
matching, coverage, quality, assistant, pipeline, deployment
```

`metadata.contract_version` debe ser `2.0.0`. `metadata.dataset_id`, `cutoff_at` e `input_fingerprints` son obligatorios. Las entidades autoritativas viven únicamente en `model`; el `projects[]` superior es una proyección compatible y nunca se usa como fuente para reconstruir hechos.

## Entidades

### `sources`

- `source_id`: estable y namespaced.
- `name`, `type`, `base_url`.
- `legal_status`: `cleared_for_demo | pending_review | restricted`.
- `access_mode`: `versioned_snapshot | user_provided | public_reference | controlled_fixture`.

### `agencies`

- `agency_id`: estable, independiente del orden de archivos.
- `canonical_name`.
- `normalized_name`.
- `domain`.
- `pilot_selected`.
- `coverage_tier`: `base | enriched | deep`.
- `source_names[]`: nombres originales preservados.
- `selection_reason`.

### `agencyAliases`

- `alias_original`.
- `alias_normalized`.
- `agency_id`.
- `resolution`: `confirmed | rule_based | manual_review`.
- `evidence`.

Un alias se asigna a cero o un ID canónico. Compartir dominio no basta para fusionar automáticamente marcas ambiguas.

`coverage_tier` expresa el nivel máximo alcanzado y es excluyente por inmobiliaria. Los indicadores son acumulativos:

- `base_count`: todas las inmobiliarias seleccionadas;
- `enriched_count`: inmobiliarias con tier `enriched` o `deep`;
- `deep_count`: inmobiliarias con tier `deep`.

### `projects`

- `project_id`: ID estable namespaced por fuente o canónico controlado.
- `agency_id`.
- `canonical_name`, `source_names[]`.
- ubicación estructurada.
- estado.
- `first_seen_at`, `last_seen_at`.
- `quality_status`.

### `typologies`

- `typology_id`, `project_id`.
- `model`.
- `floor_label_original`, `floor_min`, `floor_max`.
- dormitorios y baños.
- `quality_status`.

### `observations`

- `observation_id`.
- `source_id`.
- `entity_type`, `entity_id`.
- `captured_at`.
- `source_url`.
- `extraction_method`.
- `evidence_ids[]`.

### `facts`

- `fact_id`, `observation_id`, `entity_id`.
- `field_name`.
- `original_value`.
- `normalized_value`.
- `unit`.
- `value_kind`: `observed | derived | simulated`.
- `semantic_type`.
- `confidence`: `high | medium | low | unknown`.
- `quality_status`.
- `benchmark_eligible`.
- `derivation`: fórmula e IDs de inputs cuando aplica.

### `documents` y `evidence`

- tipo de documento;
- propietario/fuente;
- fecha;
- fragmento o transcripción;
- página/región si existe;
- hash SHA-256;
- permiso de publicación;
- ruta versionada solo cuando el activo esté autorizado.

### `issues`

- `issue_id`.
- entidad y hechos involucrados.
- `issue_code`.
- `severity`.
- `quality_status`.
- detalle y siguiente acción.

### `events`

- `event_id`.
- entidad y campo.
- hecho anterior y nuevo.
- fecha efectiva/observada.
- delta y porcentaje con base declarada.
- causa: solo si existe evidencia; de lo contrario `null`.

## Enums obligatorios

- Área: `built | free | total | unknown`.
- Precio: `list | from | sale | estimated | scenario`.
- Calidad: `certified | reviewable | inconsistent | illegible | insufficient`.
- Moneda: `PEN | USD | unknown`.
- Valor: `observed | derived | simulated`.
- Elegibilidad: booleano acompañado por `exclusion_reason`.

El símbolo `$` no se convierte automáticamente a USD. Sin contexto suficiente se normaliza como `unknown` y queda fuera de agregados monetarios certificados.

## Reglas de cálculo

### Precio por m²

Cada resultado declara:

- `price_fact_id`;
- `area_fact_id`;
- moneda;
- tipo de área usado como denominador;
- fórmula;
- redondeo.

No existe un único `price_per_m2` si hay áreas built y total disponibles.

### Conflicto de fuentes

Dos hechos observados incompatibles:

- permanecen separados;
- generan un issue;
- no crean un campo “verdadero”;
- pasan a `reviewable` o `inconsistent`;
- quedan fuera del benchmark certificado hasta resolución.

### Moneda

- Agregados se calculan por moneda.
- No se convierte sin un hecho de tipo de cambio, fuente y fecha.
- `PEN`, `USD` y `unknown` nunca se suman o promedian juntos.

### Elegibilidad

Un hecho es elegible solo cuando:

- semantic type y unidad son conocidos;
- moneda/denominador son compatibles;
- no existe issue bloqueante;
- fuente, fecha y valor original están presentes;
- no es `simulated`, salvo escenarios explícitos fuera del benchmark de mercado.

La elegibilidad se propaga de forma conservadora: un hecho derivado solo es elegible si todos sus inputs son elegibles y ninguno es `simulated`, `inconsistent`, `illegible` o `insufficient`. Cambiar `value_kind` a `derived` no limpia la calidad de sus inputs.

## Fixtures

### CT-A — Áreas y precio/m²

Fixture controlado:

- precio simulado: S/ 980,000;
- área built observada/controlada: 98 m²;
- área total observada/controlada: 206 m²;
- área libre derivada: 108 m²;
- precio/m² built: S/ 10,000.00;
- precio/m² total: S/ 4,757.28.

El precio está marcado `simulated` y no representa una publicación real.

### CT-B — Precios discrepantes

Fixture controlado:

- mismo proyecto y tipología;
- fuente A: precio list PEN 600,000;
- fuente B: precio list PEN 625,000;
- diferencia: PEN 25,000;
- diferencia relativa: `+4.17%`, usando PEN 600,000 como base anterior;
- issue `PRICE_SOURCE_CONFLICT`;
- sin selección automática;
- no elegible para benchmark certificado.

### CT-G — Tarjeta/plano

Observaciones estructuradas aportadas por el usuario:

- tarjeta: Pardo Coast, Tipo 7, Piso 1, 104.15 m²;
- plano: Pardo Coast, Tipo 7, “Área Total 53.37 m2”, departamentos 807–1007;
- delta: 50.78 m²;
- diferencia relativa respecto de tarjeta: 48.76%;
- issue `AREA_SOURCE_CONFLICT`;
- issue `FLOOR_RANGE_CONFLICT_REVIEW`;
- calidad `inconsistent`;
- `benchmark_eligible=false`.

La etiqueta 53.37 se conserva como `total`, no `built`.

### CT-D — Atributo cualitativo y documento

Fixture controlado:

- atributo observado: `countertop_material = "cuarzo"`;
- documento A: fragmento autorizado y publicable, con hash;
- documento B: referencia restringida, sin ruta pública;
- atributo no observado: `air_conditioning = unknown`.

El test demuestra que ausencia no equivale a `false`, que el atributo certificado abre evidencia autorizada y que un documento restringido conserva metadatos sin publicar el activo.

### CT-E — Histórico determinista

Fixtures controlados:

1. Precio anterior PEN 600,000 y nuevo PEN 630,000:
   - delta `+30,000`;
   - porcentaje `+5.00%` con base anterior;
   - causa `null`.
2. Valor anterior cero:
   - delta numérico permitido;
   - porcentaje `null`;
   - issue `PERCENT_BASE_ZERO`.
3. Cambio absoluto mayor a 50%:
   - issue `EXTREME_CHANGE_REVIEW`;
   - no certificado hasta revisión.

El orden se determina por fecha y luego por ID, nunca por posición en el archivo.

### CT-H — 30 inmobiliarias

- mínimo 30 `agency_id` canónicos seleccionados.
- GRUPO T&C/GRUPO TyC se consolidan conservando ambos nombres originales.
- cada seleccionada tiene `coverage_tier`.
- conteos públicos distinguen mercado bruto, piloto base, enriquecidas y profundas.
- el orden es estable.

Mínimos de fase:

- `base_count >= 30`;
- `enriched_count >= 15`, contando tiers `enriched + deep`, con al menos dos fuentes enlazadas y matching alto/medio;
- `deep_count >= 5`, contando tier `deep`, con tres o más hechos respaldados por evidencia versionada y un documento/tipología inspeccionable.

Si el snapshot local no puede demostrar estos mínimos sin inventar evidencia, el build falla y el gap se escala; no se rebaja el significado del tier.

## Compatibilidad temporal

El output conserva `projects[]` con los campos consumidos por la UI actual. Esta proyección:

- deriva del modelo v2;
- excluye contactos personales;
- conserva IDs existentes cuando son válidos;
- no cambia rutas o estructura visual;
- incluye solo valores compatibles con el significado legacy;
- no convierte un valor dudoso en cero.

Campos legacy preservados:

```text
id, source, source_type, captured_at, source_url, extraction_method,
agency_name, project_name, district, province, department, address,
latitude, longitude, project_phase, typology, bedrooms, bedrooms_min,
bedrooms_max, total_area_min, total_area_max, total_area, unit_status,
unit_count, currency, list_price_avg, price_min, price_per_m2_list,
latest_price_history_from, latest_price_history_date, price_delta,
price_delta_pct, delivery_year, delivery_date, update_date, income,
total_m2, financing_banks, amenities, project_description,
field_confidence, missing_required_fields
```

Se eliminan deliberadamente `project_contact`, `project_email`, `project_phone` y `project_whatsapp`. La vista actual debe degradar a “No registrado” sin error. Las demás secciones superiores legacy se preservan durante Fase 1.

## Determinismo

- No usar `new Date()` dentro del build.
- `generated_at` se deriva de un manifiesto congelado o parámetro explícito.
- Inputs se ordenan antes de serializar.
- Se registran hashes de cada input.
- Archivo faltante/corrupto produce error y exit code distinto de cero.
- Dos builds consecutivos deben producir el mismo SHA-256.

## Seguridad del artefacto público

El JSON público no incluye:

- nombres personales de contacto;
- emails;
- teléfonos;
- WhatsApp;
- raw payloads;
- rutas locales;
- imágenes o documentos no autorizados.

La prueba de privacidad recorre recursivamente claves y valores. Incluye casos negativos para emails, teléfonos, WhatsApp, nombres personales, rutas `C:\`, `/Users/`, `outputs/`, payloads crudos y activos con `publish_permission != authorized`.

La fuente analítica puede conservar referencias restringidas fuera de `public/`, sujetas a revisión.
