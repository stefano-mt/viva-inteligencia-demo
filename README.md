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
docker compose up --build
```

La web queda disponible en `http://localhost:8080` y enruta `/api` hacia el servicio backend.

La aplicación pública es de solo lectura. No contiene autenticación, escritura de usuarios, scraping en tiempo de consulta, CRM ni LLM. `apps/ops` prepara actualizaciones como lotes separados, autorizados y auditables; el API continúa publicando la última versión validada. La recolección de red está desactivada por defecto y ninguna corrida publica datos automáticamente.

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
```

Los planes de ingesta son offline y no descargan páginas. Informan qué fuentes podrían pasar a una recolección controlada y cuáles permanecen bloqueadas por autorización o revisión. La configuración operativa completa está en [data-dashboard-and-refresh.md](docs/operations/data-dashboard-and-refresh.md).

El baseline estático anterior a la productización está preservado por la etiqueta `demo-static-v1`.
Las capturas históricas retiradas del árbol activo se recuperan desde esa etiqueta; no se reescribió el historial Git.
