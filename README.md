# Viva Inteligencia Comercial

MVP de inteligencia comercial para explorar cobertura territorial, proyectos comparables, evidencia, benchmark, señales históricas y decisiones trazables para Viva Inmobiliaria.

## Empezar

Requisitos: Node.js 24, npm 11 y, para el stack empaquetado, Docker con Compose.

```powershell
npm ci
npm run data:build
npm run dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- OpenAPI: `http://localhost:3000/docs`

Para levantar la solución empaquetada bajo un único origen:

```powershell
docker compose up --build
```

La web queda disponible en `http://localhost:8080` y enruta `/api` hacia el servicio backend.

La aplicación pública es de solo lectura. No contiene autenticación, escritura de usuarios, scraping vivo, CRM, LLM ni persistencia.

## Mapa del repositorio

| Necesidad | Ubicación |
|---|---|
| Interfaz y navegación | `apps/web` |
| API pública | `apps/api` |
| Contratos compartidos | `packages/contracts` |
| Reglas comerciales puras | `packages/domain` |
| Acceso al snapshot | `packages/snapshot` |
| Generación y validación de datos | `tools/data` y `data/source` |
| Pruebas integrales | `tests` |
| Explicación para negocio y tecnología | `docs` |
| Contenedores y despliegue | `infra/docker`, `compose*.yml` |

Lee [START_HERE.md](docs/START_HERE.md) para elegir el recorrido documental adecuado.
La promoción de versiones se controla con el [checklist de release](docs/operations/release-checklist.md).

## Comandos canónicos

```powershell
npm run check
npm test
npm run e2e
npm run build
npm run verify
```

El baseline estático anterior a la productización está preservado por la etiqueta `demo-static-v1`.
Las capturas históricas retiradas del árbol activo se recuperan desde esa etiqueta; no se reescribió el historial Git.
