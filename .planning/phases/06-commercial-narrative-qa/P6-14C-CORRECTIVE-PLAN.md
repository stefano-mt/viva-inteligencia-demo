# P6-14C — Densidad del Comparador y jerarquía de decisión

**Fecha:** 2026-08-09

**Estado:** completado y verificado

**Dependencia:** P6-14B, commit `267405a`

## Objetivo

Convertir el Comparador comercial en una hoja de decisión legible: primero debe explicar qué condiciona la decisión, después qué diferencias conviene revisar y finalmente permitir abrir la matriz y la evidencia completa.

La intervención elimina capas visuales repetidas, no información. Conserva selección, escenario Viva, matriz de nueve grupos, diez criterios, estados de evidencia, enlaces al Inspector, denominadores, limitaciones y handoff a Movimiento.

## Dirección visual

### Sujeto y trabajo

- **Sujeto:** decisión comercial entre dos o tres proyectos del mismo escenario territorial.
- **Usuario:** responsable comercial o analista de Viva Inmobiliaria.
- **Trabajo único de la página:** identificar la diferencia que cambia la decisión y abrir su evidencia.

### Tokens conservados

- Verde Viva `#00943b`: avance y acento de hallazgo.
- Verde petróleo `#016150`: acciones, tinta de confianza y estados trazables.
- Tinta `#202022`: lectura principal.
- Papel `#f8f5ec`: límite o advertencia prudente.
- Línea `#cad7d2`: estructura tabular.
- Ámbar `#8a5400`: exclusión o precaución.

No se añaden tipografías, dependencias ni colores de producto.

### Layout

```text
┌─ Comparador comercial ───────────── 3 proyectos ─┐
│ Contrasta diferencias respaldadas                  │
├─ QUÉ CAMBIA LA DECISIÓN ──────────────────────────┤
│ 01 Hallazgo principal                              │
│    Implica… · Revisar… · [Límite] · [Ver criterio] │
│ 02 Diferencia de apoyo                             │
│ 03 Diferencia de apoyo          [Revisar movimiento]│
├─ Selección actual ───────────── [Cambiar proyectos]┤
├─ Base y denominadores [desplegable]                │
└─ Matriz completa · 9 grupos · 10 criterios         │
   Precio [abierto] · demás grupos [cerrados]         │
```

### Firma

Una **línea vertical de decisión** une como máximo tres hallazgos. El primero recibe mayor jerarquía y los demás funcionan como evidencia de apoyo; no son tarjetas independientes.

### Autocrítica

Se descartan una cuadrícula de KPIs y una tabla completa abierta por defecto: ambas repetirían la densidad que originó el correctivo. También se descarta ocultar la limitación fuera de la página; permanece accesible dentro de cada hallazgo y en el ledger metodológico.

## Historias

### HU-01 — Veredicto antes de la matriz

Como responsable comercial, quiero leer primero la condición que cambia la decisión para saber qué debo validar antes de recorrer diez criterios.

### HU-02 — Diferencias sin repetición

Como analista, quiero que cada diferencia aparezca una sola vez y enlace su fila exacta para no interpretar tres resúmenes equivalentes.

### HU-03 — Evidencia bajo demanda

Como usuario que justifica una recomendación, quiero conservar valores originales, fuente, fecha, confianza, exclusión y enlace al Inspector sin mostrarlos todos simultáneamente.

### HU-04 — Selección y continuidad

Como usuario, quiero cambiar proyectos o incluir el escenario Viva sin perder la conclusión, el escenario territorial ni el siguiente paso hacia Movimiento.

## Criterios de aceptación

1. `#compare` no repite el resumen global del escenario; el escenario permanece visible y editable en la estación lateral y en la cabecera del módulo.
2. El `h1`, el estado de selección y la tesis del comparador ocupan una cabecera compacta, no un hero de gran altura.
3. La conclusión aparece antes de selección, denominadores y matriz.
4. Se muestran como máximo tres hallazgos en una sola progresión vertical; el primero tiene jerarquía principal sin cambiar el orden del motor.
5. Cada hallazgo muestra finding, implicancia y siguiente acción; su limitación queda en una divulgación accesible.
6. Cada hallazgo conserva un enlace operable por teclado a la fila exacta de la matriz.
7. Se elimina el bloque separado de “Diferencias prioritarias”; no existe una segunda lista de los mismos criterios.
8. El CTA `Revisar movimiento` aparece una sola vez, dentro del cierre de la conclusión, y es la única acción primaria cuando la comparación está lista.
9. La selección actual y sus controles permanecen después del veredicto y conservan 0–3 proyectos, escenario Viva, búsqueda, Escape, foco y anuncios.
10. La base de lectura conserva los cuatro denominadores como atributos y muestra un resumen compacto; el ledger completo y la metodología quedan bajo demanda.
11. La matriz conserva nueve grupos, diez filas, encabezados de proyectos, estados y evidencia; solo Precio inicia abierto y los demás grupos abren bajo demanda o desde un hallazgo.
12. CT-G continúa territorialmente seleccionable, pero precio/área incompatibles siguen como no informados y el Inspector autorizado permanece accesible.
13. Estados insufficient, contract_unavailable y error mantienen CTA o explicación correcta, sin matriz parcial ni conclusión engañosa.
14. En 1280 × 720 se ven cabecera, hallazgo principal y CTA de continuidad sin textos fragmentados palabra por palabra.
15. En 390 × 844 y zoom 200 % existe una sola columna, objetivos táctiles ≥44 px, foco visible, contraste AA y cero overflow.
16. No se modifican datos, contrato 2.4, motores, elegibilidad, URL, fuentes, claims ni semántica de comparación.

