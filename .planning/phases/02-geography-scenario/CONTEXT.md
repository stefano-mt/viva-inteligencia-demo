# Fase 2 — Contexto, geografía y escenario

## Estado

`DRAFT — remediado después del ciclo 3; pendiente de nueva validación; implementación no iniciada`

## Objetivo

Convertir el filtro distrital actual en un escenario geográfico único, compartible y explicable que permita:

1. elegir distrito y alcance territorial;
2. separar los distritos de mayor carga en cuadrantes analíticos;
3. seleccionar comparables por cuadrante o radio;
4. mostrar los proyectos sobre un mapa geográfico;
5. explicar por qué cada proyecto es comparable;
6. diagnosticar el precio simulado de un proyecto Viva sin presentarlo como precio observado.

La fase debe hacer visible el valor comercial de pasar de una lista de publicaciones a una lectura territorial coherente. No debe convertir la demo estática en una aplicación cartográfica productiva.

## Feedback que origina la fase

- Los distritos con mayor carga de proyectos deben separarse para evitar análisis demasiado amplios.
- El mapa actual de posicionamiento necesita mayor tamaño, ejes legibles, interacción útil y detalle que no dependa solo del `hover`.
- Todos los módulos deben responder al mismo escenario; hoy existen filtros y selecciones duplicadas.
- La fecha de corte, cobertura, calidad y limitaciones de la información deben quedar visibles.
- El escenario Viva debe poder reiniciarse y reproducirse durante la presentación.
- La demo debe vender precisión territorial sin afirmar que un cuadrante analítico es una delimitación oficial.

## Baseline confirmado

### Datos

- Snapshot público: `dataset:viva-platform-demo-2026-07-28`.
- Contrato vigente: `2.0.0`.
- Proyectos legacy visibles: 714.
- Proyectos con latitud y longitud numéricas: 714 de 714.
- Modelo autoritativo: 676 proyectos.
- Proyectos legacy fuera del modelo autoritativo por aliases `manual_review`: 42.
- Miraflores: 90 proyectos reproducibles antes de filtros adicionales.
- Los siete distritos con mayor carga del snapshot son:

| Orden | Distrito | Observados con coordenadas | En modelo autoritativo | Gap visible |
|---:|---|---:|---:|---:|
| 1 | Miraflores | 90 | 85 | 5 |
| 2 | Santiago De Surco | 88 | 83 | 5 |
| 3 | Jesus Maria | 67 | 65 | 2 |
| 4 | San Miguel | 63 | 62 | 1 |
| 5 | Cercado de lima | 43 | 38 | 5 |
| 6 | Magdalena Del Mar | 42 | 40 | 2 |
| 7 | San Isidro | 40 | 33 | 7 |

La capitalización anterior pertenece al dataset actual. La interfaz puede mostrar nombres corregidos para lectura humana, pero la normalización debe conservar un ID estable y el nombre fuente.

La carga territorial se calcula sobre proyectos observados, por eso CT-I parte de 90. La elegibilidad analítica se calcula sobre proyectos reconciliados con `model.projects`, por eso el baseline autoritativo de Miraflores es 85. Los cinco restantes se muestran como cobertura no reconciliada y no reciben score ni alimentan referencias de precio.

### Aplicación

- `state.strategy` concentra distrito y filtros de producto, pero convive con `selectedDistrict` y `projectFilters.district`.
- `getScenarioProjects()` filtra distrito, tipología, dormitorios y entrega; no aplica cuadrante, radio o calidad geográfica.
- `comparableScore()` mezcla distrito, producto, precio, área y unidades, pero no expone sus componentes ni normaliza faltantes.
- Dashboard, proyectos, mercado, comparador, checklist y asistente consumen combinaciones distintas de `getProjectsByDistrict()`, `getScenarioProjects()` y filtros locales.
- El “Mapa de posicionamiento” es un gráfico SVG de área frente a precio por m². No es un mapa geográfico.
- No existe geometría de distritos, punto objetivo Viva, distancia, cuadrante o fixture CT-C/CT-I.

