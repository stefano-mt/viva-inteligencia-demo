# Fase 4 — Benchmark y comparador explicable

## Estado

**Borrador de preparación.** La implementación funcional permanece bloqueada hasta completar reader-test independiente y `HUMAN-GATE-A`.

## Objetivo

Convertir el conjunto de comparables del escenario en una lectura cuantitativa y cualitativa trazable, y permitir comparar dos o tres proyectos —más el escenario Viva cuando exista— sin mezclar denominadores, ocultar faltantes ni rehabilitar hechos excluidos por el inspector.

La propuesta comercial de esta fase es concreta:

> De todos los proyectos visibles, Viva muestra cuáles componen cada indicador, cuáles quedan fuera y qué diferencia puede sostenerse con la evidencia disponible.

## Historias en alcance

- `HU-DEMO-501` — Benchmark de microzona (`Must`).
- `HU-DEMO-502` — Benchmark cualitativo (`Must`).
- `HU-DEMO-503` — Comparador en filas agrupadas (`Must`).
- `HU-DEMO-504` — Conclusión ejecutiva explicable (`Should`).
- `HU-DEMO-505` — Exportación de comparación (`Could`).

Casos transversales prioritarios: CT-A, CT-B, CT-C, CT-D, CT-G y CT-I.

## Baseline confirmado

### Plataforma

- Fases 0–3 están fusionadas, desplegadas y verificadas.
- GitHub Pages sirve una demo estática sin servicios externos en runtime.
- Contrato público vigente: `2.2.0`; reader compatible con 2.0/2.1/2.2.
- El escenario serializado es la fuente única de distrito, cuadrante o radio y de `comparable_project_ids`.
- El inspector decide elegibilidad al nivel de hecho y tipología.
- `domain.js` continúa como hub compartido; no debe absorber el motor de Fase 4.

### Universo territorial

- Siete distritos de alta carga: 433 proyectos observados.
- 422 puntos dentro o sobre el polígono; 11 se conservan como exclusiones territoriales.
- 397 proyectos reconciliados y con geografía válida en esos siete distritos.
- Miraflores CT-I: 90 observados, 85 comparables y 5 no reconciliados.
- Cuadrantes Miraflores: 40/5/5/40 observados; el escenario usa solo IDs autorizados por Fase 2.

### Evidencia y hechos

- 40 hechos autoritativos: 10 elegibles y 30 excluidos.
- Cero hechos elegibles de precio por m² de mercado.
- Los dos hechos actuales de precio por m² pertenecen a CT-A, se derivan de un precio simulado y permanecen excluidos.
- Un solo atributo cualitativo elegible: `countertop_material = cuarzo`, caso CT-D controlado.
- CT-G conserva ocho hechos excluidos y una tipología no elegible; Pardo Coast permanece en el universo territorial.

### Snapshot disponible para Fase 4

La proyección legacy contiene volumen observado suficiente para materializar una capa trazable, pero hoy sigue siendo provisional:

- 714 publicaciones Nexo;
- 677 registros PEN y 37 con moneda desconocida;
- 371 cocientes aritméticos candidatos dentro de los siete distritos y la geografía válida;
- 134 inmobiliarias distintas en esos 371 candidatos;
- 704 publicaciones con algún texto de amenities;
- 23 con conteo de estacionamientos;
- cero con área techada o libre observada.

En Miraflores, el escenario distrital contiene 85 comparables y 69 cocientes provisionales calculados como precio mínimo publicado / área mínima publicada. El snapshot demuestra que ambos campos provienen de la misma página de proyecto, pero no que correspondan a la misma unidad o tipología. Por ello, los 69 se consideran `project_minima_pair_unresolved`: pueden ilustrar un índice orientativo claramente rotulado, pero no entrar al benchmark elegible.

## Problema que debe resolver la fase

La interfaz actual calcula referencias desde campos legacy y no consulta el ledger de elegibilidad de Fase 3. Esto crea cuatro riesgos:

1. presentar una mediana sin explicar qué proyectos entraron;
2. llamar comparable a métricas con denominadores diferentes;
3. contar `No informado` como ausencia de un atributo;
4. incluir en precio por m² una publicación cuyo vínculo con una tipología inconsistente no está resuelto.

Fase 4 debe cerrar `GAP-F4-BENCHMARK` antes de cambiar la UI.

## Alcance propuesto

### 1. Benchmark cuantitativo

- Materializar observación, área total y precio publicado como hechos separados.
- Crear precio por m² elegible solo cuando la fuente demuestre la pareja precio–área de la misma oferta o tipología.
- Mantener el cociente de mínimos del snapshot en una serie orientativa separada, nunca como sustituto de la referencia elegible.
- Limitar Fase 4 al denominador `total`.
- Tratar el precio como `from` mientras la fuente no permita afirmar promedio o cierre.
- Calcular P25, mediana y P75 elegibles con método R-7 solo cuando `n >= 3`; una distribución de mínimos no cambia a `ready` aunque tenga volumen.
- Mostrar proyecto, inmobiliaria, unidades reportadas y precio con denominadores propios.
- Conservar una lista exacta de IDs usados y excluidos con razones.

### 2. Benchmark cualitativo

- Normalizar amenities como **atributos anunciados**, conservando el texto original.
- Mostrar `atributo anunciado / proyectos informados`, faltantes y excluidos.
- Requerir al menos cinco proyectos informados para hablar de patrón de la muestra.
- No presentar acabados, materiales o estacionamientos como estándar cuando la muestra sea insuficiente.
- Abrir evidencia solo cuando el permiso lo permita.

### 3. Comparador por filas

