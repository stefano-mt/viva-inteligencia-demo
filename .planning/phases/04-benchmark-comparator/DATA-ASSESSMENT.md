# Fase 4 — Evaluación de datos y metodología

## Propósito

Determinar qué puede convertirse en benchmark verificable sin adquirir datos nuevos ni elevar una referencia provisional a hecho certificado por intuición.

## Veredicto

Existe base observada suficiente para demostrar un **benchmark de precio publicado desde por m² total** en los siete distritos de alta carga. No existe base suficiente para un benchmark de área techada/libre, acabados o estacionamientos.

La implementación debe materializar una capa autoritativa nueva antes de modificar el benchmark o comparador.

## Inventario actual

### Hechos autoritativos

| Dimensión | Conteo |
|---|---:|
| Hechos totales | 40 |
| Observados / derivados / simulados | 28 / 11 / 1 |
| Certificados / revisables / inconsistentes / insuficientes / ilegible | 10 / 17 / 10 / 2 / 1 |
| Elegibles / excluidos | 10 / 30 |
| Precio por m² elegible de mercado | 0 |
| Atributos cualitativos elegibles | 1, cuarzo CT-D controlado |

Los 10 hechos elegibles actuales proceden de fixtures controlados. No constituyen una muestra de mercado.

### Snapshot Nexo

| Universo | Observados | Geo válida y reconciliados | Cociente provisional de mínimos |
|---|---:|---:|---:|
| Siete distritos de alta carga | 433 | 397 | 371 |
| Miraflores distrito | 90 | 85 comparables | 69 |

Reglas vigentes del cálculo legacy provisional:

- moneda PEN;
- precio, área total y precio por m² positivos;
- URL y fecha presentes;
- captura anterior o igual al corte;
- denominador compatible con área total;
- diferencia aritmética relativa <= 0.5%;
- sin faltantes declarados de precio o área.

Estas reglas todavía operan sobre la proyección legacy, no consultan hechos/issues F3 y solo prueban coherencia aritmética. No prueban que precio mínimo y área mínima pertenezcan a la misma unidad, oferta o tipología.

## Distribución Miraflores

| Alcance | Comparables | Cocientes provisionales | P25 diagnóstico | Mediana diagnóstica | P75 diagnóstico |
|---|---:|---:|---:|---:|---:|
| Distrito | 85 | 69 | 8,463.16 | 9,250.18 | 10,269.95 |
| NW | 37 | 27 | 8,196.97 | 8,907.83 | 9,527.34 |
| NE | 4 | 4 | 7,759.36 | 8,346.71 | 9,149.80 |
| SW | 5 | 4 | 9,579.94 | 9,793.14 | 9,934.90 |
| SE | 39 | 34 | 9,036.96 | 9,793.10 | 10,643.90 |
| Radio 1 km | 22 | 21 | 9,052.02 | 9,887.10 | 11,047.38 |

Valores expresados como PEN / m² mínimo publicado. Son un diagnóstico aritmético de la proyección legacy, no una muestra elegible. El volumen no resuelve el vínculo semántico precio–área.

## Denominadores obligatorios

Para Miraflores distrito, la UI no debe resumir todo con un único `n`:

| Indicador | Denominador vigente |
|---|---:|
| Oferta observada | 90 proyectos |
| Comparables reconciliados | 85 proyectos |
| Inmobiliarias comparables | 54 |
| Cociente provisional precio mínimo / área mínima | 69 proyectos / 46 inmobiliarias |
| Precio por m² total elegible | 0 con la evidencia actualmente versionada |
| Unidades reportadas | 85/85 registros; semántica pendiente |
| Amenities informados | 83/85 |
| Parking informado | 2/85 |
| Acabados de mercado certificados | 0/85 |
| Área techada/libre | 0/85 |

## Materialización propuesta

### Fuente

Usar directamente `datos_relevantes/viva_minimum_dataset_latest.csv` y catálogos autoritativos. `public.projects[]` es una proyección de compatibilidad y no puede convertirse en fuente de verdad.

### Registros nuevos

