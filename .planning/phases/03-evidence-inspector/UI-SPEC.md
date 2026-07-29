# Fase 3 — Especificación UX/UI

## Estado

**Revisada — PASS.** Define comportamiento y jerarquía; no autoriza implementación hasta HUMAN-GATE-A.

## Dirección de diseño

### Sujeto

Un analista comercial que necesita decidir si una tipología es confiable para comparar y explicar esa decisión a gerencia.

### Trabajo principal

Responder en menos de un minuto:

> ¿Este dato puede entrar al benchmark y qué evidencia sustenta la respuesta?

### Sensación

Editorial, rigurosa y comercial: más expediente trazable que dashboard de tarjetas. Debe sentirse propio de Viva, no un panel genérico.

### Elemento memorable

El **ledger de evidencia**: una secuencia vertical que conecta fuente → valor original → normalización → hallazgo → decisión. En CT-G, una línea de contraste une `104.15 m²` y `Área Total 53.37 m²` con el delta `50.78 m²`, sin decidir cuál es verdadero.

## Arquitectura de información

### Nivel 1 — Contexto y propósito

- breadcrumb `Viva Inteligencia / Evidencia`;
- título `Inspector de evidencia`;
- una frase: “Contrasta fuentes y decide qué datos pueden entrar al benchmark”;
- ayuda de sección con:
  - para qué sirve;
  - tres pasos;
  - resultado esperado.

No se repite una cuadrícula de KPIs.

### Nivel 2 — Cobertura de la demostración

Una franja vertical/compacta presenta:

1. `30` inmobiliarias con cobertura base;
2. `22` con enriquecimiento;
3. `5` con profundidad estructurada;
4. conteo real de tipologías inspectables;
5. conteo de activos visuales autorizados.

Se usa un embudo o escala progresiva, no cinco tarjetas paralelas. Cada nivel incluye una definición bajo demanda. “Deep” nunca se etiqueta como “plano disponible”.

La franja no retrasa el momento de valor: en el enlace canónico CT-G aparece compacta y el veredicto queda en el primer viewport.

### Nivel 3 — Selector de expediente

Controles:

- proyecto;
- tipología;
- preset de caso: `Inconsistente`, `Certificado`, `Revisable`, `Insuficiente/restringido`.

El orden obligatorio es proyecto → tipología. El selector conserva el escenario territorial, pero la selección del expediente no altera los comparables de Fase 2.

La procedencia `Observado`, `Controlado` o `Simulado` aparece junto a cada opción y se repite en veredicto, ledger y visor.

CT-G usa la frase conjunta:

> Caso observado · evidencia presentada como transcripción controlada; no es el original.

Estados:

- proyecto sin tipologías: explicación y acceso a ficha de proyecto;
- tipología sin segunda fuente: estado insuficiente;
- selección inválida: corrección al preset estable y anuncio accesible.

### Nivel 4 — Veredicto

Bloque de decisión antes del detalle:

- estado textual;
- `Elegible` o `No elegible según las reglas de la demo`;
- una frase causal;
- número de fuentes;
- fecha más reciente;
- CTA primario de alto contraste:
  - `Revisar hallazgos` si hay conflicto;
  - `Abrir evidencia` si está certificado;
  - `Ver limitación` si es insuficiente/restringido.

El CTA verde oscuro debe ser inequívoco. Acciones secundarias son enlaces o botones outline.

Comportamiento determinista:

- `Revisar hallazgos` desplaza y enfoca la primera fila bloqueante según orden `área → piso/unidad → modelo → dormitorios → baños`;
- `Abrir evidencia` abre el `primary_evidence_id` declarado por el expediente;
- `Ver limitación` desplaza y enfoca `#inspector-limitations`;
- `Ver permiso pendiente` y `Ver restricción` enfocan la razón correspondiente;
- después de recargar el enlace canónico, el mismo caso, veredicto y destino principal permanecen;
- cada transición anuncia caso y destino mediante región viva.

### Nivel 5 — Ledger de compatibilidad

Comparación por filas:

| Campo | Fuente A | Fuente B | Lectura |
|---|---|---|---|
| Modelo | Tipo 7 | Tipo 7 | Compatible |
| Piso/unidad | Piso 1 | Dep. 807–1007 | Revisión requerida |
| Área | 104.15 m² · tipo no declarado | Área Total 53.37 m² | Inconsistente |
| Dormitorios | 2 | No observado | Insuficiente |
| Baños | 2 | No observado | Insuficiente |

Cada celda de fuente incluye:

- valor original como texto dominante;
- normalizado como detalle secundario;
- fecha y fuente;
- botón `Ver evidencia`.

