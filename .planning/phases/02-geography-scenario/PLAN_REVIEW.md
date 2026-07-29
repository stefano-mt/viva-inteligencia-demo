# Fase 2 — Revisión independiente del plan

## Estado

`FAIL — tres ciclos agotados; remediación posterior documentada, aún sin revalidación independiente`

Fecha: 2026-07-28.

Checker: `/root/phase2_plan_reader`.

El checker trabajó en modo read-only. No editó código, datos, estilos ni documentación.

## Alcance revisado

- `.planning/PROJECT.md`
- `.planning/STATE.md`
- `.planning/DECISIONS.md`
- `.planning/ROADMAP.md`
- `.planning/phases/01-data-contracts/CONTEXT.md`
- `CONTEXT.md`
- `UI-SPEC.md`
- `PLAN.md`
- `SOURCE-ASSESSMENT.md`

## Ciclo 1

Veredicto: `FAIL`.

Hallazgos principales:

1. ciclo imposible entre preflight, aprobación y adquisición;
2. contratos descritos como propuestos y congelados;
3. modelo de commit/draft indefinido;
4. recuperación de URL contradictoria;
5. score, cuantiles, denominadores y redondeos incompletos;
6. universo territorial mezclado con muestra de precio;
7. constantes geoespaciales incompletas;
8. gates por tarea no ejecutables;
9. baseline de `PROJECT.md` obsoleto;
10. `write_set` de planificación insuficiente;
11. versión de contrato sin congelar;
12. taxonomía de estados inconsistente;
13. teclado del mapa sin estrategia;
14. maker/checker, riesgos y post-merge sin responsables;
15. fallback cartográfico no operacional;
16. sobrealcance de CT-F, CSS, geometrías y terminología.

Remediación:

- P2-00A → P2-00B → HUMAN-GATE-A → P2-01;
- contrato `2.1.0`;
- URL, score, cuantiles R-7, precio y geografía normativos;
- cuatro universos de IDs;
- selector accesible equivalente al mapa;
- roles, HUMAN-GATE-B y verificación post-merge;
- alcance CSS y asistente acotados;
- baseline y drift 88/90 corregidos.

## Ciclo 2

Veredicto: `FAIL`.

El checker confirmó 11 de 16 hallazgos resueltos. Persistieron:

- estado único/confianza frente a cuatro ejes;
- P2-18 sin persistencia;
- HU-101.6 aún genérica;
- test P2-08 y compatibilidad P2-02 incompletos;
- ruta sin polígonos no operacional;
- rama `FAIL` ubicada en P2-17;
- catálogos URL/score abiertos;
- CT-I ambiguo ante 89/90;
- CTA sin destino;
- resumen de paralelismo desalineado.

Remediación:

- reglas y textos separados para escenario, geografía, comparabilidad y precio;
- P2-18 read-only seguido de P2-19 documental;
- tests dedicados y compatibilidad 2.0→reader 2.1;
- vuelta obligatoria a P2-00B para alternativa/sin polígonos;
- catálogos, normalización, `polygon_valid_count=90` y destino `#projects`;
- roadmap alineado.

## Ciclo 3

Veredicto: `FAIL`, estrecho.

El checker confirmó que todos los hallazgos del ciclo 2 estaban resueltos. Detectó tres gaps nuevos:

1. enums de estado sin reglas matemáticas de derivación;
2. `SOURCE-ASSESSMENT.md` requerido por contingencia, pero ausente del `write_set` P2-00B;
3. HUMAN-GATE-A sin evidencia versionada antes de P2-01.

Riesgos menores:

- nombres de olas del roadmap;
- ejecución pública de CT-C;
- dirección exacta de compatibilidad 2.0/2.1.

## Remediación posterior al ciclo 3

Sin afirmar un nuevo veredicto, el plan ahora:

- define derivación exacta de los cuatro estados;
- calcula `evidence_coverage_pct` como media de pesos disponibles y fija umbrales;
- incluye fixtures exactos para URL corregida, 89/90, 0/2/3 comparables y 2/3 precios;
- autoriza `SOURCE-ASSESSMENT.md` en P2-00B;
- incorpora P2-00C y `APPROVAL.md` como registro obligatorio de ruta, licencia, atribución, riesgos, responsable, fecha y versión documental;
- hace que P2-01 dependa de P2-00C y lea el registro;
- renombra el resumen del roadmap como líneas de trabajo;
- versiona un descriptor CT-C público y un comando `BASE_URL`;
- aclara que reader 2.1 debe leer 2.0, sin prometer que un reader 2.0 estricto entienda 2.1.

Estas correcciones no recibieron un cuarto reader-test porque el loop de coautoría limita la revisión a tres ciclos.

## Resultado operativo

- Plan creado: sí.
- Implementación autorizada: no.
- Descarga/versionado de geometría autorizado: no.
- Código funcional modificado: no.
- Siguiente gate: una nueva revisión independiente debe confirmar la remediación; después se requiere permiso/licencia verificable, HUMAN-GATE-A y P2-00C.

Este resultado histórico no habilitó implementación; la restricción se reevalúa en el ciclo 4 siguiente.

## Ciclo 4 — Revalidación independiente

Veredicto: `PASS WITH RISKS`.

El checker confirmó que los tres gaps de la revalidación anterior quedaron resueltos:

1. `geography_status` depende de disponibilidad/hash/parseo de geometría y acepta como `ready` un radio válido 0/0;
2. P2-05 produce solo `buildTerritorialContext`, P2-06 produce `buildComparabilityContext` y P2-07 compone el único `scenarioContext`;
3. P2-04 es propietario secuencial del hash público y P2-18 verifica `source-manifest.json#/derived/public_geojson_sha256`.

También validó el delta de fuente:

- siete relaciones OSM congeladas y cobertura preliminar 7/7;
- ODbL 1.0, atribución visible y share-alike documentados;
- GeoJSON geométrico separado del dataset inmobiliario;
- adquisición única, identificada y cacheada;
- cero Nominatim, Overpass, tiles o geocodificación en runtime;
- RENLIM conservado como referencia jurídica;
- dependencias y `write_set` ejecutables, sin colisiones paralelas.

No quedan gaps bloqueantes del plan. HUMAN-GATE-A debe aceptar explícitamente ODbL/share-alike, atribución visible, carácter referencial de OSM, posibles diferencias con RENLIM, adquisición puntual sujeta a la política vigente de Nominatim y publicación del aviso de licencia junto al GeoJSON.

## Resultado operativo actualizado

- Plan creado: sí.
- Checker independiente favorable: sí, `PASS WITH RISKS`.
- Implementación autorizada: no; falta HUMAN-GATE-A y P2-00C.
- Descarga/versionado de geometría autorizado: no.
- Código funcional modificado: no.
- Siguiente gate: HUMAN-GATE-A sobre la ruta OSM/ODbL y persistencia en `APPROVAL.md`.
