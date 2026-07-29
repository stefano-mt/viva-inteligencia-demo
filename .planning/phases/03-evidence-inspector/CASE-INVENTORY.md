# Fase 3 — Inventario congelado de expedientes

## Estado

**Propuesto para HUMAN-GATE-A.** Congela selección, procedencia y resultado esperado. Los valores controlados no describen proyectos reales.

## Reglas

- `observed` conserva hechos observados y restricciones reales.
- `controlled` es contenido original creado para probar comportamiento; no representa mercado.
- No se añaden casos `simulated` en Fase 3.
- Una ficha de transcripción no cuenta como activo visual original.
- `visual_pair = controlled` significa dos recursos propios: tarjeta neutral + ficha de medición neutral. La ficha de medición no se llama plano.
- CT-G no publica binarios.

## Casos

| case_id | project_id / typology_id | agency_id | Procedencia | Fuentes y evidencia | Lectura esperada | Permiso / modo público |
|---|---|---|---|---|---|---|
| `case:f3-ct-g-pardo` | `project:nexo-2951` / `typology:pardo-coast-tipo-7` | `agency:grupo-tyc` | `observed` | tarjeta Nexo + plano aportado; metadata y transcripciones versionadas | `inconsistent`; área 104.15 vs total 53.37, delta 50.78, piso 1 vs 807–1007 | tarjeta `pending`, plano `restricted`; 0 binarios; `controlled_transcription`/`restricted` |
| `case:f3-ct-d-finishes` | `project:ct-d-controlled` / `typology:ct-d-controlled` | `agency:ct-d-controlled` | `controlled` | especificación autorizada + metadata restringida | `certified` para cuarzo; aire acondicionado `insufficient` | fragmento autorizado; documento restringido sin ruta |
| `case:f3-ct-a-area-types` | `project:ct-a-controlled` / `typology:ct-a-controlled` | `agency:ct-a-controlled` | `controlled` | tarjeta neutral + ficha de medición neutral; 98 m² built, 206 m² total | `certified`; tipos de área separados | 2 activos propios `authorized`; `visual_pair = controlled` |
| `case:f3-ct-b-price-conflict` | `project:ct-b-controlled` / `typology:ct-b-controlled` | `agency:ct-b-controlled` | `controlled` | dos fichas fuente neutrales; PEN 600,000 vs PEN 625,000 | `inconsistent`; ninguna fuente elegida | 2 activos propios `authorized`; `visual_pair = controlled` |
| `case:f3-area-match` | `project:ct-a-controlled` / `typology:f3-area-match` | `agency:ct-a-controlled` | `controlled` | tarjeta neutral `Área total 76.20 m²` + ficha neutral `Área Total 76.20 m2` | `certified`; área y tipo compatibles | 2 activos propios `authorized`; `visual_pair = controlled` |
| `case:f3-floor-review` | `project:ct-b-controlled` / `typology:f3-floor-review` | `agency:ct-b-controlled` | `controlled` | tarjeta neutral `Piso 5` + ficha neutral `Unidades 501–504` | `reviewable`; coincidencia depende de inferencia de numeración | 2 activos propios `authorized`; `visual_pair = controlled` |
| `case:f3-bedroom-conflict` | `project:ct-d-controlled` / `typology:f3-bedroom-conflict` | `agency:ct-d-controlled` | `controlled` | tarjeta neutral `2 dormitorios` + ficha neutral `3 dormitorios` | `inconsistent`; issue bloqueante de dormitorios | 2 activos propios `authorized`; `visual_pair = controlled` |
| `case:f3-bathroom-conflict` | `project:ct-e-controlled` / `typology:f3-bathroom-conflict` | `agency:ct-e-controlled` | `controlled` | tarjeta neutral `2 baños` + ficha neutral `1 baño` | `inconsistent`; issue bloqueante de baños | 2 activos propios `authorized`; `visual_pair = controlled` |
| `case:f3-illegible-area` | `project:ct-e-controlled` / `typology:f3-illegible-area` | `agency:ct-e-controlled` | `controlled` | tarjeta neutral `Área total 64.80 m²` + ficha neutral cuyo campo de área está marcado ilegible | `illegible`; no se transcribe ni agrega el campo ilegible | 2 activos propios `authorized`; `visual_pair = controlled` |
| `case:f3-insufficient-source` | `project:ct-a-controlled` / `typology:f3-insufficient-source` | `agency:ct-a-controlled` | `controlled` | tarjeta neutral `Área total 71.00 m²`; segunda fuente ausente con razón explícita | `insufficient`; no se afirma compatibilidad | 1 activo propio `authorized`; segunda evidencia `unavailable` |

