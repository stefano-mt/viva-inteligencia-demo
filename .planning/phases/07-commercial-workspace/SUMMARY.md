# Fase 7 — Resumen del workspace comercial simplificado

**Fecha de cierre técnico:** 2026-08-27

**Estado:** `FUNCTIONALLY VERIFIED — awaiting human PR review and merge`

**Veredicto independiente:** `PASS`

**Candidato funcional corregido:** `23d350532584ead2cbad3ccb15e3ad88aecb08ce`

**Cierre independiente versionado:** `ce52b20c47b898c7f351715d059e1c43c7e8d31a`

## Resultado

La Fase 7 reorganiza la demo como un workspace comercial de lectura rápida. Reduce repetición, columnas y cards; conserva la profundidad analítica bajo demanda y mantiene intactas las cifras, fuentes, exclusiones, decisiones y acciones correctivas de las fases anteriores.

La nueva composición `Viva Decision Desk` ofrece:

- cinco destinos primarios: Recorrido, Panorama, Proyectos, Decidir y Seguimiento;
- cuatro accesos bajo `Profundizar`: Inspector, Benchmark, Comparador y Checklist;
- las seis etapas canónicas del recorrido y las ocho rutas expertas existentes;
- escenario resumido en el shell y editor completo cerrado por defecto;
- listas, evidencia, requisitos y diferencias presentados como filas o ledgers;
- una acción primaria dominante y un máximo de tres métricas antes del trabajo principal;
- navegación local `Ir a…` con `Ctrl+K`/`Cmd+K`, nueve destinos, teclado y cero persistencia o red.

La fase es exclusivamente UX/UI y navegación. No modifica el contrato público 2.4, dataset, writer, fingerprints, motores, elegibilidad, workflow o servicios externos.

## Historias entregadas

| Historia | Resultado confirmado |
|---|---|
| HU-DEMO-805 | Shell comercial con rail compacto, cinco destinos primarios, cuatro accesos de profundización y contexto del escenario sin duplicación. |
| HU-DEMO-806 | Escenario visible y editable bajo demanda; deep-links, recarga, atrás/adelante y reset canónicos preservados. |
| HU-DEMO-807 | Lectura principal y comienzo del trabajo aparecen en la primera pantalla de 1280×720; exactamente un `h1` visible por superficie. |
| HU-DEMO-808 | Proyectos y señales usan filas; Inspector, Benchmark, Comparador y Checklist usan ledgers operativos y composiciones verticales. |
| HU-DEMO-809 | Ayuda, metodología, referencias y atributos secundarios usan divulgación progresiva sin retirar claims, límites o acciones correctivas. |
| HU-DEMO-810 | `Ir a…` navega localmente con teclado, devuelve foco, no persiste consultas y no promete buscar datos. |

Los criterios completos viven en [PLAN.md](PLAN.md), el contrato ejecutable en [CLAIMS-INVENTORY.md](CLAIMS-INVENTORY.md) y el resultado formal en [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md).

## Cambios observables

### Shell y navegación

- Rail de escritorio compacto y navegación móvil accesible.
- Escenario activo siempre visible sin repetir el editor en cada vista.
- Grupo `Profundizar` para análisis especializados sin competir con el flujo principal.
- Paleta `Ir a…` con nueve destinos y sin búsqueda de datos, telemetría o almacenamiento.
- Rutas, aliases y retorno al recorrido conservados.

### Recorrido y Panorama

- Cada etapa prioriza pregunta, lectura, límite y siguiente acción.
- Panorama abre con la lectura territorial y el mapa antes del detalle.
- Metodología y configuración secundaria parten cerradas.
- Escala conserva 184 como total modelado y 30/22/5 como subconjuntos acumulativos.

### Proyectos e Inspector

- Proyectos reemplaza la cuadrícula extensa por filas comparables, toolbar y detalle bajo demanda.
- Inspector presenta conclusión y elegibilidad antes del expediente técnico.
- Tipo 7 conserva 104.15 m², 53.37 m², diferencia de 50.78 m² y exclusión explicable.
- El shell posee el único `h1`; el encabezado interno del Inspector usa jerarquía secundaria.

### Benchmark y Comparador

- Benchmark muestra conclusión y partición antes del contexto de escala y la metodología.
- Mantiene 85 comparables, 68 referencias orientativas y 0 parejas elegibles en Miraflores.
- Comparador coloca conclusión, control de selección y hallazgos antes de la matriz detallada.
- El shell posee el único `h1`; la vista interna del Comparador usa jerarquía secundaria.
- Ninguna referencia orientativa se presenta como tasación, precio transaccional o precio real de cierre.

### Decidir, Checklist y Seguimiento

- Asistente prioriza la consulta y conserva respuesta, datos, interpretación, límites, referencias y siguiente paso.
- Checklist organiza requisitos como filas y mantiene acciones correctivas.
- Seguimiento presenta primero la lectura de la señal y después la agenda priorizada.
- Los cambios históricos siguen sin atribuir causa, venta o precio de cierre no observado.

## Contrato comercial C01–C23

