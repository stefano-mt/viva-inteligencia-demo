# Fase 7 — Especificación UX/UI del workspace comercial

**Estado:** propuesta para `HUMAN-GATE-A`.

## 1. Dirección visual: `Viva Decision Desk`

Un escritorio editorial y operativo, sobrio y preciso. La interfaz se siente como una mesa de trabajo comercial: pocas superficies, filas alineadas, títulos breves y una acción clara. La evidencia sigue disponible, pero deja de competir con la lectura.

### Paleta

Se reutilizan los tokens existentes:

| Nombre | Rol | Hex |
|---|---|---|
| `Viva Ink` | texto principal | `#202022` |
| `Viva Deep` | acción y navegación activa | `#016150` |
| `Viva Forward` | avance/acento único | `#00943b` |
| `Mint Wash` | selección y contexto suave | `#e6f2ee` |
| `Paper` | superficie principal | `#ffffff` |
| `Warm Evidence` | límites y cautelas | `#f8f5ec` |
| `Rule` | separadores | `#d7dcda` |

`#00943b` no se usa como borde decorativo repetido. Se reserva para la línea de decisión, selección activa o indicador de avance.

### Tipografía

- títulos: `Aptos Display`, `Aptos`, `Segoe UI`, sans-serif;
- cuerpo y controles: `Aptos`, `Segoe UI`, Arial, sans-serif;
- datos técnicos: `ui-monospace`, `Consolas`, monospace solo para IDs o hashes;
- `h1`: 24–30 px según viewport;
- cuerpo: 16 px;
- texto auxiliar: 13–14 px, nunca 10–11 px para contenido operativo.

No se cargan fuentes externas. Se elimina `Arial Narrow` como primera opción para evitar una apariencia comprimida.

### Layout

- rail desktop: 244 px;
- topbar: 64–68 px;
- contenido: `min(100%, 1280px)` centrado cuando la vista no requiere ancho completo;
- mapas, tablas y comparadores pueden ocupar el ancho disponible;
- separación principal por whitespace y reglas de 1 px;
- radios moderados de 8–10 px solo en controles y superficie principal;
- sombras reservadas para overlays y paleta de destinos.

### Firma

Una **línea de decisión Viva** de 3 px conecta escenario, evidencia y acción. Aparece una vez en la lectura principal o en la etapa activa; no rodea todas las cards.

### Riesgo visual deliberado

Se reemplaza el lenguaje de dashboard con muchas cards por un lenguaje casi editorial de filas y separadores. Es más austero y puede parecer menos “decorativo”, pero corresponde al trabajo real del equipo comercial y reduce el costo de escaneo.

## 2. Arquitectura de navegación

### Navegación primaria

| Etiqueta visible | Destino | Trabajo |
|---|---|---|
| Recorrido | `#journey/scale` o etapa vigente | comprender la tesis completa |
| Panorama | `#dashboard` | leer zona y mapa |
| Proyectos | `#projects` | priorizar competidores |
| Decidir | `#assistant` | convertir evidencia en acción |
| Seguimiento | `#activity` | revisar cambios publicados |

### Profundizar

Grupo colapsable pero nombrado, no solo iconográfico:

- Inspector de evidencia → `#inspector`;
- Benchmark → `#market`;
- Comparador → `#compare`;
- Checklist → `#trust`.

El grupo recuerda su apertura solo en memoria de la sesión; no usa `localStorage`. Cuando una ruta interna está activa, el grupo se muestra abierto.

### Paleta `Ir a…`

- botón visible en el rail y atajo `Ctrl+K`/`Cmd+K`;
- diálogo con campo `Ir a una sección` y catálogo cerrado de nueve destinos;
- búsqueda por nombre, intención y sinónimos locales;
- flechas cambian selección, Enter navega, Escape cierra;
- foco vuelve al disparador;
- no muestra proyectos, documentos ni respuestas del asistente;
- copy explícito: `Navega por la demo`; nunca `Buscar en todos los datos`.

## 3. Shell

### Rail desktop

