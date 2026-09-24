# Viva Inteligencia Comercial

MVP de inteligencia comercial para explorar cobertura territorial, proyectos comparables, fuentes, rangos de mercado, señales históricas y decisiones trazables para Viva Inmobiliaria.

## Empezar

Requisitos: Node.js 24, npm 11 y, para el stack empaquetado, Docker con Compose.

```powershell
npm ci
npm run data:build
npm run dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- Operaciones internas: `http://localhost:3100`
- OpenAPI: `http://localhost:3000/docs`

Para levantar la solución empaquetada bajo un único origen:

```powershell
npm run auth:generate
# Crear .env local con VIVA_BASIC_AUTH_FILE=./infra/docker/.htpasswd.local
docker compose up --build
```

La web queda disponible en `http://localhost:8080` con usuario y contraseña HTTP Basic y enruta `/api` hacia el servicio backend. Sin archivo de credenciales, Compose usa una lista vacía y deniega el acceso. La contraseña no se versiona. El comando `npm run dev` es solo para desarrollo local y no incorpora la barrera de acceso; no debe publicarse. Consulta [acceso a la demo](docs/operations/demo-access.md) antes de compartirla.

La aplicación es de solo lectura y el contenedor web incorpora una barrera de acceso básica para la demo; no es un sistema de cuentas ni roles. No contiene escritura de usuarios, scraping en tiempo de consulta, CRM ni LLM. `apps/ops` prepara actualizaciones como lotes separados, autorizados y auditables; el API continúa publicando la última versión validada. La recolección de red está desactivada por defecto y ninguna corrida publica datos automáticamente.

## Mapa del repositorio

| Necesidad | Ubicación |
|---|---|
| Interfaz y navegación | `apps/web` |
| API pública | `apps/api` |
| Actualización privada y estado de corridas | `apps/ops` |
| Contratos compartidos | `packages/contracts` |
| Reglas comerciales puras | `packages/domain` |
| Acceso al snapshot | `packages/snapshot` |
| Generación y validación de datos | `tools/data` y `data/source` |
| Política de fuentes e ingesta | `tools/ingestion` y `docs/data/continuous-ingestion.md` |
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
npm run ingestion:plan
npm run ingestion:official-webs -- --dry-run
npm run ingestion:official-webs:reconcile -- `
  --web data/staging/official-web-refresh.json `
  --manifest data/staging/official-web-refresh.json.manifest.json
```

Los planes de ingesta son offline y no descargan páginas. Informan qué fuentes podrían pasar a una recolección controlada y cuáles permanecen bloqueadas por autorización o revisión. La configuración operativa completa está en [data-dashboard-and-refresh.md](docs/operations/data-dashboard-and-refresh.md) y el primer análisis de fuentes está en [wave-1-source-pilot.md](docs/data/wave-1-source-pilot.md).

El baseline estático anterior a la productización está preservado por la etiqueta `demo-static-v1`.
Las capturas históricas retiradas del árbol activo se recuperan desde esa etiqueta; no se reescribió el historial Git.
