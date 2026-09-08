# Handoff de tablero de datos y actualización controlada

## Propósito y estado real

Este documento entrega a Producto, Datos, Legal, Plataforma y Operaciones el tablero de procedencia de datos de `Panorama` y el control `Actualizar Data`. El tablero lee exclusivamente el snapshot publicado. El control no recolecta datos en el navegador ni convierte el API público en un scraper: cuando está habilitado, autentica al operador y despacha una solicitud a un orquestador privado.

El repositorio contiene el contrato, el cliente de despacho y el servicio interno `apps/ops` que implementa `POST /runs`. **No contiene una promoción automática de staging a producción.** El worker usa `dry-run` sin red por defecto y mantiene `published: false` en todos los resultados. Por ello, el flujo de recolección real permanece deshabilitado por defecto y no debe habilitarse hasta cumplir todos los prerrequisitos de este documento.

## Baseline empaquetado y cómo comunicarlo

La versión de datos incluida en la demo representa este universo:

| Medida | Baseline publicado | Lectura correcta |
|---|---:|---|
| Distritos | 7 | Universo geográfico de la demo, no toda Lima ni todo Perú. |
| Proyectos | 433 | Proyectos presentes en el snapshot versionado. |
| Inmobiliarias | 157 | Inmobiliarias distintas asociadas al universo publicado. |
| Observación Nexo | 433 proyectos | Cobertura de origen Nexo dentro del snapshot: 100% del universo empaquetado. |
| Datos observados en web oficial | 15 proyectos | Observaciones estructuradas y verificadas conservadas como fuente separada: 3,5% del universo. |
| Datos observados en red social | 0 proyectos | Canal sin observaciones publicadas; pendiente de integración y autorización. |

Estos valores describen el artefacto versionado que consume la demo. **No prueban que la oferta esté actualizada hoy, que se haya ejecutado scraping reciente ni que la cobertura se mantenga después de otra publicación.** Antes de comunicar cifras, el operador debe consultar `GET /api/v1/source-coverage?district=<id>` para los siete distritos y conservar el `datasetVersion` de las respuestas.

Los siete distritos del alcance son Miraflores (90 proyectos), Santiago de Surco (88), Jesús María (67), San Miguel (63), Cercado de Lima (43), Magdalena del Mar (42) y San Isidro (40). Suman 433 proyectos. Las 157 inmobiliarias son únicas en el universo: no se obtienen sumando totales distritales, porque una inmobiliaria puede aparecer en más de un distrito.

### Nexo observado no equivale a fuente oficial de la inmobiliaria

- **Observación Nexo:** dato atribuido a Nexo y publicado en el snapshot. Nexo actúa como agregador/base del universo. Esa observación no confirma que la inmobiliaria haya ratificado el valor en su propio canal.
- **Observación de web oficial:** campo estructurado asociado a un proyecto solo después de confirmar el dominio oficial, obtener un match permitido y superar la validación aplicable. Se conserva con fuente, fecha, método y evidencia propios.
- **Web oficial vinculada:** una URL o coincidencia registrada. No cuenta como observación oficial mientras no existan campos estructurados validados; el tablero la muestra por separado.
- **Conflicto:** si Nexo y una web oficial discrepan, ambas observaciones permanecen. La publicación aplica una policy o exige revisión; nunca sobrescribe silenciosamente una fuente con otra.
- **Cero en redes sociales:** significa cero observaciones estructuradas en el snapshot, no ausencia de actividad comercial en el mercado.

Precio publicado tampoco equivale a precio real de cierre. La distribución del tablero se limita a precios publicados elegibles en el snapshot.

## Qué muestra el tablero

En `Panorama`, el tablero combina el escenario activo con:

- proyectos e inmobiliarias del distrito;
- cobertura Nexo, webs oficiales vinculadas, webs oficiales con datos observados y redes sociales;
- desglose por inmobiliaria;
- distribución de precios publicados;
- fecha del último snapshot publicado y estado local del último despacho solicitado;
- señales históricas ya incluidas en el lote publicado.

