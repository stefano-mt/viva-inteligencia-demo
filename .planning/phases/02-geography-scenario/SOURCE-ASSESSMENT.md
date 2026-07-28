# Fase 2 — Evaluación de fuente cartográfica

## Estado

`PREFLIGHT COMPLETE — alternativa OSM técnicamente validada; pendiente HUMAN-GATE-A`

Fecha de revisión: 2026-07-28.

Este documento evalúa la fuente y registra una prueba read-only. No incorpora todavía geometría al repositorio.

## Decisión recomendada

Usar un **snapshot fijo de siete relaciones de OpenStreetMap (OSM)** como fuente cartográfica operativa de la demo y RENLIM como referencia legal de contraste.

Esta ruta reemplaza la candidatura INEI 2023 porque OSM sí declara condiciones de reutilización y redistribución: datos bajo Open Database License 1.0 (ODbL), atribución a OpenStreetMap y sus colaboradores, e identificación clara de la licencia. Para evitar una interpretación permisiva, el subconjunto GeoJSON y su base derivada se tratarán como ODbL 1.0 y se publicarán con aviso de share-alike.

La geometría será referencial, no oficial. La demo no afirmará que OSM sustituye al Registro Nacional de Límites (RENLIM), ni que los cuadrantes analíticos son delimitaciones municipales.

P2-01 sigue bloqueada hasta que HUMAN-GATE-A apruebe expresamente:

1. OSM como fuente cartográfica referencial;
2. ODbL 1.0 y sus obligaciones de atribución/share-alike;
3. el texto visible de atribución;
4. la diferencia entre referencia cartográfica OSM y límite legal RENLIM;
5. el uso de un snapshot estático, sin tiles ni llamadas cartográficas en runtime.

La aprobación favorable debe persistirse en `APPROVAL.md` mediante P2-00C antes de P2-01.

## Fuente operativa propuesta

| Campo | Valor revisado |
|---|---|
| Productor colaborativo | OpenStreetMap contributors |
| Sitio y licencia | `https://www.openstreetmap.org/copyright` |
| Licencia de datos | Open Database License 1.0 (ODbL) |
| Guía de atribución | `https://osmfoundation.org/wiki/Licence/Attribution_Guidelines` |
| Método de preflight | Una consulta fija de siete relaciones mediante Nominatim `lookup`, con `User-Agent` identificable |
| Política de consulta | `https://operations.osmfoundation.org/policies/nominatim/` |
| Formato de snapshot | GeoJSON, WGS84 (`EPSG:4326`) |
| Cobertura | Siete distritos de Lima Metropolitana |
| Uso previsto | Versionar un snapshot, simplificarlo de forma determinista y cargarlo localmente |
| Ejecución en runtime | Ninguna; no habrá Nominatim, Overpass, tiles ni geocodificación desde la demo |
| Estado legal | Reutilización permitida bajo ODbL con atribución y share-alike |

La consulta de preflight fue una búsqueda pequeña y única, no un crawler ni una dependencia de producción. P2-01 repetirá una sola adquisición controlada después de la aprobación, la cacheará en el repositorio y registrará fecha, respuesta, SHA-256 y `User-Agent`.

## Relaciones y correspondencia

| Orden | Distrito de UI | Nombre OSM esperado | Relación OSM | UBIGEO de contraste | Proyectos observados |
|---:|---|---|---:|---:|---:|
| 1 | Miraflores | Miraflores | 1944770 | 150122 | 90 |
| 2 | Santiago De Surco | Santiago de Surco | 1944844 | 150140 | 88 |
| 3 | Jesus Maria | Jesús María | 1944744 | 150113 | 67 |
| 4 | San Miguel | San Miguel | 1944825 | 150136 | 63 |
| 5 | Cercado de lima | Lima | 1944756 | 150101 | 43 |
| 6 | Magdalena Del Mar | Magdalena del Mar | 1944765 | 150120 | 42 |
| 7 | San Isidro | San Isidro | 1944812 | 150131 | 40 |

Los nombres de UI permanecen como alias del dataset. P2-01 validará por relación OSM, nombre normalizado y UBIGEO de contraste; una coincidencia aproximada por texto no es suficiente.

## Prueba técnica read-only

El 2026-07-28 se consultaron juntas las siete relaciones:

`https://nominatim.openstreetmap.org/lookup?osm_ids=R1944770,R1944844,R1944744,R1944825,R1944756,R1944765,R1944812&format=geojson&polygon_geojson=1`

Resultados del preflight:

- se recibieron 7 de 7 features poligonales;
- la respuesta declaró `Data © OpenStreetMap contributors, ODbL 1.0`;
- los 433 proyectos observados de los siete distritos quedaron dentro de su polígono esperado;
- Miraflores obtuvo 90/90, por lo que el fixture CT-I es técnicamente alcanzable;
- el tamaño conjunto de las geometrías está muy por debajo del límite público de 750 KB;
- no se detectó necesidad de tiles, servicios externos o geocodificación en runtime.

Esta prueba demuestra factibilidad técnica, no sustituye el snapshot reproducible ni sus hashes de P2-01/P2-04.