## Fuente cartográfica evaluada

### Fuente preferida — INEI IDE, capa distrital actualizada a 2023

- Portal: `https://ide.inei.gob.pe/`
- Descarga publicada: `https://ide.inei.gob.pe/files/Distrito.rar`
- Formato declarado por el portal: GeoPackage dentro del paquete descargable.
- Uso propuesto: extraer y versionar solo las geometrías necesarias para la demo, transformadas a GeoJSON WGS84 (`EPSG:4326`).
- Motivo: es una fuente pública primaria, ofrece geometría y atributos distritales y declara actualización a 2023.
- Advertencia del propio INEI: la información territorial puede contener diferencias o inconsistencias y su exactitud o vigencia debe verificarse.

### Verificación jurídica — RENLIM / PCM

- Servicio: `https://www.gob.pe/98535-acceder-al-registro-nacional-de-limites-renlim`
- Uso propuesto: verificar UBIGEO, nombre y vigencia de la referencia territorial.
- Restricción: la demo no afirmará que una geometría simplificada o un cuadrante analítico sustituye los límites vinculantes del RENLIM.

### Alternativa técnica — IDEP FeatureServer

- Capa: `https://www.idep.gob.pe/geoportal/rest/services/DATOS_GEOESPACIALES/L%C3%8DMITES/FeatureServer/5`
- Capacidades observadas: consulta y salida GeoJSON en `EPSG:4326`.
- Uso permitido en el plan: contingencia para obtener una geometría reproducible si la descarga INEI no puede procesarse.
- Restricción: el servicio se presenta como límite referencial; antes de versionar el resultado deben registrarse fuente, fecha, términos y diferencias respecto de INEI/RENLIM.

### Alternativa descartada como fuente primaria

La capa MINAM “Límite de los distritos de Lima Metropolitana (INEI, 2017)” permite GeoJSON, pero es anterior a la capa INEI 2023. Solo puede utilizarse como fallback documentado y nunca ocultando su antigüedad.

## Condiciones técnicas y legales de uso cartográfico

Antes de incluir geometrías en el repositorio, P2-01 debe registrar:

1. URL exacta de origen;
2. entidad productora;
3. fecha declarada de actualización;
4. fecha fija de descarga;
5. términos o licencia disponible;
6. atribución requerida;
7. CRS de origen y destino;
8. SHA-256 del archivo original y del derivado;
9. transformación aplicada y tolerancia de simplificación;
10. alcance de reutilización pública en GitHub Pages.

Si no es posible confirmar que la geometría puede redistribuirse en la demo pública, la tarea se detiene. No se reemplaza en silencio por geometrías copiadas de terceros ni por un mapa dibujado a mano.

La aplicación cargará una copia versionada y no consultará INEI, RENLIM, IDEP, ArcGIS, geocodificadores o proveedores de tiles durante la demo.

## Decisiones normativas del plan

### 1. Tres alcances territoriales

El escenario admite:

- `district`: todos los proyectos elegibles del distrito;
- `quadrant`: proyectos del cuadrante analítico seleccionado;
- `radius`: proyectos dentro de 500, 1,000 o 1,500 metros del punto objetivo Viva.

No se usarán simultáneamente cuadrante y radio. El control activo debe indicar de forma textual qué subconjunto está vigente.

### 2. Distritos de alta carga

Un distrito es `high_load` cuando está entre los siete primeros por cantidad de proyectos georreferenciados del snapshot, con desempate alfabético por ID canónico.

La lista se deriva en build time y queda versionada. No se mantiene una lista manual desconectada del dataset.

### 3. Cuadrantes analíticos, no oficiales

Para cada distrito `high_load`:

