# ADR-0005: edición revisada Nexo–web para la demostración

- Estado: aceptado para la demo controlada.
- Fecha: 23 de septiembre de 2026.
- Autoridad: solicitud explícita del Product Owner en esta conversación para corregir e incorporar el contraste en Miraflores y Jesús María (`USER-DEMO-CORRECTIONS-MIRAFLORES-JESUS-MARIA-2026-09-23`). No es aprobación de Legal u Operaciones.
- Complementa ADR-0004; no modifica su gate de recolección productiva.

## Decisión y límite

Crear una edición **revisada campo a campo**, limitada a ocho proyectos y nueve páginas oficiales ya identificadas. Incorpora únicamente observaciones no personales de los reportes sanitizados del 9/9 para VERSIA y MONTEROSSO; sanea seis referencias históricas de junio. La selección exacta, fecha original, campos retirados y huella de evidencia están en `data/source/demo-pilot/reviewed-web-comparisons.json`.

Esto autoriza mostrar esos campos revisados en esta demo, no importar ni publicar automáticamente un piloto. Los manifiestos y reportes originales conservan `publishable: false`; el conciliador productivo continúa rechazándolos. El build no lee `data/staging`, ni realiza solicitudes a las webs. No se habilita ninguna fuente en `source-registry.json`, no se reutiliza la autorización de captura del 9/9 y no se declara revisión humana o aprobación jurídica inexistente.

La revisión consiste en contrastar los valores con los reportes/insumos existentes y retirar ambigüedades. **No confirma actualidad, disponibilidad, existencia física ni precios de cierre.** No hay precio web válido ni stock web confirmado en estos ocho casos. Una ampliación de campos, proyectos o captura recurrente requiere otra decisión.

## Integridad y presentación

- Se conserva el CSV Nexo sin cambios; ninguna observación web modifica sus métricas, histórico, comparabilidad o medianas.
- Se conserva el CSV web histórico; la edición revisada es una entrada explícita versionada y con fingerprint.
- Los campos nuevos de septiembre no heredan atributos de la captura de junio. No se confunden ambientes con dormitorios ni estacionamientos de bicicletas con vehiculares.
- PARQUE NU mantiene dos páginas de unidades separadas, no un rango global ficticio.
- Un punto dentro de un rango o un año frente a una fecha completa no implica coincidencia exacta ni contradicción.
- Ficha y comparador usan el mismo dominio puro y muestran fuente/fecha, aportes y verificaciones comerciales pendientes.
- La versión publicada cambia a `dataset:viva-platform-demo-2026-09-23`. La edición declara captura web máxima del 9/9 en `matching.review_edition`; `metadata.cutoff_at`, benchmark e histórico conservan el corte analítico Nexo del 28/7 y sus fechas originales. Una nueva edición no significa una actualización de toda la base.

## Criterios y rollback

Pruebas: revisión determinista y fail-closed, Nexo intacto, ausencia de 6016 unidades, ambientes separados, precios no inventados, páginas de unidades independientes, serialización API y recorrido responsive ficha → selección → comparador.

Rollback: desplegar las imágenes del SHA anterior. No hay migraciones, cambios de credenciales, nuevas capturas ni mutaciones del almacén operativo.
