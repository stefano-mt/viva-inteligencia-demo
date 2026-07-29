# Fase 3 — Plan de ejecución

## Estado

**Revisado — PASS.** Implementación bloqueada hasta `HUMAN-GATE-A`.

## Objetivo verificable

Entregar una vista estática y reproducible que muestre cobertura multifuente, permita navegar proyecto → tipología → evidencia, explique discrepancias por campo y excluya de forma trazable los hechos no certificados, con CT-D y CT-G aprobados visual y analíticamente.

## Alcance funcional

1. Nueva vista `Inspector de evidencia`.
2. Cobertura `30 / 22 / 5` con significado explícito.
3. Mínimo 10 y máximo 15 tipologías inspectables, claramente clasificadas por procedencia.
4. Ledger por filas para compatibilidad.
5. Visor accesible de activos, fragmentos, transcripciones y restricciones.
6. Motor puro de expediente, compatibilidad, roll-up y elegibilidad.
7. CTA desde catálogo de comparables al inspector.
8. Decisión `Elegible/No elegible según las reglas de la demo` con razones.
9. CT-D y CT-G como fixtures bloqueantes.
10. Estados certificado, revisable, inconsistente, ilegible e insuficiente.

El inventario normativo es `CASE-INVENTORY.md`. Ningún maker selecciona o inventa casos fuera de esa lista.

## Historias y criterios de aceptación

### HU-DEMO-401 — Ficha multifuente del proyecto

**Como** analista comercial, **quiero** abrir una ficha que reúna las fuentes de un proyecto, **para** entender la cobertura real antes de comparar.

Criterios:

1. La ficha identifica proyecto, inmobiliaria, distrito, estado y fecha de corte.
2. Lista tipologías disponibles y número de fuentes/observaciones por tipología.
3. Distingue datos de mercado, fixtures controlados y valores derivados.
4. Muestra fuente, fecha, método y confianza, como mínimo, para modelo, piso/unidad, área, dormitorios, baños y cada atributo cualitativo incluido.
5. No presenta un tier `deep` como garantía de plano público.
6. Un proyecto sin tipología ofrece un estado insuficiente y no una ficha vacía.
7. La selección no cambia silenciosamente el escenario territorial.

### HU-DEMO-402 — Detección visual de discrepancias

**Como** analista, **quiero** ver las diferencias entre fuentes por campo, **para** identificar comparaciones engañosas.

Criterios:

1. La comparación se presenta por filas, no como una cuadrícula de cards.
2. Modelo, piso/unidad, área, dormitorios y baños tienen lectura independiente.
3. Valor original y normalizado son visibles o accesibles.
4. Compatibilidad no depende solo del color.
5. Un issue bloqueante muestra causa, hechos implicados y siguiente acción.
6. La diferencia absoluta y relativa identifica su base y redondeo.
7. La ausencia produce `insufficient`, no coincidencia.

### HU-DEMO-403 — Visor de evidencia cualitativa

**Como** analista, **quiero** abrir la evidencia desde un dato o hallazgo, **para** verificar su contexto sin abandonar el análisis.

Criterios:

1. Cada hecho con evidencia tiene un control accesible `Ver evidencia`.
2. Un activo autorizado se abre desde ruta local validada.
3. Un fragmento autorizado muestra fuente, fecha, página y texto.
4. Un activo restringido o pendiente nunca se solicita por red ni se incrusta.
5. La metadata restringida sigue siendo visible sin fragmento ni ruta.
6. El visor funciona con teclado, Escape y retorno de foco.
7. En móvil ocupa pantalla completa sin scroll horizontal.
8. Una representación controlada declara persistentemente que no es el original.

### HU-DEMO-404 — Resumen cualitativo del proyecto (`Should`)

**Como** responsable comercial, **quiero** una síntesis prudente de atributos documentados, **para** detectar argumentos verificables.

Criterios:

1. Separa atributos certificados, no observados y restringidos.
2. `unknown` nunca se presenta como `false`.
3. Cada claim certificado abre evidencia.
4. No infiere calidad, lujo, material o equipamiento por una imagen no analizada.
5. Si la historia compromete Must o performance, puede diferirse sin bloquear CT-D/CT-G.

### HU-DEMO-405 — Inspector de tipologías y planos

**Como** analista, **quiero** navegar proyecto → tipología → tarjeta/plano/evidencia, **para** revisar el objeto correcto.

Criterios:

