# Snapshot, calidad y privacidad

## Construcción

`npm run data:build` procesa exclusivamente `data/source`, ejecuta las policies vigentes y escribe artefactos ignorados en `data/generated`.

Entradas iguales deben producir bytes y SHA-256 iguales. El snapshot no se versiona, no se copia a `apps/web` y se genera antes de pruebas, imágenes o despliegue.

## Controles de arranque

- JSON Schema 2.4 y propiedades adicionales cerradas.
- Relaciones de proyectos, fuentes, observaciones, hechos y evidencia.
- Semántica de áreas, precios y pairing.
- Lista autorizada de activos públicos y ausencia de PII prohibida.
- Checksum esperado opcional mediante `SNAPSHOT_SHA256`.

Un error mantiene el proceso vivo para diagnóstico, pero `/health/ready` devuelve 503 y todos los casos de uso fallan cerrados.

## Calidad

Se conserva valor original, normalizado, unidad, fuente, captura y estado. Los conflictos no se resuelven escogiendo automáticamente el número más conveniente. Un registro excluido puede seguir visible como evidencia, pero no alimentar una métrica certificada.

## Evolución

La actualización incremental y el contraste multifuente ya son una necesidad aprobada. ADR-0004 separa un futuro almacén operacional PostgreSQL de este read model: los jobs escriben observaciones privadas y la publicación materializa un snapshot inmutable validado. El navegador y los endpoints de consulta no acceden a capturas crudas.
