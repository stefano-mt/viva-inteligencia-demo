# ADR-0002: Snapshot antes que base de datos

- Estado: aceptado
- Fecha: 2026-09-04

## Contexto

El MVP es público, pequeño, determinista y de solo lectura. No existen usuarios, escrituras ni actualización incremental.

## Decisión

Validar el snapshot al inicio y cargar índices en memoria. Definir `DataRepository` como puerto para una implementación futura.

## Consecuencias

No hay migraciones, backups ni recuperación de estado; el rollback es el SHA anterior. El arranque consume más memoria que una consulta selectiva, pero reduce costo y operación. PostgreSQL solo se reconsidera ante persistencia, ingestión incremental o integraciones operativas.