1. El orden de selección está explícito.
2. La ruta `#inspector` es directa y reproducible.
3. CT-G abre Pardo Coast → Tipo 7 mediante preset estable.
4. Un proyecto con varias tipologías conserva la selección válida.
5. Una selección inválida se corrige de forma determinista y se anuncia.
6. El detalle se adapta a 1440×900, 1280×720 y 390×844.
7. El catálogo enlaza al inspector cuando hay tipología inspeccionable.
8. El enlace CT-G canónico es `#inspector/case/f3-ct-g-pardo`.
9. Los CTA enfocan destinos deterministas definidos por UI-SPEC.

### HU-DEMO-406 — Extracción/conciliación preprocesada del plano

**Como** analista, **quiero** revisar valores transcritos y conciliados previamente, **para** evaluar discrepancias sin depender de OCR en vivo.

Criterios:

1. El sistema consume transcripciones versionadas; no ejecuta OCR en navegador.
2. Todo valor transcrito conserva texto original, normalización, método, fecha y confianza.
3. `Área Total 53.37 m2` permanece `area_type = total`.
4. `104.15 m²` permanece `area_type = unknown`.
5. La inferencia 8–10 desde `807–1007` es derivada, baja confianza y revisable.
6. No se selecciona automáticamente una fuente como verdad.
7. Los hechos no certificados no alimentan agregados certificados.

### HU-DEMO-901 — Cobertura de mercado y fuentes

**Como** usuario de la demo, **quiero** entender cuántas inmobiliarias y proyectos tienen cada nivel de evidencia, **para** interpretar correctamente la escala.

Criterios:

1. Muestra 30 base, 22 enriched y 5 deep con definiciones.
2. Aclara que los niveles son acumulativos.
3. Muestra por separado tipologías inspectables y activos autorizados.
4. Los conteos se derivan del dataset; no están escritos a mano.
5. Un cambio de datos actualiza conteos tras `data:build`.
6. No usa “cobertura total” ni “dossier visual” sin sustento.

## Casos transversales bloqueantes

### CT-D — Evidencia cualitativa

1. Seleccionar el caso controlado CT-D.
2. Mostrar `Cubierta de cocina: cuarzo.` como fragmento autorizado.
3. Mostrar fecha, fuente, página, confianza y calidad.
4. Abrir el fragmento desde el hecho `countertop_material`.
5. Mostrar `air_conditioning = unknown`, nunca `false`.
6. Documento restringido: sin activo ni fragmento público.

### CT-G — Tarjeta/plano incompatibles

1. Seleccionar Pardo Coast → Tipo 7.
2. Mostrar dos observaciones independientes.
3. Tarjeta: `Piso 1`, `104.15 m²`, área `unknown`.
4. Plano: `Dep. 807 AL 1007`, `Área Total 53.37 m2`.
5. Mostrar `50.78 m²` y `48.76%`, base tarjeta.
6. Mostrar inferencia 8–10 como derivada y de confianza baja.
7. Estado final `inconsistent`.
8. `benchmark_eligible = false`.
9. Ningún activo CT-G original se publica.
10. Desde cada hallazgo se abre metadata/transcripción permitida o el estado de restricción.
11. No aparece Park 55 ni se cambia el `project_id`.

## Contratos que deben congelarse antes de UI

### Expediente

Función pura propuesta:

```js
buildEvidenceDossier({
  model,
  inspector,
  projectId,
  typologyId
}) => {
  project,
  typologies,
  selectedTypology,
  sources,
  observations,
  facts,
  documents,
  evidence,
  issues,
  compatibilityRows,
  decision,
  coverage
}
```

No lee DOM ni estado global.

### Compatibilidad

```js
evaluateCompatibility({
  typology,
  observations,
  facts,
  issues
}) => {
  rows,
  rollupStatus,
  benchmarkEligible,
  blockingIssueIds,
  eligibleFactIds,
  excludedFactIds
}
```

La tabla de reglas se prueba con pares de entrada/salida. No se introduce un umbral general de diferencia de área: CT-G ya contiene un issue observado y bloqueante. Un umbral nuevo requeriría evidencia de negocio y decisión separada.

### Evidencia publicable

```js
resolveEvidencePresentation({ document, evidence, baseUrl }) => {
  mode: "asset" | "fragment" | "controlled_transcription" | "restricted" | "pending" | "unavailable",
  publicUrl: string | null,
  canOpen: boolean,
  reason: string | null
}
```

Solo `authorized + available` puede producir `publicUrl`; la ruta debe pertenecer a `assets/evidence/`.

