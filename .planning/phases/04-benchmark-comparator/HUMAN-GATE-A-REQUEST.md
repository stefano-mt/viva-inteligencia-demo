# Fase 4 — Solicitud de HUMAN-GATE-A

## Estado

**Pendiente de aprobación humana.** Este documento congela las decisiones de producto, datos y narrativa comercial que deben aceptarse antes de P4-01. La aprobación habilita implementación; no equivale a validación legal, `PASS` técnico, merge o despliegue.

## Decisiones solicitadas

### A1 — Fuente pública fija y revisión legal pendiente

Se autoriza usar el snapshot Nexo ya versionado como referencia pública normalizada, con fecha de corte, URL de procedencia y build sin red. Fase 4 no ejecutará scraping en vivo ni ampliará la adquisición.

La fuente conserva `legal_status = pending_review`. Aceptar A1 reconoce ese riesgo para la demo, pero **no sustituye** la revisión de términos de uso, propiedad intelectual, atribución o tratamiento jurídico que Viva debe completar antes de un uso productivo o una distribución distinta de la demo.

Si A1 se rechaza, Fase 4 se detiene hasta disponer de un dataset controlado, licenciado o provisto por Viva.

### A2 — Significado interno de “certificado”

En esta demo, “certificado” significa únicamente que el hecho pasó las reglas internas de elegibilidad, homogeneidad, trazabilidad y compatibilidad definidas en Fases 3 y 4. No significa certificación de un tercero, auditoría externa, tasación, validación registral ni garantía comercial.

La interfaz deberá explicar esta definición y podrá preferir “referencia elegible” cuando reduzca ambigüedad.

### A3 — Tipo de precio

Los precios Nexo se presentarán como **precio publicado desde**. No se los llamará precio promedio, precio de lista representativo, precio de cierre, precio de venta real ni valor de tasación. Fase 4 no aplicará conversión de moneda.

### A4 — Denominador de área

El benchmark de precio por m² usará solo área total cuando precio y área total sean compatibles y elegibles. No inferirá área techada o libre desde imágenes, proporciones o texto ambiguo. Cada indicador mostrará su denominador.

### A5 — Semántica de unidades

`unit_count` solo podrá mostrarse como “unidades reportadas por la publicación”, acompañado de fuente y cobertura. No se presentará como stock disponible, inventario total, velocidad de venta o absorción. Si la semántica no puede sostenerse en un registro, el campo se omite o queda como insuficiente.

### A6 — Atributos cualitativos

Amenities y atributos de producto se rotularán como **atributos anunciados**. Su presencia en una publicación no prueba ejecución, disponibilidad, calidad, exclusividad ni entrega. `No informado` permanece distinto de `No tiene`.

### A7 — Acabados y estacionamientos

Acabados y estacionamientos mostrarán estado insuficiente cuando su cobertura no permita comparación. No se inferirá ausencia, calidad o prevalencia. La evidencia controlada CT-D podrá ilustrar trazabilidad, pero no se extrapolará al mercado.

### A8 — Umbrales mínimos

- Cuantitativo: `n >= 3` = listo; `n = 1–2` = orientativo; `n = 0` = insuficiente.
- Cualitativo: `n >= 5` informados = listo para hablar de patrón observado de publicación; `n = 1–4` = orientativo con conteos descriptivos; `n = 0` = insuficiente.

Los umbrales afectan la narrativa, no autorizan rellenar faltantes ni ampliar el universo fuera del escenario.

### A9 — Caso Pardo Coast / CT-G

Pardo Coast permanece visible en el universo territorial. La tipología Tipo 7 y sus hechos incompatibles continúan excluidos. Un precio de proyecto cuyo vínculo con una tipología válida no pueda demostrarse queda fuera del benchmark con razón `typology_link_unresolved`; no se elige una verdad entre 104.15 m² y 53.37 m².

### A10 — Exportación diferible

HU-DEMO-505 permanece `Could` y se difiere en esta ejecución de Fase 4. Solo podrá reabrirse mediante una enmienda posterior a aprobar benchmark, comparador, conclusión, privacidad y responsive. Si se reabre, será impresión HTML / “Guardar como PDF”, con allowlist pública y sin evidencia restringida. Diferirla no bloquea Fase 4.

### A11 — Pareja precio–área no demostrada

El snapshot actual contiene precio mínimo y área mínima a nivel de proyecto, pero no un identificador que demuestre que ambos pertenecen a la misma unidad o tipología. La coincidencia aritmética no resuelve esa limitación.

Se autoriza mostrar esos cocientes solo como **Índice orientativo de entrada (precio mínimo publicado / área mínima publicada)**, con estado `orientative_noncomparable`. No entran al benchmark elegible, no cambian a `ready` por volumen y no sustentan una recomendación de precio. Una referencia por m² solo será elegible cuando provenance versionada demuestre `source_paired` para la misma oferta o tipología.

### A12 — Compatibilidad mínima del runtime territorial

Se autoriza modificar exclusivamente el allowlist de versiones públicas en `prototipo_ejecutable/public/js/scenario.js` para aceptar `2.3.0`, junto con tests de arranque 2.1/2.2/2.3. No se autoriza cambiar selección geográfica, cuadrantes, radio, serialización, score o IDs de Fase 2. Los contratos 2.1/2.2 siguen funcionando y muestran F4 como `contract_unavailable`.

## Qué se aprueba y qué no

La aprobación conjunta de A1–A12 autoriza:

- crear el contrato aditivo 2.3;
- materializar hechos de benchmark desde entradas ya versionadas;
- construir el motor puro, benchmark, comparador y conclusión explicable;
- presentar el cociente de mínimos únicamente como orientación no comparable;
- ampliar de forma mínima el allowlist runtime a 2.3 sin cambiar semántica territorial;
- ejecutar los tests y el checker previstos en `PLAN.md`.

No autoriza:

- adquisición nueva o scraping en vivo;
- publicación de activos restringidos;
- afirmar precios de cierre, demanda, absorción, stock o tasación;
- inferir áreas o resolver discrepancias por intuición;
- modificar motores protegidos de Fase 2 fuera de la excepción exacta A12 o alterar la elegibilidad de Fase 3;
- omitir revisión legal para un uso productivo;
- merge o despliegue automático.

## Frase de aceptación

Para habilitar P4-01, responder exactamente:

> Acepto A1–A12 y autorizo HUMAN-GATE-A de la Fase 4.

Una aceptación parcial, condicionada o con cambios exige actualizar contexto, assessment, UI-SPEC y plan, y repetir el reader-test antes de implementar.