```text
┌──────────────────────┐
│ VIVA  Inteligencia   │
│ [⌘ Ir a…       CtrlK]│
│                      │
│ Recorrido            │
│ Panorama              │
│ Proyectos             │
│ Decidir               │
│ Seguimiento           │
│                      │
│ ▸ Profundizar         │
│                      │
│ Miraflores · Distrito │
│ 85 comparables        │
│ [Cambiar escenario]   │
└──────────────────────┘
```

El editor completo deja de ocupar el inicio del rail. `Cambiar escenario` abre un panel dentro del rail en desktop y una hoja modal en móvil. El estado activo siempre permanece visible.

### Topbar

```text
Panorama   Lectura territorial             Miraflores · Distrito  [Ayuda]
```

- un solo `h1`;
- propósito de máximo 70 caracteres;
- escenario resumido;
- botón de ayuda de 44×44 px;
- sin duplicar logo, conteos ni botón de reinicio.

### Móvil

- barra superior con menú, título y escenario compacto;
- drawer de navegación a ancho completo útil;
- editor territorial como diálogo/hoja con foco atrapado;
- navegación primaria primero y Profundizar después;
- sin rail horizontal ni iconos sin etiqueta.

## 4. Sistema de contenido transversal

Cada ruta usa estos bloques semánticos, en este orden:

1. `workspace-heading`: título y propósito;
2. `decision-line`: lectura principal + estado/límite;
3. `metric-row`: máximo tres métricas;
4. `work-surface`: mapa, lista, tabla, formulario o respuesta;
5. `detail-disclosure`: ayuda, método, fuentes o explicación secundaria;
6. `next-action`: una acción primaria cuando exista.

Reglas:

- una sola `work-surface` dominante por tramo;
- no más de tres métricas horizontales;
- una sola acción verde por viewport;
- enlaces y acciones secundarias usan texto o borde neutro;
- máximo dos niveles de borde anidado;
- no hay grid de cards para colecciones homogéneas;
- una limitación crítica aparece junto a la lectura, no solo en `details`.

## 5. Especificación por ruta

### 5.1 Recorrido

- compactar topbar y rail de etapas;
- mantener pregunta, lectura, límite y CTA en primera pantalla;
- representar datos de respaldo como tres pares etiqueta/valor, sin cards;
- enlaces expertos dentro de `Profundizar esta lectura`;
- no cambiar catálogo, rutas, paridad ni reset.

### 5.2 Panorama / Radar

- mapa geográfico como primera superficie;
- sobre el mapa: lectura territorial y hasta tres métricas;
- selector mapa/posicionamiento integrado en la cabecera del mapa;
- `Producto y precio` bajo `Simular escenario Viva`;
- diagnóstico extendido y metodología bajo demanda;
- comparables prioritarios como filas después del mapa.

### 5.3 Proyectos

- encabezado: `85 comparables` y una frase de propósito;
- filtros esenciales en toolbar: fase, orden y búsqueda;
- lista por filas con proyecto/inmobiliaria, ubicación, precio publicado, área, estado y score;
- en laptop pueden ocultarse columnas secundarias mediante prioridad CSS, no truncar valores críticos;
- seleccionar una fila abre detalle asociado debajo o panel inline;
- máximo 18 filas por página vigente; conservar orden y selección actuales.

### 5.4 Inspector

- discrepancia y decisión de elegibilidad arriba;
- evidencia como ledger de filas: fuente, campo, valor, fecha y estado;
- visor mantiene dimensiones, transcripción y atribución;
- cobertura completa y metodología se expanden bajo demanda;
- nunca ocultar `104.15 m²`, `53.37 m²`, `50.78 m²` ni exclusión del caso Tipo 7.

### 5.5 Benchmark

- conclusión y denominador primero;
- microzonas y atributos como filas agrupadas;
- metodología y referencias completas bajo demanda;
- no ocultar insuficiencia, `n` o naturaleza orientativa.

### 5.6 Comparador

- selección y conclusión antes de la matriz;
- diferencias como filas por atributo;
- evidencia secundaria desplegable por fila;
- no usar columnas de cards para proyectos;
- preservar comparación vacía y escenario simulado opcional.

