# Fase 0 — Contexto

## Objetivo

Preparar el repositorio para trabajo agéntico verificable y extraer fronteras que permitan paralelismo seguro sin alterar el comportamiento visible.

## Decisiones

- La planificación se versiona en `.planning/`.
- `AGENTS.md` contiene reglas duraderas, no estado diario.
- GSD es compatible pero opcional.
- Graphify se ejecuta localmente y sin backend LLM.
- Un único agente edita `app.js`/`styles.css` hasta completar la modularización.
- Smoke tests y baseline visual preceden la extracción de módulos.
- Fase 0B no introduce funcionalidades ni rediseño.

## No-objetivos

- No implementar historias funcionales del backlog.
- No cambiar dataset, rutas, contenido o diseño.
- No instalar herramientas globales.
- No abrir PR ni hacer merge sin autorización.

## Gate

- Artefactos revisados.
- Plan 0B con archivos, orden y pruebas.
- Rama nueva desde `origin/main`.
- Baseline visual reproducible.
