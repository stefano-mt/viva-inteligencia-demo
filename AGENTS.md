# Instrucciones persistentes

## Misión y alcance

Mantener un MVP público y de solo lectura que transforme oferta inmobiliaria observada en decisiones comerciales geográficas, comparables y trazables para Viva Inmobiliaria.

Fuera de alcance sin una decisión nueva: autenticación, CRM, scraping u OCR en vivo, escritura de usuarios, LLM, geolocalización personal, panel administrativo y base de datos.

## Lectura inicial

1. `README.md` y `docs/START_HERE.md`.
2. El contrato de producto o ADR relacionado con el cambio.
3. `CONTRIBUTING.md` y el `CODEOWNERS` de la ruta.
4. Código y pruebas dirigidos por búsqueda; no cargues todo el repositorio.

`.planning` es memoria histórica, no fuente vigente. En una contradicción prevalecen la instrucción reciente del usuario, `docs/product`, los ADR aceptados, contratos ejecutables y finalmente el comportamiento actual.

## Fronteras obligatorias

- `apps/web`: presentación, navegación y estado de interacción. Solo consume `/api/v1`; no lee snapshots ni implementa reglas comerciales.
- `apps/api`: HTTP, seguridad, observabilidad y orquestación. No contiene HTML ni reglas duplicadas.
- `packages/contracts`: fuente única de DTO, schemas, versiones y OpenAPI.
- `packages/domain`: funciones puras; no importa DOM, Fastify, filesystem ni red.
- `packages/snapshot`: validación, índices y el puerto `DataRepository`.
- `tools/data`: generación determinista a partir de `data/source`.

No adoptes el SQL preliminar como modelo productivo. PostgreSQL requiere un ADR nuevo y una necesidad de persistencia o actualización incremental.

## Reglas de datos y narrativa

- Conserva valor original, normalizado, fuente, fecha, unidad y calidad.
- Un dato dudoso puede verse como evidencia, pero no alimentar una métrica certificada.
- No llames “área techada” a un área declarada únicamente como total.
- No atribuyas causas a señales si la fuente no las observa.
- No expongas el snapshot completo, payloads fuente, PII ni evidencias restringidas.
- Toda respuesta API incluye `datasetVersion` y `contractVersion`.

## Interfaz

- Prioriza lectura vertical, filas, detalle bajo demanda y un CTA primario inequívoco.
- Conserva las seis etapas, ocho herramientas, escenario, URLs hash y `Ctrl/Cmd+K`.
- Diseña carga, vacío, error, timeout e incompatibilidad de contrato.
- Teclado, nombre accesible, foco, contraste y zoom 200% son requisitos funcionales.
- Usa los tokens Viva existentes; no rediseñes la marca durante una refactorización técnica.

## Flujo de cambio

Trabaja en rama o worktree desde `main`. Para cambios no triviales registra objetivo, alcance, contratos, archivos, criterios y rollback. Mantén commits atómicos. No mezcles cambios de arquitectura y rediseño visual.

Antes de entregar:

```powershell
npm ci
npm run verify
docker compose config --quiet
```

La CI debe bloquear contratos, tipado, dominio, integración, E2E, privacidad o imágenes rotas. Los artefactos generados, logs, capturas y resultados Playwright no se versionan. La evidencia histórica está en `demo-static-v1`; no reescribas el historial Git.

## Condiciones de parada

Detén y escala si falta autoridad para una fuente o claim, se necesita una credencial, hay cambios ajenos solapados, una solución exige inventar datos o debilitar el gate, o una decisión altera el alcance/contrato aceptado.
