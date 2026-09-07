# Lectura territorial y trazabilidad multifuente

## Qué resuelve

Panorama permite explorar cada distrito como un conjunto de proyectos y como cuatro zonas analíticas internas. Un punto seleccionado conserva su identidad entre el mapa geográfico y el gráfico de área/precio, muestra un resumen al lado y permite abrir la ficha completa.

## Zonas analíticas internas

Las zonas Noroeste, Noreste, Suroeste y Sureste se calculan con las medianas de latitud y longitud de los proyectos del distrito que tienen coordenadas válidas. El método versionado es `district_valid_point_coordinate_medians_v1`.

Esta división sirve para acotar una lectura comercial reproducible, pero:

- no es zonificación urbana ni una delimitación oficial;
- no sustituye a RENLIM, al planeamiento municipal ni a una definición de zonas comerciales aprobada por Viva;
- puede cambiar cuando cambia el universo georreferenciado, por lo que el dataset y el método deben mostrarse juntos;
- una zona comercial futura debe registrar owner, criterios, geometría, fecha y versión antes de reemplazarla.

## Área y precio publicado

El eje horizontal representa área total publicada y el vertical precio publicado. La línea horizontal es la mediana de los precios que están visibles en el gráfico. No representa precio real de cierre, tasación ni una recomendación de precio.

## Fuentes de la ficha

Las fuentes permanecen separadas. `Nexo Inmobiliario` identifica la observación del portal o feed base. `Web propia` solo aparece cuando el snapshot contiene una coincidencia `match_high` y `requires_human_review=false` entre el proyecto Nexo y una URL oficial inventariada de la inmobiliaria. Esta vinculación no convierte automáticamente los campos de una fuente en hechos de la otra.

La etiqueta `Referencia versionada` significa que la URL y el resultado de matching están en los insumos versionados. Cuando la captura externa no forma parte del snapshot, la interfaz lo declara expresamente. Una red social solo se muestra si existe una observación estructurada de tipo `social_network`; el producto no infiere ni inventa esa cobertura.

Toda discrepancia entre Nexo, documentos Nexo, web propia o una fuente social futura debe conservar ambas observaciones y pasar por las reglas de conflicto y publicación descritas en `docs/data/continuous-ingestion.md`.
