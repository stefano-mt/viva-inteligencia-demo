# P6-15 — Contraste adversarial entre estado y UI

**Fecha:** 2026-08-10

**Método:** navegador Chrome headless mediante el helper versionado `tests/helpers/demo-browser.mjs`; solo lectura, mismo origen, sin modificar runtime ni fixtures.

## Hallazgo reproducible

`state.journeyContext` materializa estado y datos correctos, pero `app.js` no entrega ese modelo a `renderJourney`. La llamada visible en `public/app.js:380-385` solo deriva `loading`/`ready` desde `geographyArtifact.status`. `public/js/views/journey.js:134-176` renderiza `BASE_STAGE_COPY`; `renderJourney` no recibe `stage.data`, `stage.status` ni `correctiveAction`.

### Caso 1 — geografía vacía en contrato 2.4

Ruta:

```text
/?sv=1&scope=radius&lat=-12.000000&lon=-77.000000&radius=500#journey/geography
```

Resultado observado:

```json
{
  "stage": "geography",
  "state_status": "empty",
  "dom_status": "ready"
}
```

La pantalla conserva el copy de lectura disponible y el CTA normal, en vez de explicar que no hay proyectos y ofrecer la acción correctiva calculada por el estado.

### Caso 2 — Decisión no disponible en contrato 2.1

Se sirvió una copia en memoria del payload público con `metadata.contract_version = "2.1.0"` y sin índices F3–F5, usando la misma degradación del E2E versionado.

Resultado observado:

```json
{
  "stage": "decision",
  "state_status": "capability_unavailable",
  "capability_status": "capability_unavailable",
  "dom_status": "ready",
  "ui_explains_unavailable": false,
  "console_or_network_problems": 0
}
```

La UI afirma `La decisión reúne la lectura disponible...` aun cuando el estado autoritativo declara que la capacidad no existe para esa revisión.

### Caso 3 — datos autoritativos no visibles en las etapas

Sobre el payload 2.4 por defecto:

| Etapa | Datos presentes en `state.journeyContext` | Resultado en el texto visible de la etapa |
|---|---|---|
| Escala | 184 y piloto 30/22/5 | no aparece `184`; tampoco el desglose 30/22/5 |
| Calidad | 104.15, 53.37, 50.78 y exclusión | no aparece ninguno de los tres valores |
| Decisión | checklist y respuesta literal si existe | no se renderiza el checklist ni la respuesta; solo copy genérico |

Los datos sí aparecen al abandonar el recorrido y abrir ciertas rutas expertas. Eso no cumple el contrato aprobado de que cada etapa presenta su lectura principal derivada, respaldo, límite y evidencia/profundización.

## Por qué el gate existente no lo detecta

- `tests/journey-e2e.mjs:82-111` exige título, rail, CTA y los rótulos genéricos `Qué sabemos` / `Qué falta`; las cifras se verifican después de navegar a las rutas expertas.
- `tests/phase6-integral-e2e.mjs:75-91` lee `state.journeyContext` directamente mediante `import()`, no el texto/estado visible del recorrido.
- `tests/phase6-integral-e2e.mjs:189-228` contrasta el `h1`, links expertos y datos internos, pero no exige paridad DOM ↔ `journeyContext`.

Por eso `npm.cmd run verify` puede terminar verde mientras los estados visible y autoritativo divergen.

## Criterios afectados

- HU-DEMO-103: estados vacíos, insuficientes y capacidades 2.0–2.4.
- HU-DEMO-801: lectura, respaldo, evidencia y CTA por etapa.
- PLAN §1.2, §2 y §4: paridad visible con el motor autoritativo.
- CONTEXT §4.1 y §4.2: claim dinámico, fallback y aplicabilidad por etapa.
- UI-SPEC §6, §7 y §10: anatomía, contenido y estados del recorrido.

**Severidad:** P1 / bloqueante para P6-15 y para crear el PR funcional.