## Referencia legal de contraste

| Campo | Valor revisado |
|---|---|
| Registro | Registro Nacional de Límites (RENLIM) |
| Responsable | PCM — Secretaría de Demarcación y Organización Territorial |
| URL | `https://www.gob.pe/98535-acceder-al-registro-nacional-de-limites-renlim` |
| Carácter | Instrumento técnico oficial, vinculante y de cumplimiento obligatorio |
| Uso en F2 | Contrastar nombres, UBIGEO y discrepancias; no extraer ni redistribuir su visor |

RENLIM prevalece como referencia legal. Una diferencia entre OSM y RENLIM debe registrarse y mostrarse como limitación; no se resolverá llamando “oficial” al snapshot derivado.

## Fuente INEI evaluada y no seleccionada

| Campo | Valor |
|---|---|
| Portal | `https://ide.inei.gob.pe/` |
| Recurso | Límites distritales actualizados al 2023 |
| Descarga | `https://ide.inei.gob.pe/files/Distrito.rar` |
| Resultado | Técnicamente adecuada, pero sin licencia de redistribución suficientemente explícita en la página revisada |

El acceso público o la posibilidad técnica de descargar no se interpreta como permiso automático para republicar. INEI queda como referencia documental; su archivo no se incorporará a F2 sin permiso verificable y un nuevo loop de planificación/checker/HUMAN-GATE-A.

## Preflight técnico obligatorio de P2-01

1. Confirmar que `APPROVAL.md` autoriza exactamente OSM/ODbL y estas siete relaciones.
2. Ejecutar una sola adquisición con `User-Agent` identificable, respetando la política de Nominatim.
3. Guardar la respuesta fuente GeoJSON sin mutación y calcular SHA-256.
4. Registrar URL, timestamp ISO-8601, productor, licencia, atribución y relaciones.
5. Comprobar 7/7 features, tipos `Polygon`/`MultiPolygon`, WGS84 y geometrías válidas.
6. Verificar nombres, relation IDs y UBIGEO de contraste.
7. Conservar huecos y estructura multipolígono.
8. Simplificar de forma determinista con tolerancia máxima `0.00005°`, desplazamiento ≤10 m y cambio de área <0.5%.
9. Validar 433/433 puntos dentro de su distrito y 90/90 para CT-I.
10. Publicar únicamente el subconjunto aprobado, su manifiesto, README y aviso ODbL.
11. Comprobar que no existan credenciales, rutas locales, datos personales ni dependencias de red en runtime.

## Atribución y licencia requeridas

Texto visible mínimo en el módulo cartográfico:

> © OpenStreetMap contributors · ODbL 1.0. Geometría referencial; límites legales: RENLIM. Cuadrantes analíticos no oficiales.

Requisitos:

- “OpenStreetMap” enlaza a `https://www.openstreetmap.org/copyright`;
- “ODbL 1.0” enlaza a `https://opendatacommons.org/licenses/odbl/1-0/`;
- el aviso permanece legible en desktop y móvil, sin ocultarse detrás de un tooltip;
- `datos_relevantes/geography/README.md` declara que el snapshot/subconjunto derivado se ofrece bajo ODbL 1.0 y explica cómo obtener la fuente;
- `source-manifest.json` conserva la cadena de atribución, licencia, URLs, relations, timestamps y hashes.
- el GeoJSON ODbL se mantiene como archivo/base separado del dataset inmobiliario para no convertirlos en una única base combinada sin revisión legal adicional.

## Riesgos y decisión humana

| Riesgo | Impacto | Mitigación exigida |
|---|---|---|
| OSM no es el registro legal de límites | El borde puede diferir de RENLIM | Rotularlo como referencial y enlazar la referencia legal |
| ODbL exige atribución y share-alike de la base derivada | Incumplimiento de licencia si se omite | Aviso visible, README/licencia y manifest versionados |
| Las relaciones OSM pueden cambiar | El resultado futuro puede diferir | Snapshot fijo, timestamp y SHA-256; sin fetch en runtime |
| Uso indebido de Nominatim | Riesgo de bloqueo del servicio | Una adquisición pequeña, cacheada, con User-Agent; no bulk/runtime |
| Nombres legacy difieren de nombres administrativos | Asignación territorial errónea | Tabla explícita de alias, relation ID y UBIGEO de contraste |
| Simplificación excesiva | Puntos cerca del borde cambian de inclusión | Límites de desplazamiento/área y fixtures de borde |
| Dependencia de red en la demo | Fallo o cambio no controlado | Cero llamadas externas en runtime |

## Resultado del gate

- Fuente con licencia explícita: **identificada**.
- Siete relaciones: **identificadas**.
- Cobertura técnica preliminar: **7/7 features y 433/433 puntos**.
- CT-I Miraflores: **90/90 alcanzable**.
- Referencia legal de contraste: **identificada**.
- Atribución mínima: **definida**.
- Ejecución en runtime: **cero llamadas externas**.
- Implementación: **bloqueada hasta checker favorable y HUMAN-GATE-A persistida**.
