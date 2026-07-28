# Fase 2 — Especificación de UI

## Estado

`REVIEWED — PASS WITH RISKS; pendiente HUMAN-GATE-A y P2-00C`

## Principio de experiencia

La pantalla debe responder, en este orden:

1. ¿Qué zona estoy analizando?
2. ¿Cuántos proyectos entran y por qué?
3. ¿Dónde están?
4. ¿Cuáles son realmente comparables?
5. ¿Cómo quedaría el precio del escenario Viva?

El mapa es el momento central. Las métricas lo explican; no compiten con él mediante una fila extensa de tarjetas.

## Arquitectura de información

### Nivel 1 — Barra global de contexto

Persistente en todas las vistas:

- distrito;
- alcance: distrito, cuadrante o radio;
- selector dependiente de cuadrante/radio;
- fecha de corte;
- estado de cobertura territorial;
- estado de comparabilidad y porcentaje de evidencia;
- botón primario “Ver comparables” para continuar el recorrido;
- acción secundaria “Reiniciar”.

La barra no debe duplicar controles dentro de cada vista. Los controles avanzados de producto permanecen en el planificador, pero actualizan el mismo escenario canónico.

### Nivel 2 — Resumen del escenario

Una franja compacta, no seis tarjetas:

- título del alcance;
- `N` proyectos incluidos;
- `N` inmobiliarias;
- cobertura geográfica;
- precio objetivo/m² si está disponible;
- badge territorial: `Cobertura territorial completa`, `Cobertura territorial parcial` o `Geografía no disponible`;
- badge de comparabilidad: `Comparabilidad lista`, `Comparabilidad orientativa · N% evidencia` o `Comparables insuficientes`.

Cada cifra incluye etiqueta y, cuando aplica, acceso a una explicación.
El precio no se fusiona con esos badges: su panel muestra `Referencia de precio lista` o `Referencia de precio insuficiente`. Un escenario inválido muestra una alerta de corrección y luego los ejes resultantes.

### Nivel 3 — Mapa del escenario

Panel de ancho completo, situado antes de los detalles secundarios.

En escritorio:

- altura mínima de 520 px;
- mapa a la izquierda, detalle del elemento seleccionado a la derecha;
- el detalle ocupa 30–34% del panel;
- el mapa conserva al menos 760 px de ancho a 1440 px.

En laptop:

- altura mínima de 440 px;
- detalle debajo del mapa si el ancho útil es insuficiente.

En móvil:

- mapa de 360 px de alto;
- detalle en bloque inferior;
- controles en filas verticales;
- no hay interacción exclusiva por hover.

### Nivel 4 — Planificador y diagnóstico

Debajo del mapa:

- controles de producto y precio;
- diagnóstico de precio;
- contribuciones del score;
- comparables prioritarios.

La disposición usa dos columnas solo cuando cada columna conserva lectura cómoda; en móvil y laptop estrecha se apila.

### Nivel 5 — Evidencia y módulos secundarios

- posicionamiento área/precio;
- ranking distrital;
- lista y comparador;
- advertencias y metodología.

Estos contenidos aparecen más abajo o bajo `details` cuando no son esenciales para la decisión inmediata.

## Barra global de contexto

### Controles

1. **Distrito objetivo**
   - `select` nativo;
   - muestra nombre humano y conserva ID canónico;
   - cambiar distrito invalida cuadrante, centro y selecciones incompatibles.

2. **Alcance**
   - control segmentado con `Distrito`, `Cuadrante analítico`, `Radio`;
   - usa botones reales con `aria-pressed`;
   - “Cuadrante” se deshabilita con explicación cuando el distrito no es `high_load`.

3. **Cuadrante o radio**
   - cuadrante: Noroeste, Noreste, Suroeste, Sureste, cada uno con conteo;
   - radio: 500 m, 1 km, 1.5 km;
   - el selector ausente no conserva un valor oculto activo.

4. **Fecha y cobertura**
   - texto visible: “Corte 28 jul. 2026”;
   - cobertura: “90/90 con coordenadas” o equivalente;
   - elegibilidad: “85 comparables · 5 por revisar” en el snapshot vigente;
   - estado territorial y comparabilidad como dos textos separados con icono, nunca solo color.

5. **Acciones**
   - CTA primario “Ver comparables”, verde Viva, texto blanco y foco visible;
   - reinicio como botón secundario con borde oscuro;
   - al reiniciar se anuncia el resultado mediante región `aria-live`.

