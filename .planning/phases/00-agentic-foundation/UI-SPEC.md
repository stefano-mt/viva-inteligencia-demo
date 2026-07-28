# Fase 0B — Especificación de modularización con paridad

## Objetivo

Reducir el acoplamiento técnico del prototipo sin cambiar su contenido, jerarquía, estilos, navegación, datos ni comportamiento observable. Esta fase crea fronteras seguras para que las siguientes historias de usuario puedan desarrollarse en paralelo.

## Contrato de no cambio

- Se conservan las siete rutas canónicas: `dashboard`, `projects`, `market`, `compare`, `trust`, `assistant` y `activity`.
- Se conservan las rutas heredadas: `sources → market`, `matching → compare`, `quality → trust` y `pipeline → activity`.
- El dataset sigue cargándose desde `demo-data/viva-platform-demo.json`.
- Los textos, plantillas HTML, selectores, atributos `data-*`, IDs y clases no se renombran.
- La referencia mutable de `state` es única y compartida.
- `bindEvents` vuelve a enlazar controles después de cada reemplazo de `root.innerHTML`.
- Los listeners globales de `window` se registran una sola vez durante `init`.
- El orden de la cascada CSS original se conserva byte a byte dentro de los archivos extraídos.

## Fronteras JavaScript

| Módulo | Responsabilidad | Puede depender de |
|---|---|---|
| `js/state.js` | Estado mutable único | Ninguno |
| `js/config.js` | Rutas, compatibilidad, preguntas y guías | Ninguno |
| `js/domain.js` | Consultas, benchmark, recomendaciones, componentes HTML, gráficos y formatos | `state`, `config` |
| `js/views/{dashboard,projects,market,compare,checklist,assistant,activity}.js` | Un propietario por sección y un `index.js` de composición | `state`, `config`, `domain` |
| `js/navigation.js` | Vista activa, iconos y resolución de hash | `state`, `config` |
| `js/controller.js` | Eventos DOM, cambios de escenario y restauración de foco | `state`, `config`, `domain`, `navigation`; recibe `render` por inyección |
| `app.js` | Carga de datos, shell, topbar y composición | Todos los módulos anteriores |

La inyección `bindEvents(render)` evita el ciclo `controller → app → controller`. Ningún módulo importa `app.js`.

## Fronteras CSS

`styles.css` queda como manifiesto y carga, en el orden original:

1. `styles/00-tokens.css`
2. `styles/10-base.css`
3. `styles/20-shell.css`
4. `styles/30-components.css`
5. `styles/40-visualizations.css`
6. `styles/50-views.css`
7. `styles/60-states.css`
8. `styles/90-responsive.css`

No se introducen `@layer`, cambios de especificidad, renombres ni reordenamientos. Cada regla mantiene su posición relativa original.

## Verificación exigida

- Sintaxis de todos los módulos con `node --check`.
- Contrato de datos: mínimo 700 registros, 30 inmobiliarias, 10 distritos, IDs únicos y campos base válidos.
- Smoke browser en siete rutas y viewports `1440×900`, `1280×720` y `390×844`.
- Cero `console.error`, `pageerror`, fallas de red o respuestas HTTP `>= 400`.
- Navegación activa, cambio de distrito, búsqueda de proyectos y rutas heredadas.
- Landmarks, controles con nombre accesible, skip link y teclado en desktop/móvil.
- Comparación SHA-256 de 21 capturas antes/después; cualquier diferencia obliga a revisión visual.
- `git diff --check` limpio y revisión independiente sin escritura sobre código productivo.

## Definition of Done

La fase termina únicamente cuando el arnés reproducible pasa, la estructura modular no contiene ciclos hacia `app.js`, la cascada mantiene el orden original, la evidencia antes/después está registrada y un verificador independiente emite veredicto.
