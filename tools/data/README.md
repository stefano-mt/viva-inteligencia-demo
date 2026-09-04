# Herramientas de datos

Punto de entrada canónico para materializar el snapshot público 2.4.

```bash
npm run data:build
```

El resultado se escribe en `data/generated/`, se valida contra el contrato compartido y no se versiona ni se publica con el frontend. Los materializadores y validadores viven en `tools/data/src`; las regresiones históricas los consumen desde esa ubicación canónica.
