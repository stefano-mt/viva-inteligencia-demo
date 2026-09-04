# ADR-0003: Vite y DOM sin framework de componentes

- Estado: aceptado
- Fecha: 2026-09-04

## Decisión

Introducir Vite y TypeScript estricto, conservando la composición DOM existente. No añadir React, Vue ni otro framework durante la productización.

## Consecuencias

Se obtienen build, assets versionados, variables y proxy con menor riesgo de regresión. `apps/web/src/main.ts` continúa siendo grande y deberá dividirse por vistas si el producto supera el MVP; esa refactorización no se combina con el cambio de arquitectura.
