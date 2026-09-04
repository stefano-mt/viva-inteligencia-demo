# Propuesta tecnico-economica - Plataforma de scraping y enriquecimiento inmobiliario para Viva

Fecha: 2026-06-14  
Cliente objetivo: Viva Inmobiliaria  
Premisa de despliegue: la solucion productiva se desplegara en Microsoft Azure.

## 1. Resumen ejecutivo

Se propone desarrollar una plataforma modular de scraping, enriquecimiento, matching y control de calidad para informacion inmobiliaria. La solucion usara Nexo Inmobiliario como fuente base/canonica y las webs propias de inmobiliarias como fuentes complementarias para enriquecer, validar y actualizar informacion de proyectos.

La evaluacion tecnica ya ejecutada confirma que no conviene vender el proyecto como un "scraper unico" para todas las webs. El diseno recomendado es por modulos y niveles de complejidad, porque las fuentes tienen comportamientos tecnicos muy distintos:

- 10 inmobiliarias califican como MVP automatizable.
- 128 inmobiliarias califican como MVP condicionado / enriquecimiento.
- 34 inmobiliarias quedan fuera de alcance tecnico, legal u operativo.
- 20 inmobiliarias permanecen como backlog posterior por discovery pendiente o evidencia insuficiente.

La propuesta economica se estructura en dos bloques:

1. Servicios profesionales de construccion: diseno, desarrollo, pruebas, despliegue y documentacion.
2. Costos recurrentes: consumo Azure, licencias, monitoreo, soporte operativo y mantenimiento de extractores.

Los importes incluidos son rangos referenciales para estructurar la propuesta comercial. No incluyen IGV, costos legales, licencias existentes de Viva, servicios de terceros no aprobados, proxies, compra de datos externos ni consumo real definitivo de Azure.

## 2. Alcance funcional propuesto

La plataforma debe permitir:

- Ejecutar scrapers por fuente y por lote.
- Registrar inmobiliarias, dominios, aliases, prioridad, estado legal/operativo y patron tecnico.
- Descubrir URLs de proyectos por sitemap, REST, HTML, JSON embebido o navegador.
- Extraer campos inmobiliarios con evidencia trazable.
- Normalizar campos en un contrato comun.
- Relacionar proyectos extraidos con proyectos Nexo mediante matching.
- Calcular score de calidad por fuente, proyecto y campo.
- Derivar casos ambiguos a revision humana.
- Exportar datos hacia dashboard, API o procesos internos de Viva.
- Monitorear fallas, cobertura, drift de estructura web y freshness de datos.

## 3. Premisas tecnicas y comerciales

- La infraestructura productiva se desplegara en Azure.
- El sistema procesara fuentes publicas, sin login, sin evasion de CAPTCHA y sin bypass de restricciones.
- Se respetaran robots.txt, terminos de uso y restricciones legales/operativas identificadas.
- Nexo se mantendra como fuente base/canonica inicial.
- Las webs propias complementaran la informacion de Nexo, pero no reemplazaran automaticamente la fuente canonica.
- Precio, stock, moneda, unidades y fechas de entrega no se garantizan para todas las fuentes, porque la cobertura observada es baja o parcial.
- Las fuentes condicionadas se incorporaran por oleadas.
- El alcance de cada oleada se cerrara con una matriz de fuentes, campos, frecuencia y nivel de confianza.
- Los costos Azure se estimaran con Azure Pricing Calculator antes del cierre contractual.

## 4. Arquitectura Azure propuesta

