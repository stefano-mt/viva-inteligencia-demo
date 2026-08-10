# Evidencia visual P6-14B

**Fecha:** 2026-08-08

**Rama:** `feat/phase-6-commercial-narrative-qa`

## Superficies

- `radar-*`: Radar comercial con una única visualización geográfica activa y el mapa antes del producto, diagnóstico y score secundario.
- `projects-*`: Proyectos comparables con orientación compacta, un CTA primario, filtros locales y filas sin explicación repetida.

## Viewports

- 1440 × 900
- 1280 × 720
- 390 × 844

## Controles realizados

- Una sola visualización completa en el DOM de Radar.
- Switch mapa/posicionamiento operable y persistente en URL.
- Resumen territorial global omitido en Radar y Proyectos para evitar duplicación.
- Mapa antes del planificador de producto.
- Inventario antes del detalle y sin ledger adicional de KPIs.
- Sin errores de consola, errores de página o solicitudes externas.
- Sin overflow horizontal en los tres viewports.

La matriz ampliada de zoom 200 %, teclado, foco, contraste AA, objetivos 44 × 44 y reduced motion permanece en `../responsive/`.