### 5.7 Checklist

- estado de avance y condición de salida arriba;
- requisitos como filas con estado, evidencia y acción;
- justificación técnica desplegable;
- no presentar “avance” como certificación comercial.

### 5.8 Asistente

- campo de consulta como superficie principal inmediata;
- tres sugerencias como chips secundarios;
- eliminar hero promocional alto;
- respuesta: conclusión, datos, interpretación, límite y próximo paso en flujo vertical;
- referencias completas bajo divulgación, con conteo visible;
- mantener `Ctrl+Enter`, privacidad, memoria volátil y seis bloques autoritativos.

### 5.9 Señales

- agenda priorizada de máximo tres filas primero;
- filtros en toolbar compacta;
- señales como tabla/lista con cambio, fecha, estado y vigencia;
- detalle se abre al seleccionar una fila;
- conservar causa nula y no atribuir causalidad.

## 6. Estados y feedback

| Estado | Tratamiento |
|---|---|
| loading | skeleton alineado con filas/superficie, shell estable |
| empty | una explicación, una limitación y una acción correctiva |
| insufficient | lectura visible con dato ausente honesto; nunca cero fabricado |
| unavailable legacy | capacidad no disponible y ruta alternativa |
| error | recurso afectado y reintento/reinicio pertinente |
| selected | fondo `Mint Wash`, texto/icono y `aria-selected`/`aria-current` |

## 7. Copy

- títulos orientados a tarea: `Panorama`, `Proyectos`, `Decidir`, `Seguimiento`;
- el nombre técnico permanece en propósito, ayuda o breadcrumb;
- frases de apoyo ≤110 caracteres;
- labels concretos: `Cambiar escenario`, `Ver evidencia`, `Comparar seleccionados`;
- evitar repetir distrito y alcance más de dos veces antes del contenido;
- conservar lenguaje prudente: publicado, observado, orientativo, simulado, excluido.

## 8. Accesibilidad

- landmarks y un `h1` por ruta;
- diálogo `Ir a…` con nombre, descripción, foco atrapado y retorno;
- `Ctrl+K` no interfiere con campos editables;
- Escape cierra overlay, editor o drawer superior;
- filas interactivas operables por Enter/Espacio y con nombre accesible;
- objetivos ≥44×44 px;
- contraste AA ≥4.5:1;
- foco visible de 2 px;
- 200% sin doble eje;
- reduced motion elimina animaciones no esenciales.

## 9. Responsive

| Viewport | Comportamiento |
|---|---|
| 1440×900 | rail 244 px, superficie completa, columnas prioritarias |
| 1280×720 | rail 232–240 px, primera lectura + trabajo visible |
| 390×844 | drawer, toolbar apilada, filas convertidas en bloques compactos |
| 200% | layout equivalente a móvil/tablet, sin scroll horizontal del documento |

Las tablas anchas pueden tener scroll propio solo cuando el contenido no admite reflow semántico; la página no puede adquirir scroll horizontal.

## 10. Criterios visuales automatizables

- `nav primary = 5` y `expert = 4`;
- shell desktop ≤248 px;
- topbar ≤72 px;
- una acción primaria visible por viewport;
- contenido operativo ≥16 px y metadata ≥13 px;
- ayuda cerrada por defecto;
- escenario resumido visible con editor cerrado;
- ninguna vista prioritaria antepone hero + guía + resumen al trabajo;
- ningún grid de cards representa proyectos o señales;
- CTA/lectura principal dentro de 1280×720;
- cero solapes, truncamiento crítico u overflow en la matriz.

## 11. Autocrítica antes de construir

La propuesta podría caer en tres errores: esconder demasiada evidencia, convertir el menú en una taxonomía nueva difícil de aprender o introducir una paleta `Ctrl+K` desproporcionada para una demo. Se mitiga manteniendo nombres técnicos en el contexto, acceso experto en dos interacciones, claims protegidos y un comando estrictamente local. Si el comando no reduce navegación con teclado o introduce complejidad, se retira sin afectar el resto del rediseño.