```text
Fuentes externas
  Nexo / Webs propias / Backlog aprobado / APIs futuras
        |
        v
Azure Container Apps Jobs
  Workers HTTP-first y workers Playwright
        |
        +--> Azure Functions Timer Trigger
        |    Scheduler liviano / disparadores
        |
        +--> Azure Key Vault
        |    Secretos, tokens, configuraciones sensibles
        |
        +--> Azure Monitor + Application Insights
        |    Logs, metricas, alertas, trazabilidad
        |
        v
Azure Blob Storage / Data Lake Gen2
  HTML, JSON, snapshots, evidencia cruda, screenshots opcionales
        |
        v
Procesamiento / Normalizacion
  Adaptadores, parsers, reglas canonicas, quality checks
        |
        v
Azure Database for PostgreSQL Flexible Server
  Modelo relacional, historico, matches, calidad, revisiones
        |
        +--> API / Admin console
        |    Azure Container Apps o App Service
        |
        +--> Power BI / Fabric
             Dashboard comercial, calidad, operacion
```

### Servicios Azure sugeridos

| Capa | Servicio Azure recomendado | Justificacion |
| --- | --- | --- |
| Scraping batch | Azure Container Apps Jobs | Permite contenedores, jobs por ejecucion, escalamiento y soporte para Playwright. |
| Triggers livianos | Azure Functions Timer | Adecuado para programar corridas y disparar jobs simples. |
| Contenedores | Azure Container Registry | Versionado de imagenes de extractores y API. |
| Evidencia cruda | Azure Blob Storage / ADLS Gen2 | Bajo costo relativo para HTML/JSON y reprocesamiento. |
| Base principal | Azure Database for PostgreSQL Flexible Server | Buen soporte relacional, JSON, historico y matching. |
| Secretos | Azure Key Vault | Gobierno de credenciales y tokens. |
| Observabilidad | Azure Monitor + Application Insights | Logs, alertas, metricas, trazas por fuente y job. |
| Dashboard | Power BI / Fabric | Capa ejecutiva y operacional para Viva. |
| API/Admin | Azure Container Apps o App Service | Publicacion de API interna y consola de revision. |

## 5. Modulos de implementacion

### M0. Gobierno, inicio y landing zone Azure

Objetivo: preparar el entorno tecnico, reglas de seguridad y criterios de aceptacion del proyecto.

Incluye:

- Kickoff tecnico y comercial.
- Confirmacion de alcance MVP y fuentes priorizadas.
- Definicion de ambientes: dev, test y prod.
- Estructura base en Azure: resource groups, networking simple, Key Vault, Storage, permisos y naming.
- Repositorio, ramas, CI/CD base y convenciones.
- Matriz inicial de riesgos, cumplimiento y fuente/campo.

Complejidad: baja a media.  
Duracion estimada: 2 a 3 semanas.  
Esfuerzo estimado: 20 a 35 jornadas.  
Rango referencial: USD 8,000 a USD 15,000.

### M1. Plataforma core de ingesta, datos y evidencia

Objetivo: construir el nucleo reusable para todas las fuentes.

Incluye:

- Source registry de inmobiliarias, dominios, aliases, prioridad y estado.
- Modelo de datos base en PostgreSQL.
- Contrato canonico de campos inmobiliarios.
- Persistencia de raw evidence en Blob Storage.
- Estructura de runs, logs, errores y retry policy.
- Framework de adaptadores por patron tecnico.
- Normalizacion inicial de proyecto, inmobiliaria, distrito, direccion, tipologia y atributos.

Complejidad: media.  
Duracion estimada: 4 a 5 semanas.  
Esfuerzo estimado: 45 a 70 jornadas.  
Rango referencial: USD 18,000 a USD 32,000.

### M2. Scraping Nivel 1 - HTTP-first automatizable

Objetivo: productivizar fuentes de baja complejidad, priorizando Nexo y las 10 inmobiliarias MVP automatizables.

Fuentes objetivo:

- Nexo como fuente base/canonica.
- Las 10 webs propias clasificadas como MVP automatizable.
- Fuentes WordPress/sitemap/rest/html con estructura estable.

Incluye:

