# P6-15 final — auditoría de write set

**Baseline:** `8740182bd0ebac64aaf7ea163dd184b5e90b6815`

**HEAD:** `a94f25159fb20770599b97c8fdfa37a2dabe551b`

## Diff correctivo

El rango contiene exactamente 8 paths:

1. `.planning/phases/06-commercial-narrative-qa/evidence/functional/08-decision-return.png`;
2. `.planning/phases/06-commercial-narrative-qa/evidence/functional/manifest.json`;
3. `.planning/phases/06-commercial-narrative-qa/evidence/responsive/expert-market-zoom-200.png`;
4. `.planning/phases/06-commercial-narrative-qa/evidence/responsive/manifest.json`;
5. `prototipo_ejecutable/public/js/views/journey.js`;
6. `prototipo_ejecutable/public/styles/61-journey.css`;
7. `prototipo_ejecutable/tests/journey-dom-parity.mjs`;
8. `prototipo_ejecutable/tests/journey-view.mjs`.

Todos están incluidos en el write set principal o condicionado de P6-15A.

## Resultado

- paths: `8`;
- violaciones: `0`;
- diff en protegidos: `0`, exit `0`;
- `git diff --check 8740182..a94f251`: exit `0`.

Protegidos comprobados sin cambios:

- `contracts/`;
- `scripts/data/`;
- `scripts/build-demo-data.js`;
- `prototipo_ejecutable/public/demo-data/`;
- `datos_relevantes/`;
- `.github/workflows/deploy-pages.yml`.

La suite regeneró temporalmente `expert-market-zoom-200.png` y su fingerprint por una variación de captura. Como esos cambios no pertenecen al checker ni al candidato, se restauraron exactamente a `HEAD` antes de cerrar el acta.

Los únicos cambios de trabajo que debe dejar el checker están bajo el write set de P6-15: `VERIFICATION_REPORT.md` y `evidence/verification/*`.