La cobertura es distrital cuando existe un distrito en la consulta. No se debe presentar la cifra distrital como total del universo. `lastPublishedAt` informa cuándo se generó el snapshot servido; no informa cuándo una fuente externa cambió por última vez.

El API y `apps/ops` mantienen su estado de actualización en memoria. El API consulta `GET /runs/latest` con el token interno cada vez que el operador pide revisar el estado, por lo que refleja `blocked`, `failed` o `succeeded` mientras ambos procesos sigan disponibles. Un reinicio del worker borra su historial y devuelve `idle`; no existe todavía almacenamiento durable de corridas ni callback de publicación. Ningún estado de corrida prueba por sí solo una publicación: la única prueba de publicación es un nuevo `datasetVersion` validado.

## Prerrequisitos de autorización

Antes de habilitar `Actualizar Data`, el responsable de la operación debe verificar:

1. **Fuente:** cada fuente concreta está registrada individualmente; una entrada genérica no autoriza dominios, cuentas o endpoints.
2. **Legal y operativo:** `reviewStatus: "approved"`, `authorizationReference` auditable y propósito compatible con la autorización.
3. **Acceso web:** dominio oficial, hosts y rutas explícitos, `robotsStatus: "allow"`, user agent identificado, límites de frecuencia, concurrencia, timeout y tamaño.
4. **Canal Nexo:** export, API o base entregada por Viva/CODIP bajo autorización. El sitio público de Nexo permanece bloqueado.
5. **Canal social:** API oficial o acceso escrito autorizado, con alcance y retención definidos. No hay collector social en este repositorio.
6. **Plataforma privada:** desplegar `apps/ops` separado del API público. Debe validar el token interno, cargar el registro, reaplicar el policy gate por fuente/canal y limitar staging a `data/staging`.
7. **Secretos:** clave de operador y token interno generados, rotables, almacenados en un gestor de secretos y nunca versionados ni impresos en logs.
8. **Publicación:** staging privado, manifiesto, revisión de conflictos/PII, gates de contrato y mecanismo explícito para promover o rechazar un `datasetVersion`.
9. **Rollback:** artefacto anterior y SHA de web/API disponibles antes de promover.

El estado actual del registro es: `nexo-authorized-feed` pendiente, `nexo-public-website` bloqueado y la entrada genérica `official-project-websites` pendiente. No existe una fuente social aprobada. Por tanto, esos registros no autorizan una recolección de red.

## Flujo del operador

### 1. Preparación sin red

```powershell
npm run ingestion:plan
npm run ingestion:test
npm run official-webs:refresh --workspace @viva/ingestion-tools -- --dry-run
npm run build --workspace @viva/ingestion-tools
npm run build --workspace @viva/ops
```

El plan y el `dry-run` deben reportar cero solicitudes de red. Una fuente pendiente o bloqueada es un resultado esperado, no un motivo para debilitar el gate.

### 2. Configuración del despacho

Configurar los cuatro valores siguientes en el entorno del API, desde el gestor de secretos:

```text
DATA_REFRESH_ENABLED=true
DATA_REFRESH_OPERATOR_KEY=<secreto de operador>
DATA_REFRESH_DISPATCH_URL=<origen privado del orquestador>
DATA_REFRESH_INTERNAL_TOKEN=<secreto servicio-a-servicio>
```

`GET /api/v1/data-refresh/status` devuelve `enabled: true` solo si el flag y los tres valores están presentes. Mantener `DATA_REFRESH_ENABLED=false` es el kill switch operativo.

Configurar y desplegar `apps/ops` en una red privada:

```text
INGESTION_TOKEN=<mismo valor que DATA_REFRESH_INTERNAL_TOKEN>
DATA_REFRESH_EXECUTE=false
OPS_HOST=0.0.0.0
OPS_PORT=3100
INGESTION_REGISTRY_PATH=<registro versionado>
INGESTION_STAGING_DIRECTORY=<ruta dentro de data/staging>
```

`GET /health/ready` del servicio operativo debe responder `ready` antes de habilitar el API. Requiere token, registro legible y el build de `@viva/ingestion-tools`. Mantener `DATA_REFRESH_EXECUTE=false` produce únicamente planes y manifiestos sin solicitudes de red. Cambiarlo a `true` exige una autorización de cambio independiente y solo habilita el canal de webs oficiales que pase todas las policies.

