# Fase 1 — Contexto de datos, contratos y cobertura

## Objetivo

Construir una fuente de datos de demo versionada, determinista y trazable que permita afirmar con precisión:

- cobertura base de al menos 30 inmobiliarias canónicas;
- observaciones multifuente sin seleccionar automáticamente una “verdad”;
- áreas y precios correctamente tipados;
- evidencia y calidad por hecho;
- histórico sin causas inventadas;
- exclusión explícita de datos inconsistentes del benchmark certificado.

La Fase 1 no cambia todavía la experiencia visual. Entrega el contrato y los fixtures que habilitan geografía, inspector, benchmark, histórico y asistente en fases posteriores.

## Feedback que origina la fase

1. La demo debe ampliar su alcance hasta al menos 30 inmobiliarias.
2. Debe distinguir amplitud de cobertura y profundidad de enriquecimiento.
3. Debe resolver casos donde una tarjeta y un plano muestran áreas incompatibles.
4. El sistema no debe presentar datos dudosos como comparables certificados.

## Baseline confirmado

### Dataset principal

- 714 filas en `viva_minimum_dataset_latest.csv`.
- 714 IDs de proyecto de origen.
- 192 nombres distintos de inmobiliaria sin canonización demostrable.
- 45 distritos.
- Las 714 filas públicas provienen de Nexo Inmobiliario.
- 677 filas están marcadas `PEN`.
- 37 filas están marcadas `$`; el generador actual las agrega junto con PEN sin conversión.
- `built_area` y `free_area` tienen cobertura 0%.
- El generador reduce `total_area` mediante fallback y no publica el tipo de área.
- El JSON público contiene nombres de contacto, emails, teléfonos y WhatsApp no necesarios para la demo analítica.

### Webs propias y cobertura

- 192 inmobiliarias evaluadas en discovery.
- 277 filas de muestra de webs propias para 139 nombres de inmobiliaria.
- 800 filas de matching: 26 altas, 47 medias, 33 bajas y el resto no emparejado.
- Solo 10 inmobiliarias están marcadas actualmente `included_in_mvp=true`.
- Las rutas `evidence_path` de la muestra apuntan a outputs que no están versionados; un clon no puede abrir la evidencia.
- `GRUPO T&C` y `GRUPO TyC` comparten dominio y aparecen como nombres separados.

### Reproducibilidad

- `metadata.generated_at` usa la hora de ejecución, por lo que dos builds no son byte a byte idénticos.
- `readJson()` silencia tanto archivos ausentes como JSON corrupto.
- El test actual valida cantidades y forma mínima, no canonización, trazabilidad, monedas, fixtures o elegibilidad analítica.
- CT-I declara 90 proyectos en Miraflores y la recomputación posterior del snapshot confirmó 90. La referencia anterior a 88 era drift documental; no implicó cambiar o inventar proyectos.

## Caso distintivo CT-G

El snapshot versionado de Pardo Coast (`project_id=2951`) declara un rango total de 51.63–122.81 m², pero no contiene tipologías o planos.

La evidencia aportada por el usuario muestra dos observaciones adicionales:

- Tarjeta: Pardo Coast, Tipo 7, Piso 1, 104.15 m², 2 dormitorios y 2 baños.
- Plano: Pardo Coast, Departamento Tipo 7, “Área Total 53.37 m2”, departamentos 807 al 1007.

Reglas:

- No reutilizar el 104.15 del JSON actual: allí es el máximo de `Park 55`.
- Conservar tarjeta y plano como observaciones distintas.
- No llamar “área techada” a 53.37 m².
- Calcular 50.78 m² de diferencia.
- Calcular que el plano es 48.76% menor respecto de la tarjeta.
- Marcar incompatibilidad y `benchmark_eligible=false`.
- Tratar la posible lectura de pisos 8–10 como derivada, no como texto observado.
- No declarar cuál fuente es verdadera.
- El disclaimer del plano obliga a presentar discrepancia y revisión, no una conclusión registral.

Las imágenes completas no se publicarán en GitHub Pages sin autorización. La Fase 1 versionará transcripción estructurada, hashes y metadatos; un activo visual neutral o autorizado se resolverá en la fase del inspector.

## Historias dentro de alcance

- `HU-DEMO-001`: dataset piloto controlado.
- `HU-DEMO-002`: modelo multifuente y trazabilidad por campo.
- `HU-DEMO-003`: desagregación prudente de áreas.
- `HU-DEMO-004`: tipos de precio y escenario de descuento.
- `HU-DEMO-005`: atributos cualitativos y documentos.
- `HU-DEMO-006`: observaciones históricas y eventos.
- `HU-DEMO-902`: selección y normalización de 30 inmobiliarias.
- Fixtures transversales: CT-A, CT-B, CT-G y CT-H.

## Fuera de alcance

- Scraping o navegación automatizada nueva.
- OCR en vivo.
- Publicación de planos completos sin autorización.
- Conversión PEN/USD sin una observación de tipo de cambio.
- Inferencia de precios reales de cierre.
- UI del inspector, mapa, benchmark o asistente.
- Base de datos productiva, backend, autenticación o integraciones.

## Política de evidencia y valores

Todo hecho debe distinguir:

- `observed`: aparece directamente en una fuente.
- `derived`: resultado reproducible de hechos observados.
- `simulated`: valor controlado para escenario o fixture.

Todo hecho relevante conserva:

- valor original;
- valor normalizado;
- unidad y tipo semántico;
- fuente, URL y fecha de captura;
- confianza y estado de calidad;
- evidencia o razón explícita de ausencia;
- elegibilidad para agregados certificados.

Una fuente faltante o ambigua produce `insufficient` o `review_required`; nunca cero inventado.

## Privacidad y uso prudente

- El artefacto público no debe exponer nombres personales, teléfonos, emails o WhatsApp.
- Las fuentes públicas se registran para trazabilidad, no para autorizar ingesta recurrente.
- La automatización futura requiere revisión de términos, propiedad intelectual y protección de datos.
- Los documentos aportados se transcriben de forma estructurada; la publicación del activo original depende de autorización.

## Definition of Ready

La implementación puede iniciar cuando:

1. `DATA-SPEC.md` y `PLAN.md` reciben revisión de un checker.
2. Los fixtures CT-A/B/G/H están definidos como datos controlados u observados.
3. Los archivos protegidos y write sets no se solapan.
4. Se acepta que la UI seguirá consumiendo una proyección compatible.
5. CT-I permanece abierto para Fase 2 con 90 proyectos observados confirmados por el snapshot.
