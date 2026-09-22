# Ficha de autorización de una fuente web oficial

Esta ficha se completa antes de mover una URL de `candidateTargets` a `collection.targets`. La
aprobación debe vivir en el sistema documental de Viva; el registro solo conserva su referencia
auditable y los límites aprobados.

## Identidad y propósito

- `sourceId`:
- Inmobiliaria y dominio oficial:
- Proyecto(s) y rutas exactas:
- Propósito comercial de la recolección:
- Owner de datos:

## Acceso revisado

- Fecha y responsable de revisión de `robots.txt`:
- URL y SHA-256 de `robots.txt`:
- Resultado por cada ruta:
- Términos, privacidad y documentos revisados:
- Bloqueos técnicos observados:

## Alcance permitido

- Campos públicos autorizados:
- Documentos autorizados: HTML / JSON / PDF / otros:
- Frecuencia máxima:
- Concurrencia por host:
- Identificación del agente:
- Retención de capturas privadas:
- Uso permitido en el read model:

## Exclusiones obligatorias

- Formularios, leads, teléfonos, correos y demás datos personales.
- Endpoints autenticados, CAPTCHA y medidas técnicas de control.
- Precios sin proyecto, unidad, moneda o vigencia inequívocos.
- Campañas vencidas como si fueran ofertas vigentes.
- Redes sociales sin API o permiso escrito específico.

## Aprobaciones

- Legal — nombre, decisión y fecha:
- Operaciones / Plataforma — nombre, decisión y fecha:
- Owner de datos — nombre, decisión y fecha:
- `authorizationReference` verificable:
- Inicio y vencimiento de la autorización:
- Condiciones de revocación:

## Activación técnica

Una vez aprobada la ficha:

1. actualizar en un mismo cambio `reviewStatus: approved`, `robotsStatus: allow`,
   `automationAuthorizationStatus: registered`, `policyStatus: approved_for_controlled_collection`,
   `accessReview.legalStatus: approved`, `accessReview.operationalStatus: approved`,
   `accessReview.decision: approved` y `authorizationReference`;
2. comprobar que `allowedHosts`, límites, agente y campos coincidan con la autorización;
3. limitar `collection.targets` exactamente a las rutas revisadas y autorizadas;
4. ejecutar primero un `dry-run` y revisar el manifiesto;
5. realizar una única captura controlada en staging privado;
6. revisar PII, asociación de entidad, vigencia y conflictos;
7. publicar únicamente una versión validada y conservar el snapshot anterior para rollback.

No se debe aprobar solo una parte de esos campos. La transición incompleta debe fallar cerrada y
volver a `blocked_pending_review_and_authorization`.