“Ver comparables” cambia la vista canónica a `projects`, actualiza el hash a `#projects`, conserva el escenario y mueve el foco programáticamente a `#main-content` después del render. No hace scroll a un bloque ambiguo ni altera filtros.

Los controles territoriales hacen commit inmediato. Los campos de producto/precio viven en un formulario: “Actualizar escenario” valida y hace un commit atómico; “Cancelar cambios” recupera los valores activos. Un error enfoca el primer campo inválido. Un commit válido conserva el foco en el botón y anuncia el nuevo conteo.

### Responsive

- 1440 px: título y controles en una sola barra si no se comprimen.
- 1280 px: contexto en dos filas.
- 390 px: título, resumen y controles apilados; acciones ocupan ancho completo.
- Ningún texto crítico se trunca con puntos suspensivos sin alternativa accesible.

## Panel geográfico

### Render

- SVG propio con geometría versionada; no canvas opaco para lectores ni iframe externo.
- polígono distrital con borde de alto contraste;
- cuadrantes con relleno suave y patrón/etiqueta;
- proyectos como nodos SVG seleccionables con puntero y reflejados en un control accesible equivalente;
- punto Viva con forma distinta;
- círculo de radio cuando aplica;
- leyenda siempre visible;
- escala gráfica aproximada y orientación norte;
- atribución visible, no encerrada en tooltip: “© OpenStreetMap contributors · ODbL 1.0. Geometría referencial; límites legales: RENLIM. Cuadrantes analíticos no oficiales.”;
- “OpenStreetMap” y “ODbL 1.0” enlazan respectivamente al copyright OSM y a la licencia;
- la atribución se conserva legible en desktop y móvil.

### Estados visuales de proyecto

- incluido;
- seleccionado;
- fuera del alcance;
- geografía inválida;
- observado no reconciliado;
- escenario Viva.

Los estados usan forma, borde y texto además de color.

### Interacción

- Hover: adelanto opcional con proyecto y score.
- Foco/teclado en el selector accesible: mismo adelanto.
- Click en el punto o selección desde el control accesible de proyectos: fija la selección y abre el detalle persistente.
- Escape: cierra un popover temporal, no borra el escenario.
- El detalle persistente contiene:
  - proyecto e inmobiliaria;
  - distancia o cuadrante;
  - score y cobertura;
  - área, dormitorios, entrega y precio publicado disponible;
  - botón “Ver por qué es comparable”;
  - botón “Abrir en comparables”.

El usuario puede obtener toda la información sin mover el puntero sobre círculos. Para evitar 90 paradas de tabulación, los puntos SVG no forman una lista de tab stops. Un `select`/combobox de proyectos, ordenado igual que el ranking, permite recorrer todos los IDs con teclado y abrir el mismo detalle. El mapa mantiene click como mejora para puntero.

El punto Viva puede definirse mediante preset o campos numéricos de latitud/longitud. “Colocar en mapa” es opcional para puntero. Tras reset, el foco permanece en “Reiniciar” y la región viva confirma el baseline; el mapa nunca roba foco automáticamente.

### Selector de visualización

En el encabezado del panel:

- `Mapa geográfico`;
- `Posicionamiento área/precio`.

Es un control segmentado accesible, no pestañas visuales sin semántica.

El estado por defecto es `Mapa geográfico`. Cambiar al posicionamiento conserva el mismo conjunto de proyectos y muestra:

- ejes con valores y unidades;
- ticks legibles;
- mediana;
- leyenda;
- target Viva cuando existe;
- tabla/resumen accesible del punto seleccionado;
- detalle por click o por selector accesible de teclado, no solo `title` SVG.

## Cuadrantes analíticos

### Comunicación

Encabezado:

> Cuadrantes analíticos del snapshot

Ayuda:

> División reproducible basada en la mediana de latitud y longitud de los proyectos observados. No representa límites municipales ni microzonas oficiales.

Cada cuadrante muestra:

- nombre;
- proyectos observados y comparables elegibles;
- inmobiliarias;
- cobertura de precio compatible;
- estado de información.

No se mostrará una cuadrícula de cuatro tarjetas grandes. Se usará una lista de filas seleccionables junto al mapa o un resumen compacto.

## Score de comparabilidad

### Resumen

En tarjetas y puntos:

- valor `0–100`;
- etiqueta `Alta`, `Media`, `Baja` u `Orientativa`;
- cobertura de evidencia.

Etiquetas: Alta desde 80, Media desde 60, Baja bajo 60; con cobertura menor a 60 se muestra solo Orientativa.