## IDs de documentos, evidencia y selección primaria

| case_id | `document_ids` | `evidence_ids` | `primary_evidence_id` |
|---|---|---|---|
| `case:f3-ct-g-pardo` | `document:pardo-coast-card`, `document:pardo-coast-plan` | `evidence:pardo-coast-card-metadata`, `evidence:pardo-coast-plan-metadata` | `evidence:pardo-coast-card-metadata` |
| `case:f3-ct-d-finishes` | `document:ct-d-authorized`, `document:ct-d-restricted` | `evidence:ct-d-countertop-fragment`, `evidence:ct-d-restricted-metadata` | `evidence:ct-d-countertop-fragment` |
| `case:f3-ct-a-area-types` | `document:f3-ct-a-card`, `document:f3-ct-a-measurement` | `evidence:f3-ct-a-card`, `evidence:f3-ct-a-measurement` | `evidence:f3-ct-a-measurement` |
| `case:f3-ct-b-price-conflict` | `document:f3-ct-b-source-a`, `document:f3-ct-b-source-b` | `evidence:f3-ct-b-source-a`, `evidence:f3-ct-b-source-b` | `evidence:f3-ct-b-source-a` |
| `case:f3-area-match` | `document:f3-area-match-card`, `document:f3-area-match-measurement` | `evidence:f3-area-match-card`, `evidence:f3-area-match-measurement` | `evidence:f3-area-match-measurement` |
| `case:f3-floor-review` | `document:f3-floor-review-card`, `document:f3-floor-review-measurement` | `evidence:f3-floor-review-card`, `evidence:f3-floor-review-measurement` | `evidence:f3-floor-review-measurement` |
| `case:f3-bedroom-conflict` | `document:f3-bedroom-conflict-card`, `document:f3-bedroom-conflict-measurement` | `evidence:f3-bedroom-conflict-card`, `evidence:f3-bedroom-conflict-measurement` | `evidence:f3-bedroom-conflict-card` |
| `case:f3-bathroom-conflict` | `document:f3-bathroom-conflict-card`, `document:f3-bathroom-conflict-measurement` | `evidence:f3-bathroom-conflict-card`, `evidence:f3-bathroom-conflict-measurement` | `evidence:f3-bathroom-conflict-card` |
| `case:f3-illegible-area` | `document:f3-illegible-area-card`, `document:f3-illegible-area-measurement` | `evidence:f3-illegible-area-card`, `evidence:f3-illegible-area-measurement` | `evidence:f3-illegible-area-measurement` |
| `case:f3-insufficient-source` | `document:f3-insufficient-source-card` | `evidence:f3-insufficient-source-card` | `evidence:f3-insufficient-source-card` |

## Totales congelados

- expedientes: 10;
- tipologías: 10;
- proyectos: 5 existentes; no se crean proyectos F3 nuevos;
- agencias: 5 (`grupo-tyc` + 4 controladas);
- expedientes observados: 1;
- expedientes controlados: 9;
- expedientes simulados: 0;
- pares visuales controlados: 7;
- expedientes con al menos un activo neutral: 8;
- binarios observados originales publicados: 0;
- fragmentos de texto autorizados existentes: 1;
- estados: 3 certificados o parcialmente certificados, 1 revisable, 4 inconsistentes, 1 ilegible y 1 insuficiente;
- hallazgos/validaciones relevantes: 10;
- documentos/evidencias objetivo: entre 17 y 20, según si metadata restringida se materializa como evidencia separada.

## Diferencia aceptada respecto de PROJECT.md

`PROJECT.md` plantea 10–15 tipologías con tarjeta y plano/imagen. Esta fase propone:

- 7 pares visuales controlados de tarjeta + ficha de medición;
- 1 caso controlado con fragmento/especificación;
- 1 caso controlado con tarjeta y ausencia explícita de segunda fuente;
- 1 caso observado CT-G con transcripciones y metadata, sin binarios publicables.

Por tanto:

- se alcanza 10 tipologías inspectables;
- se alcanza evidencia visual controlada, no 10 planos originales;
- no se alcanza ningún dossier visual original autorizado de mercado;
- la incorporación de originales reales queda diferida hasta recibir permisos registrables.

HUMAN-GATE-A debe aceptar expresamente esta diferencia. No puede reinterpretarse después como “10 planos reales”.

## Regla de cambio

Cambiar un `case_id`, valor, procedencia, estado esperado o permiso requiere:

1. actualizar este inventario;
2. justificar el cambio en `.planning/DECISIONS.md`;
3. actualizar fixture y test correspondiente;
4. repetir revisión independiente;
5. nueva aprobación si cambia el alcance comercial o legal.
