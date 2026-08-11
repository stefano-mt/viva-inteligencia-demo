# Evidencia de P6-14

Esta carpeta está preparada, pero el ensayo aún no ha sido ejecutado.

## Una carpeta nueva por sesión

1. Crear `run-AAAA-MM-DD-alias/`. Si el nombre ya existe, añadir un sufijo; nunca reutilizar ni sobrescribir una carpeta.
2. Copiar `session-metadata.template.json` como `run-AAAA-MM-DD-alias/session-metadata.json` y completar todos los campos.
3. Copiar `reader-response.template.md` como `run-AAAA-MM-DD-alias/reader-response.md` sin resumir ni corregir la respuesta del lector.
4. Copiar `rubric.template.md` como `run-AAAA-MM-DD-alias/rubric.md` y marcar cada criterio con evidencia concreta.
5. Añadir a esa misma carpeta capturas o grabación consentida del inicio, mapa, Tipo 7, decisión y cierre.

Antes del prompt, ejecutar y registrar `git status --short`, `git rev-parse HEAD`, `git rev-parse --short=12 HEAD` y `git remote get-url origin`. La copia no es válida si el primer comando muestra cambios.

Cada repetición requiere un lector nuevo. Una sesión `FAIL` o `INVALID` permanece guardada y no se reemplaza.

No declarar `PASS` mientras algún campo permanezca pendiente o no exista respaldo suficiente.
