# Actualización continua y contraste multifuente

## Objetivo

Actualizar el catálogo sin introducir scraping en el request path ni perder el origen de un dato. Nexo aporta el universo base mediante un canal autorizado; las webs oficiales aportan observaciones complementarias. Los documentos de Nexo constituyen otra captura de la misma fuente y se contrastan sin asumir que coinciden con la ficha.

## Baseline publicado y límites de lectura

El snapshot empaquetado de la demo contiene 7 distritos, 433 proyectos y 157 inmobiliarias. En ese artefacto, 433 proyectos tienen una observación de origen Nexo, 15 tienen datos estructurados observados en una web oficial y 0 tienen observaciones estructuradas de una red social.

Estas cifras son cobertura verificada del artefacto versionado, no una consulta en vivo ni evidencia de scraping reciente. Deben acompañarse del `datasetVersion`. Una observación Nexo pertenece al agregador/base y no confirma el dato como declaración de la inmobiliaria. Una URL oficial vinculada tampoco cuenta como observación oficial: solo cuentan los campos estructurados cuya coincidencia y evidencia fueron validadas. Las discrepancias se conservan por fuente.

El registro vigente mantiene `nexo-authorized-feed` en `pending`, el sitio público de Nexo en `blocked` y la entrada genérica de webs oficiales en `pending`; no registra un canal social aprobado. Por eso el baseline no autoriza, por sí mismo, una nueva recolección.

## Flujo

```mermaid
flowchart LR
  S[Registro de fuentes] --> G[Policy gate]
  G -->|autorizada| C[Collector batch]
  G -->|pendiente o bloqueada| Q[Cuarentena]
  C --> R[Captura cruda privada]
  R --> N[Normalización]
  N --> M[Matching de entidades]
  M --> X[Conflictos y revisión]
  X --> P[Publicación validada]
  P --> D[Snapshot / DataRepository]
  D --> A[API pública]
```

## Jerarquía de incorporación

1. Export, API o base Nexo entregada por Viva/CODIP con autorización registrada.
2. Documentos Nexo asociados a cada proyecto o tipología, conservando fecha y huella.
3. Web oficial de la inmobiliaria, habilitada por dominio y rutas.
4. Fuentes transaccionales autorizadas para precios de cierre; no se infieren desde anuncios.

El sitio público de Nexo no se recolecta automáticamente mientras su registro permanezca `blocked`. La matriz histórica de 192 inmobiliarias y 171 dominios es un inventario de descubrimiento, no una autorización de ejecución.

## Referencias oficiales para autorizar y clasificar

