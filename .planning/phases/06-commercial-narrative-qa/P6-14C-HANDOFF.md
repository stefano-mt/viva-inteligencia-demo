# P6-14C — Handoff: densidad del Comparador y jerarquía de decisión

**Fecha de cierre:** 2026-08-09

**Estado:** completado y verificado

**Rama:** `feat/phase-6-commercial-narrative-qa`

**Baseline:** `267405a`

**Siguiente paso:** P6-14D — revisión de copy transversal y preparación de un nuevo ensayo humano independiente

## Resultado

P6-14C convierte el Comparador comercial en una hoja de decisión progresiva:

- La conclusión sustentada aparece antes de selección, denominadores y matriz.
- El primer hallazgo recibe jerarquía principal; los dos hallazgos de apoyo conservan finding, implicancia, siguiente revisión, limitación y enlace a su fila exacta.
- `Revisar movimiento` es la única acción primaria de la comparación lista y queda visible junto al encabezado de decisión en laptop.
- Se eliminó el índice separado de diferencias prioritarias y el handoff duplicado.
- El resumen territorial global ya no se repite en `#compare`; el escenario permanece visible y editable en la estación lateral y la región viva accesible se conserva.
- La base de lectura inicia cerrada con sus conteos esenciales; al abrirla mantiene los cuatro denominadores y el enlace metodológico.
- La matriz conserva nueve grupos y diez criterios; solo Precio inicia abierto, y un hallazgo abre y enfoca automáticamente cualquier otro grupo necesario.
- Selección 0–3, escenario Viva, CT-G, estados insufficient/error/legacy, evidencia, privacidad, URL y motor de benchmark permanecen intactos.

## Criterios demostrados

Los 16 criterios del plan quedaron cubiertos: decisión primero, máximo tres hallazgos, limitaciones bajo demanda, una sola acción primaria, ausencia de información repetida, denominadores compactos, matriz íntegra, foco por criterio, CT-G fail-closed, responsive, teclado, contraste AA, objetivos 44 × 44, zoom 200 % y cero overflow/truncamiento.

## Evidencia portable

Evidencia funcional:

- `evidence/functional/04-depth-comparator.png`
- `evidence/functional/manifest.json`

Matriz responsive:

- `evidence/responsive/expert-compare-1440x900.png`
- `evidence/responsive/expert-compare-1280x720.png`
- `evidence/responsive/expert-compare-390x844.png`
- `evidence/responsive/expert-compare-zoom-200.png`
- `evidence/responsive/manifest.json`

La inspección visual confirmó una lectura clara del hallazgo principal en escritorio y laptop, una sola columna en móvil y reflow legible a zoom 200 %. La corrida E2E regeneró de forma determinista las capturas funcionales 03–06 y sus fingerprints; solo 04 cambia por el runtime de P6-14C.

## Verificación final

`npm.cmd run verify` terminó con código `0` y cubrió:

- sintaxis, ownership CSS y grafo de arquitectura;
- recorrido completo y las ocho rutas expertas;
- contratos públicos 2.0–2.4, determinismo y privacidad;
- escenarios, comparabilidad, geografía, Inspector, Benchmark, Comparador, Histórico y Asistente;
- E2E funcionales, smoke de ocho rutas por tres viewports y accesibilidad;
- Fase 6 en 14 superficies × 3 viewports, zoom 200 %, teclado, foco, objetivos 44 × 44, contraste AA, reduced motion y cero overflow o truncamiento.

También pasaron en forma explícita:

- `node tests/comparison-density.mjs`
- `node tests/comparison-view.mjs`
- `node tests/journey-depth.mjs`
- `node tests/comparison-e2e.mjs`
- `node tests/benchmark-comparison-responsive.mjs`
- `npm.cmd run test:phase6:responsive`

La regresión responsive histórica de Benchmark/Comparador asumía que eyebrow y metadata territoriales siempre existían. Se sincronizó la aserción con la cabecera vigente —ambos elementos son opcionales— y la suite volvió a pasar en 1440, 1280, móvil y zoom 200 %, sin cambios de runtime.

## Archivos protegidos

No se modificaron dataset público, schema, writer, scripts de datos, fingerprints públicos, motores, estado, controlador, navegación, contrato de URL ni vistas ajenas al Comparador. Las plantillas de ensayo humano preexistentes permanecen sin seguimiento y fuera del commit.

## Rollback

Revertir el commit atómico de P6-14C y ejecutar `npm.cmd run verify`. El rollback debe retirar juntos composición, estilos, regresiones y evidencia para conservar coherencia entre conclusión, enlaces de hallazgo y filas de la matriz.
