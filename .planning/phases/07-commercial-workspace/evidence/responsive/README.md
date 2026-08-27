# P7-09 · Responsive, accesibilidad y densidad comercial

## Alcance

La evidencia cubre las 14 superficies definidas por el contrato ejecutable
C01–C23:

- seis etapas del Recorrido ejecutivo;
- Panorama, Proyectos, Inspector, Benchmark, Comparador, Checklist, Decidir y
  Seguimiento.

Cada superficie se verificó en `1440×900`, `1280×720`, `390×844` y en un
reflow equivalente a zoom 200% (`720×450`). El resultado son 56 capturas PNG,
indexadas con SHA-256 en `manifest.json`.

## Controles ejecutados

- cero overflow horizontal, solapamiento o truncamiento crítico;
- lectura principal y zona de trabajo alcanzables en todas las superficies;
- contenido operativo de al menos 16 px y metadata de al menos 13 px;
- controles visibles de al menos 44×44 px;
- contraste AA del título principal y foco perceptible;
- navegación por teclado, cierre con `Escape` y devolución de foco para menú,
  editor de escenario y paleta `Ir a…`;
- rail del Recorrido completo en escritorio y selector compacto en móvil;
- una sola acción primaria visible por pantalla;
- movimiento reducido y cero solicitudes externas o errores de navegador;
- fixture `tests/fixtures/commercial-claims.json` conservado byte a byte.

## Reproducción

Desde `prototipo_ejecutable`:

```powershell
npm.cmd run test:phase7:responsive
npm.cmd run test:a11y
```

La prueba responsive vuelve a generar las capturas y el manifiesto de esta
carpeta de forma local. P7-09 no modifica contratos, datos ni motores de la
demo.