- Los [términos de Nexo](https://nexoinmobiliario.pe/terminos-y-condiciones) se registran como restricción contractual del collector público; la vía preferida es un canal concedido por Viva/CODIP.
- El [Código de Protección y Defensa del Consumidor](https://www.leyes.congreso.gob.pe/DetLeyNume_1p.aspx?xNorma=6&xNumero=29571&xTipo=) exige información inmobiliaria clara y mínima, pero no se usa como sustituto de permiso para automatizar una web.
- El [Registro Nacional de Límites — RENLIM](https://www.gob.pe/98535-acceder-al-registro-nacional-de-limites-renlim) es la referencia oficial para límites político-administrativos.
- Los [planos de zonificación del IMP](https://portal.imp.gob.pe/normas-zonificacion-y-sistema-vial-metropolitano/planos-de-zonificacion/) describen usos de suelo. No se reinterpretan automáticamente como zonas comerciales ni como límites distritales.

## Contrato de observación

Cada campo recolectado incluye:

- `sourceId`, URL o identificador de documento y fecha de captura;
- valor original, valor normalizado, unidad y semántica;
- método y localizador (`selector`, `jsonPath`, página o celda);
- hash de la captura, confianza y estado de revisión;
- proyecto/tipología/unidad candidata y score de matching.

Un conflicto se abre cuando observaciones vigentes de la misma entidad/campo no coinciden dentro de su tolerancia. Ambas permanecen disponibles. Una policy determina si el hecho publicado toma una observación, queda vacío o requiere revisión humana.

## Policy gate por fuente web

- dominio oficial confirmado;
- términos y revisión legal/operativa aprobados;
- `robots.txt` compatible con las rutas objetivo;
- referencia auditable de autorización;
- frecuencia, concurrencia, timeout y tamaño máximos configurados;
- sin autenticación, CAPTCHA, evasión, datos personales ni formularios;
- captura solo de información necesaria para el contrato comercial.

`npm run ingestion:plan` lee el registro y la matriz existente sin hacer solicitudes externas. Una salida `COLLECTION_ALLOWED` no reemplaza la revisión humana: demuestra que sus cuatro campos habilitantes quedaron registrados.

## Despacho desde el tablero

`Actualizar Data` es una superficie de operación protegida, no un collector en el navegador. Está deshabilitada por defecto. `GET /api/v1/data-refresh/status` solo informa `enabled: true` cuando el API tiene el flag, la clave de operador, la URL del orquestador y el token interno. Con una clave válida, `POST /api/v1/data-refresh` crea un `runId` y despacha alcance/canales al `POST /runs` de un servicio privado.

`apps/ops` implementa ese servicio como worker interno. Valida el token y el payload, encola fuera del request path, reaplica el policy gate y escribe staging/manifiesto sanitizados. Usa `DATA_REFRESH_EXECUTE=false` por defecto, por lo que realiza cero solicitudes de red. No publica datasets y todos sus resultados conservan `published: false`. El estado del API y del worker vive en memoria; un despacho aceptado no significa que exista una versión nueva. La guía completa de habilitación, seguridad, criterios y rollback está en `docs/operations/data-dashboard-and-refresh.md`.

Los canales tienen este soporte actual:

- `official_websites`: existe un batch controlado; usa `dry-run` por defecto y solo `--execute` sobre fuentes individuales aprobadas con targets explícitos;
- `nexo_authorized_feed`: existe un adaptador de archivo offline, pero el feed sigue no operativo hasta registrar autorización y recibir la entrega autorizada;
- `social_official_apis`: solo está reservado en el contrato de despacho; no existe collector ni fuente aprobada.

Si falta cualquiera de esas condiciones, el botón, API o job deben fallar cerrados y el runtime debe conservar el último snapshot aprobado.

## Importación del feed autorizado de Nexo

El repositorio incluye un adaptador offline para un export CSV autorizado. No navega ni descarga el sitio público de Nexo. El adaptador:

- exige exactamente el esquema de `data/source/viva_minimum_dataset_latest.csv`;
- fusiona por `project_id`, actualiza valores informados y conserva el valor vigente cuando la nueva celda está vacía;
- mantiene proyectos anteriores que no estén en una entrega parcial y añade proyectos nuevos;
- elimina `project_contact`, `project_email`, `project_phone` y `project_whatsapp` del artefacto de staging;
- genera un manifiesto con altas, actualizaciones, campos modificados y checksum SHA-256;
- nunca sobrescribe directamente el dataset canónico.

Antes de ejecutarlo, `nexo-authorized-feed` debe figurar como `approved` en `data/source/ingestion/source-registry.json` e incluir una `authorizationReference` auditable. Luego:

```powershell
npm run ingestion:nexo:stage -- --input C:\ruta\export-nexo-autorizado.csv
```

La salida queda en `data/staging/nexo-authorized-merged.csv` junto con su manifiesto. Para publicar la actualización se revisan los conflictos, se reemplaza el CSV canónico mediante un PR y se ejecutan `npm run data:build` y `npm run verify`. Si falta autorización, cambia el esquema, hay IDs duplicados o aparece una fila sin `project_id`, el proceso falla cerrado sin escribir la salida.

## Zonas y cuadrantes

- Distrito: UBIGEO y límite contrastado con RENLIM; una geometría referencial conserva su atribución.
- Zona oficial: exige autoridad, instrumento legal o dataset oficial, versión y geometría.
- Zona comercial interna: exige nombre, owner, versión, criterios y fecha; se muestra expresamente como interna.
- Cuadrantes geométricos arbitrarios no se presentan como oficiales.

## Publicación y rollback

La publicación valida contrato, relaciones, privacidad, checksums y métricas antes de asignar un nuevo `datasetVersion`. Un run fallido queda en cuarentena. El runtime sirve la última versión aprobada y el rollback cambia al artefacto anterior; nunca borra observaciones ni capturas.
