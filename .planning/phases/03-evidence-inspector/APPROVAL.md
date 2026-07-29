# Fase 3 — HUMAN-GATE-A

## Estado

**APROBADA** el 2026-07-29. Habilita P3-01; no equivale a implementación, verificación, merge ni despliegue.

## Registro de aprobación

- Responsable: Stefano.
- Fecha y hora de sesión: `2026-07-29T11:03:25.5945816-05:00`.
- Declaración exacta:

> Acepto A1–A8 y autorizo HUMAN-GATE-A de la Fase 3.

- Plan aprobado: commit `2ca7cf3`.
- Revisión independiente: `PASS` en `PLAN_REVIEW.md`.

## Condiciones aceptadas

### A1 — Activos CT-G

Las capturas originales de tarjeta y plano permanecen fuera del repositorio porque sus permisos son `pending` y `restricted`. La demo muestra metadata y transcripciones controladas.

### A2 — Evidencia neutral

Se pueden crear fichas y activos neutrales propios para los casos de demostración. Deben declarar “Representación controlada para demo; no es el documento original” y no copiar logos, layouts o diseños de terceros.

### A3 — Cobertura

La escala `30 / 22 / 5` describe cobertura base, enriquecida y profunda. Tipologías inspectables y activos autorizados se muestran por separado.

### A4 — Alcance

Se aceptan 10 tipologías inspectables y 5 agencias: 1 expediente observado, 9 controlados, 7 pares visuales controlados, 0 binarios originales de mercado y 17–20 documentos/evidencias. Una transcripción controlada no satisface “plano original”. Los dossiers originales se difieren hasta contar con permisos registrables.

### A5 — Clasificación

Los estados son certificado, revisable, inconsistente, ilegible e insuficiente. Una contradicción observada y bloqueante prevalece como inconsistente; no se corrige automáticamente.

### A6 — Áreas y verdad

`104.15 m²` conserva tipo no declarado; `Área Total 53.37 m2` conserva tipo total. El sistema no llama techada a ninguna de ellas ni elige una fuente como verdad.

### A7 — Elegibilidad

La exclusión aplica a hechos y tipología, no al proyecto completo. Los hechos incompatibles y Tipo 7 quedan no elegibles; Pardo Coast permanece en el universo territorial/comparables de Fase 2.

### A8 — Tecnología

La demo sigue estática y reproducible. No incorpora OCR en vivo, scraping, backend ni servicios externos.

## Documentos aprobados

- `CONTEXT.md`;
- `UI-SPEC.md`;
- `CASE-INVENTORY.md`;
- `PLAN.md`;
- `PLAN_REVIEW.md`;
- `HUMAN-GATE-A-REQUEST.md`.

## Límites

La aprobación:

- no autoriza publicar originales CT-G;
- no autoriza inventar planos, claims de mercado o datos reales;
- no amplía el alcance a integraciones, OCR, scraping o backend;
- no autoriza cambiar CT-D/CT-G, A1–A8, contrato, inventario, permisos, write sets o dependencias sin replanificación y nueva revisión;
- no autoriza merge automático ni evita el checker independiente P3-14;
- no sustituye HUMAN-GATE-B si el veredicto final fuera `PASS WITH RISKS`.

## Condición de validez

P3-01 puede comenzar únicamente desde una rama funcional derivada del commit que contiene esta aprobación. Cualquier cambio material a las condiciones aceptadas invalida este gate.
