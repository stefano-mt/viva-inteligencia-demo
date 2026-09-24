# Miraflores y Jesús María: Nexo frente a la web oficial

## Objetivo

Mostrar cómo una captura de la web propia añade información comercial a la base Nexo, sin reemplazarla ni atribuir vigencia a información histórica. Esta edición sigue ADR-0005.

## Qué mostrar

| Distrito | Proyecto / inmobiliaria | Ejemplo útil | Alcance |
| --- | --- | --- | --- |
| Miraflores | VERSIA / Cantabria | Mismo rango de 60–98 m² y dirección; entrega anual frente a fecha detallada; ambientes separados de dormitorios | Captura 9/9 revisada para demo |
| Miraflores | ASTER REDUCTO / Aster Homes | Áreas comunes anunciadas y entrega en marzo 2027 | Referencia histórica 14/6, pendiente de recaptura |
| Miraflores | Benavides 1361 / Gratto | Áreas comunes y rango publicado 64–92 m²; dirección corporativa excluida | Referencia histórica 14/6 |
| Miraflores | PARQUE NU / Grupo Magbis | Dos fichas independientes: Dúplex 801 y Típico 2-502 | Referencias de unidades, no rangos del proyecto |
| Jesús María | MONTEROSSO / Grupo Toratto | Web añade terraza y estacionamiento para bicicletas; área 69,56–69,88 m²; hasta 2 dormitorios | Captura 9/9 revisada para demo |
| Jesús María | Alejandría / Brazil | Áreas comunes anunciadas en el canal propio | Referencia histórica 14/6 |
| Jesús María | BEYOND / Grupo Maxx | Información web disponible pero parcial | Referencia histórica 14/6 |
| Jesús María | ZEGARRA 920 / Granadero | Coworking y terraza; área observada pendiente de identificar por modelo | Referencia histórica 14/6 |

## Recorrido comercial

1. Escoger distrito completo para evitar excluir un ejemplo por filtros de zona o dormitorios.
2. En Proyectos, abrir VERSIA o MONTEROSSO y leer **Qué aporta la web oficial**. Expandir Nexo/web para comprobar un dato y su fecha.
3. Seleccionar VERSIA + ASTER REDUCTO + Benavides 1361 en Miraflores. En Jesús María: MONTEROSSO + Alejandría + ZEGARRA 920.
4. Abrir Comparador. Revisar la comparación Nexo y, en la sección web, los datos de cada inmobiliaria junto con lo que aportan y lo que falta confirmar.
5. Explicar la decisión posible: preparar preguntas sobre servicios, tamaños/modelos y plazos antes de diseñar argumentos comerciales. No recomendar un precio de venta a partir de mínimos no emparejados.

## Límites que no deben convertirse en claims

- Se demuestra extracción técnica en dos webs, no una cobertura actualizada de todas las inmobiliarias.
- Ninguno de los ocho casos tiene precio web válido para demostrar descuentos o confirmar precios Nexo.
- Fecha de revisión de la demo y fecha de captura no son equivalentes. Nexo no se volvió a capturar.
- Faltante no significa inexistente. “Hasta 2” no significa exactamente 2. Ambientes no equivale a dormitorios.
- La actualización periódica sigue separada de la demo y conserva sus controles. No hay datos nuevos de redes sociales.

## Implementación

`tools/data/src/data/reviewed-web.js` aplica la edición allowlisted; `packages/domain/src/source-comparison.ts` y `source-decision.ts` comparan y redactan los hallazgos. `packages/snapshot` entrega la misma lectura a ficha y API comparador; `apps/web` solo la presenta. Los archivos originales de Nexo y web permanecen intactos.

## Verificación del 23/9/2026

- Instalación limpia, generación determinista, revisión de datos, tipado, pruebas unitarias/API, privacidad, paridad y compilación: correctos. Snapshot SHA-256: `cb9ac47d3fc4fa1c1bde6d3dcd5bb064f178862856beb6460c1aa1365af95050`.
- E2E general: 11 superficies; continuidad UX: 13 casos; contraste multifuente: 9 casos sobre los ocho proyectos, a 1440, 768 y 390 px y zoom CSS de prueba 200 %. Sin desborde horizontal, solicitudes externas ni entrega del snapshot al navegador.
- `npm run verify` completó pruebas y compilación; su último paso de auditoría no pudo acceder al registro desde el sandbox. Repetido `npm audit --audit-level=high` con acceso a red: código 0, dos alertas moderadas en `vitest`/`@vitest/mocker`, ninguna alta. No se aplicó una actualización mayor forzada. La imagen API, sin dependencias de desarrollo, reportó cero vulnerabilidades npm.
- Las imágenes web/API se construyeron y se activaron en Compose local. `/health/ready`, metadata y fichas revisadas respondieron 200 con la edición `dataset:viva-platform-demo-2026-09-23`; se comprobó también la interfaz desplegada de VERSIA en escritorio y MONTEROSSO en móvil. El servicio operativo y su volumen no se modificaron.
- Capturas de QA: `test-results/source-comparison/` (ignoradas por Git). CSV originales, registro de fuentes y manifiestos piloto intactos. No se realizaron nuevas capturas web, push ni publicación remota.