### Manifest y allowlist

Cada activo público declara:

- `asset_id`;
- `document_id`;
- `logical_path`;
- `sha256`;
- `media_type`;
- `bytes`;
- `width` y `height` cuando aplica;
- `provenance = controlled_original`;
- `publish_permission = authorized`;
- `license_note`.

Reglas:

- allowlist: `image/png`, `image/webp`, `image/jpeg` y `text/plain; charset=utf-8`;
- máximo 250 KB por imagen;
- máximo 10 KB por fragmento de texto;
- máximo 4 MB acumulado para Fase 3;
- rutas exactas bajo `assets/evidence/`;
- hash y bytes validados durante build;
- firma mágica, extensión y MIME coinciden;
- PNG/JPEG/WebP se decodifican y sus dimensiones reales coinciden con manifest;
- los hashes CT-G `41ab273c521fcc66025653e8cfe44f894afb01b2f1b9be72847dcf87db2f2c4b` y `3c108732cc1f9c0dbd884ed3d171a0abacffc96d9e80a95d994dc1d1a43bd60a` están en una denylist y no pueden corresponder a un archivo público;
- un activo fuera de manifest hace fallar el gate.

### Contrato público 2.2.0

P3-01 es obligatorio. El writer pasa de `2.1.0` a `2.2.0`; el reader 2.2 acepta `2.0.0`, `2.1.0` y `2.2.0`.

El root añade una propiedad requerida solo para 2.2:

```js
inspector: {
  version: 1,
  default_case_id: "case:f3-ct-g-pardo",
  cases: InspectorCase[],
  assets: InspectorAsset[],
  coverage: {
    total_cases,
    observed_cases,
    controlled_cases,
    simulated_cases,
    inspectable_typologies,
    authorized_visual_assets
  }
}
```

`InspectorCase` es cerrado (`additionalProperties: false`) y requiere:

- `case_id`, `route_slug`, `project_id`, `typology_id`;
- `provenance_classification`: `observed|controlled|simulated`;
- `source_ids`, `observation_ids`, `fact_ids`, `document_ids`, `evidence_ids`, `issue_ids`;
- `required_fact_ids`, subconjunto no vacío de `fact_ids` usado para el roll-up;
- `primary_evidence_id` nullable;
- `expected_quality_status`;
- `expected_benchmark_eligible`;
- `public_visual_asset_count`.

`InspectorAsset` es cerrado y refleja el manifest: `asset_id`, `document_id`, `logical_path`, `sha256`, `media_type`, `bytes`, dimensiones, procedencia, permiso y nota de licencia.

Los proyectos, tipologías, observaciones, hechos, documentos, evidencias e issues nuevos se integran en `model`; `inspector.cases` solo indexa IDs existentes. Todo documento visual controlado tiene una evidencia con fragmento textual no vacío, por lo que no se introduce evidencia `available` exclusivamente binaria. Consumidores F2 pueden ignorar `inspector` y deben mantener su salida.

### Estado

Agregar únicamente selecciones de inspector:

- `inspectorProjectId`;
- `inspectorTypologyId`;
- `inspectorEvidenceId`;
- `inspectorPreset`;
- `inspectorDialogOpen`.

El escenario territorial sigue siendo autoritativo para mapa y comparables. El inspector no crea un segundo escenario.

## Archivos protegidos

Salvo tarea que los declare expresamente:

- `prototipo_ejecutable/public/js/scenario.js`;
- `prototipo_ejecutable/public/js/comparability.js`;
- `prototipo_ejecutable/public/js/views/geographic-map.js`;
- `prototipo_ejecutable/public/js/views/positioning-map.js`;
- `prototipo_ejecutable/public/styles/45-geography.css`;
- `datos_relevantes/geography/**`;
- fixtures CT-C/CT-I;
- workflows de despliegue.

No se modifican imágenes CT-G del directorio temporal del usuario.

## Olas y dependencias

```text
3.0 planificación y aprobación
  ↓
3.1 contrato + fixtures + activos permitidos
  ↓
3.2 motor puro + estado/controlador
  ↓
3.3 shell de inspector + cobertura + visor
  ↓
3.4 ledger + decisión + enlace desde catálogo
  ↓
3.5 E2E/a11y/responsive + checker
  ↓
memoria + PR + Pages
```

No se ejecutan tareas de una ola dependiente hasta cerrar los contratos de la anterior.

## Roles y delegación