1. se validan los puntos que caen dentro de la geometría distrital;
2. se calcula la mediana de latitud y la mediana de longitud de esos puntos;
3. ambas medianas dividen el distrito en Noroeste, Noreste, Suroeste y Sureste;
4. un punto sobre la mediana norte/sur pertenece al norte;
5. un punto sobre la mediana este/oeste pertenece al este;
6. la asignación se materializa en build time y no depende del navegador;
7. se registra método, snapshot, conteo y cobertura.

La interfaz usará siempre el rótulo “Cuadrante analítico”. No usará “zona oficial”, “sector municipal” o “microzona oficial”.

### 4. Punto objetivo y radio

- El punto objetivo es simulado y se etiqueta “Escenario Viva”.
- Puede cargarse desde un preset versionado o definirse haciendo clic/activando un punto del mapa.
- No se captura una dirección personal ni se llama a un geocodificador.
- La distancia se calcula con Haversine y se muestra en metros.
- Un punto fuera del polígono distrital produce un estado de validación; no cambia de distrito automáticamente.
- El usuario de teclado puede elegir un preset o ingresar latitud/longitud; colocar el punto con puntero es una mejora equivalente, no la única vía.

### 5. Escenario canónico

La única fuente de verdad del escenario es:

```text
scenario
├── version
├── district_id
├── scope_mode
├── quadrant_id
├── center_latitude
├── center_longitude
├── radius_meters
├── typology
├── bedrooms
├── target_area_m2
├── target_price_pen
├── delivery_year
└── source = default | url | interaction
```

`selectedDistrict` y la duplicación entre `strategy.district` y `projectFilters.district` deben retirarse o quedar como proyección de compatibilidad temporal, nunca como fuentes paralelas.

### 6. Persistencia reproducible

- El escenario válido se serializa en parámetros de URL con `sv=1`.
- La ruta de vista continúa en el hash.
- Solo se serializan campos permitidos y valores validados.
- Recargar o compartir la URL reproduce el mismo subconjunto.
- “Reiniciar escenario” elimina los parámetros y vuelve al preset base versionado.
- No se usa `localStorage` para ocultar estado que la URL no representa.

Esquema canónico y orden:

```text
?sv=1
&district=150122
&scope=district|quadrant|radius
&quadrant=NW|NE|SW|SE
&lat=-12.123456
&lon=-77.012345
&radius=500|1000|1500
&typology=all|<slug permitido>
&bedrooms=all|<entero permitido>
&area=<decimal positivo>
&price=<decimal positivo>
&delivery=all|<año permitido>
&viz=geographic|positioning
#<vista>
```

- Los parámetros en su valor por defecto o no aplicables se omiten.
- La serialización conserva el orden anterior y redondea coordenadas a seis decimales.
- `source` no se serializa; se deriva como `default`, `url` o `interaction`.
- `sv` desconocido o `district` inválido descarta la transacción completa y vuelve al preset.
- `scope` inválido vuelve a `district` y limpia cuadrante/radio.
- Cuadrante inválido o no disponible vuelve a `district`.
- Radio, latitud o longitud inválidos vuelven a `district`, pero conservan filtros de producto válidos.
- Cada filtro de producto inválido vuelve solo a su valor por defecto.
- Después del parseo, `history.replaceState` escribe la URL canónica normalizada.

Catálogos normativos del snapshot F2:

- `typology=all|casa|departamento|lote|oficina`;
- `bedrooms=all|0|1|2|3|4|5`, donde `0` representa estudio/sin dormitorio declarado como cero;
- `delivery=all|2019|2022|2023|2024|2025|2026|2027|2028|2029`;
- el contrato `2.1.0` publica esos valores en `scenario_catalogs`, derivados y ordenados de forma determinista durante el build;
- tipología se normaliza con `trim`, Unicode NFKD, eliminación de diacríticos, minúsculas y colapso de espacios/guiones a `-`; cualquier categoría fuera de la lista blanca bloquea el build;
- el score compara el slug canónico, nunca la etiqueta visual;
- `area` acepta decimal finito `> 0` y `<= 10000`; `price` acepta decimal finito `> 0` y `<= 1000000000`;
- valores fuera de catálogo o rango siguen la recuperación por campo ya definida.

