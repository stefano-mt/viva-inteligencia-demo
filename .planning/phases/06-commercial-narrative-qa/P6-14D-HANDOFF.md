# P6-14D — Handoff: copy comercial transversal y nuevo ensayo independiente

**Fecha de cierre:** 2026-08-10

**Estado técnico:** completado y verificado

**Estado del ensayo humano:** `PENDING`

**Rama:** `feat/phase-6-commercial-narrative-qa`

**Baseline:** `605de1f`

**Siguiente paso:** ejecutar P6-15 como verificación técnica independiente. Por D-042, P6-14 permanece `PENDING/DEFERRED` y su sesión se ejecutará en P6-20 sobre la versión pública desplegada.

## Resultado

P6-14D revisa transversalmente el lenguaje de las ocho rutas expertas y las seis etapas del recorrido. La interfaz conserva sus datos, cálculos, fuentes, fechas, estados y límites, pero reduce el vocabulario interno que obligaba al usuario comercial a interpretar la arquitectura de la demo.

Los cambios principales son:

- navegación con descripciones breves orientadas a la tarea;
- guías progresivas bajo el rótulo `Cómo usarla`;
- uso consistente de zona, muestra, base de comparación, fuente, límite y siguiente acción;
- estados vacíos o incompatibles explicados como versiones de datos o información faltante;
- Inspector expresado como comparación campo por campo y uso en la comparación;
- Benchmark y Comparador sin `dataset`, `snapshot`, `fallback`, `ledger`, `motor` ni `denominadores` visibles por defecto;
- Asistente presentado como respuesta verificable basada en datos visibles, sin exponer su taxonomía interna;
- Señales presentadas como cambios publicados con fuente, fecha y agenda sugerida.

No se cambiaron valores, conteos, elegibilidad, engines, estado, controlador, contrato de URL, dataset público, schema, writer ni fingerprints públicos.

## Paquete de ensayo independiente

`COMMERCIAL_REHEARSAL.md` y las plantillas de `evidence/rehearsal/` quedaron preparadas para una sesión nueva:

- el SHA completo y corto se obtienen de la copia que realmente se probará;
- cada sesión usa `run-AAAA-MM-DD-alias/` y nunca sobrescribe evidencia anterior;
- se conserva el prompt literal y el límite de 10 minutos;
- se evalúan cinco afirmaciones esperadas, seis afirmaciones prohibidas y cero ayuda del maker;
- se registran repositorio, SHA, árbol limpio, servidor, URL, navegador, independencia, consentimiento, tiempos, ayudas y resultado;
- la persona creadora no completa la rúbrica por el lector.

Las plantillas continúan vacías y el resultado se mantiene en `PENDING`. Este cierre técnico no reemplaza el ensayo humano.

## Regresiones incorporadas

- `tests/copy-language.mjs`: recorre ocho rutas expertas y seis etapas en navegador; bloquea vocabulario interno visible por defecto y exige anclas comerciales.
- `tests/rehearsal-packet.mjs`: bloquea hashes obsoletos, resultados anticipados, carpetas destructivas o metadatos incompletos.
- `test:phase6:language`: agrupa ambas validaciones y forma parte de la integración de Fase 6.
- Las expectativas textuales existentes se sincronizaron solo cuando describían el copy visible modificado.

## Ajuste visual demostrado

La primera corrida responsive detectó que el botón de ayuda del Comparador terminaba 11 px fuera del ancho útil a `390 × 844`. Se aplicó una corrección específica en móvil que desplaza el control y su popover dentro de la superficie sin reducir el objetivo táctil de 44 × 44 px ni afectar otras vistas.

La repetición verificó 14 superficies × 3 viewports, zoom 200 %, teclado, foco, contraste AA, movimiento reducido y cero overflow o truncamiento.

## Evidencia portable

Evidencia funcional actualizada:

- `evidence/functional/01-scale.png`
- `evidence/functional/02-geography-map.png`
- `evidence/functional/03-quality-type7.png`
- `evidence/functional/04-depth-comparator.png`
- `evidence/functional/05-movement-signal.png`
- `evidence/functional/06-decision-assistant.png`
- `evidence/functional/07-decision-checklist.png`
- `evidence/functional/08-decision-return.png`
- `evidence/functional/manifest.json`

La matriz responsive y su manifiesto se regeneraron para las 14 superficies en 1440 × 900, 1280 × 720 y 390 × 844, además de las comprobaciones de zoom y teclado que ejecuta la suite.

La inspección visual final cubrió Escala, Calidad/Tipo 7, Comparador, Decisión y Comparador móvil. Se confirmó una jerarquía clara, copy legible, acciones continuas y ausencia de recortes.

## Verificación final

Terminaron con código `0`:

- `npm.cmd run test:phase6:language`
- `npm.cmd run test:phase6:responsive`
- `npm.cmd run test:a11y`
- `npm.cmd run verify`

El gate integral volvió a comprobar sintaxis, ownership CSS, arquitectura, recorrido, contratos 2.0–2.4, determinismo, privacidad, datos, geografía, escenarios, Inspector, Benchmark, Comparador, Historial, Asistente, E2E, smoke de ocho rutas × tres viewports y accesibilidad de 14 superficies × tres viewports.

## Riesgo residual y condición de continuidad

El único gate pendiente es humano: una persona nueva debe completar el recorrido sin ayuda del maker y dejar evidencia no destructiva. D-042 difiere este gate a P6-20. Hasta entonces:

- P6-14 no puede declararse `PASS` humano;
- P6-15 puede cerrarse como verificación técnica, con un máximo de `PASS WITH RISKS` por `R6-H1`;
- la fase no puede declararse `ready for client` ni `deployed and verified`;
- no debe presentarse una plantilla vacía como evidencia de ensayo.

## Rollback

Revertir el commit atómico de P6-14D y ejecutar `npm.cmd run verify`. Copy, regresiones, evidencia automática y paquete de ensayo deben retirarse juntos para conservar coherencia entre interfaz y rúbrica.
