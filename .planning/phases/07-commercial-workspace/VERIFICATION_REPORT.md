# P7-10A — Repetición formal independiente

Fecha: 2026-08-27

Candidato cerrado: `23d350532584ead2cbad3ccb15e3ad88aecb08ce`

Rama: `feat/phase-7-commercial-workspace`

Base de Fase 7: `6251442f989df26d5589cadbafa5f13ccaf19e8c`

Padre correctivo: `afa67bcabaa0d78dcdef8b9a0e134ea3c014825e`

Verificador independiente: `/root/p7_10a_checker`

## Veredicto

**PASS**

P7-10A cierra los dos hallazgos P2 del informe anterior. Inspector y Comparador exponen exactamente un `h1` visible. Benchmark, Comparador y Seguimiento muestran la lectura y el comienzo del trabajo dentro del primer viewport de `1280×720`, medidos a `scrollY = 0` antes de foco, teclado, clic, captura o scroll explícito.

No se detectaron nuevos gaps P0–P3. `HUMAN-GATE-B` no es requerido.

## G1 — Jerarquía de encabezados

| Superficie | `h1:visible` | Resultado |
|---|---:|---|
| Inspector | 1 | PASS |
| Comparador | 1 | PASS |

El título canónico permanece en el shell. Los encabezados internos de Inspector y Comparador usan `h2`, por lo que la corrección conserva nombre visible y elimina la duplicidad semántica.

## G2 — Primera pantalla de 1280×720

Todas las coordenadas se obtuvieron antes de cualquier operación capaz de desplazar el documento.

| Superficie | `scrollY` | Lectura `y` | Trabajo `y` | Alto | Resultado |
|---|---:|---:|---:|---:|---|
| Benchmark | 0 | 345.25 | 366.25 | 720 | PASS |
| Comparador | 0 | 295.83 | 466.00 | 720 | PASS |
| Seguimiento | 0 | 356.55 | 716.03 | 720 | PASS |

El comienzo de la agenda de Seguimiento queda dentro del viewport y la regresión exige estrictamente `y < 720`. La medición está respaldada por captura y por el harness independiente.

## Harness browser independiente

El helper Python de la skill `webapp-testing` se intentó primero con `--help`, pero el ejecutable de WindowsApps no pudo iniciar. Se aplicó el fallback Playwright Node ya disponible en el repositorio, mediante un harness nuevo que no reutiliza las aserciones de P7-09 ni el checker anterior.

Comandos:

```powershell
node --check .planning/phases/07-commercial-workspace/evidence/verification/checker-p7-10a.mjs
node .planning/phases/07-commercial-workspace/evidence/verification/checker-p7-10a.mjs
```

Resultado:

```text
P7-10A browser adversarial PASS: G1 y G2 cerrados a scrollY=0 en 1280x720.
```

El navegador registró cero problemas de consola/página, cero solicitudes externas y cuatro capturas inspeccionadas visualmente.

Evidencia portable:

- `evidence/verification/checker-p7-10a.mjs`;
- `evidence/verification/p7-10a-browser-verification.json`;
- `evidence/verification/p7-10a-inspector-1280x720.png`;
- `evidence/verification/p7-10a-market-1280x720.png`;
- `evidence/verification/p7-10a-compare-1280x720.png`;
- `evidence/verification/p7-10a-activity-1280x720.png`.

## Suite integral y regresión P7-09

El orquestador ejecutó el comando oficial exacto sobre el candidato correctivo:

```powershell
cd prototipo_ejecutable
npm.cmd run verify
```

Resultado comunicado al checker: **PASS**. Incluyó sintaxis, arquitectura, C01–C23, CT-A–I/P, compatibilidad 2.0–2.4, datos, determinismo, privacidad, E2E, P7 responsive, smoke y accesibilidad. Por instrucción del orquestador, el checker no duplicó esta ejecución y concentró la independencia en el browser adversarial y la auditoría del diff.

La prueba P7-09 ahora:

1. restablece `scrollY = 0` y estabiliza el layout;
2. valida un único `h1` visible;
3. mide lectura y trabajo;
4. solo después ejecuta helpers de foco que pueden llamar `scrollIntoViewIfNeeded()`.

Esto elimina el falso verde descrito por el informe anterior.

## Auditoría de commit y límites

- `git show --check 23d3505`: PASS.
- `git diff --check afa67bc..23d3505`: PASS.
- El commit correctivo contiene 35 archivos: presentación en `app.js`, cinco vistas, tres hojas de estilo, regresiones dirigidas y evidencia P7.
- El diff de presentación solo reordena/compacta contenido, elimina resúmenes de escenario redundantes y corrige la jerarquía de títulos; no introduce dependencias, imports ni cálculos nuevos.
- Las pruebas dirigidas preservan los claims y sincronizan selectores con la nueva topología visible. El cambio de `benchmark-e2e.mjs` mantiene la prohibición de tasación/promedio transaccional y verifica explícitamente que el uso de “precio de cierre” sea una negación prudente.
- No existen cambios en el commit correctivo ni en toda la Fase 7 frente a `6251442` bajo:
  - `prototipo_ejecutable/contracts/*`;
  - `prototipo_ejecutable/scripts/build-demo-data.js`;
  - `prototipo_ejecutable/scripts/data/*`;
  - `prototipo_ejecutable/public/demo-data/*`;
  - `datos_relevantes/*`;
  - `prototipo_ejecutable/public/js/*-engine.js`;
  - `.github/workflows/*`.
- No se modificaron datos, contratos, writer, motores, elegibilidad ni workflows.
- Los archivos dirty y no rastreados de Fase 6 permanecieron fuera del alcance: no se leyeron, editaron ni añadieron al staging.

## Cierre del gate

P7-10A queda **PASS** sobre `23d350532584ead2cbad3ccb15e3ad88aecb08ce`. La Fase 7 puede continuar con P7-11 —memoria y preparación del pull request funcional— sin aceptación de riesgo adicional.
