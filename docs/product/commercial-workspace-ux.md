# Mesa de trabajo comercial: implementación UX

## Objetivo y alcance

Implementación de la auditoría autorizada del 22 de septiembre de 2026: coherencia de escenario, significado de datos, recuperación de consultas y una interfaz compacta para explorar, abrir fichas y comparar. Conserva la identidad Viva, cinco tareas principales, recorrido opcional, URLs y reglas comerciales. Se trabaja en la rama existente `feat/phase-8-web-ingestion-wave1`, sin descartar los cambios anteriores de ingesta y fichas multifuente.

No activa capturas externas, publicaciones, avisos automáticos, almacenamiento de consultas o selecciones, autenticación comercial ni un agente LLM. No convierte las zonas analíticas en divisiones oficiales ni los precios publicados en precios de cierre.

## Comportamiento aceptado

- **Proyectos:** las vistas «Comparables del escenario», «Todo el distrito» y «Todo el catálogo» distinguen tres universos. Solo se seleccionan proyectos que cumplen el escenario. Los filtros se aplican en el servidor antes de paginar.
- **Escenario:** aplicar confirma el nuevo contexto solo después de recibir evaluación, proyectos e historial. Ante error conserva el escenario y la selección anteriores, además del borrador. Cancelar, cerrar o navegar invalida la solicitud pendiente. Reiniciar es una acción explícita.
- **Ficha:** panel lateral en escritorio amplio y vista dedicada cuando no hay espacio. Al cerrar recupera página, selección, posición y control de origen. No es un diálogo modal.
- **Comparador:** conserva el orden de dos o tres proyectos; muestra nombres junto a las características y permite revisar todos los datos o diferencias y pendientes. Una ausencia no se llama coincidencia y una exclusión no se cuenta como diferencia de producto.
- **Mapa:** representa solo proyectos del escenario; selector textual equivalente a los puntos. La mediana de precio es calculada en dominio sobre todos los proyectos representables, no sobre una página. Cambiar de punto no permite que una respuesta anterior sobrescriba el último elegido.
- **Seguimiento:** cada evento lleva su proyecto y respeta el escenario completo. La antigüedad se interpreta al corte del dataset, no a la fecha del ordenador. «— / Aún no monitoreado» no es cero cambios. No se anuncian notificaciones automáticas disponibles.
- **Fuentes y precios:** una web enlazada no equivale a datos capturados. Nexo y web oficial siguen separados en la ficha. El cociente orientativo por m² queda bajo demanda; no se presenta como precio confirmado de una unidad.
- **Actualización:** corte del dato, preparación de la versión y fin de recopilación son cosas distintas. Un job terminado no demuestra que el usuario esté viendo datos nuevos. La publicación no tiene fecha registrada en el read model actual.
- **Acceso y recuperación:** paleta con filtro real, vacío, teclado y cierre al elegir la ruta actual; salto al contenido sin cambiar ruta; errores posteriores al arranque visibles y reintentables. Foco, borradores y desplegables se conservan en actualizaciones del mismo contexto.

## Contratos compatibles

| Operación de lectura | Entrada | Resultado adicional |
|---|---|---|
| `POST /api/v1/projects/query` | `scenario`, `page`, `pageSize` (máximo 100), `query`, `sort` | Página y `positioningStats: {count, medianPublishedPricePen}` sobre la consulta completa |
| `POST /api/v1/history/query` | `scenario`, `page`, `pageSize` (máximo 100) | Página con `project: ProjectSummary | null` en cada evento |
| Estado de recopilación | Sin cambio de entrada | `snapshotGeneratedAt` y `publication: {status: "not_recorded", publishedAt: null}` |

Los GET anteriores continúan disponibles. Ambos POST son cálculos sin persistencia, rechazan campos adicionales y usan el evaluador comercial existente. Las respuestas mantienen `datasetVersion` y `contractVersion`. El cliente rechaza versiones incompatibles o cambios de dataset durante una consulta. `lastPublishedAt` se conserva como alias legado, **no** como evidencia de publicación.

En los dos POST, `scenario` es obligatorio; los demás parámetros son opcionales.

## Responsabilidades y archivos