Por proyecto reconciliado y geográficamente válido del Top 7:

1. observación de publicación;
2. hecho de área total observada;
3. hecho de precio publicado desde observado;
4. registro de pairing con provenance y estado;
5. hecho derivado de precio por m² total solo para `source_paired`; el cociente `project_minima_pair_unresolved` vive en una serie orientativa separada;
6. hecho de unidades reportadas, si A5 lo autoriza;
7. hechos de atributos anunciados normalizados, conservando original;
8. parking solo cuando existe, sin imputar cero a faltantes.

### Índice público 2.3

```text
benchmark
├── version
├── methodology
│   ├── cutoff_at
│   ├── minimum_quantitative_sample
│   ├── minimum_qualitative_informed_sample
│   ├── quantile_method
│   ├── price_type_policy
│   ├── allowed_area_denominators
│   ├── pairing_policy
│   ├── exclusion_reason_precedence
│   └── representativeness_rules
├── fact_index[]
│   ├── project_id
│   ├── observation_id
│   ├── total_area_fact_id
│   ├── published_price_fact_id
│   ├── price_per_m2_fact_id
│   ├── pairing_status
│   ├── pairing_evidence_ids[]
│   ├── reported_unit_count_fact_id
│   ├── parking_count_fact_id
│   └── attribute_fact_ids[]
├── attribute_catalog[]
│   ├── attribute_id
│   ├── category
│   ├── normalized_label
│   └── aliases
└── coverage
    └── indicators{}
        ├── input_project_ids[]
        ├── used_project_ids[]
        ├── missing_project_ids[]
        └── excluded_projects[{ project_id, reasons[] }]
```

El índice solo contiene metodología e IDs. Los valores viven en `model.observations` y `model.facts`.

## Reglas de calidad

### Precio por m²

Elegible solo si:

- proyecto dentro de `scenarioContext.comparable_project_ids`;
- observación autoritativa y fecha válida;
- moneda PEN;
- precio `from` y área total positivos;
- denominador `total` explícito;
- derivación reproducible;
- `pairing_status = source_paired`, respaldado por `offer_id`, `typology_id` o métrica nativa con semántica documentada;
- sin issue bloqueante aplicable al precio/área;
- vínculo tipológico resuelto o no necesario;
- proyecto no incluido por fallback.

Estados de pairing:

- `source_paired`: la fuente demuestra que precio y área pertenecen a la misma oferta/tipología; puede ser elegible;
- `project_minima_pair_unresolved`: ambos mínimos provienen del proyecto, pero la pareja de unidad no está demostrada; solo índice orientativo;
- `conflicting`: existe evidencia incompatible; excluido;
- `missing`: falta uno de los insumos; faltante.

La coincidencia de la fórmula dentro de 0.5% no promueve `project_minima_pair_unresolved` a `source_paired`. Con las entradas hoy versionadas, los 371/69 candidatos permanecen orientativos y el benchmark elegible tiene `n = 0`, salvo que una evidencia ya versionada y auditable demuestre una pareja concreta durante P4-02.

### Ledger por indicador

Cada indicador parte de IDs distintos del universo canónico que le corresponde y devuelve una partición disjunta:

`input_project_ids = used_project_ids + missing_project_ids + excluded_project_ids`.

- un proyecto aporta como máximo un valor por indicador;
- múltiples observaciones idénticas se deduplican por valor normalizado y conservan todos los IDs de provenance;
- múltiples observaciones incompatibles excluyen el proyecto con `conflicting_observations`;
- `restricted` queda fuera de numerador y denominador agregado y aparece en exclusiones;
- las razones se ordenan: `restricted` → `blocking_issue` → `conflicting_observations` → `pair_unresolved` → `currency` → `area_denominator` → `cutoff` → `missing`;
- cada KPI conserva sus propios IDs; no existe un `used_project_ids` global reutilizable.

### Cualitativo

Estado por atributo/proyecto:

- `evidence_backed`: hecho certificado con evidencia permitida;
- `announced`: la publicación lo declara, sin evidencia independiente;
- `unknown`: la fuente no lo informa;
- `restricted`: existe referencia, no puede abrirse;
- `excluded`: contradicción o issue bloqueante.

La prevalencia de `announced` usa como denominador proyectos distintos con campo informado. `unknown` no equivale a `false`; `restricted` y `excluded` quedan fuera del denominador y se muestran por separado. Una observación repetida del mismo proyecto nunca incrementa el numerador.

### Representatividad

- Cuantitativo elegible `ready`: al menos 3 valores `source_paired` homogéneos.
- Cuantitativo elegible `orientative`: 1–2 valores `source_paired`.
- Cuantitativo elegible `insufficient`: 0 valores `source_paired`.
- Serie `project_minima_pair_unresolved`: siempre `orientative_noncomparable`, aunque `n >= 3`; nunca se mezcla con la serie elegible.
- Cualitativo `ready`: al menos 5 proyectos informados; puede hablar de patrón observado de publicación.
- Cualitativo `orientative`: 1–4 informados; solo conteo descriptivo, sin prevalencia/patrón.
- Cualitativo `insufficient`: 0 informados.
- `contract_unavailable`: falta `benchmark` en 2.1/2.2; no equivale a muestra vacía.
- `error`: contrato 2.3 inválido o fallo técnico; no se presenta como insuficiencia.

## Taxonomía inicial de atributos

La taxonomía debe ser cerrada, versionada y revisable. Categorías candidatas:

- acceso y recepción;
- bienestar y deporte;
- reuniones y trabajo;
- recreación familiar;
- gastronomía y social;
- exterior y áreas verdes;
- servicios comunes;
- movilidad y estacionamiento.

`Otros` no es un atributo canónico. Dos textos solo se unifican con alias explícito, nunca por similitud intuitiva durante el render.

## Casos de aceptación de datos

### CT-A

- área total y built permanecen denominadores distintos;
- el precio simulado no entra al benchmark de mercado;
- F4 no crea built/free de mercado.

### CT-B

- conserva ambos precios incompatibles;
- ninguno se selecciona como verdad o agregado.

### CT-C

- un proyecto fuera de la microzona no aparece en `used_project_ids`;
- mapa, benchmark y comparador comparten el universo canónico.

### CT-D

- cuarzo abre su evidencia;
- no se presenta como prevalencia territorial.

### CT-G

- Pardo Coast sigue territorialmente visible;
- Tipo 7 y sus ocho hechos permanecen excluidos;
- un precio con vínculo tipológico no resuelto queda fuera del benchmark.
- la observación F4 de Pardo Coast no aparece en `price_per_m2_total.used_project_ids` y conserva `typology_link_unresolved` más enlace al inspector.

### CT-P — Pareja precio–área

- un fixture `source_paired` con la misma oferta entra una sola vez;
- dos mínimos de proyecto sin `offer_id`/`typology_id` quedan en `orientative_noncomparable`;
- observaciones repetidas idénticas se deduplican;
- observaciones incompatibles producen `conflicting_observations`;
- para cada indicador se verifica la partición exacta y sin duplicados.

### CT-I

- conserva 90/85/5 y cuadrantes 40/5/5/40;
- añade denominadores de precio y cualitativo sin alterar esos conteos.

## Privacidad y publicación

- No incorporar HTML crudo, imágenes, rutas locales o PII.
- No copiar evidencia pending/restricted.
- URLs públicas pueden conservarse como metadata; no se convierten automáticamente en CTA.
- Exportación usa allowlist y excluye hashes completos, fragmentos restringidos y URLs no autorizadas.

## Gates de volumen y determinismo

- Orden canónico de todos los registros e índices.
- Dos builds consecutivos producen hashes idénticos.
- JSON público objetivo menor a 10 MB; superar el umbral exige revisión de alcance.
- Ningún hecho duplicado por `(project_id, field_name, source_id, captured_at)`.
- Cero referencias huérfanas.
- El coverage report debe cerrar `GAP-F4-BENCHMARK` o explicar por qué sigue bloqueante.
