# Validación humana integral

Estas plantillas se usarán una sola vez al cierre de P8-08. No constituyen evidencia de ejecución ni permiten declarar aceptación humana.

## Una carpeta nueva por sesión

1. Crear una carpeta `run-AAAA-MM-DD-alias/` fuera del repositorio o como artefacto de CI.
2. Copiar `session-metadata.template.json`, `reader-response.template.md` y `rubric.template.md` dentro de la carpeta.
3. Registrar el SHA inmutable desplegado, el entorno, el navegador y la duración.
4. Conservar literalmente las observaciones del lector y adjuntar solo evidencia consentida.
5. No declarar `PASS` mientras exista un campo pendiente o falte respaldo.

La persona lectora debe ser independiente del diseño y desarrollo de la demo. El protocolo comercial histórico permanece recuperable en la etiqueta `demo-static-v1`.

## Preflight reproducible

Antes de iniciar, registrar sin modificar el resultado de:

```bash
git status --short
git rev-parse HEAD
git rev-parse --short=12 HEAD
```

Cada repetición requiere un lector independiente nuevo y una carpeta nueva. La evidencia de una sesión fallida no se reemplaza ni se sobrescribe.
