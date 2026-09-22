# Registro de fuentes de ingesta

`source-registry.json` es el registro que aplica el policy gate. `agency-source-catalog.json`
conserva la identidad, alcance y evidencia de planificación de las inmobiliarias priorizadas.

El catálogo `1.0.0` cubre las ocho inmobiliarias de la Ola 1. El registro `1.2.0` las incorpora
como fuentes individuales, pero **no autoriza recolección**: todas conservan
`reviewStatus: pending`, no tienen `authorizationReference` y su lista de targets está vacía.

El piloto técnico de Cantabria / VERSIA y Toratto / MONTEROSSO confirmó
`accessReview.routeRobotsStatus: allow` solo para las rutas auditadas. El `robotsStatus` de la
fuente permanece en `unknown` para impedir que esa evidencia acotada se interprete como permiso
global. Este avance técnico no cambia el gate: las ocho permanecen bloqueadas hasta que Legal,
Operaciones y el owner de datos registren una autorización auditable. El detalle está en
`docs/data/wave-1-source-pilot.md`.

El registro aislado `pilots/wave-1-demo-feasibility.json` limita VERSIA y MONTEROSSO a dos
pasadas por target (`calibration` y `validation`). La autorización del Product Owner registrada
desde esta conversación cubre solo esa prueba técnica no publicable; no habilita el registro
productivo, publicación ni reutilización. Una tercera pasada queda fuera del alcance autorizado.
El resultado sanitizado de ambas pasadas está documentado en
`docs/data/wave-1-demo-pilot-result.md`; los artefactos temporales permanecen fuera de Git.

`candidateTargets` conserva 16 URL de prueba derivadas del matching histórico. Los matches
altos y medios mantienen el ID Nexo; los bajos o no resueltos no lo hacen. Estas URL no son
ejecutables: solo una revisión puede promoverlas a `collection.targets`.

Estados importantes:

- `officialDomainConfirmed` / `domainIdentityStatus`: confirma identidad, no permiso de uso.
- `robotsAssessmentStatus: preliminary_root_allow_only`: registra una observación exploratoria;
  cada ruta objetivo debe revisarse antes de cambiar `robotsStatus` a `allow`.
- `automationAuthorizationStatus: not_registered`: no existe una autorización auditable.
- `policyStatus: blocked_pending_review_and_authorization`: el collector debe fallar cerrado.

El alias confirmado `GRUPO T&C` / `GRUPO TyC` se resuelve a `agency:grupo-tyc`; no forma parte
de las ocho fuentes de la primera ola, pero ya puede usarse para conciliación y evitar dobles
conteos.

Para habilitar una fuente se deben registrar, mediante una revisión separada:

1. rutas de proyecto inequívocas en `collection.targets`;
2. evaluación de `robots.txt` para esas rutas;
3. revisión legal y operativa aprobada;
4. `authorizationReference` verificable;
5. límites y campos permitidos del conector.

Solo después pueden cambiar `reviewStatus` y `robotsStatus`. La disponibilidad pública de una
web o sus datos no reemplaza estos gates, según ADR-0004.

`npm run ingestion:plan` presenta por separado el catálogo de la demo y la matriz histórica de
discovery, que tiene un alcance mayor. Sus cifras no deben compararse como si fueran el mismo
universo.