| Rol | Responsabilidad | Restricción |
|---|---|---|
| Orquestador | intención, orden, gate y memoria | no implementa en paralelo con delegados |
| Implementador de datos | contrato, fixtures, manifest, build | no toca vistas |
| Implementador de dominio | módulo puro y tests | no toca datos fuente ni CSS |
| Implementador UI | inspector y estilos propios | no cambia reglas de elegibilidad |
| Integrador | estado, controlador, app y catálogo | único escritor de archivos compartidos |
| Verificador | CT-D/CT-G, visual, a11y, regresión | distinto de makers |
| Revisor | sobrealcance, permisos, claims | solo lectura |

Cada tarea produce handoff según `.planning/templates/HANDOFF.md`.

## Matriz normativa de ejecución

Esta tabla prevalece sobre cualquier resumen posterior. Un cambio de dependencia o archivo exige actualizar el plan antes de escribir.

| Tarea | `depends_on` | Puede paralelizar con | Gate de salida |
|---|---|---|---|
| P3-00A | Fase 2 cerrada | ninguno | baseline y permisos confirmados |
| P3-00B | P3-00A | ninguno | reader-test favorable |
| P3-00C | P3-00B + HUMAN-GATE-A | ninguno | aprobación persistida |
| P3-01 | P3-00C | investigación P3-03, sin escritura común | schema y reader 2.2 congelados |
| P3-02 | P3-00C | P3-01 | proyecciones CT-D/CT-G pasan |
| P3-03 | P3-01 + P3-02 | ninguno | inventario, manifest y catálogos válidos |
| P3-04 | P3-03 | ninguno | JSON determinista y reporte actualizado |
| P3-05 | P3-01 + P3-02 + P3-03 + P3-04 | ninguno | motor puro pasa payload 2.2 |
| P3-06 | P3-05 | ninguno | estado/controlador pasan |
| P3-07 | P3-04 + P3-05 + P3-06 | ninguno | shell/cobertura/veredicto pasan |
| P3-08 | P3-07 | ninguno | seis modos de visor pasan |
| P3-09 | P3-08 | ninguno | ledger CT-D/CT-G pasa |
| P3-10 | P3-09 | ninguno | navegación y catálogo integrados |
| P3-11 | P3-10 | ninguno | contrato de elegibilidad expuesto |
| P3-12 | P3-11 | ninguno | E2E y regresión pasan |
| P3-13 | P3-12 | ninguno | visual, responsive y 200% pasan |
| P3-14 | P3-13 | revisor read-only | veredicto independiente |
| P3-15 | P3-14 + HUMAN-GATE-B si aplica | ninguno | memoria y PR listos |
| P3-16 | merge humano P3-15 | ninguno | Pages verificado |
| P3-17 | P3-16 | ninguno | resultado post-merge persistido |

## Ola 3.0 — Preparación

### P3-00A — Auditoría de datos, permisos y arquitectura

**Objetivo:** confirmar baseline, gaps y fronteras.

**Write set:** solo `CONTEXT.md`.

**Checks:**

- conteos recompuestos desde JSON;
- permisos CT-D/CT-G confirmados;
- Graphify y lectura directa coinciden en hubs;
- ningún activo CT-G está en el repositorio.

### P3-00B — Cerrar UI-SPEC y plan

**Write set:**

- `.planning/phases/03-evidence-inspector/CONTEXT.md`;
- `.planning/phases/03-evidence-inspector/UI-SPEC.md`;
- `.planning/phases/03-evidence-inspector/PLAN.md`;
- `.planning/phases/03-evidence-inspector/CASE-INVENTORY.md`;
- `.planning/phases/03-evidence-inspector/HUMAN-GATE-A-REQUEST.md`;
- `.planning/phases/03-evidence-inspector/PLAN_REVIEW.md`.

**Done:** reader-test independiente `PASS` o `PASS WITH RISKS` con gaps explícitos.

### HUMAN-GATE-A — Autorización previa

La persona responsable debe aceptar explícitamente:

1. no publicar los originales CT-G;
2. usar transcripciones/fichas controladas y activos neutrales;
3. separar `deep` de activos visuales;
4. clasificación y precedencia de estados;
5. exclusión sin corrección automática;
6. alcance de 10–15 tipologías y procedencia visible;
7. ausencia de OCR/scraping/integraciones en vivo.

### P3-00C — Persistir aprobación

**Dependencia:** frase explícita de HUMAN-GATE-A.

**Write set:**

- `.planning/phases/03-evidence-inspector/APPROVAL.md`;
- `.planning/STATE.md`;
- `.planning/DECISIONS.md`.

