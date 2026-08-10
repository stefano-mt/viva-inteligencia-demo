# P6-15 final — contraste adversarial de UI y estado

**Script:** `p6-15-repeat-browser.mjs`

**Resultado estructurado:** `browser-repeat/result.json`

## Paridad y contenido

- Las seis etapas cumplen `data-journey-state === state.journeyContext.stages[stageId].status`.
- Escala canónica muestra `184` y `30 / 22 / 5`.
- Calidad muestra `104.15`, `53.37`, `50.78` y exclusión.
- Geografía vacía muestra `empty` y la acción autoritativa `Ajustar escenario → #dashboard`.
- Contrato 2.1 muestra `capability_unavailable` y `Formular consulta en el asistente → #assistant`.
- Contrato 2.0 conserva el error global y produce cero nodos Journey.

## G4 — faltantes de Escala

Se interceptó el payload 2.4 y se eliminaron:

- `metadata.counts.canonical_agencies`;
- `pilot.counts.base_count`.

Resultado:

- modelo: `insufficient`;
- DOM: `insufficient`;
- inmobiliarias modeladas: `No disponible`;
- piloto: `No disponible / 22 / 5`;
- no aparece un `0` fabricado.

## G5 — respuesta real y referencias

El navegador abrió `#assistant`, generó una respuesta real y volvió a `#journey/decision`. El estado contenía seis bloques:

1. `answer`;
2. `data`;
3. `interpretation`;
4. `limitations`;
5. `references`;
6. `next_step`.

Los cinco bloques de lectura quedan visibles en la etapa. `references` se representa mediante divulgación progresiva: inicia cerrada, se abre por click y muestra 4/4 etiquetas autoritativas.

Tipografía computada:

- límite: `16 px`;
- `summary`: `16 px`;
- referencias: `16 px`.

Geometría de Decisión con respuesta en 1280×720:

- límite: `197.30–298.17 px`;
- CTA: `621.09–665.09 px`;
- ambos dentro del viewport de `720 px`.

## Consola y red

- problemas de consola/página: `0`;
- solicitudes externas: `0`.

## Capturas

- `browser-repeat/scale-1280x720.png`;
- `browser-repeat/scale-missing-counts-1280x720.png`;
- `browser-repeat/quality-1280x720.png`;
- `browser-repeat/decision-response-1280x720.png`;
- `browser-repeat/decision-references-open-1280x720.png`;
- `browser-repeat/geography-empty-1280x720.png`.
