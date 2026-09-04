# Pruebas de integración

Las pruebas de integración están ubicadas junto al componente responsable:

- `apps/api/src/*.test.ts`: rutas HTTP, errores, metadata y health checks.
- `packages/snapshot/src/*.test.ts`: carga, checksum, contrato, índices y corrupción del snapshot.
- `apps/web/src/*.test.ts`: cliente HTTP, timeout y fallos controlados.
- `tests/e2e`: integración completa navegador–API.

Esta colocación reduce saltos de contexto en el MVP. Este directorio es el punto de entrada y recibirá únicamente pruebas que atraviesen más de un workspace sin requerir navegador.

```powershell
npm test
npm run e2e
```
