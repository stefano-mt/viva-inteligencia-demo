# Ola 0: catálogo de webs oficiales

## Resultado

La Ola 0 convierte la investigación del 8 de septiembre de 2026 en dos artefactos operativos:

- `data/source/ingestion/agency-source-catalog.json`: identidad, alias, cobertura histórica y
  bloqueos de las inmobiliarias prioritarias;
- `data/source/ingestion/source-registry.json`: entradas que el policy gate puede evaluar.

No se realizó una captura ni se habilitó una fuente. Un dominio oficial confirmado demuestra
identidad; no demuestra autorización contractual ni compatibilidad de todas sus rutas con
`robots.txt`.

## Ola 1 preparada

| Inmobiliaria | Proyectos demo | Dominio registrado | Arquetipo inicial |
|---|---:|---|---|
| Invent Inmobiliaria | 6 | `invent.com.pe` | JSON embebido / HTML |
| Cantabria | 5 | `cantabriainmobiliaria.pe` | WordPress / sitemap / HTML |
| HL Desarrollos Inmobiliarios | 4 | `hldi.pe` | WordPress / sitemap / HTML |
| Inhouse | 4 | `inhouse.com.pe` | JSON embebido / HTML |
| Multiurbe | 2 | `multiurbe.com` | WordPress / sitemap / HTML |
| Proyec Inmobiliaria | 2 | `proyec.com.pe` | WordPress / sitemap / HTML |
| Toratto Grupo Inmobiliario | 2 | `grupotoratto.com` | WordPress / sitemap / HTML |
| Verdant Inmobiliaria | 1 | `verdant.pe` | WordPress / sitemap / HTML |

Son 26 proyectos de la demo. Los porcentajes históricos del catálogo sirven para priorizar QA;
no son cobertura vigente ni promesa de que cada campo pueda publicarse.

El registro conserva 16 `candidateTargets` derivados de
`data/source/nexo_web_project_match.csv`. Los matches altos o medios incluyen el ID Nexo; los
matches bajos o no resueltos no lo incluyen y exigen revisión humana. Algunos sirven como
muestra del conector pero quedan fuera de los siete distritos de la demo. Ninguno es un target
ejecutable: `collection.targets` permanece vacío.

## Alias resuelto

`GRUPO T&C` y `GRUPO TyC` se consideran nombres de origen de la entidad canónica
`agency:grupo-tyc`, con dominio `grupotyc.com`. Los 17 registros de proyecto asociados se
conservan con su nombre original, pero el matching debe usar el identificador canónico.

## Condición de entrada a la Ola 1

Cada fuente permanece bloqueada hasta que una revisión auditable promueva candidatos a targets
ejecutables, valide términos y rutas de `robots.txt`, documente los campos permitidos y registre
una autorización. Cumplidas esas condiciones, el cambio de policy debe revisarse en PR y probar
que el collector continúa fallando cerrado para las demás fuentes.

Consulta [Actualización continua y contraste multifuente](continuous-ingestion.md) y
[ADR-0004](../adr/0004-controlled-ingestion-and-published-read-model.md) para el flujo completo.
