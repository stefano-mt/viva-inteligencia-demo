# Fase 7 — Baseline preimplementación

**Paso:** P7-00D.

**Fecha:** 2026-08-24.

**SHA de partida:** `53ccfefb487e92f95f334d442c2356720e2cc7ed`, commit que contiene HUMAN-GATE-A.

**Veredicto:** `PASS`.

## 1. Alcance

Se congeló el estado de Fase 6 antes de modificar el runtime de Fase 7:

- seis etapas: Escala, Geografía, Calidad, Profundidad, Movimiento y Decisión;
- ocho rutas expertas: Radar, Proyectos, Inspector, Benchmark, Comparador, Checklist, Asistente y Señales;
- viewports 1440×900, 1280×720 y 390×844;
- DOM, `h1`, orden de encabezados, foco, cantidad de controles, acción primaria, altura, overflow, consola y red;
- contrato 2.4, compatibilidad 2.0–2.4, datos, privacidad, determinismo, CT-A–I/P, reset y deep-links mediante el gate integral.

## 2. Gate técnico

Desde `prototipo_ejecutable/`:

```text
npm.cmd run verify
```

Resultado: exit code 0. Pasaron sintaxis, ownership CSS, grafo de módulos, recorrido, contrato/datos, compatibilidad, determinismo, privacidad, escenario, geografía, Inspector, Benchmark, Comparador, Histórico, Asistente, E2E, responsive, smoke y accesibilidad.

Resultados de navegador incluidos en el gate:

- responsive: 14 superficies × 3 viewports + zoom 200 %, teclado, foco, 44×44, AA, reduced motion y cero overflow/truncamiento;
- smoke: ocho rutas × tres viewports;
- accesibilidad: 14 superficies × tres viewports;
- errores de consola/página: 0;
- solicitudes externas: 0.

La suite regeneró cinco evidencias rastreadas de Fase 6. Como estaban fuera del write set y provenían exclusivamente de esta ejecución, se restauraron de forma dirigida a `HEAD`; no forman parte del diff P7-00D.

## 3. Captura portable de Fase 7

Comando:

```text
$env:BASELINE_SHA='53ccfefb487e92f95f334d442c2356720e2cc7ed'
node .planning/phases/07-commercial-workspace/evidence/baseline/capture-baseline.mjs
```

Resultado:

- 14 superficies × 3 viewports = 42 capturas completas;
- 42 comprobaciones de DOM, foco, orden y densidad;
- 42/42 con una acción primaria identificada;
- 0 casos de overflow horizontal;
- 0 valores `NaN`, `Infinity` o `∞`;
- 0 errores de consola, página, HTTP o recursos;
- 0 solicitudes a hosts externos.

Manifiesto: `evidence/baseline/manifest.json`.

SHA-256 del manifiesto:

```text
8135a3bf5fa9cedaaee71a90eb2971582d39ce1b1e1aa38b321c987aa3c6dbff
```

El directorio contiene 44 archivos: capturador, manifiesto y 42 PNG; tamaño total 9,683,027 bytes.

El capturador se ejecutó dos veces sobre el mismo SHA. Ambas corridas reprodujeron las 42 rutas/viewports, métricas DOM, alturas, conteos, foco y resultados lógicos. Los bytes PNG no fueron idénticos entre procesos de Chromium, por lo que sus hashes identifican esta corrida final y no se presentan como determinismo de raster.

## 4. Métricas de densidad que justifican Fase 7

Valores en 1280×720. `Altura` es el alto completo del documento; `Controles` incluye enlaces, botones, campos, selects y disclosures operables.

| Superficie | Altura | Controles | Controles en primera pantalla |
|---|---:|---:|---:|
| Escala | 720 px | 8 | 8 |
| Geografía | 720 px | 10 | 10 |
| Calidad | 720 px | 9 | 9 |
| Profundidad | 764 px | 12 | 12 |
| Movimiento | 720 px | 9 | 9 |
| Decisión | 720 px | 10 | 10 |
| Radar | 2,793 px | 23 | 4 |
| Proyectos | 1,770 px | 32 | 9 |
| Inspector | 2,461 px | 15 | 5 |
| Benchmark | 3,986 px | 50 | 3 |
| Comparador | 2,319 px | 62 | 8 |
| Checklist | 1,103 px | 10 | 3 |
| Asistente | 1,464 px | 14 | 2 |
| Señales | 3,560 px | 28 | 4 |

En 390×844 los máximos son:

- Proyectos: 8,629 px;
- Señales: 6,527 px;
- Inspector: 5,817 px;
- Benchmark: 5,738 px;
- Comparador: 4,133 px;
- Asistente: 2,521 px.

Estas cifras no son fallos técnicos del baseline: documentan la deuda de densidad aprobada para Fase 7. Las capturas confirman repetición de escenario/guía antes del trabajo, listas demasiado extensas y detalle secundario visible demasiado pronto. También confirman que la semántica, la única acción primaria, los claims críticos y la navegación permanecen disponibles antes del rediseño.

## 5. Muestras revisadas visualmente

- `expert-dashboard-1280x720.png`: mapa útil, pero escenario, guía, detalle persistente, editor y diagnóstico generan una página larga.
- `expert-projects-1280x720.png`: jerarquía inicial clara; filtros, 18 filas y ficha producen continuidad extensa.
- `expert-compare-1280x720.png`: conclusión visible, pero 62 controles y la matriz completa aumentan la carga.
- `expert-assistant-390x844.png`: el formulario queda después de escenario, guía, hero y estado pendiente; requiere simplificación para acceso rápido.

## 6. Condición para P7-01

P7-00D pasa. P7-01 puede comenzar si:

1. contrato, datos, writer, fingerprints, motores, elegibilidad y workflow permanecen protegidos;
2. el fixture C01–C23 copia las autoridades sin reinterpretación;
3. cualquier diferencia posterior se contrasta con este SHA y manifiesto;
4. no se eliminan claims, límites, referencias, estados o acciones correctivas para reducir densidad;
5. el runtime continúa sin cambios hasta el commit atómico de P7-01.

P7-00C y P7-00D no modificaron código, estilos, datos, tests de producto ni comportamiento.
