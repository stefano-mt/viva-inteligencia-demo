# Herramientas de datos

Punto de entrada canónico para materializar el snapshot público 2.4.

```bash
npm run data:build
```

El resultado se escribe en `data/generated/`, se valida contra el contrato compartido y no se versiona ni se publica con el frontend. Los materializadores históricos permanecen temporalmente en `apps/web/scripts` mientras concluye la migración de las regresiones `.mjs`.
