# P6-14B — Handoff: Radar mapa primero e inventario comparable

**Fecha de cierre:** 2026-08-09

**Estado:** completado y verificado

**Rama:** `feat/phase-6-commercial-narrative-qa`

**Baseline:** `685ff86`

**Siguiente paso:** P6-14C — densidad del Comparador y jerarquía de decisión

## Resultado

P6-14B diferencia las dos superficies que el ensayo humano percibió como repetitivas:

- **Radar comercial** abre con un único lienzo territorial prioritario. El switch mapa/posicionamiento sustituye el contenido del mismo espacio y mantiene su estado canónico.
- **Proyectos comparables** abre con una orientación breve y un inventario por filas, sin la cuadrícula KPI redundante ni explicaciones repetidas por registro.
- Producto y diagnóstico quedan después del mapa; score y proyectos prioritarios permanecen disponibles bajo profundización progresiva.
- El resumen global del escenario se omite únicamente en Radar y Proyectos; el escenario continúa visible y editable en la estación lateral.
- Estado, URL, comparabilidad, elegibilidad, fuentes, datasets y motores permanecen sin cambios.

## Criterios demostrados

Los 13 criterios del plan quedaron cubiertos: una visualización activa, mapa primero, inventario compacto, detalle bajo demanda, filtros/selección/comparación intactos, responsive, teclado, contraste AA, zoom 200 % y ausencia de cambios semánticos o de datos.

## Evidencia portable

Directorio: `evidence/corrective-radar-projects/`

- `radar-1440x900.png`
- `radar-1280x720.png`
- `radar-390x844.png`
- `projects-1440x900.png`
- `projects-1280x720.png`
- `projects-390x844.png`
- `README.md`

La matriz responsive y la evidencia funcional canónica también fueron regeneradas por sus suites correspondientes.

## Verificación final

`npm.cmd run verify` terminó con código `0` y cubrió:

- sintaxis, ownership CSS y grafo de arquitectura;
- recorrido completo y las ocho rutas expertas;
- contratos públicos 2.0–2.4, determinismo y privacidad;
- escenarios, comparabilidad, geografía, Inspector, Benchmark, Comparador, Histórico y Asistente;
- E2E funcionales, smoke de ocho rutas por tres viewports y accesibilidad;
- Fase 6 en 14 superficies × 3 viewports, zoom 200 %, teclado, foco, objetivos 44 × 44, contraste AA, reduced motion y cero overflow o truncamiento.

Durante la verificación se observaron dos incidencias de infraestructura/compatibilidad de pruebas, no defectos del runtime:

1. Un primer timeout transitorio al abrir `#main-content` en la suite responsive de Fase 5. La prueba aislada y dos recorridos posteriores pasaron completos.
2. `journey-e2e.mjs` aún exigía el resumen global legacy dentro de Radar. La aserción se migró al contrato P6-14B: ausencia de duplicado y conservación del escenario en `#scenario-sidebar-title`.

## Archivos protegidos

No se modificaron dataset público, schema, writer, scripts de datos, motores, contrato de URL ni vistas ajenas al alcance. Las plantillas de ensayo humano preexistentes permanecen sin seguimiento y fuera del commit.

## Rollback

Revertir el commit atómico de P6-14B y ejecutar `npm.cmd run verify`. El rollback debe retirar juntos composición, estilos, pruebas y evidencia para conservar coherencia entre producto y contrato verificado.