### 3. Solicitud desde Panorama

1. Abrir `Panorama` y comprobar `datasetVersion` y fecha del snapshot.
2. Seleccionar `Actualizar Data`.
3. Elegir el distrito activo o los siete distritos de la demo.
4. Seleccionar únicamente canales realmente soportados y autorizados.
5. Introducir la clave de operador y enviar.
6. Registrar `runId`, alcance, canales, solicitante y referencia de cambio en el sistema operativo privado; no registrar la clave.

El navegador envía `POST /api/v1/data-refresh` con la clave en `x-data-refresh-key`. El API verifica configuración y clave, genera un `runId` y despacha a `${DATA_REFRESH_DISPATCH_URL}/runs` con `x-ingestion-token`. `apps/ops` valida el payload, acepta una sola corrida activa, responde `202` y ejecuta el lote de forma asíncrona. El API no descarga páginas ni importa archivos durante esa petición.

### 4. Ejecución y revisión privadas

- Para un feed Nexo autorizado, usar el adaptador offline descrito en `docs/data/continuous-ingestion.md`; hoy permanece no operativo hasta aprobar el registro y aportar el archivo autorizado.
- Para webs oficiales, ejecutar el batch solo sobre entradas concretas aprobadas y targets explícitos. El `dry-run` es el modo predeterminado; `--execute` no debe usarse para fuentes pendientes.
- Para redes sociales, detener el canal: el contrato/UI reserva la opción, pero no existe implementación ni autorización vigente.
- Revisar manifiesto, checksums, solicitudes, fallas, conflictos, campos estructurados y prueba de ausencia de PII. Staging no es publicación.

El worker marca Nexo como `unsupported` con `AUTHORIZED_FEED_INPUT_REQUIRED`, social como `policy_blocked` con `SOCIAL_API_AUTHORIZATION_REQUIRED` y una corrida con cualquier canal no soportado/bloqueado como `blocked`. Para webs oficiales escribe staging sanitizado y manifiesto por `runId` en `data/staging/ops` o la ruta configurada. Incluso un canal `succeeded` conserva `published: false`.

### 5. Publicación

1. Resolver o poner en cuarentena los conflictos sin borrar observaciones.
2. Promover insumos canónicos mediante un cambio revisado.
3. Ejecutar `npm run data:build` y `npm run verify`.
4. Registrar checksum y nuevo `datasetVersion`.
5. Desplegar web y API del mismo SHA.
6. Confirmar que el tablero muestra la versión nueva y que las cifras se recalculan desde el API.

Hasta completar estos pasos, el runtime sigue sirviendo el último snapshot aprobado.

## Comportamiento fail-closed

| Condición | Resultado esperado |
|---|---|
| Falta flag, clave, URL de despacho o token interno | `enabled: false`; el diálogo queda bloqueado y no se despacha nada. |
| Clave de operador incorrecta | `401 DATA_REFRESH_UNAUTHORIZED`; no se llama al orquestador. |
| Orquestador no disponible | `502 DATA_REFRESH_DISPATCH_FAILED`; el snapshot publicado no cambia. |
| `apps/ops` sin token, registro o build de ingesta | Readiness `503`; no debe habilitarse el despacho. |
| `DATA_REFRESH_EXECUTE=false` | El worker genera un plan/manifiesto sin solicitudes de red y sin publicar. |
| Worker rechaza autorización o lock | Estado `blocked`/`failed`; no se publica. |
| Fuente pendiente, bloqueada, sin autorización, robots o targets | El policy gate impide la recolección. |
| Feed Nexo con esquema o IDs inválidos | El staging falla sin sobrescribir el dataset canónico. |
| Respuesta, redirect, host, CAPTCHA o acceso no permitido | El collector aborta ese target, registra un código seguro y no intenta evasión. |
| Staging o verificación fallan | No se asigna una versión nueva; el API conserva la última versión aprobada. |

No se permite convertir `apps/web`, `apps/api` ni un endpoint de consulta en ruta de scraping. La recolección de red solo puede ocurrir en un worker batch privado y autorizado.