El escenario activo es la única fuente global. Los controles territoriales se aplican inmediatamente. El formulario de producto/precio usa los valores del DOM como borrador local y solo hace un commit atómico al enviar “Actualizar escenario”; “Cancelar cambios” restaura el formulario desde el escenario activo. No existe un segundo `draftScenario` global.

### 7. Consumidores consistentes

Una sola función produce `scenarioContext`, que contiene:

- `observed_scope_project_ids`: observados que pertenecen al alcance territorial;
- `geography_valid_project_ids`: observados con coordenadas válidas y, cuando existe polígono, dentro o sobre su borde;
- `comparable_project_ids`: geográficamente válidos, reconciliados con el modelo autoritativo y compatibles con filtros de producto;
- `price_reference_project_ids`: comparables con precio publicado provisional compatible;
- proyectos excluidos y motivo;
- cobertura geográfica;
- alcance textual;
- lectura de mercado;
- orden y score de comparables;
- diagnóstico de precio;
- los cuatro ejes independientes de estado definidos en la sección 11; no existe `scenarioContext.state` legacy.

Dashboard, mapa, proyectos, lectura de mercado, comparador, checklist y asistente deben recibir el mismo `scenarioContext`. Los filtros de búsqueda o visualización locales no alteran silenciosamente el conjunto canónico.

El mapa puede representar proyectos observados no reconciliados con un estado visual distinto, pero la lectura de mercado, score, comparador y asistente solo consumen `comparable_project_ids`. La diferencia se presenta como cobertura, no se oculta ni se mezcla.

### 8. Score explicable

El score será de 0 a 100 y mostrará:

- proximidad geográfica;
- similitud de área;
- dormitorios;
- tipología;
- entrega;
- proximidad de precio publicado.

Cada componente declara peso disponible, puntos y dato faltante. El score se normaliza solo sobre dimensiones disponibles y muestra cobertura de evidencia. Un score con cobertura menor a 60% se etiqueta `orientativo` y no se usa para un benchmark certificado.

La cantidad de unidades publicadas deja de sumar puntos de comparabilidad; puede usarse como contexto de presión, no como similitud.

Reglas normativas para F2:

- geografía: 30 puntos por pertenecer al distrito/cuadrante seleccionado; en modo radio, `30 × max(0, 1 - distancia/radio)`;
- área: `20 × max(0, 1 - |área_proyecto-área_Viva|/área_Viva)`;
- dormitorios: 15 por coincidencia exacta o porque el rango publicado contiene el objetivo;
- tipología: 10 por coincidencia normalizada;
- entrega: 10 por el mismo año, 5 por diferencia de un año;
- precio/m²: `15 × max(0, 1 - |precio_m2_proyecto-precio_m2_Viva|/precio_m2_Viva)`.

Una dimensión solo forma parte de `available_weight` cuando existen valores compatibles en ambos lados. El score mostrado es `raw_points / available_weight × 100`; la cobertura es `available_weight / 100 × 100`. Los empates se resuelven por mayor cobertura, menor distancia disponible y `project_id` ascendente.

Contrato adicional:

- área del proyecto: `total_area` positivo; si falta, la dimensión área no se evalúa; los rangos se muestran, pero no se convierten en un punto medio para score;
- etiquetas: `Alta >= 80`, `Media >= 60 y < 80`, `Baja < 60`, siempre que cobertura sea al menos 60%; con menor cobertura la única etiqueta es `Orientativa`;
- puntos y score: redondeo decimal `half away from zero` a una cifra;
- distancia de ordenamiento: valor completo, no el texto redondeado.