- Extractor Nexo endurecido.
- Adaptadores HTTP-first para WordPress, sitemap, REST y HTML estatico.
- Extraccion de campos con evidencia por URL.
- Persistencia de HTML crudo (con tags) por fuente, ademas del texto, para habilitar deteccion de senales y reproceso sin recapturar.
- Enriquecimiento Grupo C - senales de marketing digital (deteccion directa en HTML, incluido en alcance base): `meta_pixel_detected`, `google_tag_detected`, `live_chat_tool`, `social_links_detected`, `virtual_tour_available`, `brochure_downloadable`.
- Reintentos, rate limits y control de errores por fuente.
- Pruebas por fuente y reporte de cobertura.
- Publicacion de dataset normalizado MVP.

Validacion tecnica (POC, evidencia con HTML crudo): `google_tag` 82%, `social_links` 93%, `sales_channels` 74%, `live_chat` 61%, `brochure` 64% — cumplen o superan las estimaciones. Detalle en `docs/PRUEBA_ADDENDUM_ENRIQUECIMIENTO_RRSS.md`.

Complejidad: baja a media.  
Duracion estimada: 4 a 6 semanas.  
Esfuerzo estimado: 50 a 85 jornadas.  
Rango referencial: USD 22,000 a USD 38,000 (incluye enriquecimiento Grupo C).

### M3. Scraping Nivel 2 - Enriquecimiento condicionado

Objetivo: incorporar oleadas de fuentes condicionadas que aportan valor, pero no garantizan automatizacion completa campo por campo.

Fuentes objetivo:

- Subconjunto priorizado de las 128 fuentes MVP condicionado / enriquecimiento.
- WordPress no uniforme, HTML heterogeneo, JSON embebido y estructuras custom.

Incluye:

- Adaptadores por familia de sitio.
- Parsers para JSON embebido y estructuras propietarias.
- Reglas adicionales de limpieza y normalizacion.
- Enriquecimiento contextual de webs propias (Grupo A/B, incluido en alcance base): financiamiento (`financing_programs`, `initial_fee_pct`, `subsidy_eligible`, ampliacion de `financing_banks`), estrategia comercial (`market_segment`, `sales_channels`, `promotions_text`) y perfil del desarrollador (`developer_ruc`, `developer_founding_year`).
- Control de campos parciales.
- Scoring por fuente/campo.
- Reporte de brechas por inmobiliaria.

Nota: los campos con cobertura < 20% se tratan como enriquecimiento oportunistico (no entran en SLA de cobertura). Los campos LLM/NLP (`commercial_usp_text`, `brand_tone_signal`) operan sobre texto raw ya persistido y se cotizan dentro de O1/Azure OpenAI.

Unidad comercial sugerida:

- Oleada de 25 a 40 fuentes condicionadas.
- Cada oleada debe cerrarse con decision Go, Go condicionado operativo o No-go.

Complejidad: media.  
Duracion estimada por oleada: 5 a 7 semanas.  
Esfuerzo estimado por oleada: 60 a 110 jornadas.  
Rango referencial por oleada: USD 28,000 a USD 55,000 (incluye enriquecimiento web Grupo A/B).

### M4. Scraping Nivel 3 - Fuentes dinamicas o de alta complejidad

Objetivo: incorporar fuentes que requieren navegador, render dinamico, interacciones o tratamiento especial.

Fuentes objetivo:

- Fuentes clasificadas como `playwright_rendered_html`.
- Casos de alto valor comercial dentro del grupo condicionado.
- Fuentes con filtros, paginacion dinamica o contenido generado por JavaScript.

Incluye:

- Workers Playwright en Azure Container Apps Jobs.
- Control de concurrencia, memoria y timeout.
- Capturas de evidencia cuando aplique.
- Tests visuales/DOM por flujo critico.
- Monitoreo especial por costo y fragilidad.
- Decision de continuidad por fuente segun estabilidad.