## Riesgos de seguridad y PII

- **Clave en navegador:** la UI actual pide la clave al operador. Solo debe usarse por HTTPS, en una estación controlada, sin persistencia, analytics de formularios ni grabación de sesión. Rotar la clave ante exposición. Para una operación multiusuario, sustituir esta clave compartida por autenticación y autorización reales antes de ampliar el acceso.
- **Endpoint alcanzable:** el endpoint de despacho comparte el API de la demo. Aplicar rate limit, protección perimetral y monitoreo de intentos fallidos; no confiar en ocultar el botón.
- **Token interno:** nunca enviarlo al navegador ni incluirlo en errores. Limitarlo al origen privado y rotarlo de forma independiente.
- **SSRF y redirecciones:** mantener URL del orquestador bajo configuración de plataforma y hosts/targets de collectors en allowlist; no aceptar URLs arbitrarias del formulario.
- **Capturas crudas:** HTML, documentos, credenciales y payloads fuente pertenecen a almacenamiento privado, cifrado e inmutable, con retención y acceso mínimos. No entran al snapshot ni a logs.
- **Contacto y texto libre:** correo, teléfono, WhatsApp, formularios y descripciones con PII no se publican. Los extractores deben conservar solo campos estructurados permitidos y redactar auditorías.
- **Manifiestos:** no incluir secretos, headers, query strings sensibles ni rutas locales. Conservar `runId`, fuente, URL pública saneada, fecha, policy y checksum.
- **Disponibilidad y memoria:** un job fallido nunca debe degradar la lectura pública; la última versión aprobada permanece servible. El estado y la deduplicación de `apps/ops` no sobreviven reinicios, por lo que la operación debe registrar corridas de manera externa antes de ampliar su uso.

## Criterios de aceptación para habilitar el flujo

- [ ] La verificación del baseline suma 7 distritos y 433 proyectos, identifica 157 inmobiliarias únicas y conserva el mismo `datasetVersion` en las siete consultas distritales.
- [ ] La suma del alcance esperado distingue 433 Nexo, 15 con observación de web oficial y 0 social, sin sumar URLs vinculadas como observaciones.
- [ ] La interfaz y la documentación aclaran que son datos del snapshot, no una lectura en vivo ni evidencia de scraping reciente.
- [ ] Nexo y webs oficiales aparecen como observaciones separadas; un conflicto conserva ambas.
- [ ] `DATA_REFRESH_ENABLED=false` deja la operación bloqueada y mantiene funcional la consulta pública.
- [ ] La habilitación incompleta también devuelve `enabled: false`.
- [ ] Clave incorrecta, worker inaccesible, fuente no autorizada y policy incompleta fallan cerrados sin cambiar el snapshot.
- [ ] El request público únicamente despacha; no realiza scraping, importación, normalización ni publicación.
- [ ] `apps/ops` autentica `x-ingestion-token`, valida alcance/canales y reaplica autorizaciones por fuente.
- [ ] Con `DATA_REFRESH_EXECUTE=false`, una corrida finaliza sin solicitudes de red y conserva `published: false`.
- [ ] El build, tipado y pruebas de `@viva/ops` forman parte de los gates ejecutados por CI antes de desplegar el worker.
- [ ] Nexo no se solicita al sitio público; su feed permanece sin soporte operativo hasta aprobación y entrega autorizada.
- [ ] Social permanece sin soporte hasta existir API/acceso autorizado, collector, pruebas y entrada individual aprobada.
- [ ] Webs oficiales solo se ejecutan sobre dominios/targets individuales aprobados y respetan robots, límites y bloqueos.
- [ ] Staging y capturas no contienen secretos ni PII prohibida; el snapshot supera pruebas de privacidad, contrato y checksum.
- [ ] La publicación requiere revisión humana y produce un `datasetVersion` nuevo; un despacho aceptado no se presenta como publicación.
- [ ] Se prueba rollback antes de habilitar y se conserva el artefacto aprobado anterior.

## Rollback y respuesta a incidentes

