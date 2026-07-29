# Geografía cartográfica de Fase 2

Este directorio mantiene la base geométrica separada de los datos inmobiliarios de Viva.

## Fuente y licencia

- Fuente: OpenStreetMap contributors.
- Licencia: Open Database License 1.0 (ODbL).
- Copyright y condiciones: <https://www.openstreetmap.org/copyright>.
- Texto de atribución: `© OpenStreetMap contributors`.
- Referencia legal de límites en Perú: RENLIM. La geometría OSM es referencial y no sustituye límites vinculantes.

`district-boundaries-source.geojson` contiene un snapshot fijo de siete relaciones OSM adquirido mediante un único lookup controlado de Nominatim. El archivo geométrico y sus derivados se ofrecen bajo ODbL 1.0 y permanecen separados del dataset inmobiliario.

## Relaciones incluidas

| Distrito de UI | Nombre OSM | Relación | UBIGEO de contraste |
|---|---|---:|---:|
| Miraflores | Miraflores | 1944770 | 150122 |
| Santiago De Surco | Santiago de Surco | 1944844 | 150140 |
| Jesus Maria | Jesús María | 1944744 | 150113 |
| San Miguel | San Miguel | 1944825 | 150136 |
| Cercado de lima | Lima | 1944756 | 150101 |
| Magdalena Del Mar | Magdalena del Mar | 1944765 | 150120 |
| San Isidro | San Isidro | 1944812 | 150131 |

Los UBIGEO son referencias de contraste del proyecto; no se atribuyen a la respuesta OSM cuando esta no los incluye.

## Uso permitido en la demo

- Cargar únicamente una copia estática y versionada.
- Simplificar de manera determinista respetando las tolerancias del plan.
- Mostrar atribución visible y enlace a ODbL.
- Rotular cuadrantes como analíticos y no oficiales.

No se permiten llamadas a Nominatim, Overpass, tiles, geocodificadores u otros servicios cartográficos durante el runtime de la demo.

## Reproducción

La URL, fecha, `User-Agent`, relations, hashes y licencia se registran en `source-manifest.json`. Cualquier actualización futura requiere una nueva adquisición controlada, revisión de diferencias y actualización de fingerprints.
