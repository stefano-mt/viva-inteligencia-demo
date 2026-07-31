# Fase 4 — HUMAN-GATE-A

## Estado

**APROBADA** el 2026-07-31. Habilita P4-00D y, si su baseline pasa, P4-01. No equivale a implementación, verificación, merge, revisión legal ni despliegue.

## Registro de aprobación

- Responsable: Stefano.
- Fecha y hora de sesión: `2026-07-31T11:11:10.4019829-05:00`.
- Declaración exacta:

> Acepto A1–A12 y autorizo HUMAN-GATE-A de la Fase 4.

- Plan aprobado: commit `be5fd33`.
- Revisión independiente inicial: `FAIL`.
- Re-review vigente: `PASS WITH RISKS`; B1–B4 cerrados documentalmente.

## Condiciones aceptadas

1. **Fuente:** snapshot Nexo fijo y ya versionado, sin scraping en vivo; `legal_status = pending_review` no sustituye revisión jurídica para producción o distribución adicional.
2. **Elegibilidad:** “certificado” significa solo elegible bajo reglas internas; la UI prefiere “referencia elegible”.
3. **Precio:** se rotula `Precio publicado desde`; no es promedio, cierre, venta real ni tasación y no hay conversión de moneda.
4. **Área:** benchmark total-only; no se infieren áreas techadas o libres.
5. **Unidades:** `unit_count` solo puede significar unidades reportadas por la publicación; nunca stock, inventario o absorción.
6. **Cualitativo:** amenities son atributos anunciados, no existencia física verificada; `No informado` no es `No tiene`.
7. **Cobertura baja:** acabados y estacionamientos degradan honestamente a insuficiente; CT-D no se extrapola al mercado.
8. **Umbrales:** cuantitativo `n >= 3/1–2/0`; cualitativo `n >= 5/1–4/0`, con estados y narrativa separados.
9. **CT-G:** Pardo Coast permanece territorial; Tipo 7 y hechos incompatibles siguen excluidos; no se elige entre 104.15 m² y 53.37 m².
10. **Exportación:** HU-505 queda diferida; reabrirla exige enmienda posterior a privacidad y responsive.
11. **Pairing:** los cocientes de mínimos actuales son `orientative_noncomparable`; no entran al benchmark elegible ni sustentan recomendación de precio. Solo `source_paired` puede ser elegible.
12. **Runtime:** se autoriza únicamente añadir 2.3 al allowlist de `scenario.js` y probar arranque 2.1/2.2/2.3; no se modifica semántica territorial F2.

## Límites

La aprobación no autoriza:

- adquisición nueva, scraping, OCR en vivo, backend o red runtime;
- publicar evidencia restricted/pending, PII, rutas locales o HTML crudo;
- convertir mínimos no emparejados en una referencia elegible;
- modificar archivos protegidos fuera de A12;
- ampliar un `write_set` sin enmienda y nuevo reader-test;
- merge o despliegue automático;
- omitir checker independiente, HUMAN-GATE-B si aplica o verificación post-merge.

## Condición de validez

P4-00D parte del commit que contiene esta aprobación. P4-01 solo comienza si el lockfile, baseline browser y regresiones pre-implementación pasan. Un cambio material en A1–A12, pairing, fuente, contrato, umbrales, write sets o alcance invalida el gate y exige replanificación.
