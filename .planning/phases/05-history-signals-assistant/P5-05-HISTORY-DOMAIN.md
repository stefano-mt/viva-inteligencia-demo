# P5-05 — Motor puro de histórico y señales

**Estado:** completado.

**Rama:** `feat/phase-5-history-signals-assistant`.

## Objetivo

Derivar línea de tiempo, filtros, detalle, cobertura y agenda desde `payload.history`, las referencias autoritativas de `payload.model` y `scenarioContext`, sin reconstruir cambios desde la proyección legacy, consultar red o reloj del dispositivo, ni modificar estado, vistas o datos.

## Contrato del motor

`public/js/history.js` expone tres operaciones puras:

- `normalizeHistoryFilters(filters)`: normaliza estado, vigencia y dirección según precedencias cerradas.
- `buildHistoryContext({ data, scenarioContext, filters })`: produce timeline, cobertura territorial, razones y agenda reproducible.
- `getHistoryEventDetail(historyContext, historyEventId)`: devuelve el detalle visible con proyecto, observaciones, hechos y evidencias resueltas.

El motor exige contrato público 2.4 con `history.version = 1`. Para contratos anteriores devuelve `contract_unavailable`; no inventa histórico ni usa `projects[].price_delta_pct`.

## Reglas aplicadas

1. `scenarioContext.comparable_project_ids` es la frontera autoritativa. Distrito, cuadrante o radio no incorporan proyectos adicionales por inferencia.
2. El orden es `calidad → vigencia → evidencia → magnitud → recencia → ID canónico`; una señal revisable extrema nunca supera una certificada.
3. La vigencia se calcula contra `history.policy.cutoff_at` y sus ventanas 30/90, no contra la hora del equipo.
4. Fechas inválidas o invertidas, moneda desconocida, deltas inconsistentes y referencias rotas degradan la señal a `insufficient`.
5. Evidencia ausente, no disponible o restringida nunca se presenta como positiva.
6. Base cero conserva `delta_pct = null` y una explicación explícita; nunca produce infinito.
7. Una causa solo se conserva si tiene evidencia causal autorizada y disponible. En otro caso se suprime y se explica.
8. La agenda tiene como máximo tres filas. Usa “cambio observado”, conserva referencias y, si no hay señales certificadas, prioriza validación o ampliación de cobertura sin inventar oportunidades.
9. Los filtros derivan una vista local y no mutan el payload ni `scenarioContext`.

## Cobertura comprobada

- Dataset completo: 36 eventos visibles, 31 certificados y 5 revisables.
- CT-C: un proyecto del mismo distrito queda fuera cuando no pertenece a `comparable_project_ids`.
- CT-E: detalle anterior/nuevo, delta absoluto, delta porcentual válido o nulo, tres fechas, referencias y causa nula.
- CT-G: una evidencia marcada `restricted` degrada fail-closed a `insufficient` y no genera acción positiva.
- CT-I: Miraflores conserva 90 proyectos observados y el motor usa únicamente los 85 comparables canónicos.
- Orden estable incluso si eventos y colecciones de `model` llegan invertidos.
- Contratos 2.0–2.3 degradan explícitamente a histórico no disponible.

## Verificación

PASS:

```text
npm.cmd run test:history:domain
npm.cmd run check
npm.cmd run test:phase5:data
npm.cmd run test:data:compatibility
npm.cmd run test:data:determinism
npm.cmd run test:data:privacy
git diff --check
```

El test de dominio también inspecciona estáticamente que el motor no dependa de DOM, red, almacenamiento del navegador o reloj del dispositivo.

`npm.cmd run test:architecture` conserva el rojo temporal ya registrado en P5-04: `scenario.js` aún rechaza el contrato público 2.4. La corrección pertenece exclusivamente a P5-06, que integrará el motor al estado derivado. P5-05 no amplió su write set para ocultar ese gate.

## Archivos modificados

- `prototipo_ejecutable/public/js/history.js`
- `prototipo_ejecutable/tests/history-domain.mjs`
- `prototipo_ejecutable/package.json`
- memoria de planificación de P5-05

## Archivos protegidos

Sin cambios en writer, schema, policy, fixtures, JSON público, `scenario.js`, `state.js`, `controller.js`, vistas, estilos, activos, Benchmark, Inspector o semántica de elegibilidad.

## Handoff a P5-06

P5-06 debe adoptar contrato 2.4 en el runtime territorial y derivar `historyContext` desde el mismo `scenarioContext` utilizado por Radar, mapa, Benchmark y Comparador. Debe consumir la API pública del motor sin duplicar orden, filtros, validación de referencias ni reglas de agenda dentro de `state.js`.
