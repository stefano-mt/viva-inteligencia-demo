# Handoff — Fase 0B

## Estado entregado

- Rama: `chore/phase-0b-parity-harness`.
- Fase 0A/0B: completa y verificada.
- Código productivo: paridad funcional y visual material.
- Veredicto independiente: `PASS`.

## Comandos de continuidad

```powershell
cd prototipo_ejecutable
npm.cmd install
npx playwright install chromium
npm.cmd run verify
```

Si Chrome ya está instalado, el helper de pruebas puede usarlo como fallback.

## Propiedad de archivos para nuevas olas

- Escenario/shell: `public/app.js`.
- Estado: `public/js/state.js`.
- Configuración y rutas: `public/js/config.js`.
- Eventos: `public/js/controller.js`.
- Navegación: `public/js/navigation.js`.
- Lógica compartida actual: `public/js/domain.js`.
- Sección concreta: `public/js/views/<seccion>.js`.
- Tokens/base/layout/componentes/visualizaciones/vistas/estados/responsive: archivo correspondiente en `public/styles/`.

Dos agentes no deben compartir un mismo archivo en la misma ola. `domain.js` y `50-views.css` siguen siendo recursos compartidos y requieren propietario único o una fase adicional de extracción.

## Próximo trabajo permitido

Preparar el `CONTEXT.md`, contrato de datos y `PLAN.md` de Fase 1. No iniciar aún mapa geográfico, OCR, inspector o ampliación de claims sin fixtures y reglas de trazabilidad aprobadas.
