# UX/UI — Fase 5

**Estado:** propuesta; implementación bloqueada por HUMAN-GATE-A.

## Dirección de diseño

La interfaz se concibe como un **cuaderno de señales comerciales**: una secuencia vertical donde cada hallazgo muestra qué cambió, qué tan confiable es y qué revisar después. La firma visual es una “columna de evidencia” verde que conecta valor anterior, valor nuevo, estado y acción. El asistente se presenta como un lector guiado del mismo cuaderno, no como un chatbot abierto.

Se mantiene la identidad Viva aprobada: verdes corporativos, fondos cálidos, tipografía funcional y acentos ámbar solo para advertencias. El color nunca será el único portador de estado.

## Principios

1. **Escenario antes que señal:** distrito, alcance, corte y muestra siempre visibles, pero compactos.
2. **Una lectura principal por fila:** evitar mosaicos de tarjetas equivalentes.
3. **Antes y después, no porcentaje aislado:** el porcentaje acompaña los valores y fechas.
4. **Calidad visible:** certificado, por revisar e insuficiente usan icono, texto y razón.
5. **Evidencia alcanzable:** cada afirmación importante tiene acción “Ver evidencia”.
6. **Sin hover obligatorio:** tooltips complementan; nunca contienen el único valor.
7. **Respuesta acotada:** el asistente muestra qué entiende y qué no puede saber.

## Arquitectura de `#activity`

### Encabezado compacto

- Título: “Señales del mercado”.
- Subtítulo dinámico: `Cambios publicados en {distrito} · {alcance}`.
- Resumen de escenario en una franja de una sola fila en escritorio y dos filas en móvil.
- CTA primario: “Revisar señal prioritaria” solo si existe una señal certificada.
- CTA secundario: “Ver comparables”.

### Resumen de calidad

Una banda con cuatro valores, no cuatro cards:

- eventos detectados;
- certificados;
- por revisar;
- cobertura temporal.

Cada valor abre su explicación mediante un control accesible.

### Línea de tiempo

Diseño vertical por filas. Cada fila contiene:

- fecha de nueva observación;
- nombre del proyecto e inmobiliaria;
- `S/ anterior → S/ nuevo`;
- delta y porcentaje si aplica;
- vigencia;
- estado y razón breve;
- acciones “Ver proyecto” y “Ver evidencia”.

Al seleccionar una fila en escritorio se abre un panel de detalle lateral dentro del flujo; en móvil el detalle se despliega debajo de la fila. La selección no depende del hover.

### Agenda de seguimiento

Lista vertical numerada de máximo tres acciones derivadas:

1. señal a verificar;
2. atributo/documento a contrastar;
3. decisión o pregunta pendiente.

Cada acción debe explicar su origen y enlazar la ruta correspondiente. No usar el mosaico actual de cuatro tarjetas.

### Wireframe

```text
┌ Señales del mercado ─ escenario compacto ───────────────┐
│ 5 detectadas | 3 certificadas | 2 por revisar | corte  │
└─────────────────────────────────────────────────────────┘
┌ Filtros: estado · vigencia · tipo                       ┐
├ 24 may  Proyecto A                                     ┤
│ S/ 790,900  →  S/ 627,000      −20.7%                  │
│ CERTIFICADA · vigente · 2 observaciones                 │
│ [Ver evidencia] [Ver proyecto]                          │
├ 24 may  Proyecto B                                     ┤
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
┌ Agenda de seguimiento                                  ┐
│ 1. Validar...                                           │
│ 2. Contrastar...                                        │
│ 3. Preparar...                                          │
└─────────────────────────────────────────────────────────┘
```

## Arquitectura de `#assistant`

### Promesa clara

- Título: “Asistente de estrategia”.
- Etiqueta visible: “Lectura determinista · sin IA generativa”.
- Texto: “Responde con los datos certificados del escenario activo y muestra sus referencias”.

### Preguntas compatibles

Las sugerencias se agrupan en una lista compacta por finalidad:

- Entender el escenario.
- Revisar cambios.
- Comparar proyectos.
- Consultar evidencia cualitativa.
- Conocer límites.

Se muestran tres inicialmente y un botón “Ver preguntas compatibles”. Se eliminan sugerencias que nombren otro distrito mientras no se cambie el escenario.

### Entrada

