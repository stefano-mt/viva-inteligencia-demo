# ADR-0001: Monorepo con backend-for-frontend sobre snapshot

- Estado: aceptado
- Fecha: 2026-09-04

## Decisión

Usar npm workspaces, una web Vite/TypeScript y una API Fastify/TypeScript. La API actúa como backend-for-frontend y consulta un repositorio en memoria construido desde un snapshot validado.

## Consecuencias

La web deja de descargar 7,4 MB y de ejecutar reglas comerciales. Contratos y dominio se comparten sin publicación intermedia. La solución requiere dos procesos, pero Compose y el proxy de mismo origen mantienen una operación pequeña.