Complejidad: alta.  
Duracion estimada por paquete: 4 a 6 semanas.  
Esfuerzo estimado por paquete: 45 a 80 jornadas.  
Rango referencial por paquete: USD 22,000 a USD 45,000.

### M5. Matching, calidad y revision humana

Objetivo: asegurar que los proyectos extraidos se vinculen correctamente con Nexo y que la calidad sea auditable.

Incluye:

- Motor de matching por nombre, distrito, direccion, URL, inmobiliaria y similitud textual.
- Scores de confianza: alto, medio, bajo.
- Reglas de publicacion automatica y revision manual.
- Cola de revision para matches ambiguos.
- Quality score por fuente, proyecto y campo.
- Auditoria de cambios y decisiones.

Complejidad: media a alta.  
Duracion estimada: 4 a 6 semanas.  
Esfuerzo estimado: 50 a 90 jornadas.  
Rango referencial: USD 22,000 a USD 42,000.

### M6. Dashboard, API y exportaciones para Viva

Objetivo: convertir los datos enriquecidos en una salida usable para equipos comerciales, pricing o analitica.

Incluye:

- Dataset semantico para Power BI.
- Vistas por inmobiliaria, distrito, proyecto, fuente, cobertura y cambios.
- API interna o exports CSV/JSON programados.
- Filtros por distrito, tipologia, dormitorios, area, fecha y fuente.
- Indicadores de calidad y freshness.
- Documentacion de metricas.

Complejidad: media.  
Duracion estimada: 3 a 5 semanas.  
Esfuerzo estimado: 35 a 65 jornadas.  
Rango referencial: USD 16,000 a USD 30,000.

### M7. Operacion, seguridad, monitoreo y hardening

Objetivo: dejar la plataforma operable y mantenible en produccion.

Incluye:

- Alertas por falla de fuente, caida de cobertura, errores HTTP y drift.
- Dashboards tecnicos de salud.
- Runbooks operativos.
- Backups, retencion y politicas de evidencia.
- Gestion de secretos.
- Roles y permisos.
- Documentacion tecnica y transferencia.
- Pruebas de carga controladas y ajuste de costos Azure.

Complejidad: media.  
Duracion estimada: 2 a 4 semanas.  
Esfuerzo estimado: 25 a 50 jornadas.  
Rango referencial: USD 10,000 a USD 24,000.

### M8. Backlog, discovery adicional y regularizacion de fuentes

Objetivo: resolver las 20 fuentes pendientes y revaluar casos fuera de alcance si Viva considera que tienen valor comercial.

Incluye:

- Discovery manual/asistido de dominios.
- Confirmacion de propiedad u oficialidad.
- Auditoria tecnica puntual.
- Revision de robots/TOS.
- Decision Go / Go condicionado / No-go.
- Reingreso al source registry si aplica.

Complejidad: variable.  
Duracion estimada: 2 a 4 semanas.  
Esfuerzo estimado: 20 a 45 jornadas.  
Rango referencial: USD 8,000 a USD 20,000.

### M_RRSS. Captura de redes sociales por API oficial (modulo opcional)

Objetivo: complementar el perfil de cada inmobiliaria con senales de actividad y madurez digital desde redes sociales, usando exclusivamente APIs oficiales. Modulo opcional, fuera del MVP base; se cotiza por separado y se incorpora desde M3 o como paquete posterior.

Alcance MVP del modulo (viable):

- Paso 1 - Link harvesting: el campo `social_links_detected` (ya incluido en M2/Grupo C) cosecha los perfiles enlazados. Costo cero, sin llamadas externas.
- Paso 2 - API enrichment job (Azure Container App Job ligero, sin Playwright): consulta Facebook (Meta Graph API) y YouTube (Data API v3) y persiste en tabla `social_profiles` vinculada a `agency_id`. Credenciales en Key Vault.
- Campos Facebook: `fb_page_id`, `fb_followers`, `fb_rating`, `fb_posts_monthly_count`, `fb_last_post_date`.
- Campos YouTube: `yt_channel_id`, `yt_subscribers`, `yt_video_count`, `yt_last_upload_date`, `yt_views_total`.