El fixture `tests/fixtures/commercial-claims.json` materializa C01–C23 y permaneció byte a byte estable después de P7-01. Las regresiones cubren:

- seis etapas y ocho rutas expertas;
- CT-A–I/P;
- contratos 2.0–2.4 y degradación explícita;
- cifras, denominadores, exclusiones y límites autoritativos;
- vacíos, insuficiencia, error global y acciones correctivas;
- escenario, reset, deep-links, historial y asistente;
- cero `NaN`, infinito, persistencia o solicitudes externas.

## Accesibilidad, responsive y densidad

- 14 superficies verificadas en 1440×900, 1280×720, 390×844 y reflow equivalente a zoom 200 %.
- 56 capturas finales con SHA-256 en [evidence/responsive/manifest.json](evidence/responsive/manifest.json).
- Texto operativo ≥16 px y metadata ≥13 px.
- Controles visibles ≥44×44 px, foco perceptible, contraste AA y movimiento reducido.
- Cero overflow, solapamiento o truncamiento crítico.
- Una sola acción primaria visible por pantalla.
- Exactamente un `h1` visible por superficie.
- En 1280×720 y `scrollY = 0`, Benchmark, Comparador y Seguimiento muestran la lectura y el borde superior de la zona de trabajo dentro del viewport. El criterio geométrico es `y < 720`; no afirma que toda la zona de trabajo sea visible.

## Verificación independiente

El primer P7-10 detectó dos gaps P2 de jerarquía y primera pantalla. P7-10A los corrigió y la repetición independiente emitió `PASS`, sin P0–P3 abiertos y sin requerir HUMAN-GATE-B.

Resultados finales:

- `npm.cmd run verify`: PASS sobre el candidato correctivo `23d3505`;
- C01–C23, CT-A–I/P y compatibilidad 2.0–2.4: PASS;
- smoke: ocho rutas × tres viewports;
- responsive/a11y: 14 superficies × tres viewports + zoom 200 %;
- Inspector y Comparador: un `h1` visible;
- Benchmark: lectura `y=345.25`, trabajo `y=366.25` en 1280×720;
- Comparador: lectura `y=295.83`, trabajo `y=466.00`;
- Seguimiento: lectura `y=356.55`, trabajo `y=716.03`;
- consola/página: cero problemas en la repetición adversarial sobre `23d3505`;
- solicitudes externas: cero requests cross-origin o a servicios externos; los assets locales/same-origin del bootstrap no se contabilizan como red externa;
- Graphify: 4,020 nodos y 8,105 aristas sobre el candidato integrado `6a6a60c`; el correctivo posterior fue auditado por diff/write set y no tocó datos, contratos ni motores;
- protegidos: sin cambios en datos, contratos, writer, motores o workflows.

## Evidencia portable

- Baseline preimplementación: [BASELINE_BROWSER.md](BASELINE_BROWSER.md) y [evidence/baseline](evidence/baseline/).
- Matriz final: [evidence/responsive](evidence/responsive/).
- Informe vigente: [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md).
- Browser independiente: [evidence/verification](evidence/verification/).
- Correctivo P7-10A: [P7-10A-CORRECTIVE.md](P7-10A-CORRECTIVE.md).

## Commits de la fase

| Bloque | Commits |
|---|---|
| Plan, revisiones, normalización y aprobación | `3907f27`, `cb0af8e`, `9ecf1d7`, `dde4f88`, `83bb0a5`, `074b15d`, `53ccfef` |
| Baseline | `7f7436f` |
| Primitives, shell y comando local | `9bf18de`, `85e1e1f`, `347029b` |
| Recorrido, Panorama y Proyectos | `349c026`, `57fb2ae` |
| Inspector, Benchmark, Comparador, Asistente, Checklist y Señales | `a481710`, `233882c` |
| Integración y responsive | `4a8d8ce`, `6a6a60c` |
| Verificación inicial, correctivo y cierre independiente | `afa67bc`, `23d3505`, `ce52b20` |

## Riesgos y límites del veredicto

No existen gaps técnicos P0–P3 abiertos y HUMAN-GATE-B no aplica. Permanecen estos límites deliberados:

- la Fase 7 no incluye UAT humana por A13;
- el `PASS` es técnico y no equivale a despliegue público;
- Graphify no sustituye revisión visual de CSS/JSON;
- la agenda de Seguimiento inicia en `y=716.03`: la medición usa el borde superior del `getBoundingClientRect()` de `.history-agenda` en Chromium/Playwright, viewport 1280×720 y `scrollY=0`; cumple `y < 720`, pero la revisión del PR debe confirmar visualmente que el handoff entre lectura y trabajo resulta claro;
- no debe declararse `deployed and verified` hasta completar P7-12, P7-13 y P7-14.

## Estado de ship

- P7-00A–P7-10A: completados.
- P7-11: completado por este resumen, handoff y actualización de estado; su SHA se deriva después de crear el commit.
- P7-12: revisión y merge humano pendientes.
- P7-13: verificación post-merge pendiente.
- P7-14: persistencia post-merge pendiente.
