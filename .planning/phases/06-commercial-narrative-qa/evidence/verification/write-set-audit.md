# P6-15 — Auditoría de diff, protegidos y write sets

**Rango:** `25300b1..7a08fca`

## Resumen

- 22 commits.
- 216 archivos.
- 13,374 inserciones y 1,194 eliminaciones.
- `git diff --check`: una advertencia de línea vacía final en `UX-AUDIT.md`; sin error de código o datos.

## Protegidos

Sin cambios respecto de la base:

- `contracts/demo-v2.schema.json`;
- `scripts/build-demo-data.js`;
- `scripts/data/*`;
- `public/demo-data/*`;
- `datos_relevantes/*`;
- `.github/workflows/deploy-pages.yml`;
- activos/evidencia de producto F3–F5.

Los hashes reproducidos por el gate permanecen:

- dataset: `20d44245c956a198c8621b3f544115387037b73cc462e50f63a5ce6d61fb4a37`;
- coverage: `639b613aff89f9605c3dcc74a7914700dfa89fb84ababe70910fc25c3ba81864`;
- GeoJSON: `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0`.

## Write sets funcionales

P6-01–P6-13 y P6-14A–D mantienen runtime, estilos, pruebas y evidencia dentro de la unión de write sets aprobados y sus enmiendas documentadas. No hay modificación de contrato, datos, writer, elegibilidad, motores F3–F5 o workflow.

## Drift procedimental menor

Tres cierres documentales ampliaron el commit más allá del write set literal del paso, aunque solo para actualizar memoria/estado:

- `bb9b5a8` (P6-00B) modifica documentos corregidos además de `PLAN_REVIEW.md`;
- `8e760b6` (P6-00C) actualiza `ROADMAP.md` además del set declarado;
- `67009b3` (P6-00D) actualiza `ROADMAP.md` y `STATE.md` además de baseline/evidencia.

No afecta runtime ni reproducibilidad, pero contradice la frase `write sets cerrados` del plan. Se clasifica como P3/proceso. Debe normalizarse en la memoria P6-16 o aceptarse explícitamente; no se considera cubierto por R6-H1.

## Working tree del checker

Al iniciar solo existía una carpeta no rastreada creada por el usuario bajo `evidence/rehearsal/run-2026-08-10-lector01/`. No se modificó, eliminó, añadió al índice ni utilizó como evidencia formal. Los únicos archivos nuevos del checker pertenecen a `evidence/verification/` y `VERIFICATION_REPORT.md`.
