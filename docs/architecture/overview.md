# Arquitectura lean

## Contexto

```mermaid
flowchart LR
  U[Equipo comercial] --> W[Web Vite + TypeScript]
  W -->|JSON /api/v1| A[API Fastify + TypeScript]
  A --> D[Dominio puro]
  A --> R[DataRepository en memoria]
  R --> S[Snapshot 2.4 validado]
  P[Publicación determinista] --> S
  O[(Almacén operacional privado)] --> P
  I[Jobs de ingesta autorizados] --> O
```

## Contenedores

```mermaid
flowchart TB
  B[Navegador] -->|:8080| N[Nginx no-root / web]
  N -->|/api y /health| F[Fastify no-root / api]
  F -->|despacho autenticado| Q[Fastify no-root / ops]
  Q --> I[ingesta autorizada]
  I --> T[(staging + manifiesto)]
  F --> C[contracts]
  F --> D[domain]
  F --> R[snapshot repository]
  R --> J[(JSON inmutable en memoria)]
```

## Fronteras

| Componente | Puede conocer | No puede conocer |
|---|---|---|
| `apps/web` | DTO públicos, navegación, presentación | snapshot completo, reglas comerciales, filesystem |
| `apps/api` | HTTP, seguridad, casos de uso | HTML y estado de interfaz |
| `apps/ops` | ejecución batch, staging, manifiestos y policy gates | navegador, publicación automática, datos sin autorización |
| `packages/contracts` | schemas, DTO, versiones | datos o frameworks de UI |
| `packages/domain` | reglas puras y deterministas | DOM, Fastify, archivos, red |
| `packages/snapshot` | validación, índices y consultas | presentación o decisiones HTTP |
| `tools/data` | insumos autorizados y materialización | runtime del usuario |
| `tools/ingestion` | registro, policy gates y jobs batch | frontend y request path del API |

`DataRepository` es el puerto de sustitución. Una futura implementación PostgreSQL no debe cambiar dominio, contratos ni endpoints.

PostgreSQL se incorpora en el plano operacional aprobado por ADR-0004, no como dependencia directa del navegador. El runtime público puede continuar leyendo un snapshot publicado o sustituir el repositorio sin cambiar DTO ni reglas de dominio.

## Flujo de arranque

1. El proceso API lee snapshot y JSON Schema.
2. Valida checksum opcional, contrato, relaciones y privacidad.
3. Construye índices en memoria.
4. `/health/ready` responde 200 únicamente después de completar los pasos anteriores.
5. La web solicita metadata y bootstrap compacto; nunca descarga el snapshot.

Consulta los ADR en `docs/adr/` para conocer las decisiones y sus consecuencias.