- Seleccionar 2–3 proyectos del mismo escenario.
- Añadir el escenario Viva como columna claramente simulada cuando esté configurado.
- Agrupar precio, áreas, producto, ubicación, entrega, áreas comunes, acabados, estacionamientos y fuentes/confianza.
- Mostrar diferencias prioritarias primero y detalle bajo demanda.
- Enlazar discrepancias al inspector sin publicar evidencia restringida.

### 4. Conclusión ejecutiva

- Derivar como máximo tres hallazgos desde filas identificables.
- Separar hallazgo, implicancia y siguiente acción.
- Declarar limitaciones críticas.
- No predecir ventas, absorción ni precio real de cierre.

### 5. Exportación

`HU-DEMO-505` se mantiene opcional. Solo se ejecutará después de los Must/Should y mediante impresión HTML/guardar como PDF con allowlist pública; no justifica una dependencia o backend.

## Semántica propuesta

### “Certificado”

Significa únicamente:

> Elegible según las reglas internas, trazabilidad y corte de la demo.

No significa certificación de un tercero, tasación, auditoría legal, inventario vigente ni precio de cierre.

### Precio

- Etiqueta propuesta: `Precio publicado desde`.
- Moneda: solo PEN en el agregado principal.
- Área denominadora: total.
- El valor original se conserva.
- El precio por m² derivado declara fórmula e IDs de sus insumos.
- `pairing_status = source_paired` requiere un `offer_id`, `typology_id` o métrica nativa cuya semántica de pareja esté documentada. La coincidencia aritmética o el origen en una misma página de proyecto no bastan.
- `pairing_status = project_minima_pair_unresolved` queda fuera del benchmark elegible y, si se muestra, se titula `Índice orientativo de entrada`.

### Unidades

Si se aprueba su uso, se nombran `Unidades reportadas por la publicación`. Nunca `stock disponible`, `inventario real` o `unidades en venta`.

### Amenities

Se nombran `Atributos anunciados`. El sistema demuestra que una publicación los menciona; no certifica existencia física, calidad ni disponibilidad.

## Regla CT-G

`project:nexo-2951` permanece visible en mapa, universo territorial y lista de comparables. La tipología Pardo Coast Tipo 7 y sus ocho hechos incompatibles continúan excluidos.

Un precio de proyecto solo puede entrar al benchmark certificado si el materializador demuestra que no depende de la tipología incompatible. Si el vínculo no se puede resolver, el precio queda fuera con razón `typology_link_unresolved`; no se elimina el proyecto completo.

La observación nueva de Fase 4 también queda cubierta por este overlay: CT-G debe probar que Pardo Coast sigue territorialmente visible, no aparece en los IDs usados por precio elegible y expone la razón de exclusión y el enlace al inspector.

## Fuera de alcance

- Nuevo scraping, OCR, APIs o actualización en vivo.
- Precio real de cierre, velocidad de venta o absorción.
- Área techada/libre de mercado sin fuente explícita.
- Tasación o recomendación automática de precio.
- Predicción de demanda.
- Confirmar amenities por fotografía o inferencia.
- Exportación con evidencia restringida.
- Rediseñar mapa, inspector, histórico o asistente.

## Riesgos

| ID | Riesgo | Severidad | Tratamiento |
|---|---|---:|---|
| F4-R1 | Fuente Nexo sigue `pending_review` | Bloqueante | HUMAN-GATE-A limita el uso al snapshot normalizado ya versionado; no sustituye revisión legal |
| F4-R2 | Confundir “certificado” con validación externa | Alta | Definición persistente y copy obligatorio |
| F4-R3 | Confundir precio desde con promedio/lista/cierre | Alta | `price_type = from` y cautela visible |
| F4-R4 | Mezclar área total con techada/libre | Crítica | F4 total-only y CT-A negativo |
| F4-R5 | Confundir `unit_count` con stock | Alta | Etiqueta prudente o excluir KPI |
| F4-R6 | Amenities sin normalización/evidencia | Alta | Taxonomía, original conservado y estado `announced` |
| F4-R7 | Rehabilitar CT-G por agregado de proyecto | Crítica | Overlay de exclusión y test CT-G |
| F4-R8 | Cualitativo con muestra insuficiente | Alta | Umbral, cobertura y “información insuficiente” |
| F4-R9 | Payload crece excesivamente | Media | Universo Top 7, índice por IDs y gate de bytes |
| F4-R10 | Exportación filtra evidencia | Alta | Diferir o usar allowlist/print seguro |
| F4-R11 | Dividir dos mínimos no emparejados y llamarlo precio por m² comparable | Crítica | `pairing_status`, serie orientativa separada y test negativo |
| F4-R12 | Contrato 2.3 rechazado por el runtime F2 | Crítica | Cambio mínimo y autorizado del allowlist de `scenario.js` con pruebas 2.1/2.2/2.3 |

## Definition of Ready

Fase 4 puede iniciar implementación cuando:

1. `CONTEXT.md`, `DATA-ASSESSMENT.md`, `UI-SPEC.md` y `PLAN.md` pasan reader-test independiente;
2. HUMAN-GATE-A resuelve A1–A12;
3. contrato 2.3, fixtures y reglas CT-A/B/C/D/G/I quedan congelados;
4. cada tarea declara `write_set` y archivos protegidos;
5. la fuente materializadora es el dataset versionado, no `public.projects[]`;
6. la UI distingue observado, derivado, simulado, anunciado, desconocido y excluido;
7. no se promete acabados/parking cuando la muestra es insuficiente;
8. el plan mantiene una sola recomposición de benchmark por escenario;
9. las dependencias locales de Playwright están instaladas antes del gate visual;
10. el runtime territorial admite 2.3 mediante un cambio mínimo aprobado y conserva 2.1/2.2;
11. la pareja precio–área tiene estados ejecutables y el snapshot actual degrada a orientativo cuando no puede demostrarla.
10. el checker final es distinto de los makers.
