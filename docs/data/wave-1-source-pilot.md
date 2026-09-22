# Ola 1 — Piloto de fuentes oficiales

- Corte de revisión: 8 de septiembre de 2026
- Fuentes: Cantabria / VERSIA y Toratto / MONTEROSSO
- Resultado: viables técnicamente, bloqueadas para recolección automática
- Collector o lote productivo ejecutado: no; la revisión técnica consultó únicamente las rutas
  identificadas en este documento
- Capturas HTML o datos personales almacenados: no
- Resultado de la prueba técnica ejecutada: [Nexo vs webs oficiales](wave-1-demo-pilot-result.md)

## Para qué sirve este piloto

El piloto comprueba, antes de habilitar un collector, que la identidad del dominio, la ruta del
proyecto, `robots.txt`, los límites técnicos y el posible vínculo con Nexo sean auditables. Una
web pública y una regla `robots.txt` permisiva no constituyen por sí solas autorización para
automatizar ni reutilizar contenido. Por eso las dos fuentes conservan `reviewStatus: pending`,
no tienen `authorizationReference` y mantienen `collection.targets` vacío.

El resultado `allow` se registra dentro de `accessReview.routeRobotsStatus` y se limita a las
rutas enumeradas. El `robotsStatus` general de cada fuente sigue en `unknown`; solo podrá cambiar
en la misma revisión que apruebe y promueva los targets exactos.

### Alcance temporal autorizado para la demo

La autorización del Product Owner otorgada en esta conversación cubre exclusivamente la prueba
técnica no publicable de VERSIA y MONTEROSSO. No autoriza recolección productiva, publicación ni
reutilización del contenido. El contrato permite exactamente dos pasadas por target: una de
`calibration` para ajustar el extractor y una de `validation` para comprobar el resultado. Una
tercera pasada requiere una nueva autorización y no forma parte de este piloto. En ambas se
mantienen `publishable: false`, exclusión de HTML crudo, formularios y datos personales.

## Resultado por fuente

| Fuente | Proyecto Nexo | Acceso técnico | Hechos detectados | Riesgo principal | Decisión |
| --- | --- | --- | --- | --- | --- |
| Cantabria | VERSIA (`3981`) | Permitido para las rutas revisadas | Nombre, ubicación, pisos, área, ambientes, entrega, arquitecto y modalidad general de cuota inicial | Los únicos precios hallados pertenecen a una campaña vencida; el brochure excede el límite actual | Bloqueada hasta aprobación y autorización auditable |
| Toratto | MONTEROSSO (`1940`) | Permitido para las rutas revisadas | Nombre, ubicación, áreas, dormitorios, amenidades y datos legales del proyecto | La ficha y el portal de protección describen alcances distintos; el portal agrupa varios proyectos y datos de formularios | Bloqueada hasta aprobación y autorización auditable |

## Cantabria — VERSIA

### Rutas y acceso

- Dominio oficial: `https://cantabriainmobiliaria.pe/`.
- Ruta publicada en el sitemap: `https://cantabriainmobiliaria.pe/proyecto/versia-miraflores/`.
- La ruta redirige dentro del host autorizado a
  `https://cantabriainmobiliaria.pe/landing-versia/`.
- `robots.txt`: HTTP 200, `User-agent: *` y `Disallow:` vacío para las rutas revisadas.
- SHA-256 de `robots.txt`:
  `4b9e711707cc22f784c9215f389392622bdf6557476460b734c0c6a3c2d7a6cb`.
- Perfil de extracción recomendado: HTML semántico. La landing no ofrece un objeto de proyecto
  útil en JSON-LD ni JSON embebido.

### Hechos detectados y compatibilidad

- Proyecto VERSIA, Miraflores, Enrique Palacios 830.
- Nueve pisos, áreas publicadas de 60 a 98 m² y entrega declarada para 2028.
- La web dice “2 y 3 ambientes”. Debe conservarse el término original; no se convertirá
  automáticamente a dormitorios.
- L1007 Arquitectos y posibilidad general de fraccionar la cuota inicial.

