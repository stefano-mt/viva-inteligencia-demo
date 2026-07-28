# Uso de Graphify en este repositorio

## Objetivo

Graphify reduce lecturas indiscriminadas y ayuda a ubicar hubs, dependencias e impacto. No reemplaza la lectura dirigida, los tests ni la revisión de criterios.

## Ejecución reproducible sin instalación global

En PowerShell, desde la raíz:

```powershell
$env:UV_CACHE_DIR = "$PWD\.cache\uv"
uvx --from graphifyy graphify extract . --code-only --no-cluster
uvx --from graphifyy graphify god-nodes --top 15
uvx --from graphifyy graphify query "frontend navigation views state data rendering" --budget 3000
```

Los outputs de `graphify-out/` son locales y están ignorados por Git.

## Resultado del baseline

- 8 archivos de código.
- 172 nodos.
- 634 relaciones.
- Hubs: `escapeHtml`, `renderDashboard`, `render`, `renderProjectDetail`, `renderMarket`, `renderCompare`, `buildBenchmark`.

Interpretación: navegación, vistas, eventos y utilidades están muy concentrados en `public/app.js`. Graphify respalda el gate de un único escritor UI hasta la modularización.

## Resultado posterior a 0B

Ejecución incremental del 2026-07-28:

- 12 archivos de código cambiaron y 6 quedaron sin cambios.
- 207 nodos.
- 726 relaciones.
- La consulta `frontend navigation views state data rendering` devuelve fronteras explícitas para `app`, `state`, `controller`, `navigation`, `domain` y las vistas.

Los god nodes funcionales siguen siendo `escapeHtml`, renderizadores de vistas, formatos y benchmark. La concentración ya no está en `app.js`, pero `domain.js` conserva lógica compartida y requiere un propietario único hasta una extracción posterior.

## Loop recomendado

### Inicio de fase

1. Regenerar el grafo si cambió código desde el último mapa.
2. Consultar el concepto o flujo de la fase.
3. Usar `affected` o `path` para evaluar impacto.
4. Confirmar hallazgos importantes en el código.

### Fin de fase

1. Regenerar.
2. Comparar hubs y dependencias nuevas.
3. Verificar que no se creó otro “god node”.
4. Registrar solo conclusiones útiles en el resumen de fase.

## Restricciones observadas

- `--code-only` omite documentos, imágenes y CSV.
- Dos JSON de calidad no produjeron nodos en el baseline.
- El SQL requiere el extra `graphifyy[sql]`.
- CSS/HTML y relaciones dinámicas no quedan descritos con la misma fidelidad que funciones JavaScript.
- El grafo muestra conectividad, no corrección funcional.
- La extracción semántica con backend LLM requeriría credenciales y una decisión de privacidad; no está autorizada por defecto.

## Uso en delegación

El explorador puede devolver:

- nodos relevantes;
- rutas y líneas;
- relaciones de llamada;
- áreas potencialmente afectadas;
- incertidumbres que requieren lectura directa.

El planificador no debe asignar archivos basándose solo en el grafo. Debe validar el `write_set` contra imports, estado compartido, estilos y pruebas.