Fuera de alcance del modulo MVP: Instagram (condicionado, requiere autorizacion del owner), TikTok y LinkedIn (sin API viable / scraping prohibido). Sin insights de audiencia, sin datos de Ads, sin mensajes privados, sin perfiles personales.

Validacion tecnica (POC): 128 de 160 dominios con HTML crudo (80%) son direccionables por RRSS MVP (tienen Facebook o YouTube enlazado), en linea con la estimacion 70-85% del addendum. Detalle en `docs/PRUEBA_ADDENDUM_ENRIQUECIMIENTO_RRSS.md`.

Dependencias: registro de Meta App (1-2 semanas de revision) y Google API Key para YouTube (inmediata). Iniciar en paralelo con M2/M3 para no generar cuello de botella.

Complejidad: baja-media.  
Esfuerzo estimado: 10 a 15 jornadas (Facebook + YouTube); 5 a 7 jornadas por plataforma posterior.  
Rango referencial: USD 5,000 a USD 12,000 (modulo completo FB + YT).  
Incremento Azure estimado: USD 20 a USD 45 / mes.

## 6. Paquetes comerciales sugeridos

### Paquete A - MVP productivo controlado

Objetivo: llevar a produccion el nucleo de la plataforma con Nexo, las 10 fuentes automatizables y salidas operativas basicas.

Incluye:

- M0 Gobierno y Azure landing zone.
- M1 Plataforma core (con persistencia de HTML crudo).
- M2 Scraping Nivel 1 + enriquecimiento Grupo C (senales de marketing digital).
- M3 enriquecimiento web Grupo A/B sobre el lote viable (financiamiento, segmento, perfil del desarrollador).
- M5 Matching/calidad en version inicial.
- M6 Dashboard/API en version inicial.
- M7 Operacion basica.

El modulo opcional M_RRSS (redes sociales por API) no esta incluido en el Paquete A; se cotiza por separado (USD 5,000 a USD 12,000).

Duracion estimada: 10 a 14 semanas.  
Rango referencial de servicios: USD 85,000 a USD 140,000.  
Consumo Azure estimado inicial: USD 350 a USD 1,500 por mes, sujeto a frecuencia, retencion y usuarios.  
Licencias Power BI: se cotizan aparte segun usuarios y plan vigente de Viva.

### Paquete B - Expansion de enriquecimiento condicionado

Objetivo: incorporar la primera gran oleada de fuentes condicionadas de complejidad media.

Incluye:

- M3 para una oleada de 25 a 40 fuentes.
- Extension de M5 para nuevos matches.
- Extension de dashboard/calidad.
- Ajustes de operacion.

Duracion estimada: 6 a 9 semanas.  
Rango referencial de servicios: USD 35,000 a USD 75,000 por oleada.  
Incremento Azure estimado: USD 300 a USD 1,500 por mes por oleada activa, segun frecuencia y volumen.

### Paquete C - Alta complejidad y Playwright

Objetivo: incorporar fuentes dinamicas o de alto valor que requieren navegador y mayor supervision.

Incluye:

- M4 para paquete de fuentes dinamicas priorizadas.
- Ajuste de infraestructura para Playwright.
- Monitoreo y alertas especificas.
- Reglas de continuidad por costo/beneficio.

Duracion estimada: 5 a 8 semanas.  
Rango referencial de servicios: USD 28,000 a USD 60,000 por paquete.  
Incremento Azure estimado: USD 600 a USD 2,800 por mes, dependiendo de frecuencia, concurrencia y volumen de screenshots/evidencia.

### Paquete D - Operacion mensual y mantenimiento evolutivo

Objetivo: sostener la plataforma, atender cambios de fuente y acompanar a Viva en mejoras continuas.