El contrato vigente ya admite ubicación, área, entrega y financiación, pero no modela pisos,
arquitecto ni el concepto abierto de “ambientes”. Esos hechos quedan fuera del staging hasta
aprobar una extensión contractual que preserve su significado original.

El HTML también conserva términos de una campaña que venció el 8 de marzo de 2026: precio
regular S/ 615 000 y promocional S/ 580 000 para una unidad específica. Esos importes no son un
precio vigente. El contrato actual no modela campañas vencidas, por lo que el extractor debe
excluirlos de `published_price`.

El brochure oficial pesa más de 3 MB. Queda fuera porque supera `maxResponseBytes` y el pipeline
actual no habilita extracción PDF.

### Políticas revisadas

- Términos y condiciones: `https://cantabriainmobiliaria.pe/terminos-y-condiciones/`.
- Privacidad: `https://cantabriainmobiliaria.pe/politicas-de-privacidad/`.

No se identificó una prohibición expresa de automatización, pero tampoco una autorización
expresa para la recolección y reutilización.
Los formularios y scripts de captación contienen o procesan datos personales y quedan fuera del
alcance.

## Toratto — MONTEROSSO

### Rutas y acceso

- Dominio oficial: `https://www.grupotoratto.com/`.
- Ficha canónica: `https://www.grupotoratto.com/departamento/monterosso/`.
- Documento complementario:
  `https://www.grupotoratto.com/proteccion-al-consumidor/`.
- `robots.txt`: HTTP 200; la regla general permite `/` y las rutas revisadas no coinciden con las
  exclusiones declaradas.
- SHA-256 de `robots.txt`:
  `ccea52bf41f9ea8ccb1b5b746860a1bf550438d0beeb5289ef05d1425bede91b`.
- Perfil recomendado: WordPress más HTML semántico. El JSON-LD describe la página y la
  organización, no una oferta inmobiliaria.

### Hechos y conflicto que deben conservarse

La ficha comercial publica “hasta 2 dormitorios” y 69,56–69,88 m², además de lobby, terraza,
parrilla y estacionamiento para bicicletas. El portal de protección describe el proyecto con 36
departamentos, tres sótanos, nueve pisos, 1–3 dormitorios y 59,32–75,89 m².

Área, dormitorios y amenidades caben en el contrato vigente. El número de pisos, sótanos,
departamentos y los documentos legales requieren campos contractuales nuevos antes de poder
publicarse.

Estos valores no se sobrescriben ni se promedian. Se registran como observaciones oficiales
separadas, con su URL, fecha y alcance documental. La diferencia podría corresponder a proyecto
completo frente a oferta comercial remanente, pero esa explicación es una hipótesis y requiere
revisión humana.

La ficha no publica precio. El portal contiene campañas y documentos de varios proyectos, además
de formularios. Un extractor genérico no debe atribuir a MONTEROSSO un precio o texto tomado de
otra sección. Se requiere un extractor acotado por encabezado de proyecto y que descarte campos
de contacto. Una campaña de agosto de 2026 ya venció al corte y solo podría modelarse como
histórico.

No se encontró una página general de términos en las rutas convencionales. El portal de
protección incluye privacidad y términos de campañas, pero no se identificó una autorización
expresa para automatización o reutilización.

## Regla de conciliación con Nexo

1. Nexo y cada documento oficial generan observaciones distintas.
2. El ID Nexo vincula la entidad, pero no convierte una fuente en autoridad sobre la otra.
3. Un valor oficial discrepante se muestra como contraste y queda pendiente de revisión.
4. Los precios vencidos, ambiguos o no asociados inequívocamente al proyecto no se publican como
   precio vigente.
5. Ninguna captura, formulario, teléfono, correo o dato personal llega al read model público.

## Gate pendiente

Para promover cualquiera de estas rutas a `collection.targets` se necesita una referencia
auditable aprobada por Legal, Operaciones y el owner de datos de Viva que cubra acceso batch y
reutilización de hechos públicos. Después se ejecutará una sola recolección controlada, con
concurrencia uno por host, intervalo mínimo de 1.500 ms, staging privado y QA humana antes de
publicar. La [ficha de autorización](source-authorization-template.md) enumera los datos y
aprobaciones que deben registrarse.