La columna `Lectura` incluye etiqueta, motivo y si bloquea benchmark. No depende de hover.

En móvil, cada fila se apila verticalmente manteniendo el orden `campo → fuente A → fuente B → lectura`; no se convierte en una tabla con scroll horizontal obligatorio.

### Nivel 6 — Visor de evidencia

Se abre desde una fila o hallazgo, no como modal ornamental.

En escritorio:

- panel lateral o diálogo ancho;
- izquierda: activo autorizado o ficha de transcripción;
- derecha: metadata y campos relacionados.

En móvil:

- diálogo de pantalla completa;
- botón cerrar visible;
- foco atrapado;
- Escape cierra;
- al cerrar, foco vuelve al disparador.

Contenido:

- título y tipo de documento;
- badge `Original autorizado`, `Transcripción controlada`, `Permiso pendiente` o `Restringido`;
- fecha;
- fuente;
- método;
- hash abreviado con acceso al valor completo;
- fragmento o activo si está permitido;
- región resaltada solo cuando exista coordenada válida;
- aviso persistente cuando el contenido no es original.

Nunca:

- mostrar un thumbnail borroso como si fuera evidencia;
- depender del zoom/hover para leer valores;
- cargar un activo `restricted` o `pending`;
- llamar “plano” a una ficha neutral.

### Nivel 7 — Decisión y siguiente acción

Debajo del ledger:

- hechos elegibles;
- hechos excluidos;
- razones agrupadas;
- siguiente acción recomendada;
- enlace `Ver reglas de certificación`.

Para CT-G:

> Esta tipología no es elegible para el benchmark según las reglas de la demo. El área publicada no declara tipo y difiere 50.78 m² del Área Total observada en el plano. También existe una incompatibilidad pendiente entre Piso 1 y unidades 807–1007. El proyecto permanece en la lectura territorial.

No usar “error del competidor” ni “dato falso”.

“Certificado” es un estado interno del contrato. La interfaz explica `Elegible según las reglas de la demo`; no sugiere certificación externa, legal ni de un tercero.

## Navegación

Se propone una nueva entrada bajo `Análisis`:

- `Inspector de evidencia`
- hint: `Fuentes, tipologías y calidad`

Desde `Proyectos comparables`, el detalle seleccionado incluye el CTA `Inspeccionar evidencia` cuando existe tipología. Si no existe, ofrece `Ver cobertura disponible` y explica la limitación.

La ruta base es `#inspector`. El enlace canónico CT-G es:

```text
#inspector/case/f3-ct-g-pardo
```

El parser mapea `f3-ct-g-pardo` a `case:f3-ct-g-pardo`. Una ruta de caso inválida cae al CT-G canónico, anuncia la corrección y no altera el escenario territorial.

## Reducción de sobrecarga

- máximo dos decisiones primarias visibles por viewport;
- máximo una banda de resumen;
- presupuesto inicial: un veredicto, cinco filas compactas, metadata cerrada y una sola siguiente acción;
- cobertura como escala, no cards;
- compatibilidad como filas, no cards por dato;
- metadata en `details` o panel lateral;
- resumen cualitativo después del veredicto, no antes;
- listas largas con agrupación y búsqueda, no carruseles;
- no repetir fuente/fecha en múltiples bloques si la fila ya las presenta;
- cifras secundarias usan menor énfasis, nunca texto gris de bajo contraste.

Área y piso/unidad ocupan las dos primeras filas del ledger CT-G.

## Explicación de componentes

Cada módulo incluye una frase visible; la ayuda ampliada se presenta en `details`, nunca solo por hover:

- cobertura: “Muestra cuánta profundidad de fuente existe realmente”;
- selector: “Elige el proyecto y la tipología que vas a contrastar”;
- veredicto: “Resume si los datos son elegibles según las reglas de la demo”;
- ledger: “Compara valores fuente por fuente y explica cada incompatibilidad”;
- visor: “Abre únicamente evidencia permitida y conserva su contexto”;
- decisión: “Explica qué se usa, qué se excluye y cuál es el siguiente paso”.

## Lenguaje

Términos preferidos:

- `Valor publicado`;
- `Valor normalizado`;
- `Tipo de área no declarado`;
- `Evidencia disponible`;
- `Permiso pendiente`;
- `Requiere revisión`;
- `No elegible para el benchmark según las reglas de la demo`;
- `No observado`;
- `Representación controlada para demo`.

Términos prohibidos sin evidencia:

