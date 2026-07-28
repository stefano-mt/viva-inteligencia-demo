# Contrato público de datos v2

`demo-v2.schema.json` es la fuente ejecutable de estructura para el dataset estático de Viva Inteligencia Comercial. Usa JSON Schema Draft 2020-12, es autocontenido y no requiere una dependencia de runtime.

## Alcance

El contrato distingue dos capas:

1. `model`: modelo autoritativo de fuentes, inmobiliarias, aliases, proyectos, tipologías, observaciones, hechos, documentos, evidencia, issues y eventos.
2. `projects` y las secciones legacy superiores: proyección temporal consumida por la UI existente.

La proyección legacy no es una fuente de verdad y no debe utilizarse para reconstruir observaciones o hechos. Se conserva para que la Fase 1 pueda cambiar el contrato sin modificar las siete rutas actuales.

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
14. Los fixtures CT-A/B/D/E/G/H producen exactamente sus resultados esperados.
15. La proyección legacy deriva del modelo autoritativo y no contiene PII.
16. Inputs y colecciones se ordenan de forma determinista y sus hashes coinciden.
17. Dos builds consecutivos producen el mismo SHA-256.

## Uso por roles posteriores

- P1-02 debe construir fixtures contra `$defs` y las reglas semánticas anteriores.
- P1-03 a P1-05 deben conservar IDs namespaced y no relajar enums.
- P1-06 implementa las validaciones cruzadas sin corregir datos.
- P1-07 genera el documento raíz completo y la proyección legacy.
- El checker independiente valida el resultado; el implementador del contrato no emite el veredicto de fase.
