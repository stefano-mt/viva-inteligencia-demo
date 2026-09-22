# Ingesta controlada

Este workspace prepara fuentes y políticas; no realiza scraping al ejecutar los gates normales.

```powershell
npm run ingestion:plan
npm run ingestion:test
```

`ingestion:plan` es offline: lee el registro y la auditoría ya versionada, informa qué fuentes siguen bloqueadas y realiza cero solicitudes de red. Un collector futuro debe invocar `evaluateSource(..., "collect")` antes de cualquier descarga y fallar cerrado si falta dominio oficial, robots permitido, revisión aprobada o referencia de autorización.

Las capturas crudas, documentos originales y credenciales pertenecen a almacenamiento privado, no a este repositorio ni al API público. Consulta `docs/data/continuous-ingestion.md`, `docs/data/wave-1-source-pilot.md` y ADR-0004.

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

### Piloto técnico no publicable

La demo puede ejecutar una captura puntual sin convertirla en ingesta productiva. La fuente debe
registrar `pilotAuthorization` con rol `product_owner`, propósito `technical_feasibility` y una
lista cerrada de rutas que también estén en `accessReview.reviewedPaths`. Además se requiere una
sola fuente y una sola URL candidata en el comando:

```powershell
npm run official-webs:refresh --workspace @viva/ingestion-tools -- --execute --pilot `
  --source agency-demo-official-web `
  --target https://www.inmobiliaria-demo.example/proyectos/proyecto-demo `
  --product-owner-authorization PO-DEMO-PILOT-001
```

La confirmación debe coincidir exactamente con la referencia registrada. El collector vuelve a
consultar `robots.txt`, rechaza una redirección hacia una ruta no revisada y escribe únicamente en
`data/staging/pilots`. El resultado usa `mode: "technical-pilot"`, contrato
`pilot-1.0.0` y `publishable: false`; el conciliador de publicación lo rechaza por diseño.
Este permiso no cambia `reviewStatus`, no llena `collection.targets` y no habilita el comando
productivo, que conserva la aprobación Legal/Operaciones y `authorizationReference`.

El contrato aislado de VERSIA y MONTEROSSO autoriza como máximo dos pasadas por target y en este
orden: `calibration` y `validation`. La segunda sirve únicamente para comprobar que el extractor
calibrado reproduce el resultado; una tercera pasada queda fuera de alcance. La autorización del
Product Owner registrada desde esta conversación cubre solo esta prueba técnica no publicable:
no autoriza recolección productiva, publicación ni reutilización. El proceso operativo debe
conservar un `runId` distinto por pasada y detenerse después de `validation`.

Si la fuente contiene `accessReview`, cada target ejecutable debe coincidir exactamente con una
ruta de `accessReview.reviewedPaths`; una ruta nueva falla antes de cualquier solicitud.

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
        "projectExternalId": "NEXO-000",
        "projectName": "Proyecto Demo",
        "matchClass": "match_high",
        "requiresHumanReview": false
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
red, redirecciones seguidas, resultado por URL y checksums del registro y del staging. Para
`registrySha256` se ordenan lexicográficamente las claves de cada objeto JSON, se conserva el orden
de los arreglos, se serializa sin espacios en UTF-8 y se calcula SHA-256 en hexadecimal minúscula.
Así, el orden incidental de propiedades no cambia la huella, pero cualquier fuente, autorización,
allowlist o target distinto sí la cambia. El job consulta `robots.txt`, aplica la regla más
específica, serializa solicitudes por host, limita concurrencia, timeout y tamaño, y no reintenta
401/403/407/429, CAPTCHA o challenges. No autentica, no rota identidad, no resuelve CAPTCHA y no
elude redirecciones a hosts no registrados.

API programática inyectable para pruebas y orquestadores:

```ts
const result = await runOfficialWebBatch(options, { fetchImpl, now, sleep });
await writeBatchArtifacts(result, outputPath, manifestPath);
```

La llamada debe permanecer en un worker operativo; nunca en el request path de `apps/api`.

## Extractores de la Ola 1

La primera vertical admite cuatro arquetipos sin acoplarse a una inmobiliaria concreta:

- JSON-LD de un proyecto y su oferta;
- JSON de proyecto embebido en la página;
- campos etiquetados de WordPress;
- metadatos y HTML semántico como respaldo descriptivo.

Cada fuente priorizada declara el orden recomendado en `collection.extractorArchetypes`. El
resultado registra qué extractores aplicaron, cuántos campos propusieron y qué incidencias
quedaron abiertas. El HTML genérico no interpreta precios visualmente cercanos. Un precio solo
entra al staging cuando está asociado de forma inequívoca a un único proyecto y tiene moneda;
precios múltiples, banners o importes sin moneda quedan fuera con un código de revisión.

Además de los campos iniciales, los extractores pueden observar tipologías, fecha de entrega y
bancos de financiamiento. Siguen excluidos descripciones libres, contactos, correos, teléfonos y
HTML crudo.

## Conciliación Nexo ↔ web oficial

Una captura autorizada se concilia en un segundo paso; nunca se sobrescribe Nexo:

```powershell
npm run ingestion:official-webs:reconcile -- `
  --web data/staging/official-web-refresh.json `
  --manifest data/staging/official-web-refresh.json.manifest.json `
  --output data/staging/official-web-reconciliation.json
```

El comando verifica primero ambos checksums, el contrato completo y la identidad del manifiesto.
También recompone las decisiones de política, revalida cada host contra `allowedHosts`, contrasta
fuentes y targets con el registro vigente y exige una correspondencia uno-a-uno entre target y
observación. Usa el CSV Nexo vigente y los alias confirmados del catálogo de Ola 0. Un ID externo solo genera `auto_matched` cuando el
target fue clasificado `match_high`, no requiere revisión, y el nombre, distrito e inmobiliaria
siguen siendo consistentes en la captura actual. También puede enlazar por nombre, distrito y
unicidad sin contradicciones. Los demás casos quedan como `review_required` o `unmatched`.

Por cada enlace automático se conservan dos valores con su URL, fecha, unidad, localizador y
confianza, además de la huella y auditoría de extracción de la página. El estado de campo puede ser `same`, `different`, `only_nexo`,
`only_official_web` o `not_comparable`. Importes con monedas distintas y áreas sin unidad no se
comparan. El artefacto se escribe únicamente en `data/staging`, incluye checksum y tampoco
publica el snapshot.