### 9. Diagnóstico de precio

- El precio del escenario Viva es `simulated`.
- Los precios de competidores se describen como precios de lista observados/publicados cuando tengan fuente, fecha, PEN y denominador compatible.
- No se afirma precio real de cierre.
- El diagnóstico muestra mediana, rango intercuartílico, diferencia absoluta/relativa y número de comparables elegibles.
- Si hay menos de tres comparables elegibles, el estado es `insufficient` y no se presenta una conclusión fuerte.
- Mientras F4 no certifique hechos de mercado, la UI usa “referencia publicada” y no “benchmark certificado”.

Para esta fase, una referencia legacy es compatible cuando tiene `currency=PEN`, `price_per_m2_list > 0`, `source_url`, `captured_at` y no declara faltante el precio o el área usada. Esta regla produce una referencia comercial provisional; no cambia `benchmark_eligible` del modelo autoritativo ni anticipa la certificación de F4.

Regla normativa de precio:

1. solo se usa la fila legacy reconciliada con un `project:nexo-*`;
2. `list_price_avg`, `total_area` y `price_per_m2_list` deben ser positivos;
3. `currency=PEN`, `source_url` HTTP(S), `captured_at <= cutoff_at` y `missing_required_fields` no contiene precio o área;
4. `price_per_m2_list` debe coincidir con `list_price_avg / total_area` dentro de 0.5%;
5. no se elige entre múltiples observaciones: F2 usa la proyección legacy única del snapshot; la conciliación multifuente corresponde a F4;
6. P25, mediana y P75 usan interpolación lineal R-7 sobre valores ordenados;
7. se requieren al menos tres referencias;
8. `target < P25` es Entrada, `P25 <= target <= P75` es Alineado y `target > P75` es Premium;
9. diferencia absoluta = `target - mediana`; diferencia relativa = `(target - mediana) / mediana`;
10. moneda se muestra sin decimales, precio/m² con dos decimales y porcentaje con una cifra.

`price_reference_project_ids` alimenta todas las cifras y explicaciones de precio. El mapa conserva `geography_valid_project_ids` y distingue visualmente cuáles no pertenecen a la muestra de precio; no desaparecen por faltar precio.

### 10. Constantes geoespaciales

- radio medio terrestre Haversine: `6,371,008.8 m`;
- inclusión en radio: distancia completa `<= radius_meters`;
- presentación: distancia al metro; el filtro nunca usa el valor redondeado;
- CRS público: `EPSG:4326`;
- punto sobre el borde exterior: dentro;
- punto sobre el borde de un hueco: fuera;
- `Polygon` y `MultiPolygon` se soportan;
- comparación punto-segmento: epsilon `1e-10` grados;
- geometrías versionadas: exactamente los siete distritos `high_load` del snapshot;
- simplificación inicial: tolerancia máxima `0.00005°`, desplazamiento máximo validado de 10 m y variación de área menor a 0.5%;
- si el artefacto supera 750 KB o incumple tolerancias, se detiene para decidir precisión/peso; no se incrementa tolerancia automáticamente.

### 11. Ejes de estado

No existe un único estado ambiguo. `scenarioContext` expone:

- `scenario_status = valid | invalid`;
- `geography_status = ready | partial | unavailable`;
- `comparability_status = ready | orientative | insufficient`;
- `price_status = ready | insufficient`;
- `evidence_coverage_pct` numérico.

La UI traduce esos valores, pero no los fusiona en una sola bandera de “confianza”.

Reglas normativas de derivación:

| Campo | Regla |
|---|---|
| `scenario_status=invalid` | La transición actual rechazó o corrigió al menos un parámetro, dependencia o campo. Es un estado transitorio no serializado. Se limpia a `valid` al descartar la alerta, completar un commit posterior válido o recargar la URL ya canonizada. |
| `scenario_status=valid` | El preset, URL canonizada o último commit no produjo correcciones pendientes de anunciar. |
| `geography_status=unavailable` | Falta la geometría aprobada, falla su hash/parseo o `geography_valid_project_ids.length=0`. |
| `geography_status=partial` | La geometría es utilizable y existe al menos un proyecto geográficamente válido, pero `geography_valid_project_ids.length < observed_scope_project_ids.length`. |
| `geography_status=ready` | La geometría es utilizable y todos los observados del alcance son geográficamente válidos. |
| `evidence_coverage_pct` | Media aritmética de `available_weight` de todos los `comparable_project_ids`, donde cada valor ya está en escala 0–100; redondeo `half away from zero` a una cifra. Con cero comparables vale 0. |
| `comparability_status=insufficient` | Cero `comparable_project_ids`. |
| `comparability_status=orientative` | Hay uno o más comparables, pero son menos de tres o `evidence_coverage_pct < 60`. |
| `comparability_status=ready` | Hay al menos tres comparables y `evidence_coverage_pct >= 60`. |
| `price_status=insufficient` | Hay menos de tres `price_reference_project_ids`. |
| `price_status=ready` | Hay al menos tres `price_reference_project_ids`. |

La validez del escenario no cambia esos denominadores. Por ejemplo, una URL corregida puede producir temporalmente `scenario_status=invalid` y simultáneamente geografía `ready`.

Fixtures mínimos de estado:

| Caso | Entrada relevante | Resultado exacto |
|---|---|---|
| URL corregida | `sv=1`, distrito válido y `radius=abc` | transición `scenario_status=invalid`; fallback distrital; tras descartar alerta queda `valid` |
| Sin geometría | geometría ausente, 90 observados, 0 IDs geográficos/comparables/precio | `scenario_status=valid`, `geography_status=unavailable`, cobertura 0, comparabilidad/precio `insufficient` |
| Cobertura parcial | 90 observados, 89 geográficamente válidos | `geography_status=partial`; CT-I falla aunque el mapa pueda degradar |
| Sin comparables | 0 comparables | cobertura 0, `comparability_status=insufficient` |
| Muestra pequeña | 2 comparables con coberturas 80 y 80 | cobertura 80.0, `comparability_status=orientative` |
| Umbral exacto | 3 comparables con coberturas 100, 60 y 20 | cobertura 60.0, `comparability_status=ready` |
| Precio insuficiente | 2 referencias de precio | `price_status=insufficient` |
| Precio listo | 3 referencias de precio | `price_status=ready` |

Mapeo visible normativo:

| Eje | Valor | Texto visible |
|---|---|---|
| Escenario | `invalid` | Alerta “Escenario compartido corregido”; no se muestra como badge normal |
| Geografía | `ready` | “Cobertura territorial completa” |
| Geografía | `partial` | “Cobertura territorial parcial” |
| Geografía | `unavailable` | “Geografía no disponible” |
| Comparabilidad | `ready` | “Comparabilidad lista” |
| Comparabilidad | `orientative` | “Comparabilidad orientativa · N% evidencia” |
| Comparabilidad | `insufficient` | “Comparables insuficientes” |
| Precio | `ready` | “Referencia de precio lista”, solo dentro del diagnóstico |
| Precio | `insufficient` | “Referencia de precio insuficiente”, solo dentro del diagnóstico |

Si geografía es `partial`, comparabilidad `orientative` y precio `insufficient`, se muestran los tres mensajes en sus lugares respectivos; nunca se sintetizan como “confianza media”.

## Fixtures bloqueantes

### CT-C — Consistencia de microzona

El fixture contiene:

- un distrito;
- un punto objetivo;
- un radio;
- un proyecto dentro;
- un proyecto fuera;
- un proyecto sin geografía válida;
- un proyecto observado dentro pero no reconciliado con el modelo autoritativo;
- condiciones de producto conocidas.

