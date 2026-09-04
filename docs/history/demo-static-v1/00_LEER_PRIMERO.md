# Entrega tecnica - Prototipo Viva Inteligencia Comercial

Esta carpeta contiene solo los artefactos relevantes para que el equipo tecnico implemente la plataforma a partir del prototipo visual y la evidencia generada en el PoC.

## Contenido

```text
entrega_equipo_tecnico_viva_prototipo/
  00_LEER_PRIMERO.md
  prototipo_ejecutable/
    package.json
    server-static.js
    public/
    scripts/
  datos_relevantes/
  documentacion_implementacion/
  referencias_clave/
```

## Que debe revisar primero el equipo

1. `documentacion_implementacion/01_resumen_para_equipo_tecnico.md`
2. `prototipo_ejecutable/public/index.html`
3. `prototipo_ejecutable/public/app.js`
4. `datos_relevantes/viva_minimum_dataset_latest.csv`
5. `datos_relevantes/service_scope_matrix.csv`
6. `documentacion_implementacion/04_mapa_datos_y_archivos.md`

## Ejecutar el prototipo

Desde `prototipo_ejecutable/`:

```powershell
npm.cmd run dev
```

Abrir:

```text
http://localhost:4173
```

Validar sintaxis:

```powershell
npm.cmd run check
```

## Rutas del prototipo

```text
/#dashboard   Resumen comercial
/#projects    Catalogo de proyectos
/#market      Mercado e inmobiliarias
/#compare     Comparador de publicaciones
/#trust       Confianza y alertas de datos
/#assistant   Asistente comercial simulado
/#activity    Actividad del sistema
```

## Que se excluyo deliberadamente

No se incluyeron logs, snapshots HTML crudos, outputs timestamped, backups, scripts exploratorios de todas las fases ni archivos duplicados. Esos artefactos sirven para auditoria profunda, pero no son necesarios para que el equipo implemente el producto.

## Nota de alcance

El prototipo usa datos publicos scrapeados/normalizados y matrices derivadas del PoC. No representa ventas reales, ingresos reales ni stock real completo de Viva. Para produccion, cualquier automatizacion sobre fuentes publicas debe pasar por revision legal/operativa y por validacion de calidad.