## Write set permitido

- `.planning/phases/06-commercial-narrative-qa/P6-14C-CORRECTIVE-PLAN.md`
- `.planning/phases/06-commercial-narrative-qa/P6-14C-HANDOFF.md`
- `.planning/phases/06-commercial-narrative-qa/evidence/corrective-comparator/*`
- `.planning/phases/06-commercial-narrative-qa/evidence/functional/03-quality-type7.png`
- `.planning/phases/06-commercial-narrative-qa/evidence/functional/04-depth-comparator.png`
- `.planning/phases/06-commercial-narrative-qa/evidence/functional/05-movement-signal.png`
- `.planning/phases/06-commercial-narrative-qa/evidence/functional/06-decision-assistant.png`
- `.planning/phases/06-commercial-narrative-qa/evidence/functional/manifest.json`
- `.planning/phases/06-commercial-narrative-qa/evidence/responsive/expert-compare-*`
- `.planning/phases/06-commercial-narrative-qa/evidence/responsive/manifest.json`
- `prototipo_ejecutable/public/app.js`
- `prototipo_ejecutable/public/js/views/compare.js`
- `prototipo_ejecutable/public/styles/57-comparison.css`
- `prototipo_ejecutable/public/styles/90-responsive.css`
- `prototipo_ejecutable/tests/comparison-density.mjs`
- `prototipo_ejecutable/tests/comparison-view.mjs`
- `prototipo_ejecutable/tests/comparison-e2e.mjs`
- `prototipo_ejecutable/tests/journey-depth.mjs`
- `prototipo_ejecutable/tests/journey-e2e.mjs`
- `prototipo_ejecutable/tests/projects-compare.mjs`
- `prototipo_ejecutable/tests/browser-a11y.mjs`
- `prototipo_ejecutable/tests/benchmark-comparison-responsive.mjs`
- `prototipo_ejecutable/tests/phase6-responsive.mjs`
- `prototipo_ejecutable/package.json`

### Enmienda controlada del write set

La repetición de `journey-e2e.mjs` regenera en una misma corrida las capturas funcionales 03–06 y sus fingerprints. Se incorporan 03, 05 y 06 únicamente para mantener el manifiesto portable y coherente; P6-14C no modifica Inspector, Movimiento ni Asistente. También se incorpora `tests/projects-compare.mjs` porque contenía dos expectativas textuales del Comparador anterior. `tests/benchmark-comparison-responsive.mjs` se sincroniza con la cabecera territorial vigente, donde eyebrow y metadata son opcionales, para que la regresión alcance y valide nuevamente el Comparador.

## Archivos protegidos

- Dataset público, schema, writer, scripts de datos y fingerprints.
- `benchmark.js`, `state.js`, `controller.js`, `navigation.js` y contrato de URL.
- Vistas y estilos de Radar, Proyectos, Inspector, Benchmark, Histórico, Asistente y Checklist.
- Evidencia y plantillas preexistentes de ensayo humano.
- `app.js` solo puede omitir el resumen global en `compare`; no cambia estado, eventos ni navegación.

## Tareas atómicas

1. Crear una prueba de densidad y jerarquía que falle contra el render vigente.
2. Omitir el resumen global únicamente en Comparador.
3. Compactar la cabecera y convertir la conclusión en una línea de decisión.
4. Integrar el handoff a Movimiento dentro de la conclusión y retirar el bloque redundante.
5. Eliminar el índice de diferencias repetido.
6. Compactar denominadores mediante divulgación progresiva.
7. Abrir inicialmente solo el grupo Precio y conservar navegación directa a cualquier fila.
8. Ajustar CSS desktop, laptop, móvil, forced colors y reduced motion sin estilos globales nuevos.
9. Actualizar regresiones, ejecutar gates y capturar tres viewports más zoom 200 %.

## Verificación

Desde `prototipo_ejecutable/`:

```powershell
node tests/comparison-density.mjs
node tests/comparison-view.mjs
node tests/journey-depth.mjs
node tests/comparison-e2e.mjs
npm.cmd run test:phase6:responsive
npm.cmd run test:a11y
npm.cmd run verify
```

Además: cambiar 3→2→3 proyectos; seleccionar CT-G; incluir/quitar Viva; abrir/cerrar selección, límite, base, grupos y evidencia con teclado; usar un hallazgo para enfocar una fila; comprobar consola y cero red externa.

## Riesgos y mitigaciones

- **Un hallazgo apunta a una fila dentro de un grupo cerrado:** el controlador vigente abre el grupo y enfoca la fila; se cubre con E2E.
- **La matriz oculta demasiado:** su encabezado y nueve grupos permanecen visibles; solo cambia la apertura inicial.
- **La base compacta oculta un denominador esencial:** el resumen declara escenario, selección y pares elegibles; el ledger conserva los cuatro conteos.
- **La conclusión parece una recomendación automática:** copy conserva “derivada”, implicancia, siguiente acción y limitación; no se cambia el motor.
- **El selector se desplaza al bajar de jerarquía:** sigue inmediatamente después de la conclusión y conserva apertura modal en móvil.
- **Regresiones por CSS heredado:** los cambios se limitan a `57-comparison.css` y selectores `.comparison-*`.

## Rollback

Revertir el commit atómico de P6-14C y ejecutar `npm.cmd run verify`. El rollback debe restaurar juntos composición, estilos, pruebas y evidencia para que enlaces de hallazgo y filas no diverjan.

## Condición de cierre

P6-14C termina con criterios 1–16 demostrados, evidencia portable y gate integral verde. Luego continúa P6-14D: revisión de copy transversal y preparación de un nuevo ensayo humano independiente.