Incluye:

- Monitoreo de corridas.
- Correccion de extractores degradados.
- Ajustes menores de parsers.
- Revision de calidad.
- Soporte operativo.
- Informe mensual de cobertura, fallas y mejoras.

Rango referencial mensual:

- Soporte base: USD 4,000 a USD 7,000 / mes.
- Soporte estandar: USD 7,000 a USD 12,000 / mes.
- Soporte intensivo: USD 12,000 a USD 20,000 / mes.

La seleccion depende de cantidad de fuentes activas, criticidad, frecuencia de actualizacion y SLA esperado.

## 7. Resumen economico por modulo

| Modulo | Complejidad | Duracion | Rango servicios profesionales |
| --- | --- | --- | ---: |
| M0. Gobierno y landing zone Azure | Baja-media | 2-3 semanas | USD 8,000-15,000 |
| M1. Plataforma core | Media | 4-5 semanas | USD 18,000-32,000 |
| M2. Scraping Nivel 1 | Baja-media | 4-6 semanas | USD 22,000-38,000 |
| M3. Scraping Nivel 2 por oleada | Media | 5-7 semanas | USD 28,000-55,000 |
| M4. Scraping Nivel 3 por paquete | Alta | 4-6 semanas | USD 22,000-45,000 |
| M5. Matching, calidad y revision | Media-alta | 4-6 semanas | USD 22,000-42,000 |
| M6. Dashboard/API/export | Media | 3-5 semanas | USD 16,000-30,000 |
| M7. Operacion y hardening | Media | 2-4 semanas | USD 10,000-24,000 |
| M8. Backlog/discovery | Variable | 2-4 semanas | USD 8,000-20,000 |
| M_RRSS. Redes sociales por API (opcional) | Baja-media | 2-3 semanas | USD 5,000-12,000 |

Nota: el enriquecimiento web (Grupo C en M2, Grupo A/B en M3) esta incluido en el alcance base y no se cotiza como modulo aparte. M_RRSS es el unico componente nuevo del addendum que se cotiza por separado (+ USD 20-45 / mes de Azure).

## 8. Estimacion Azure mensual

Los costos Azure dependen del acuerdo comercial de Viva con Microsoft, region, moneda, descuentos, reservas, frecuencia de scraping, volumen de evidencia y retencion. Microsoft indica en sus paginas de pricing que los precios publicados son estimaciones y que la cotizacion debe validarse con Azure Pricing Calculator.

### Escenario 1 - MVP controlado

Supuestos:

- Nexo + 10 fuentes MVP automatizables.
- Corrida diaria o interdiaria.
- Mayormente HTTP-first.
- Retencion raw de 3 a 6 meses.
- Dashboard Power BI con usuarios limitados.

Rango Azure referencial: USD 350 a USD 1,500 / mes.  
Servicios dominantes: Container Apps Jobs, PostgreSQL, Blob Storage, Monitor, Key Vault, Power BI.

### Escenario 2 - Expansion media

Supuestos:

- MVP + 25 a 40 fuentes condicionadas.
- Corrida semanal o 2 a 3 veces por semana.
- Pocas fuentes Playwright.
- Retencion raw de 6 a 12 meses.
- Mayor volumen de logs y evidencia.

Rango Azure referencial: USD 900 a USD 3,500 / mes.

### Escenario 3 - Operacion ampliada

Supuestos:

- MVP + varias oleadas condicionadas.
- 70 a 120 fuentes activas.
- Uso regular de Playwright en fuentes dinamicas.
- Evidencia historica de 12 meses o mas.
- Dashboard y API con mayor cantidad de usuarios/consumos.

Rango Azure referencial: USD 2,500 a USD 8,000 / mes.

Estos rangos no incluyen licencias corporativas ya contratadas por Viva, costos legales, integraciones externas, soporte Microsoft, conectores premium o consumo de Azure OpenAI si se incorpora asistente conversacional.