Mapa, lectura de mercado, comparador y asistente deben incluir exactamente el mismo ID comparable dentro, excluir el ID fuera y registrar los motivos del proyecto inválido y del no reconciliado. El mapa puede mostrar el no reconciliado como cobertura excluida, nunca como comparable.

### CT-I — Distrito de alta carga

El fixture parte de Miraflores con 90 proyectos antes de filtros. Debe comprobar:

1. conteo distrital inicial de 90;
2. estado `high_load=true`;
3. cuatro cuadrantes analíticos definidos;
4. `coordinate_valid_count=90` como precondición confirmada del snapshot;
5. P2-03 calcula `polygon_valid_count`; para aprobar CT-I debe ser 90 y cada uno debe pertenecer exactamente a un cuadrante;
6. suma de cuadrantes observados igual a `polygon_valid_count`;
7. 85 proyectos autoritativos identificados antes de filtros de producto;
8. cinco proyectos no reconciliados visibles y excluidos de comparabilidad;
9. selección de cuadrante propagada a todos los consumidores;
10. reset que restaura 90 observados y 85 comparables antes de otros filtros.

Si `polygon_valid_count < 90`, CT-I falla y se detiene la fase para revisar geometría, alias o coordenadas; no se aprueba con 89 ni se oculta el excluido.

## Fuera de alcance

- límites catastrales o legales de predios;
- microzonas oficiales inexistentes o no publicadas;
- geocodificación de direcciones;
- mapas o tiles externos en tiempo de ejecución;
- tráfico, tiempos de viaje o isócronas;
- backend, base de datos espacial o PostGIS;
- ubicación de personas;
- scraping recurrente;
- precio real de cierre;
- causalidad entre geografía y ventas.

## Riesgos

| Riesgo | Tratamiento |
|---|---|
| Términos de redistribución cartográfica no confirmados | `SOURCE-ASSESSMENT.md`, stop rule de HUMAN-GATE-A y prohibición de descargar/versionar. |
| Geometría referencial distinta de RENLIM | Atribución, año y nota de uso referencial. |
| Puntos fuera del polígono oficial | Reporte de cobertura y exclusión prudente del modo cuadrante. |
| Cuadrantes con distribución desigual | Método por medianas y conteos visibles; no presentarlos como mercado homogéneo. |
| Score alto con datos escasos | Cobertura de evidencia y estado `orientativo`. |
| URL manipulada | Lista blanca y recuperación normativa: versión/distrito reinician; dependencias geográficas vuelven a distrito; filtros inválidos se reinician por campo. |
| Dataset de 3.3 MB más geometrías | GeoJSON simplificado y separado; presupuesto de peso definido en el plan. |
| Ampliación del hub `domain.js` | Nuevos módulos puros para geografía, escenario y comparabilidad. |

## Definition of Ready

La implementación puede iniciar cuando:

1. `CONTEXT.md`, `UI-SPEC.md` y `PLAN.md` no se contradicen;
2. un preflight read-only registra la fuente, términos y alternativa recomendada;
3. CT-C y CT-I tienen diseño de fixture y resultados esperados congelados; P2-02 materializa los archivos;
4. el contrato de escenario está congelado;
5. el método de cuadrantes está aceptado como analítico;
6. pesos y cobertura del score están especificados;
7. cada tarea tiene `depends_on`, `write_set`, verificación y rollback;
8. un checker independiente emite `PASS` o riesgos explícitos;
9. el usuario aprueba el plan, la ruta cartográfica exacta y cualquier riesgo; elegir una fuente alternativa o retirar el polígono obliga a volver a P2-00B, revisar Context/UI/Plan, ejecutar otro checker y solicitar una nueva HUMAN-GATE-A;
10. P2-00C persiste ruta, permiso/licencia, atribución, riesgos, responsable, fecha y versión documental en `APPROVAL.md`;
11. solo después se permite descargar/versionar geometría o editar código funcional.