### Explicación

El panel “Por qué es comparable” usa filas:

| Factor | Dato del proyecto | Dato Viva | Puntos |
|---|---|---|---:|
| Distancia | 420 m | radio 1 km | 30/30 |
| Área | 72 m² | 70 m² | 18/20 |
| Dormitorios | 2 | 2 | 15/15 |

Los faltantes dicen “No disponible” y muestran peso no evaluado. No se ocultan ni reciben cero sin explicación.

## Diagnóstico de precio

Jerarquía:

1. precio total simulado Viva;
2. precio simulado por m²;
3. mediana publicada del alcance;
4. diferencia porcentual;
5. rango intercuartílico;
6. número de comparables elegibles;
7. advertencia metodológica.

Estados:

- **Alineado:** dentro de la banda central.
- **Entrada competitiva:** por debajo.
- **Premium:** por encima.
- **Insuficiente:** menos de tres comparables compatibles.

P25/P75 usan interpolación R-7. Los límites son inclusivos para Alineado (`P25 <= target <= P75`); Entrada queda bajo P25 y Premium sobre P75.

Texto obligatorio:

> Escenario estimado frente a precios de lista publicados. No representa precios reales de cierre.

## Reducción de sobrecarga

- Sustituir la fila de seis KPI por una franja de 3–4 métricas principales y detalle expandible.
- Limitar listas iniciales a cinco comparables.
- Presentar dimensiones del score como filas, no tarjetas.
- Agrupar métricas secundarias bajo `details`.
- Mantener una acción primaria por panel.
- Mover el posicionamiento y ranking por debajo del mapa geográfico.
- No colocar mapa y planificador en columnas estrechas simultáneas.

## Estados obligatorios

### Carga

- skeleton del panel;
- texto “Preparando escenario geográfico”;
- controles deshabilitados con semántica real.

### Sin geometría

- mantiene lista de proyectos;
- explica que no puede dibujar el límite;
- no dibuja una forma inventada;
- permite continuar a nivel distrito si las coordenadas son válidas.

### Sin coordenadas válidas

- no muestra puntos en `(0,0)`;
- lista el número excluido;
- ofrece revisar cobertura.

### Radio sin resultados

- conserva el punto y el radio;
- muestra “0 comparables dentro de 1 km”;
- ofrece ampliar radio o volver a distrito;
- no usa fallback silencioso al distrito.

### Información de precio insuficiente

- oculta conclusión fuerte;
- mantiene conteos y mapa;
- explica qué campos faltan.

### URL inválida

- `sv` o distrito inválidos vuelven al baseline completo;
- dependencias geográficas inválidas vuelven a modo distrito;
- filtros de producto inválidos vuelven individualmente a su default;
- conserva los campos independientes válidos según el contrato;
- anuncia que el escenario compartido no pudo aplicarse por completo.

## Contraste y tokens

- CTA primario: verde Viva oscuro sobre texto blanco, con estado hover/focus diferenciado.
- Texto principal: casi negro o verde petróleo oscuro.
- Texto secundario: gris con contraste suficiente; no gris claro sobre blanco.
- Advertencias: ámbar con texto oscuro y etiqueta.
- Selección: borde de 2 px, icono y fondo; no solo verde.
- Focus: anillo de 3 px visible contra fondos claros y verdes.

Antes de cerrar la fase se medirán combinaciones reales; los nombres de tokens no sustituyen la comprobación.

## Accesibilidad

- orden de tabulación: contexto → visualización → mapa → detalle → planificador;
- nodos SVG con nombre accesible para tecnología asistiva y selección equivalente mediante control nativo;
- resumen tabular o lista equivalente para la información del mapa;
- `aria-live="polite"` para cambios de escenario;
- `aria-pressed` en modos y visualización;
- `aria-describedby` para metodología y advertencias;
- mapa usable al 200% de zoom;
- objetivos táctiles mínimos de 44×44 px en controles principales;
- reducción de movimiento respetada;
- ningún tooltip contiene información exclusiva.

## Evidencia visual requerida

Capturas antes/después en:

- 1440×900;
- 1280×720;
- 390×844.

Escenarios:

1. Miraflores completo con 90 proyectos;
2. un cuadrante seleccionado;
3. radio de 1 km con punto Viva;
4. score abierto;
5. precio insuficiente;
6. distrito sin cuadrantes;
7. posicionamiento área/precio;
8. foco de teclado visible.