- `Área techada` para CT-G;
- `Verdadero`, `falso` o `error`;
- `Precio real de cierre`;
- `Plano original` para un recurso neutral;
- `Cobertura total`;
- `Automáticamente corregido`.

## Guion comercial verificable — 5 minutos

Punto de entrada: `#inspector/case/f3-ct-g-pardo`.

| Tiempo máximo | Acción | Evidencia de éxito |
|---|---|---|
| 0:00–0:30 | leer propósito, procedencia y veredicto | identifica Pardo Coast, Tipo 7 y estado observado/inconsistente |
| 0:30–1:30 | activar `Revisar hallazgos` | foco llega a área; explica 104.15, 53.37, tipo y delta |
| 1:30–2:30 | revisar piso/unidad | distingue Piso 1, 807–1007 e inferencia 8–10 de baja confianza |
| 2:30–3:30 | abrir evidencia | distingue transcripción controlada, permiso pendiente y restricción; no ve binarios originales |
| 3:30–4:15 | leer decisión | explica por qué no es elegible y cuál es la siguiente acción |
| 4:15–5:00 | abrir cobertura | explica 30/22/5 y que 10 casos no equivalen a 10 originales de mercado |

Gate narrativo: un lector nuevo completa el recorrido en cinco minutos o menos y explica, sin facilitador, valor, evidencia, limitación y siguiente acción.

## Paleta y contraste

Reutilizar tokens existentes de Viva:

- verde marca para acentos y progreso;
- teal oscuro para texto/acciones primarias;
- carbón para títulos y datos;
- superficies blancas y verdes muy suaves;
- ámbar para revisión;
- rojo oscuro sobrio para inconsistencia bloqueante;
- azul/gris para información insuficiente.

Requisitos:

- estado no depende solo del color;
- CTA primario con contraste AA;
- texto normal no usa tonos más claros que el `--muted` aprobado;
- números del ledger usan cifras tabulares si el sistema disponible lo soporta;
- foco visible con doble anillo compatible con superficies claras.

No se añaden fuentes web ni dependencias externas. Se conserva la tipografía local del sistema y se mejora la jerarquía con peso, tamaño, ancho y espaciado.

## Densidad y responsive

### 1440×900

- cobertura y veredicto visibles antes del ledger;
- ledger usa ancho completo;
- visor puede ser lateral sin ocultar la relación entre hallazgo y fuente.

### 1280×720

- el veredicto y CTA principal CT-G quedan visibles sin scroll;
- ninguna cifra se trunca;
- CTA primario no compite con filtros.

### 390×844

- controles en una columna;
- ledger apilado;
- diálogo de evidencia en pantalla completa;
- acciones con área táctil mínima de 44×44;
- no hay scroll horizontal para el recorrido principal.

### Zoom 200%

- navegación, selectores, veredicto, ledger y cierre del visor permanecen operables;
- el layout pasa a una columna antes de superponerse.

## Estados obligatorios

### Carga

Skeleton textual o mensaje estable; no muestra valores parciales como certificados.

### Error de datos

Mensaje: no se pudo construir el expediente; ofrece volver al catálogo. No expone stack.

### Sin tipología

Explica qué cobertura existe y qué falta.

### Evidencia restringida

Metadata visible; activo ausente; razón y siguiente paso.

### Permiso pendiente

No carga el activo; evita enlace externo automático; conserva fecha/hash.

### Ilegible

No inventa transcripción. Muestra qué campo no pudo leerse.

### Insuficiente

No interpreta ausencia como `false` ni coincidencia.

### Inconsistente

Conserva observaciones, cuantifica conflicto cuando procede y bloquea agregación.

### Certificado

Explica por qué es elegible y abre evidencia autorizada.

## Accesibilidad

- headings siguen jerarquía lógica;
- ledger tiene semántica de tabla en escritorio o grupos etiquetados equivalentes en móvil;
- badges incluyen texto completo;
- anuncios `aria-live` para cambio de expediente y apertura/cierre;
- selectores tienen label y descripción;
- diálogos controlan foco;
- Enter/Espacio activan filas interactivas;
- Escape cierra paneles;
- no hay información solo al hover;
- imágenes autorizadas tienen `alt` descriptivo, no transcripción inventada;
- hashes y URLs largas tienen nombre accesible legible.

## Evidencia visual requerida

Capturas antes/después en:

- 1440×900;
- 1280×720;
- 390×844;
- Chrome a 200%.

Casos:

1. cobertura `30 / 22 / 5`;
2. CT-G veredicto y ledger;
3. visor CT-D autorizado;
4. activo restringido;
5. estado insuficiente/ilegible;
6. caso certificado;
7. retorno de foco y navegación por teclado.
