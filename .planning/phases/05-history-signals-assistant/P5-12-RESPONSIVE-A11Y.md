# P5-12 — Responsive, contraste, densidad, teclado y zoom 200%

**Fecha:** 2026-08-04

**Rama:** `feat/phase-5-history-signals-assistant`

**Estado:** completado; pendiente P5-13

**Contrato público:** `2.4.0`, sin cambios

## Objetivo cerrado

P5-12 convirtió los criterios visuales y de interacción de `#activity` y `#assistant` en un gate reproducible de navegador. Las dos rutas pasan en 1440×900, 1280×720, 390×844 y reflow equivalente a 200%, sin scroll horizontal, texto crítico truncado, controles táctiles menores a 44×44 ni pérdida de foco.

El alcance se limitó a estilos, pruebas, manifiesto y evidencia. No se modificaron contrato, schema, dataset público, writer, motores, estado, controlador, vistas, navegación, fingerprints ni activos.

## Decisiones de diseño

La dirección visual conserva el “cuaderno de señales comerciales” aprobado: verde Viva como espina de evidencia, superficies cálidas para límites y ámbar solo para advertencias acompañadas por texto e icono.

| Problema observado | Ajuste aplicado | Resultado verificable |
|---|---|---|
| Foco global tenue sobre superficies claras y oscuras | Anillo blanco de 3 px y halo exterior de tinta en controles de Señales y Asistente | El foco permanece visible en botones, filtros, divulgaciones, referencias y textarea |
| Texto principal de las señales en 15 px | Razón de cada señal y texto de agenda elevados a 16 px | Cuerpo principal ≥16 px; metadata ≥14 px |
| Líneas largas en introducción y respuesta | Copia principal limitada a 72 caracteres aproximados (`72ch`) | Lectura escaneable sin columnas estrechas ni truncamiento |
| Banda territorial comprimida en laptop | Métricas territoriales 2×2 entre 621 y 1320 px; una columna bajo 620 px | “Sin precio objetivo” ocupa como máximo dos líneas y ya no se fragmenta palabra por palabra |
| Metadata territorial pequeña | Elegibilidad, etiquetas, estados y enlace reproducible elevados a 14 px en ambas rutas | Jerarquía legible y contraste estable en los tres tamaños |
| Densidad móvil innecesaria | Espaciado interno moderado en calidad, escenario, preguntas y composer; CTA sigue a ancho completo | Menor longitud sin esconder información crítica |
| Foco o contenido bajo cabecera sticky | `scroll-margin-top` específico para controles, respuesta y detalle | El reflow conserva foco y permite llevar el control a una zona visible |
| Movimiento no esencial | Transiciones y animaciones anuladas con `prefers-reduced-motion` | Duración computada de 0 s |

## Gate ejecutable

Se incorporó `tests/phase5-responsive.mjs` y el comando `test:phase5:responsive`. La suite también forma parte de `test:e2e` y, por tanto, de `verify`.

La prueba valida:

- 1440×900, 1280×720 y 390×844 para ambas rutas;
- reflow a 200% mediante DPR 2 y viewport CSS 720×450;
- ausencia de overflow horizontal y truncamiento crítico;
- cuerpo ≥16 px, metadata ≥14 px y contraste de texto WCAG AA ≥4.5:1;
- objetivos táctiles de al menos 44×44 en tablet/móvil y 200%;
- foco de alto contraste, preservación de foco tras reflow y reducción de movimiento;
- densidad de cuatro/dos/una columnas según ancho, sin comprimir el contexto territorial;
- recorrido por teclado señal → evidencia → cierre y sugerencia → consulta → respuesta → referencia → regreso;
- estados vacío, solo por revisar, CT-F y degradación explícita de contrato 2.3;
- cero errores de consola, página o HTTP y cero solicitudes externas.

## Evidencia portable

Directorio: `evidence/p5-12/`.

### Viewports obligatorios

- `activity-1440x900.png`
- `activity-1280x720.png`
- `activity-390x844.png`
- `assistant-1440x900.png`
- `assistant-1280x720.png`
- `assistant-390x844.png`

### Zoom y estados críticos

- `activity-zoom-200.png`
- `assistant-zoom-200.png`
- `activity-empty-390x844.png`
- `activity-reviewable-1280x720.png`
- `assistant-ct-f-390x844.png`
- `activity-legacy-1280x720.png`
- `assistant-legacy-1280x720.png`

Las capturas se generan desde scroll superior para evitar que la cabecera sticky oculte contenido en una imagen full-page. Las referencias visuales previas permanecen en `evidence/baseline/`, `evidence/p5-08/` y `evidence/p5-10/`.

## Verificación ejecutada

```text
npm.cmd run check:phase5             PASS
npm.cmd run test:phase5:responsive   PASS
npm.cmd run test:e2e                 PASS
npm.cmd run verify                   PASS
git diff --check                     PASS
```

`verify` pasó antes de la corrección final de movimiento reducido; después de esa corrección se repitieron `check:phase5`, toda la cadena `test:e2e`, la suite responsive y `git diff --check`, todos en `PASS`.

## Revisión independiente

El checker `/root/p5_12_checker` inspeccionó el diff sin editar archivos. Su primera pasada emitió `PASS WITH RISKS` porque el helper de navegador anulaba movimiento antes de medirlo y el zoom no verificaba solapes geométricos. Tras retirar esa estabilización durante el chequeo, medir controles con transiciones reales, comprobar viewport/solapes y anular la transición del shell bajo `prefers-reduced-motion`, el checker repitió la suite.

**Veredicto final:** `PASS`, sin riesgos residuales dentro de P5-12.

Esta revisión proporcional no sustituye el gate formal P5-13.

## Límites

- El 200% está automatizado como reflow equivalente reproducible y valida geometría/foco; no sustituye el ensayo humano breve recomendado antes de presentar la demo.
- P5-12 no cambia la semántica de señal, prioridad, referencia ni respuesta.
- El checker formal de toda la Fase 5 corresponde a P5-13; el checker proporcional de esta tarea no lo sustituye.

## Siguiente paso

Ejecutar P5-13: verificación independiente de contrato, código, dataset, pruebas, navegador, privacidad y narrativa.
