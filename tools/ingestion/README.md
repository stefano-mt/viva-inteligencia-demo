# Ingesta controlada

Este workspace prepara fuentes y políticas; no realiza scraping al ejecutar los gates normales.

```powershell
npm run ingestion:plan
npm run ingestion:test
```

`ingestion:plan` es offline: lee el registro y la auditoría ya versionada, informa qué fuentes siguen bloqueadas y realiza cero solicitudes de red. Un collector futuro debe invocar `evaluateSource(..., "collect")` antes de cualquier descarga y fallar cerrado si falta dominio oficial, robots permitido, revisión aprobada o referencia de autorización.

Las capturas crudas, documentos originales y credenciales pertenecen a almacenamiento privado, no a este repositorio ni al API público. Consulta `docs/data/continuous-ingestion.md` y ADR-0004.

## Refresco batch de webs oficiales

`official-webs:refresh` ejecuta un collector fuera del runtime público. El modo por defecto es
`dry-run`: evalúa cada fuente con `evaluateSource(source, "collect")`, aplica filtros y genera
un staging vacío más su manifiesto, pero hace **cero solicitudes de red**.
Solo considera entradas `official_project_website`; el feed autorizado de Nexo conserva su
adaptador offline separado y un agregador público nunca se trata como web oficial.

```powershell
npm run official-webs:refresh --workspace @viva/ingestion-tools -- --dry-run
npm run official-webs:refresh --workspace @viva/ingestion-tools -- --dry-run --district Miraflores --agency "Inmobiliaria Demo"
```

Una ejecución real requiere `--execute` y solo alcanza fuentes que, individualmente, tengan:

- dominio oficial confirmado;
- `reviewStatus: "approved"`;
- `robotsStatus: "allow"`;
- `authorizationReference` auditable;
- uno o más targets explícitos en `collection.targets`.

Ejemplo de entrada futura en el registro (los valores son ilustrativos y no autorizan una fuente):

```json
{
  "sourceId": "agency-demo-official-web",
  "label": "Web oficial de Inmobiliaria Demo",
  "sourceClass": "official_project_website",
  "purpose": "Contraste de proyectos",
  "officialDomainConfirmed": true,
  "reviewStatus": "approved",
  "robotsStatus": "allow",
  "authorizationReference": "LEGAL-AAAA-NNN",
  "collection": {
    "userAgent": "VivaInteligenciaBatch/1.0",
    "allowedHosts": ["www.inmobiliaria-demo.example"],
    "timeoutMs": 10000,
    "minIntervalMs": 1500,
    "maxResponseBytes": 1000000,
    "targets": [
      {
        "url": "https://www.inmobiliaria-demo.example/proyectos/proyecto-demo",
        "district": "Miraflores",
        "agency": "Inmobiliaria Demo",
        "projectExternalId": "NEXO-000"
      }
    ]
  }
}
```

Después de la autorización registrada, la operación controlada puede limitarse por fuente,
distrito o inmobiliaria:

```powershell
npm run official-webs:refresh --workspace @viva/ingestion-tools -- --execute `
  --source agency-demo-official-web --district Miraflores `
  --concurrency 2 --timeout-ms 10000 --rate-limit-ms 1500
```

La salida predeterminada es `data/staging/official-web-refresh.json` y su manifiesto
`data/staging/official-web-refresh.json.manifest.json`. Ninguno publica datos por sí solo.
El staging agrupa `sourceObservations` por `sourceId`; no fusiona ni sobrescribe observaciones
de Nexo u otra fuente. Solo conserva campos estructurados permitidos, URL pública, fecha y
huella SHA-256; nunca almacena HTML, descripciones libres, contacto, correo o teléfono.

El manifiesto registra decisiones del policy gate, filtros, límites efectivos, solicitudes de
red, resultado por URL y checksum del staging. El job consulta `robots.txt`, aplica la regla más
específica, serializa solicitudes por host, limita concurrencia, timeout y tamaño, y no reintenta
401/403/407/429, CAPTCHA o challenges. No autentica, no rota identidad, no resuelve CAPTCHA y no
elude redirecciones a hosts no registrados.

API programática inyectable para pruebas y orquestadores:

```ts
const result = await runOfficialWebBatch(options, { fetchImpl, now, sleep });
await writeBatchArtifacts(result, outputPath, manifestPath);
```

La llamada debe permanecer en un worker operativo; nunca en el request path de `apps/api`.
