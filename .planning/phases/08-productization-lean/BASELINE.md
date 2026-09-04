# Baseline reproducible — Fase 8

## Git

- Baseline funcional y documental: `6210e5bc8a899ea30599586766b19854f148a6bc`.
- Baseline funcional de Pages: `5e4cfd064c6b008fcce43ea0e78792e13b1cedd5`.
- Etiqueta de rollback: `demo-static-v1`.
- Rama de ejecución: `feat/phase-8-productization-lean`.

## Producto

- Contrato público: `2.4.0`.
- Dataset: 714 proyectos legacy, 676 proyectos canónicos y 184 agencias.
- Superficies: seis etapas del recorrido y ocho rutas expertas.
- Casos de aceptación: CT-A–I/P.
- El navegador carga el snapshot completo y ejecuta los motores localmente.

## Verificación preimplementación

Ejecutado desde `prototipo_ejecutable/` después de `npm.cmd ci`:

```powershell
npm.cmd run verify
```

Resultado: `PASS`.

La suite confirmó contratos 2.0–2.4, C01–C23, 14 superficies, CT-A–I/P, determinismo, privacidad, responsive, zoom 200%, teclado, smoke y accesibilidad. Los archivos de evidencia modificados por la captura automática fueron restaurados inmediatamente al baseline.