No avanza si la aceptación es parcial o ambigua.

## Ola 3.1 — Datos, contrato y fixtures

### P3-01 — Introducir contrato público 2.2.0

**Objetivo:** añadir el índice `inspector` 2.2.0 sin duplicar los registros autoritativos de `model`.

**Write set:**

- `prototipo_ejecutable/contracts/demo-v2.schema.json`;
- `prototipo_ejecutable/contracts/README.md`;
- `prototipo_ejecutable/tests/data-schema.mjs`;
- `prototipo_ejecutable/tests/data-contract-compatibility.mjs`.

**Criterios:**

- reader 2.2 acepta 2.0, 2.1 y 2.2;
- schema y reader reconocen 2.2;
- root `inspector`, `InspectorCase` e `InspectorAsset` cumplen la forma congelada;
- todos los IDs de caso resuelven a registros nativos de `model`;
- evidencia visual autorizada conserva fragmento no vacío;
- permisos no se debilitan;
- representación controlada no puede declararse original.

**Rollback:** si 2.2 no conserva compatibilidad F2, detener Fase 3; no insertar propiedades libres en 2.1.

### P3-02 — Congelar CT-D/CT-G públicos

**Write set:**

- `prototipo_ejecutable/tests/e2e-scenarios/ct-d-public.json`;
- `prototipo_ejecutable/tests/e2e-scenarios/ct-g-public.json`;
- `prototipo_ejecutable/tests/phase3-fixtures.mjs`.

**Archivos protegidos:** `datos_relevantes/demo-pilot/fixtures/ct-d.json` y `ct-g.json`. Son la fuente ya verificada; esta tarea crea proyecciones E2E sin reescribirlos.

**Criterios:** todas las expectativas bloqueantes quedan en proyecciones ejecutables derivadas; CT-G sigue sin activo público; el test demuestra paridad con los fixtures fuente.

### P3-03 — Crear catálogo de expedientes y manifest de activos

**Write set:**

- `datos_relevantes/demo-pilot/inspector-cases.json`;
- `datos_relevantes/demo-pilot/evidence-manifest.json`;
- `datos_relevantes/demo-pilot/sources.json`;
- `datos_relevantes/demo-pilot/agencies.json`;
- `datos_relevantes/demo-pilot/typologies.json`;
- `datos_relevantes/demo-pilot/observations.json`;
- `datos_relevantes/demo-pilot/facts.json`;
- `datos_relevantes/demo-pilot/documents.json`;
- `datos_relevantes/demo-pilot/evidence.json`;
- `datos_relevantes/demo-pilot/issues.json`;
- `prototipo_ejecutable/public/assets/evidence/f3-ct-a-card.webp`;
- `prototipo_ejecutable/public/assets/evidence/f3-ct-a-measurement.webp`;
- `prototipo_ejecutable/public/assets/evidence/f3-ct-b-source-a.webp`;
- `prototipo_ejecutable/public/assets/evidence/f3-ct-b-source-b.webp`;
- `prototipo_ejecutable/public/assets/evidence/f3-area-match-card.webp`;
- `prototipo_ejecutable/public/assets/evidence/f3-area-match-measurement.webp`;
- `prototipo_ejecutable/public/assets/evidence/f3-floor-review-card.webp`;
- `prototipo_ejecutable/public/assets/evidence/f3-floor-review-measurement.webp`;
- `prototipo_ejecutable/public/assets/evidence/f3-bedroom-conflict-card.webp`;
- `prototipo_ejecutable/public/assets/evidence/f3-bedroom-conflict-measurement.webp`;
- `prototipo_ejecutable/public/assets/evidence/f3-bathroom-conflict-card.webp`;
- `prototipo_ejecutable/public/assets/evidence/f3-bathroom-conflict-measurement.webp`;
- `prototipo_ejecutable/public/assets/evidence/f3-illegible-area-card.webp`;
- `prototipo_ejecutable/public/assets/evidence/f3-illegible-area-measurement.webp`;
- `prototipo_ejecutable/public/assets/evidence/f3-insufficient-source-card.webp`;
- `prototipo_ejecutable/tests/data-evidence-manifest.mjs`.

**Criterios:**

- 10–15 tipologías;
- 5 agencias o más;
- 5 hallazgos/validaciones;
- 2 casos insuficientes/ilegibles/restringidos;
- 10–20 documentos/evidencias;
- cada caso declara `observed`, `controlled` o `simulated`;
- todo binario público es autorizado o creación neutral propia;
- límite de tamaño definido y validado.

