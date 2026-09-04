# Pruebas de paridad

Este directorio documenta el límite de paridad entre la demo estática preservada y la aplicación productizada.

Durante la transición, el oráculo histórico permanece en `apps/web/tests`: valida contrato 2.0–2.4, CT-A–I/P, C01–C23, las seis etapas del recorrido y las ocho rutas expertas. No se duplica aquí para evitar dos fuentes de verdad.

Comandos canónicos desde la raíz:

```powershell
npm test
npm run verify:legacy
```

Toda nueva regla comercial debe probarse primero en `packages/domain`. Si sustituye una aserción legacy, la migración debe conservar el caso observable antes de retirar la prueba antigua.