- Textarea con etiqueta persistente.
- Contador y límite razonable.
- CTA primario “Generar lectura”.
- Ayuda: “La consulta no se guarda”.
- Enter no envía accidentalmente desde un textarea; `Ctrl+Enter` puede hacerlo si se documenta.

### Respuesta

Una respuesta se organiza verticalmente:

1. **Respuesta breve:** una o dos frases.
2. **Datos usados:** filas clave/valor, no cards.
3. **Lectura y límites:** distingue hecho, interpretación permitida y desconocido.
4. **Referencias:** chips accesibles con tipo y estado; abren Inspector o proyecto.
5. **Siguiente paso:** una acción concreta y reproducible.

Para rechazo CT-F:

```text
No disponemos de precios reales de cierre.
La demo observa precios publicados y no debe presentarlos como transacciones.
[Ver precios publicados comparables] [Preguntas compatibles]
```

### Wireframe

```text
┌ Asistente de estrategia ─ escenario compacto ───────────┐
│ Lectura determinista · referencias obligatorias         │
└─────────────────────────────────────────────────────────┘
┌ Preguntas compatibles                                   ┐
│ [¿Qué cambió?] [¿Qué evidencia tiene?] [¿Qué no sé?]   │
│ Pregunta...                              [Generar]       │
└─────────────────────────────────────────────────────────┘
┌ Respuesta breve                                         ┐
│ ...                                                     │
├ Datos usados                                            ┤
│ ...                                                     │
├ Evidencia y límites                                     ┤
│ [HECHO certificado] [OBSERVACIÓN] [FUENTE]              │
└─────────────────────────────────────────────────────────┘
```

## Jerarquía y densidad

- Un `h1` por ruta; subtítulos de 16–18 px y cuerpo mínimo de 16 px en contenido principal.
- Metadatos mínimo 14 px con contraste AA.
- Máximo 72 caracteres por línea de explicación.
- Máximo tres acciones simultáneas por bloque.
- El estado territorial completo no debe ocupar más que el primer viewport móvil; se ofrece resumen y expansión.
- Por defecto se muestran hasta cinco eventos y existe “Ver más”; no scroll infinito.

## Color y contraste

- Primario Viva oscuro para CTA: fondo verde oscuro y texto blanco, ratio AA.
- Certificado: verde con icono de verificación y texto explícito.
- Revisable: ámbar con icono de advertencia y razón.
- Insuficiente: gris/rojo sobrio con icono y texto; no se confunde con error de aplicación.
- Foco visible de al menos 2 px y separado del borde.
- Botones principales no compiten con “Reiniciar”; reinicio permanece secundario.

## Estados obligatorios

- cargando;
- disponible con señales certificadas;
- solo señales revisables;
- sin cambios elegibles en el escenario;
- histórico no disponible por contrato antiguo;
- evidencia restringida o desconocida;
- pregunta compatible;
- pregunta ambigua;
- pregunta fuera de alcance;
- rechazo CT-F;
- error de integridad con CTA de recuperación.

## Responsive y zoom 200%

- ≥1024 px: timeline y detalle pueden usar dos columnas 7/5, pero cada registro mantiene lectura horizontal corta.
- 640–1023 px: una columna; filtros en dos filas.
- <640 px: contexto resumido, filtros apilados, detalles bajo la señal y CTA a ancho completo.
- A 200%, ningún control queda oculto por encabezado sticky ni requiere scroll horizontal.
- La lista de referencias permite wrap y conserva nombre, tipo y estado.

## Accesibilidad

- Línea de tiempo implementada como lista semántica; fechas mediante `<time>`.
- Variaciones se anuncian como “disminuyó/aumentó”, no solo con signo o color.
- El panel seleccionado conserva foco y `aria-expanded`/`aria-controls`.
- Estados dinámicos del asistente usan región `aria-live="polite"` sin releer toda la página.
- La respuesta mantiene orden de encabezados y puede recorrerse solo con teclado.
- Reducir movimiento respeta `prefers-reduced-motion`.

## Evidencia visual requerida

- `#activity` y `#assistant` en 1440×900, 1280×720 y 390×844.
- Reflow a zoom 200% para ambas rutas.
- Estados sin señales, solo revisables, CT-F y contrato legacy.
- Recorrido teclado: sugerencia → consulta → respuesta → evidencia → regreso preservando escenario.
- Comparación antes/después que demuestre eliminación de distritos ajenos y de variaciones extremas sin validar.