### P3-04 — Integrar build y reporte de cobertura

**Write set:**

- `prototipo_ejecutable/scripts/data/evidence.js`;
- `prototipo_ejecutable/scripts/data/measures.js`;
- `prototipo_ejecutable/scripts/data/validate.js`;
- `prototipo_ejecutable/scripts/build-demo-data.js`;
- `datos_relevantes/demo-pilot/coverage-report.json`;
- `prototipo_ejecutable/public/demo-data/viva-platform-demo.json`;
- `prototipo_ejecutable/tests/data-evidence.mjs`;
- `prototipo_ejecutable/tests/data-measures.mjs`;
- `prototipo_ejecutable/tests/data-validator-unit.mjs`;
- `prototipo_ejecutable/tests/data-determinism.mjs`;
- `prototipo_ejecutable/tests/data-privacy.mjs`;
- `prototipo_ejecutable/tests/data-inspector.mjs`.

**Criterios:**

- build offline y determinista;
- writer emite contrato 2.2.0;
- conteos derivados;
- referencias válidas;
- privacidad y permisos PASS;
- archivos huérfanos o rutas locales fallan.

## Ola 3.2 — Dominio y estado

### P3-05 — Motor puro del inspector

**Write set:**

- `prototipo_ejecutable/public/js/evidence-inspector.js`;
- `prototipo_ejecutable/tests/evidence-inspector.mjs`.

**Criterios:**

- funciones puras;
- CT-D/CT-G pasan;
- tabla completa de cinco estados;
- no selecciona verdad;
- no depende del DOM;
- no crea un nuevo hub.

### P3-06 — Estado y controlador

**Dependencia:** P3-05.

**Único escritor compartido.**

**Write set:**

- `prototipo_ejecutable/public/js/state.js`;
- `prototipo_ejecutable/public/js/controller.js`;
- `prototipo_ejecutable/tests/inspector-state.mjs`.

**Criterios:**

- selección de caso/proyecto/tipología determinista;
- selección inválida se corrige y anuncia;
- apertura/cierre conserva foco;
- escenario F2 no cambia.

## Ola 3.3 — Componentes de inspector

### P3-07 — Shell, ficha y cobertura

**Write set:**

- `prototipo_ejecutable/public/js/views/inspector.js`;
- `prototipo_ejecutable/public/styles/55-inspector.css`;
- `prototipo_ejecutable/tests/inspector-view.mjs`.

**Criterios:** niveles, conteos, propósito, selectores y veredicto inicial según UI-SPEC.

Assertions obligatorias:

- seis frases visibles de ayuda para cobertura, selector, veredicto, ledger, visor y decisión;
- procedencia visible en selector y veredicto;
- una sola siguiente acción primaria;
- metadata cerrada por defecto;
- veredicto y CTA CT-G visibles sin scroll en 1280×720.

### P3-08 — Visor de evidencia

**Dependencia:** P3-07.

**Mismo escritor que P3-07 o commit secuencial.**

**Write set:**

- `prototipo_ejecutable/public/js/views/inspector.js`;
- `prototipo_ejecutable/public/styles/55-inspector.css`;
- `prototipo_ejecutable/tests/inspector-viewer.mjs`.

**Criterios:** modos asset/fragment/transcripción/restringido/pending/unavailable, teclado y retorno de foco.

## Ola 3.4 — Ledger, decisión e integración

### P3-09 — Ledger de compatibilidad

**Dependencia:** P3-08.

**Write set:**

- `prototipo_ejecutable/public/js/views/inspector.js`;
- `prototipo_ejecutable/public/styles/55-inspector.css`;
- `prototipo_ejecutable/tests/inspector-ledger.mjs`.

**Criterios:** filas de modelo, piso/unidad, área, dormitorios y baños; CT-G completo; móvil apilado.

### P3-10 — Integrar vista y enlace desde catálogo

**Único escritor de integración.**

**Write set:**

- `prototipo_ejecutable/public/app.js`;
- `prototipo_ejecutable/public/js/config.js`;
- `prototipo_ejecutable/public/js/navigation.js`;
- `prototipo_ejecutable/public/js/views/index.js`;
- `prototipo_ejecutable/public/js/views/projects.js`;
- `prototipo_ejecutable/public/styles.css`;
- `prototipo_ejecutable/public/styles/50-views.css`;
- `prototipo_ejecutable/tests/module-graph.mjs`;
- `prototipo_ejecutable/tests/projects-compare.mjs`.

