# ADR-0004: Ingesta controlada y read model publicado

- Estado: aceptado
- Fecha: 2026-09-04
- Sustituye parcialmente: ADR-0002 para el plano de actualización

## Contexto

La validación humana solicitó actualizar la base Nexo, enriquecer proyectos con webs oficiales, conservar diferencias entre fuentes y consultar detalle por zona. Esto introduce actualización incremental y persistencia operativa, las condiciones de revisión previstas por ADR-0002.

El sitio público de Nexo registra restricciones al uso de agentes o herramientas externas de navegación. La disponibilidad pública de una ficha tampoco equivale por sí sola a autorización de recolección automatizada. Por ello no se incorpora un scraper irrestricto ni se ejecuta recolección desde el API público.

## Decisión

Separar tres planos:

1. **Ingesta operativa:** jobs programados, allowlist por fuente, límite de frecuencia, identificación del agente, respeto de robots y términos, y fallo cerrado si falta autorización.
2. **Almacén canónico privado:** PostgreSQL para runs, fuentes, capturas, observaciones, entidades, matches, conflictos y revisiones. Las capturas originales se guardan en object storage privado e inmutable.
3. **Publicación:** una corrida validada materializa un read model/snapshot inmutable. Solo este artefacto alimenta `DataRepository` y el API público.

La fuente base de Nexo será un export, API o base entregada por Viva/CODIP bajo autorización verificable. El collector del sitio público de Nexo permanece deshabilitado hasta registrar permiso contractual escrito.

Las webs propias se habilitan una por una. Se exige dominio oficial confirmado, rutas permitidas, revisión legal/operativa aprobada y una referencia de autorización. No se eluden CAPTCHA, autenticación, bloqueos, rate limits ni medidas técnicas.

Cada valor se modela como observación; nunca se actualiza destructivamente otra fuente. La resolución produce un hecho publicado con policy y justificación, conservando las observaciones discrepantes. Precio publicado y precio de cierre usan campos y fuentes diferentes.

## Modelo mínimo del almacén

- `source_registry` y `source_authorizations`
- `ingestion_runs` y `raw_captures`
- `projects`, `typologies` y `units`
- `observations` y `field_evidence`
- `entity_matches` y `source_conflicts`
- `districts`, `zone_definitions` y `project_zone_assignments`
- `publication_runs` y `dataset_versions`

El SQL histórico no es el esquema de migración. Las migraciones se derivarán de este modelo y de `packages/contracts`.

## Geografía

RENLIM es la referencia para límites político-administrativos. Una zona o cuadrante solo se rotula como oficial si registra autoridad, norma, versión y geometría. Segmentaciones de mercado creadas por Viva se denominan “zonas comerciales internas”, tienen owner y versión, y nunca se confunden con límites oficiales.

## Consecuencias

- El frontend y el API de consulta siguen siendo deterministas y de solo lectura.
- Una falla de ingesta no degrada la versión publicada.
- El rollback selecciona el `datasetVersion` anterior, sin revertir capturas.
- Incorporar PostgreSQL, scheduler y object storage será una entrega operativa posterior con migraciones, secretos y backups propios.
- El comando `npm run ingestion:plan` valida el policy plan sin red; los collectors no forman parte de los gates ordinarios.
