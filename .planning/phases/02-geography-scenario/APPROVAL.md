# Fase 2 — HUMAN-GATE-A

## Estado

`APPROVED — P2-01 habilitada`

## Registro de aprobación

- Responsable: Stefano, responsable de producto en este hilo.
- Aprobación explícita: “Sí, apruebo.”
- Timestamp: `2026-07-28T14:22:24-05:00`.
- Rama: `feat/phase-2-geography-scenario`.
- Commit documental revisado: `f258ebac2d07bb49ae97273cfb90f32f37d80214`.
- Veredicto independiente: `PASS WITH RISKS`.

La respuesta aprueba la solicitud inmediatamente precedente: usar OSM/ODbL en las condiciones descritas e iniciar la implementación de Fase 2.

## Ruta cartográfica aprobada

- Fuente: OpenStreetMap contributors.
- Licencia: Open Database License 1.0 (ODbL).
- Copyright/licencia: `https://www.openstreetmap.org/copyright`.
- ODbL 1.0: `https://opendatacommons.org/licenses/odbl/1-0/`.
- Guía de atribución: `https://osmfoundation.org/wiki/Licence/Attribution_Guidelines`.
- Política de adquisición: `https://operations.osmfoundation.org/policies/nominatim/`.
- Lookup aprobado:
  `https://nominatim.openstreetmap.org/lookup?osm_ids=R1944770,R1944844,R1944744,R1944825,R1944756,R1944765,R1944812&format=geojson&polygon_geojson=1`
- Uso: una adquisición controlada y cacheada durante P2-01; cero llamadas cartográficas en runtime.

Relaciones aprobadas:

| Distrito | Relación OSM |
|---|---:|
| Miraflores | 1944770 |
| Santiago de Surco | 1944844 |
| Jesús María | 1944744 |
| San Miguel | 1944825 |
| Lima, alias `Cercado de lima` | 1944756 |
| Magdalena del Mar | 1944765 |
| San Isidro | 1944812 |

## Atribución aceptada

Texto visible mínimo:

> © OpenStreetMap contributors · ODbL 1.0. Geometría referencial; límites legales: RENLIM. Cuadrantes analíticos no oficiales.

El GeoJSON se publica como base derivada separada bajo ODbL 1.0, con aviso de licencia en el archivo/metadata, `README.md`, manifiesto y módulo cartográfico.

## Riesgos aceptados

1. OSM es colaborativo y referencial; puede diferir del límite legal vigente en RENLIM.
2. La base geométrica derivada se redistribuye bajo ODbL 1.0 y share-alike.
3. La atribución visible y permanente forma parte de la interfaz.
4. Las relaciones OSM pueden cambiar en el futuro; el snapshot, timestamp y hashes fijan la versión usada por la demo.
5. Nominatim se usa una sola vez, con `User-Agent` identificable y caché, sujeto a reconfirmar su política al ejecutar P2-01.
6. Los UBIGEO se usan como contraste y alias internos; no se presentan como atributos originales de OSM cuando la respuesta no los incluye.
7. Los cuadrantes son divisiones analíticas por medianas y no zonas oficiales.
8. Una diferencia cartográfica o de cobertura se expone; no se oculta para sostener el claim.

## Riesgos y usos rechazados

1. Presentar OSM o los cuadrantes como límites oficiales o jurídicamente vinculantes.
2. Mezclar la base geométrica ODbL con datos inmobiliarios propietarios dentro de una única base sin revisión legal adicional.
3. Omitir atribución, licencia o share-alike del GeoJSON.
4. Consultar Nominatim, Overpass, tiles o geocodificadores durante la demo.
5. Sustituir la fuente aprobada, relation IDs o condiciones de licencia sin repetir assessment, checker y HUMAN-GATE-A.
6. Incorporar ubicación de personas o datos personales.

## Documentos aprobados

| Documento | SHA-256 |
|---|---|
| `CONTEXT.md` | `6468c7c70f854a6b75c5335b2766755d9614c413d9e7ca4da9c1bad0ffa11831` |
| `UI-SPEC.md` | `d0998a6fa04d64cf21ef1795edaf3e27db9cc12376b671cd38526bd68dcd8572` |
| `PLAN.md` | `3e34dfbf70fa1c6bb96196bf7f161acf9feb724521fbe6818b636d591783aa7f` |
| `SOURCE-ASSESSMENT.md` | `eecc043c9ab4128de016b0c6ea4f7137fea8e33e6f216c99548f6545beb9691c` |
| `PLAN_REVIEW.md` | `e7dc74c35f3e7577b76079154caf0c338ec17829d64cdbf87f3e76d786217677` |

## Condición de validez

P2-01 puede iniciar únicamente si la fuente, licencia, relaciones, atribución y restricciones coinciden con este registro. Cualquier diferencia reactiva la stop rule y exige una nueva decisión humana.