## 9. Modelo de precio por fuente adicional

Para mantener control comercial, se recomienda usar una tarifa incremental por fuente adicional, segun complejidad:

| Tipo de fuente | Criterio tecnico | Rango por fuente |
| --- | --- | ---: |
| Nivel 1 HTTP-first | Sitemap/REST/HTML estable, sin navegador | USD 800-1,800 |
| Nivel 2 heterogenea | JSON embebido, HTML custom, reglas propias | USD 1,800-3,800 |
| Nivel 3 dinamica | Playwright, JS, filtros, paginacion compleja | USD 3,500-7,500 |
| Backlog/discovery | Dominio incierto, oficialidad pendiente, revision legal | USD 600-2,000 |

Estos rangos aplican como referencia para ampliaciones posteriores al MVP. La fuente debe pasar por evaluacion tecnica y legal antes de entrar a produccion.

## 10. Campos incluidos y limites de cobertura

### Campos recomendados para MVP

- Inmobiliaria.
- Proyecto.
- Fuente.
- URL origen.
- Fecha de captura.
- Distrito.
- Direccion.
- Tipologia.
- Dormitorios cuando exista.
- Area total cuando exista.
- Descripcion.
- Amenities.
- Contacto comercial cuando exista.
- Bancos/financiamiento cuando exista.
- Estado del proyecto cuando exista.
- Score de confianza.

### Campos condicionados

- Precio publicado.
- Stock.
- Numero de unidades.
- Moneda.
- Fecha de entrega.
- Coordenadas.
- Promociones.
- Variaciones historicas.

Estos campos deben venderse como enriquecimiento condicionado, porque la evaluacion mostro cobertura baja o parcial.

### Campos no recomendados como promesa general

- Precio venta real sin fuente interna Viva.
- Ingresos reales sin integracion con sistemas internos.
- Stock real completo.
- Identificacion individual de usuarios o leads desde fuentes publicas.
- Cobertura 100% de todas las inmobiliarias.

## 11. Equipo sugerido

| Rol | Participacion |
| --- | --- |
| Project Manager / Product Owner tecnico | Coordinacion, alcance, backlog, hitos y relacion con Viva. |
| Arquitecto de solucion Azure | Diseno cloud, seguridad, costos y escalabilidad. |
| Data/Scraping Lead | Estrategia de extraccion, adaptadores, calidad y patrones. |
| Backend Engineer | API, jobs, persistencia, normalizacion y servicios internos. |
| Data Engineer | Modelo relacional, ETL, historico, dedupe y calidad. |
| BI Engineer | Power BI, modelo semantico, dashboards y metricas. |
| DevOps Engineer | CI/CD, contenedores, monitoreo, secretos y ambientes. |
| QA/Data QA | Validacion de campos, regresion por fuente y casos de negocio. |

## 12. Hitos y cronograma de referencia

| Hito | Resultado | Semana objetivo |
| --- | --- | ---: |
| H1 | Kickoff, alcance cerrado y ambiente Azure base | 1-2 |
| H2 | Plataforma core y modelo de datos inicial | 3-5 |
| H3 | Nexo productivizado y evidencia cruda persistida | 5-7 |
| H4 | 10 fuentes MVP automatizables integradas | 7-10 |
| H5 | Matching/calidad inicial y revision humana basica | 9-12 |
| H6 | Dashboard/API MVP y validacion con Viva | 11-13 |
| H7 | Hardening, monitoreo, runbook y cierre MVP | 13-14 |

Las expansiones M3/M4 deben planificarse como oleadas posteriores o en paralelo si Viva aprueba presupuesto y priorizacion de fuentes.

## 13. Criterios de aceptacion

Una fuente se considera productiva cuando:

- Tiene dominio confirmado y estado legal/operativo habilitado.
- El extractor ejecuta sin errores criticos.
- Los campos extraidos tienen evidencia trazable.
- La cobertura supera el umbral definido para su nivel.
- Los datos se normalizan al contrato canonico.
- Los matches altos se publican y los casos medios/bajos quedan para revision.
- La fuente aparece en dashboards de calidad y operacion.
- Existen alertas por falla o caida de cobertura.

El MVP se considera cerrado cuando:

- Nexo y las 10 fuentes MVP automatizables estan ejecutando en Azure.
- Existe almacenamiento de evidencia cruda.
- Existe base PostgreSQL con modelo inicial.
- Existe dashboard/API inicial para Viva.
- Existen logs, alertas y runbook operativo.
- Existe reporte de calidad por fuente/campo.
- Viva valida los resultados sobre una muestra de proyectos.

## 14. Exclusiones comerciales

Quedan fuera del alcance salvo aprobacion expresa:

- Scraping con login.
- Evasion de CAPTCHA, bloqueos o restricciones tecnicas.
- Uso de proxies para eludir restricciones.
- Scraping de datos personales no autorizados.
- Automatizacion contra terminos de uso restrictivos.
- Garantia de disponibilidad de campos que las webs no publican.
- Integracion con CRM/ERP interno de Viva no especificado.
- Azure OpenAI, asistente conversacional, Meta Ads, Google Ads o GA4, salvo modulo adicional.
- Licencias Power BI, Microsoft Fabric u otros productos Microsoft no incluidos en el contrato de desarrollo.

## 15. Opcionales de fase 2

### O1. Asistente conversacional

Solucion read-only con Azure OpenAI, conectada a vistas certificadas o semantic layer. Requiere diccionario de metricas cerrado, permisos, controles SQL y evaluacion de exactitud.

Rango referencial: USD 18,000 a USD 45,000.  
Consumo Azure OpenAI: variable segun modelo, volumen de preguntas y contexto.

### O2. Integraciones marketing

Integracion por APIs autorizadas con Meta Ads, Google Ads y GA4 para atribucion agregada por campana/proyecto, siempre que existan UTMs y permisos.

Rango referencial: USD 18,000 a USD 40,000.

### O3. Fuentes publicas/institucionales

Incorporacion de datasets publicos para enriquecer zonas, distritos, indicadores o entorno urbano.

Rango referencial: USD 10,000 a USD 28,000.

## 16. Recomendacion comercial final

La propuesta deberia presentarse en tres pasos:

1. MVP productivo controlado: construir la plataforma en Azure con Nexo y las 10 fuentes automatizables.
2. Expansion por oleadas: incorporar fuentes condicionadas en paquetes de 25 a 40, priorizando valor comercial y baja/media complejidad.
3. Alta complejidad selectiva: abordar Playwright y casos dinamicos solo cuando la fuente justifique el costo y el mantenimiento.

Esta estructura protege la propuesta de una promesa excesiva, permite mostrar valor rapido y deja un camino claro para escalar hacia las 128 fuentes condicionadas sin comprometer cobertura que las webs no sostienen tecnicamente.

## 17. Referencias de pricing Azure consultadas

- Azure Pricing Calculator: https://azure.microsoft.com/en-us/pricing/calculator/
- Azure Container Apps pricing: https://azure.microsoft.com/en-us/pricing/details/container-apps/
- Azure Functions pricing: https://azure.microsoft.com/en-us/pricing/details/functions/
- Azure Database for PostgreSQL pricing: https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/
- Azure Blob Storage pricing: https://azure.microsoft.com/en-us/pricing/details/storage/blobs/
- Azure Monitor pricing: https://azure.microsoft.com/en-us/pricing/details/monitor/
- Power BI pricing: https://www.microsoft.com/en-us/power-platform/products/power-bi/pricing

Los precios de nube deben validarse al momento de cotizar, con region, moneda, descuentos, acuerdos corporativos y consumo esperado de Viva.
