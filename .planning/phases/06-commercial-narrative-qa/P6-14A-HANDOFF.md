# P6-14A — Handoff de simplificación correctiva

**Fecha:** 2026-08-08

**Estado:** completado y verificado

**Rama:** `feat/phase-6-commercial-narrative-qa`

**Baseline:** `0167224`

## Resultado

La configuración territorial quedó consolidada en una única estación dentro de la barra lateral. La cabecera ahora identifica el módulo y el escenario activo sin repetir controles ni estados técnicos. El resumen global prioriza tres cifras comerciales y conserva cobertura, elegibilidad, corte y URL canónica dentro de un detalle técnico bajo demanda.

No se modificaron el dataset público, el contrato 2.4, los motores, los cálculos, las fuentes ni los claims de evidencia.

## Cambios entregados

- Estación territorial única con distrito, alcance, control dependiente, `Ver comparables` y reinicio.
- Cabecera silenciosa sin el eyebrow global repetido ni acciones duplicadas.
- Resumen comercial de tres métricas con divulgación progresiva del detalle técnico.
- Drawer móvil operable por teclado y controles de al menos 44 × 44 px.
- Adaptación del recorrido para reutilizar el mismo escenario sin una segunda barra de acciones.
- Pruebas actualizadas para las ocho rutas expertas y las seis etapas del recorrido.

## Evidencia

- Comparativa visual: `evidence/corrective-shell/`
- Matriz responsive regenerada: `evidence/responsive/`
- Viewports: 1440 × 900, 1280 × 720, 390 × 844 y reflow equivalente a 200 %.

## Verificación final

Ejecutado desde `prototipo_ejecutable/`:

```powershell
npm.cmd run verify
```

Resultado: PASS. Incluye sintaxis, arquitectura, recorrido, contratos 2.0–2.4, datos, privacidad, determinismo, inspector, benchmark, E2E, humo y accesibilidad. La validación responsive confirmó 14 superficies × 3 viewports, zoom 200 %, teclado, foco, objetivos 44 × 44, contraste AA, reduced motion y ausencia de overflow o truncamiento.

## Archivos deliberadamente preservados

Los documentos y plantillas de ensayo humano que ya estaban sin seguimiento no forman parte de P6-14A y permanecen intactos:

- `COMMERCIAL_REHEARSAL.md`
- `evidence/rehearsal/README.md`
- `evidence/rehearsal/reader-response.template.md`
- `evidence/rehearsal/rubric.template.md`
- `evidence/rehearsal/session-metadata.template.json`

## Pendientes y siguiente paso

P6-14A no cierra la validación humana P6-14. El siguiente bloque es P6-14B: diferenciar Radar y Proyectos, priorizar el mapa y reducir la repetición de resúmenes dentro de esas vistas. La densidad del Comparador y la revisión de copy transversal continúan en P6-14C/D. El ensayo con un lector independiente nuevo se repite después de completar P6-14A–D.

## Rollback

Revertir el commit atómico que contiene este handoff y repetir `npm.cmd run verify`. El rollback debe restaurar juntos el render del escenario, el shell, los estilos y las pruebas para evitar controles duplicados o desconectados.