**Criterios:**

- entrada de navegación;
- guía de sección;
- CTA de catálogo;
- estilos nuevos importados en orden;
- sin duplicar lógica del motor.

### P3-11 — Propagar decisión de elegibilidad

**Objetivo:** exponer la elegibilidad de hechos/tipología a consumidores futuros sin cambiar comparabilidad territorial F2.

**Write set:**

- `prototipo_ejecutable/public/js/evidence-inspector.js`;
- `prototipo_ejecutable/tests/evidence-inspector.mjs`.

`domain.js` queda protegido. Si la integración demuestra que debe cambiar, P3-11 se detiene y el plan vuelve a revisión.

**Criterios:** facts excluidos no aparecen como certificados; la tipología CT-G es no elegible; `project:nexo-2951` conserva pertenencia a CT-I/comparables F2; la proyección legacy no gana elegibilidad por omisión.

## Ola 3.5 — Calidad, verificación y ship

### P3-12 — E2E CT-D/CT-G y regresiones

**Write set:**

- `prototipo_ejecutable/tests/inspector-e2e.mjs`;
- `prototipo_ejecutable/tests/browser-smoke.mjs`;
- `prototipo_ejecutable/tests/browser-a11y.mjs`;
- `prototipo_ejecutable/tests/helpers/demo-browser.mjs`;
- `prototipo_ejecutable/tests/scenario-e2e.mjs`;
- `prototipo_ejecutable/package.json`.

**Criterios:**

- 8 rutas × 3 viewports;
- CT-C/CT-I conservan conteos e IDs;
- query territorial no cambia al abrir/cerrar inspector;
- deep-link y reload funcionan bajo base path de GitHub Pages;
- ningún elemento pending/restricted crea `src`, `href`, `fetch` ni hotlink;
- 0 errores de consola, HTTP o red externa;
- 7 vistas previas sin regresión y nueva vista incluida.

### P3-13 — Responsive, contraste y densidad

**Write set:**

- `prototipo_ejecutable/public/styles/55-inspector.css`;
- `prototipo_ejecutable/public/styles/90-responsive.css`;
- `prototipo_ejecutable/tests/inspector-responsive.mjs`.

**Criterios:** tres viewports, zoom 200%, teclado, contraste, sin scroll horizontal principal.

Assertions obligatorias:

- cinco filas compactas en orden área → piso/unidad → modelo → dormitorios → baños;
- procedencia visible también en ledger y visor;
- metadata permanece cerrada al cargar;
- una sola siguiente acción;
- foco y lectura sobreviven al reflow.

### P3-14 — Checker independiente

**Solo lectura salvo informe.**

**Write set:**

- `.planning/phases/03-evidence-inspector/VERIFICATION_REPORT.md`.

**Veredicto:** `PASS`, `PASS WITH RISKS` o `FAIL`.

Debe comprobar historias, CT-D, CT-G, permisos, claims, a11y, visual, determinismo, regresiones y Graphify.

Debe asignar un lector nuevo, no maker, para ejecutar el guion comercial sin facilitador. Gate: `≤ 5:00`, explica valor, procedencia, limitación, motivo de no elegibilidad y siguiente acción. Evidencia: tiempo de inicio/fin, pasos completados, errores y explicación final del lector.

### HUMAN-GATE-B — Riesgos residuales

Solo requerido si P3-14 emite `PASS WITH RISKS`. Debe aceptar riesgos enumerados; no convierte el veredicto en PASS.

### P3-15 — Memoria y PR funcional

**Write set:**

- `.planning/phases/03-evidence-inspector/SUMMARY.md`;
- `.planning/phases/03-evidence-inspector/HANDOFF.md`;
- `.planning/STATE.md`;
- `.planning/ROADMAP.md`;
- `.planning/DECISIONS.md`.

El merge es humano.

### P3-16 — Verificación post-merge

Read-only contra GitHub Pages:

- workflow success;
- SHA desplegado;
- HTTP 200;
- CT-D/CT-G en URL pública;
- activos permitidos 200;
- activos restringidos ausentes;
- escritorio/móvil/consola.

### P3-17 — Persistir resultado post-merge

Rama y PR documental separados, como en Fase 2.

**Write set:**

- `.planning/phases/03-evidence-inspector/POSTMERGE_REPORT.md`;
- `.planning/STATE.md`.

## Paralelismo permitido

Después de P3-00C:

- P3-01 y diseño del inventario P3-03 pueden investigarse en paralelo, pero la escritura se integra secuencialmente si comparten contrato.
- P3-05 comienza solo cuando P3-01–P3-04 están cerrados y el payload 2.2 está integrado.
- P3-07 no comienza hasta estabilizar la forma del dossier P3-05.
- P3-12 puede preparar harness sin cambiar expectativas; el E2E final espera P3-10.
- P3-07, P3-08 y P3-09 son secuenciales porque comparten vista y CSS.
- ningún agente paralelo toca `state.js`, `controller.js`, `app.js`, `domain.js` o `styles/50-views.css`.

## Comandos de verificación previstos

Desde `prototipo_ejecutable/`:

```powershell
npm.cmd run check
npm.cmd run test:data
npm.cmd run test:architecture
npm.cmd run test:smoke
npm.cmd run test:a11y
npm.cmd run verify
```

Tests nuevos previstos:

```powershell
node tests/phase3-fixtures.mjs
node tests/data-evidence-manifest.mjs
node tests/data-inspector.mjs
node tests/evidence-inspector.mjs
node tests/inspector-state.mjs
node tests/inspector-view.mjs
node tests/inspector-viewer.mjs
node tests/inspector-ledger.mjs
node tests/inspector-e2e.mjs
node tests/inspector-responsive.mjs
```

P3-12 añade todos estos comandos a `npm.cmd run check` y `npm.cmd run verify`; no basta ejecutarlos manualmente.

Graphify al cierre:

```powershell
$env:UV_CACHE_DIR = "$PWD\..\.cache\uv"
uvx --from graphifyy graphify extract .. --code-only --no-cluster
uvx --from graphifyy graphify god-nodes --top 15
```

## Evidencia requerida

- diff y `write_set` por tarea;
- handoff maker;
- resultados de tests dirigidos;
- hash del JSON tras dos builds;
- inventario y hash de activos públicos;
- prueba negativa de activos restringidos;
- capturas de UI-SPEC;
- grabación o secuencia del recorrido CT-G;
- árbol de accesibilidad o evidencia de teclado;
- acta del lector nuevo con duración ≤5:00 y explicación sin facilitador;
- reporte del checker independiente;
- links al PR, workflow y Pages.

## Definition of Done

1. Todas las historias Must cumplen criterios.
2. CT-D y CT-G pasan en dominio, UI y Pages.
3. Cobertura visible se deriva del dataset.
4. Se inspeccionan 10–15 tipologías con procedencia explícita.
5. Ningún activo no autorizado está en el repo o en la red del navegador.
6. El caso Tipo 7 conserva valores, etiquetas y restricciones.
7. No se elige verdad ni se llama techada al área desconocida.
8. Facts no certificados quedan excluidos de salida certificada.
9. La experiencia es vertical, legible y no una cuadrícula de cards.
10. CTA principal tiene contraste y jerarquía.
11. Teclado, foco, móvil y zoom 200% pasan.
12. Build y tests son deterministas.
13. No hay errores de consola, HTTP ni recursos 404.
14. Vistas de Fase 2 no regresionan.
15. Checker independiente emite veredicto.
16. Estado, decisiones, resumen y handoff están actualizados.
17. PR revisable por historias y commits atómicos.
18. Pages post-merge queda verificado antes de declarar cierre.
19. Un lector nuevo completa el guion comercial en cinco minutos o menos sin facilitador.

## Rollback

- Si falla contrato/datos: revertir P3-04 y conservar fixtures/version anterior.
- Si falla ruta/estado: retirar `#inspector` de navegación sin tocar escenario F2.
- Si falla un activo: eliminarlo del manifest y degradar a fragmento/metadata.
- Si falla CT-G: bloquear PR; no ocultar la discrepancia.
- Si el nuevo módulo crea un hub o ciclos: extraer frontera antes de continuar.
- Si la UX no supera el baseline en viewports: conservar catálogo actual y no fusionar la vista.

## Condiciones de parada

Detener y escalar si:

- se solicita publicar una imagen sin permiso;
- no se puede distinguir representación controlada de original;
- un cambio exige OCR/scraping/servicio externo;
- el modelo necesita elegir una fuente como verdad;
- se propone inferir `área techada`;
- dos makers requieren el mismo archivo en paralelo;
- CT-D o CT-G se alteran para hacer pasar una UI;
- aparecen cambios ajenos solapados;
- el gate falla tres veces sin nueva hipótesis.