1. Poner `DATA_REFRESH_ENABLED=false` y redesplegar el API para detener nuevos despachos.
2. Revocar/rotar la clave de operador y el token interno si existe riesgo de exposición.
3. Detener `apps/ops` sin borrar staging, manifiestos o capturas necesarios para auditoría.
4. Si una versión defectuosa fue publicada, seleccionar el snapshot aprobado anterior y comprobar su checksum; no revertir ni borrar observaciones crudas.
5. Si el cambio también afectó runtime, desplegar web y API del SHA anterior como unidad.
6. Confirmar `/health/ready`, `/api/v1/meta`, `/api/v1/source-coverage` y el recorrido de `Panorama`.
7. Documentar `runId`, versiones afectadas, causa, fuentes, contención y decisión de republicación sin incluir secretos o PII.

Reiniciar el API elimina su estado visible de corrida; no cancela por sí mismo un worker ya aceptado. Detener `apps/ops` interrumpe la ejecución, pero no sustituye un mecanismo durable de cancelación o auditoría.

## Mapa exacto: necesito cambiar X → propietario/ruta

| Necesito cambiar… | Propietario/revisión | Ruta exacta |
|---|---|---|
| Copy, estructura o interacción del tablero/modal | Producto + Frontend + QA | `apps/web/src/main.ts`, `apps/web/src/styles.css` |
| Cliente HTTP o tipos usados por la web | Frontend + Backend | `apps/web/src/api.ts`, `apps/web/src/types.ts` |
| DTO, canales, estados o schemas de respuesta | Backend + consumidores + QA | `packages/contracts/src/api.ts` |
| Endpoint de cobertura, status o despacho | Backend + Seguridad + Plataforma | `apps/api/src/app.ts` |
| Flag, clave, URL o token de entorno | Plataforma + Seguridad | `apps/api/src/config.ts`, `.env.example`, secreto del entorno |
| Cálculo de cobertura, desglose por inmobiliaria o precio publicado | Datos + Backend + QA | `packages/snapshot/src/repository.ts`, `packages/snapshot/src/types.ts` |
| Autorización, bloqueo o targets de una fuente | Datos + Legal + Plataforma | `data/source/ingestion/source-registry.json` |
| Policy gate común | Datos + Legal + Seguridad | `tools/ingestion/src/policy.ts` |
| Importación offline del feed Nexo | Datos + Privacidad | `tools/ingestion/src/import-nexo.ts`, `tools/ingestion/src/nexo-authorized-import.ts` |
| Batch de webs oficiales y controles de red | Datos + Seguridad + Plataforma | `tools/ingestion/src/refresh-official-webs.ts`, `tools/ingestion/src/official-web-refresh.ts` |
| Materialización, calidad o privacidad del snapshot | Datos + Privacidad + QA | `tools/data`, `data/source`, `packages/contracts/schemas/demo-v2.schema.json` |
| Tests del contrato/API y cobertura | Backend + QA | `apps/api/src/app.test.ts`, `packages/snapshot/src/repository.test.ts` |
| Prueba integral de que el navegador no llama hosts externos | Frontend + Seguridad + QA | `tests/e2e/productized-e2e.mjs` |
| Worker `POST /runs`, estado o controles de ejecución | Plataforma + Datos + Seguridad | `apps/ops/src/app.ts`, `apps/ops/src/run-manager.ts`, `apps/ops/src/config.ts`, `apps/ops/src/ingestion.ts` |
| Inclusión del worker en build, tests o scripts de release | Plataforma + QA | `package.json`, `apps/ops/package.json`, pipeline correspondiente en `.github/workflows` |
| Persistencia durable, cancelación o reconciliación del estado | Plataforma + Datos + Seguridad; requiere diseño operativo | No existe. Registrar la decisión mediante ADR antes de ampliar la operación. |
| Canal social | Producto + Legal + Datos + Privacidad | No existe collector. Crear solo después de definir API oficial, autorización, contrato, retención y pruebas. |
| Procedimiento, criterios o riesgos de esta entrega | Operaciones + propietarios anteriores | `docs/operations/data-dashboard-and-refresh.md`, `docs/data/continuous-ingestion.md` |

Los alias provisionales de `CODEOWNERS` deben sustituirse por equipos reales durante el traspaso.