- Contratos: `packages/contracts/src/api.ts` y `scenario-query.ts`.
- Dominio: `packages/domain/src/positioning.ts` y regla compartida de rango de dormitorios en `legacy/comparability.js`.
- Repositorio/API: `packages/snapshot/src/repository.ts`, `types.ts`; `apps/api/src/app.ts`.
- Presentación: `apps/web/src/main.ts`, `api.ts`, `styles.css`.
- Estado de interacción: `apps/web/src/interaction-state.ts`, separado de reglas comerciales.
- Pruebas: unitarias junto a cada módulo, `tests/e2e/productized-e2e.mjs` y `tests/e2e/ux-continuity-e2e.mjs`.

No se hace un refactor masivo del entrypoint: la extracción inicial cubre continuidad y concurrencia; dividir todas las vistas en módulos es trabajo posterior, no condición para cambiar la semántica del producto.

## Verificación reproducible

```powershell
npm ci
npm run verify
docker compose config --quiet
```

`verify` incluye contratos, tipos, dominio, API, regresión estática, privacidad, determinismo, E2E de producto y continuidad, compilación y auditoría de dependencias. Para repetir solo continuidad con artefactos compilados: `npm run e2e:ux`. Los arneses levantan servidores aislados y no cambian el servidor que usa una persona.

Criterios: universo canónico en distrito/zona/radio/dormitorios/entrega y más de 100 proyectos; selección 2/3 entre páginas; borrador/foco; escenarios fallidos y respuestas invertidas; errores HTTP/timeout/contrato; mapa con identidad correcta; ficha y comparación sin desbordamiento en tamaños de escritorio, tableta, móvil y texto ampliado. Capturas y resultados generados no se versionan.

La verificación automática no sustituye pruebas con comerciales, lector de pantalla, teléfono físico ni auditoría completa WCAG. Tampoco acredita rendimiento p95 en Compose, Core Web Vitals de campo, publicación de imágenes ni despliegue productivo.

### Resultado de esta implementación

- `npm ci` y `npm run verify`: completados con salida 0. La suite de producto verificó 11 superficies sin descargar el snapshot ni depender de hosts externos.
- Continuidad ampliada: 13 casos E2E aprobados, incluyendo navegar durante el arranque, respuestas tardías, escenario fallido, selección entre páginas y retorno desde la ficha. Tras el último ajuste se repitieron la suite completa de continuidad y el chequeo de tipos de la web.
- Revisión visual: anchos de 1440, 1280, 768, 390, 360 y 320 px; cinco secciones principales y ficha con texto ampliado al 200 %. Sin desbordamiento horizontal en las vistas comprobadas. La ampliación de texto no equivale a una prueba de zoom nativo del navegador.
- `docker compose config --quiet`: salida 0, con advertencia de acceso denegado al archivo de configuración del usuario Docker. Solo valida la configuración; no se construyeron imágenes ni se desplegó Compose en esta ejecución.
- `git diff --check`: sin problemas de espacios o marcadores de conflicto.
- Auditoría de dependencias: cero vulnerabilidades de producción; dos avisos moderados en Vitest y su dependencia `@vitest/mocker`. El gate configurado en nivel alto pasó, pero los avisos quedan pendientes. No se forzó una actualización mayor de herramientas dentro de este cambio UX.
- Snapshot y contrato conservados: dataset `dataset:viva-platform-demo-2026-07-28`, contrato `2.4.0`, SHA-256 `dfb0841b439d0a03175a21a3c518a8c9b089039720cf7d9845abe676aea44081`.

Las capturas y el resumen visual están en la carpeta local de evidencias `outputs/ux-audit-2026-09-22` del workspace contenedor, fuera del repositorio. La vista temporal de revisión usa web en `127.0.0.1:4435` y API en `127.0.0.1:4434`, con recopilación externa deshabilitada; no es una URL publicada ni un servicio permanente. No se realizó commit, push ni publicación en esta ejecución.

## Prueba comercial pendiente y rollback

La prueba humana P2.2 queda pendiente: con el mismo escenario, localizar un proyecto, seleccionar tres entre páginas, explicar dos diferencias, volver a una ficha y distinguir falta de cobertura de cero cambios. Registrar dificultades y correcciones sin asumir mejoras porcentuales ni recopilar analítica automáticamente.

Para revertir una entrega integrada, revertir sus commits o desplegar el SHA anterior validado. No requiere migraciones de base de datos. En este checkout sucio no usar `reset --hard` ni restauraciones globales: preservar por separado los cambios previos de datos, ingesta y documentación. No borrar evidencias históricas ni artefactos locales del usuario.
