# Fase 7 — Auditoría UX/UI de simplificación comercial

**Fecha:** 2026-08-21.

**Fuentes:** capturas aportadas por el usuario, versión pública de GitHub Pages, evidencia responsive de Fase 6 y estructura HTML/CSS vigente.

## 1. Qué funciona y se preserva

- identidad Viva y contraste ya verificado;
- escenario único y reproducible;
- mapa como momento visual principal;
- listas de proyectos y señales derivadas del escenario;
- evidencia y limitaciones verificables;
- recorrido ejecutivo y deep-links expertos;
- divulgaciones accesibles, teclado y responsive;
- datos honestos: sin causalidad, precio de cierre o pairing inventado.

## 2. Hallazgos priorizados

### P0 — No hay una jerarquía única de acción

El escenario tiene su propio botón verde, las vistas añaden CTA, el recorrido compite con ocho módulos y varios bordes verdes se leen como llamadas de atención. La interfaz no siempre comunica cuál acción hace avanzar la decisión.

**Respuesta:** una acción primaria por viewport y un único acento de avance.

### P1 — El shell consume espacio de análisis

El sidebar mide 300 px, contiene logo, editor territorial completo, botón, reinicio, recorrido, ocho módulos y fecha. En 1280 px deja menos espacio al mapa, tablas y comparación.

**Respuesta:** rail de 240–248 px; escenario resumido; editor bajo demanda; navegación por tareas.

### P1 — Ayuda y resumen retrasan el contenido

En varias rutas, una guía horizontal y una tarjeta de escenario aparecen antes de la tarea principal. Ambas son correctas, pero se repiten en cada visita.

**Respuesta:** propósito de una línea en la cabecera, botón `Ayuda` y resumen territorial compacto. Las limitaciones críticas permanecen inline.

### P1 — Las cards pierden significado por repetición

Cuando filtro, resultado, métrica, recomendación y detalle tienen bordes, fondos y radios similares, la vista no distingue niveles. Las cards se convierten en decoración estructural.

**Respuesta:** reservar superficie delimitada para el trabajo principal; usar filas, separadores y tipografía para el resto.

### P1 — El menú describe módulos, no tareas

`Inspector de evidencia` o `Benchmark de microzona` son precisos para un experto, pero no siempre son la forma más rápida de decidir dónde empezar.

**Respuesta:** destinos primarios por intención y herramientas especializadas bajo `Profundizar`.

### P2 — Exceso de copy visible

La página explica qué hace, qué no hace, cómo usarla, el escenario y la metodología antes de mostrar el resultado. La transparencia es una fortaleza, pero no toda explicación necesita estar expandida.

**Respuesta:** preservar claims y límites; mover instrucciones, metodología y referencias extensas a divulgaciones.

### P2 — La lista de proyectos sigue pareciendo una colección de cards

Los proyectos comparten estructura y deberían compararse en una tabla/lista. Una card por proyecto obliga a releer etiquetas y consume altura.

**Respuesta:** fila con identidad, precio, área, estado y score; selección expande un detalle asociado.

### P2 — La vista de señales mezcla agenda, filtros, tarjetas y detalle

Doce secciones visibles y 3,568 px en la auditoría móvil del navegador indican que seguimiento requiere una jerarquía más fuerte.

**Respuesta:** agenda priorizada primero, filtros inline, tabla de señales después, dossier solo al seleccionar.

## 3. Inventario cuantitativo vigente

| Vista | Caracteres visibles | Secciones | Altura observada* | Implicación |
|---|---:|---:|---:|---|
| Radar | 5,259 | 6 | 2,785 px | la lectura compite con controles y diagnóstico |
| Proyectos | 5,657 | 3 | 1,791 px | el volumen textual está en elementos repetidos |
| Asistente | 2,357 | 5 | 1,461 px | la hero y el escenario desplazan la consulta |
| Señales | 4,680 | 12 | 3,568 px | demasiados bloques con peso equivalente |
| Checklist | 2,018 | 15 | 1,099 px | muchos microbloques para una decisión binaria |

\* Medición comparativa en el viewport disponible del navegador integrado; no sustituye la matriz formal de 1440/1280/390.

## 4. Principios extraídos de las referencias

| Patrón útil | Aplicación a Viva | Límite |
|---|---|---|
| rail persistente | cinco destinos primarios y grupo experto | no copiar navegación ni marca de Attio |
| tablas y filas | proyectos, señales, evidencia y checklist | móvil pasa a filas apiladas, no tabla truncada |
| comando rápido | `Ir a…` para destinos locales | no prometer búsqueda de datos |
| whitespace | separar decisiones por ritmo | no ocultar contenido con espacios excesivos |
| acciones contextuales | secundarios dentro de `details` o menú | limitaciones críticas siempre visibles |
| un CTA claro | verde Viva para la próxima acción | estados no dependen solo del color |

## 5. Presupuesto de información por primera pantalla

En 1280×720 cada vista prioritaria debe mostrar:

1. título y propósito en una línea;
2. escenario activo en una línea;
3. una lectura principal;
4. hasta tres métricas o estados;
5. inicio de la superficie operativa;
6. una acción primaria, si corresponde.

No deben aparecer simultáneamente:

- guía expandida;
- editor completo del escenario;
- hero promocional;
- más de tres tarjetas métricas;
- más de una acción primaria;
- metodología completa.

## 6. Matriz de simplificación por ruta

| Ruta | Conservar primero | Convertir en filas | Mover bajo demanda |
|---|---|---|---|
| Recorrido | pregunta, lectura, límite, CTA | hechos de respaldo | enlaces expertos y fuentes extensas |
| Radar | mapa, escenario, lectura territorial | comparables prioritarios | formulario de producto y diagnóstico extendido |
| Proyectos | conteo, filtros esenciales, lista | todos los proyectos | explicación de score y metadatos secundarios |
| Inspector | decisión de elegibilidad y discrepancia | evidencias/campos | cobertura completa y metodología |
| Benchmark | conclusión y denominador | atributos/microzonas | metodología y referencias extensas |
| Comparador | conclusión y selección | diferencias por atributo | evidencias secundarias y notas repetidas |
| Checklist | estado de avance | requisitos | justificación técnica completa |
| Asistente | consulta y respuesta | datos/acciones de la respuesta | sugerencias extensas y referencias completas |
| Señales | agenda y cambio prioritario | señales históricas | detalle del evento y metodología |

## 7. Autocrítica

Un diseño más blanco y con menos bordes puede parecer limpio sin ser más rápido. También existe el riesgo de esconder evidencia para producir una captura atractiva. Por eso la fase no se acepta por estética: se mide tiempo de localización automatizable, orden DOM, presupuesto de primera pantalla, paridad de claims y número de interacciones.

Se descarta:

- un dashboard nuevo con más cards;
- reducir tipografía para “hacer caber” contenido;
- sustituir navegación por iconos sin texto;
- ocultar límites o denominadores;
- una búsqueda ficticia que no consulte datos;
- copiar la apariencia de la referencia.
