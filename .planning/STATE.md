# Estado del proyecto

**Actualizado:** 2026-07-28

**Milestone:** demo vNext orientada a venta

**Fase activa:** Fase 1 — datos, contratos y cobertura

**Estado:** Fase 0A/0B completa con veredicto independiente `PASS`; Fase 1 pendiente de contexto y plan

## Baseline confirmado

- Rama de fase: `chore/phase-0b-parity-harness`, creada desde `origin/main` después del merge del PR #4.
- `npm.cmd run verify`: aprobado el 2026-07-28.
- Dataset público actual: 714 proyectos.
- GitHub Pages despliega `prototipo_ejecutable/public` desde `main`.
- Cobertura actual del snapshot: 192 inmobiliarias y 45 distritos.
- `app.js`: 262 líneas; estado, configuración, controlador, navegación, dominio y siete vistas están modularizados.
- `styles.css`: manifiesto de ocho archivos con cascada exacta.
- Existen contratos automatizados de arquitectura, datos, navegación, consola, accesibilidad y evidencia visual.

## Resultado de Graphify

Baseline local `--code-only --no-cluster`:

- 8 archivos de código clasificados.
- 172 nodos.
- 634 relaciones.
- Nodos de alta conectividad: `escapeHtml`, `renderDashboard`, `render`, `renderProjectDetail`, `renderMarket`, `renderCompare` y `buildBenchmark`.

Post-0B incremental:

- 12 archivos de código cambiaron y 6 quedaron sin cambios.
- 207 nodos.
- 726 relaciones.
- La consulta ubica explícitamente `state.js`, `navigation.js`, `controller.js`, `views/index.js` y las vistas por sección.

Conclusión: `app.js` dejó de ser el contenedor de toda la interfaz. `domain.js` y `50-views.css` siguen siendo hubs compartidos y no deben tener varios escritores simultáneos.

## Decisiones vigentes

- Usar una estructura compatible con GSD sin obligar a instalar GSD globalmente.
- Mantener `AGENTS.md` pequeño y duradero; el estado cambiante vive en `.planning/`.
- Separar quien implementa de quien verifica.
- Usar Graphify como mapa de orientación/impacto, no como prueba de aceptación.
- No enviar código ni documentos de Viva a un backend LLM para construir el grafo.
- Mantener el arnés Playwright y el verificador independiente como gate de cada fase.
- No iniciar mapas o inspector hasta congelar contratos de datos, evidencia y escenario.

## Restricciones y pendientes

- El documento “Flujo Agéntico de Desarrollo con GSD” no fue localizado entre los archivos accesibles con ese nombre. Se incorporaron los tres principios descritos por el usuario: fuente de verdad/preparación, ciclo por fase/DoD y contexto Markdown/roles/handoff.
- No se proporcionó la URL exacta del video Graphify + Claude Code. La evaluación usa el repositorio y documentación primaria de Graphify.
- Los criterios detallados de cada historia deben copiarse al `PLAN.md` de la fase antes de ejecutar.
- Una máquina nueva debe ejecutar `npm.cmd install` e instalar Chromium de Playwright o disponer de Chrome.

## Próxima acción recomendada

1. Revisar el resumen y verificación de Fase 0.
2. Preparar `CONTEXT.md` y `PLAN.md` de Fase 1.
3. Congelar esquema, fixtures CT-A/CT-B/CT-G/CT-H y reglas de exclusión.
4. Ejecutar Fase 1 por write sets disjuntos.
5. Abrir el PR de Fase 0B antes de mezclar features funcionales.

## Regla para actualizar este archivo

Registrar solo estado vigente, decisiones, bloqueos y siguiente acción. Mover historial detallado a resúmenes de fase y evidencia.
