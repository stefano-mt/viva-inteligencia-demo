# Fase 4 — Especificación UX/UI

## Estado

**Borrador sujeto a HUMAN-GATE-A.** Esta especificación no autoriza implementación.

## Sujeto, audiencia y trabajo único

- **Sujeto:** comparación comercial de proyectos residenciales dentro de una microzona.
- **Audiencia primaria:** analista o responsable comercial de Viva Inmobiliaria.
- **Trabajo único:** decidir qué referencia de mercado y qué diferencia entre proyectos puede sostenerse con datos trazables.

La experiencia no debe parecer un dashboard genérico. Debe leerse como una cédula técnica de decisión.

## Dirección visual

### Tesis

El benchmark abre con una afirmación verificable, no con una cuadrícula de KPIs:

> Miraflores tiene 85 comparables; 69 permiten un índice orientativo de entrada, pero la pareja precio–área no está demostrada a nivel de unidad.

El número exacto cambia con el escenario y solo se muestra cuando el contrato está disponible.

### Firma visual: línea de evidencia

Una línea vertical verde conecta:

`alcance → denominador → resultado → fuentes → exclusiones`.

La línea no es decorativa: cada nodo representa una transformación del universo y permite abrir los IDs que entran o salen. Esta es la única apuesta visual distintiva de la fase; el resto permanece sobrio.

### Autocrítica aplicada

Se descartan dos patrones genéricos:

- hero con seis tarjetas equivalentes;
- tabla ancha como único modo de comparar.

La versión final prioriza una cédula vertical, conclusión antes del detalle y grupos de filas bajo demanda. La selección masiva de candidatos deja de preceder siempre a la decisión.

## Tokens

No se añaden dependencias ni fuentes externas.

| Rol | Token |
|---|---|
| Viva principal | `#00943B` |
| Verde profundo | `#016150` |
| Acción | `#00614F` |
| Acción hover | `#00483B` |
| Tinta | `#202022` |
| Fondo operativo | `#EFF0F0` |
| Papel de evidencia | `#F8F5EC` |
| Revisión | `#8A5400` |
| Inconsistencia | `#B42318` |

Tipografía:

- interfaz: Aptos / Segoe UI / Arial local;
- títulos: 28–36 px, peso 750–800;
- cuerpo: 15–16 px;
- fuente/metadata: mínimo 13 px;
- números: `font-variant-numeric: tabular-nums`;
- no usar texto de 11 px para headers o datos interactivos.

## Arquitectura de información

### Ruta `#market` — Benchmark de microzona

1. Cédula de alcance y estado.
2. Referencia cuantitativa.
3. Composición de oferta.
4. Atributos anunciados y documentados.
5. Exclusiones y metodología bajo demanda.
6. Contexto territorial existente, contraído.
7. CTA al comparador.

### Ruta `#compare` — Comparador estratégico

1. Selección compacta y escenario Viva.
2. Conclusión ejecutiva.
3. Diferencias prioritarias.
4. Grupos de comparación.
5. Fuentes, confianza y limitaciones.
6. Exportación diferida; no aparece en esta ejecución sin enmienda posterior.

No se añade una novena ruta. Se conservan IDs `market` y `compare` y aliases legacy.

## Wireframe — Benchmark

```text
┌ Benchmark de microzona ─────────────── [LISTO / ORIENTATIVO] ┐
│ Miraflores · Cuadrante NW · corte 28 jul. 2026              │
│ Área total · 0 referencias elegibles / 37 comparables       │
│ 27 cocientes de mínimos orientativos · 10 faltantes         │
└──────────────────────────────────────────────────────────────┘

│ ALCANCE       40 observados
│   └─ VÁLIDOS  37 comparables
│       ├─ ELEGIBLE 0 parejas demostradas
│       └─ ORIENTACIÓN 27 cocientes de mínimos

┌ Referencia elegible por m² total ─────────────────────────────┐
│ Información insuficiente: no hay parejas precio–área probadas │
│ Índice orientativo de entrada: P25 · mediana · P75            │
│ Cociente de mínimos; no representa una tipología demostrada   │
│ Fuente, corte, fórmula, n y cautela visibles                  │
└──────────────────────────────────────────────────────────────┘

┌ Oferta de la muestra ─────────────────────────────────────────┐
│ Proyectos usados ....................................... 37  │
│ Inmobiliarias .......................................... 29  │
│ Unidades reportadas .......................... 312 · 37/37   │
│ [Ver composición exacta]                                    │
└──────────────────────────────────────────────────────────────┘

┌ Atributos anunciados ─────────────────────────────────────────┐
│ ÁREAS COMUNES                                                 │
│ Lobby       █████████  31/36 informados · 1 no informado     │
│ Parrillas   ███████    24/36 informados [Ver proyectos]      │
│                                                                │
│ ACABADOS                                                       │
│ Información insuficiente: 0 proyectos de mercado documentados │
│                                                                │
│ ESTACIONAMIENTOS                                               │
│ Información insuficiente: 2/37 informados                     │
└──────────────────────────────────────────────────────────────┘

<details>Composición y exclusiones</details>
<details>Contexto territorial: ranking y cuadrantes</details>

[Comparar proyectos de esta muestra]
```

Los valores del wireframe son ilustrativos. La UI real siempre deriva sus cifras.

## Wireframe — Comparador

```text
┌ Selección ─────────────────────────────────────────────────────┐
│ [Proyecto A ×] [Proyecto B ×] [+ Cambiar proyectos]           │
│ [Incluir escenario Viva]                      [Exportar]       │
└───────────────────────────────────────────────────────────────┘

┌ Conclusión ejecutiva ─────────────────────────────────────────┐
│ HALLAZGO    máximo tres; cada uno enlaza a una fila           │
│ IMPLICANCIA lectura prudente, sin predicción de ventas        │
│ ACCIÓN      precio / evidencia / diferenciación               │
│ LIMITACIÓN  dato crítico faltante o incompatible              │
└───────────────────────────────────────────────────────────────┘

┌ Comparación por filas ─────────────────────────────────────────┐
│ Criterio       Viva          Proyecto A        Proyecto B      │
│ ▼ Diferencias prioritarias                                    │
│ ▼ Precio                                                      │
│ ▼ Áreas                                                       │
│ ▶ Producto                                                    │
│ ▶ Ubicación                                                   │
│ ▶ Entrega                                                     │
│ ▶ Áreas comunes                                               │
│ ▶ Acabados y materiales                                       │
│ ▶ Estacionamientos                                            │
│ ▶ Fuentes y confianza                                         │
└───────────────────────────────────────────────────────────────┘
```

## Componentes

### Cédula de alcance

Debe mostrar simultáneamente:

- distrito/cuadrante/radio;
- fecha de corte;
- área denominadora;
- estado `ready`, `orientative` o `insufficient`;
- comparables totales;
- muestra usada por indicador;
- exclusiones principales.

El estado no depende solo del color.

### Línea de evidencia

Cada paso tiene:

- etiqueta;
- conteo;
- definición;
- control para abrir composición cuando aplica.

La línea se convierte en lista vertical simple a 390 px y al 200%.

### Banda cuantitativa

- P25, mediana y P75 con ejes y valores visibles.
- El tooltip es complementario.
- El marcador Viva declara `simulado`.
- Si `n < 3`, no se dibuja una banda engañosa; se usa estado orientativo/insuficiente.

### Prevalencia cualitativa

Cada fila muestra:

- atributo normalizado;
- original accesible;
- `numerador / informados`;
- no informados;
- excluidos;
- clasificación `evidence_backed` o `announced`;
- acción `Ver proyectos`.

No usar “estándar del mercado” con menos de cinco informados.

### Selector de comparables

- Los seleccionados permanecen visibles como chips removibles.
- El buscador se abre bajo demanda.
- Máximo tres proyectos.
- Solo ofrece IDs del escenario vigente.
- Si cambia el escenario, conserva únicamente selecciones válidas y anuncia las removidas.

### Matriz agrupada

Orden recomendado:

1. diferencias prioritarias;
2. precio;
3. áreas;
4. producto;
5. ubicación;
6. entrega;
7. áreas comunes;
8. acabados y materiales;
9. estacionamientos;
10. fuentes y confianza.

Cada celda puede mostrar:

- valor;
- unidad/denominador;
- observado, derivado, simulado, anunciado, unknown o excluido;
- fecha y fuente bajo demanda;
- evidencia o enlace al inspector cuando existe permiso.

### Conclusión ejecutiva

Estructura fija:

- `Hallazgo`;
- `Implicancia comercial`;
- `Siguiente acción`;
- `Limitación` cuando aplica.

Máximo tres hallazgos. Cada uno enlaza a un `id` de fila. Cambiar selección recompone texto y referencias.

## Copy obligatorio

- `Precio publicado desde`, no `precio real`.
- `Área total`, no `área techada` cuando no existe evidencia.
- `Unidades reportadas por la publicación`, no `stock`.
- `Atributos anunciados`, no `amenities verificados`.
- `No informado`, no `No tiene`.
- `Elegible según las reglas de la demo`, no `certificado externamente`.
- `Información insuficiente` cuando no alcanza el mínimo.

## Jerarquía de acciones

Benchmark:

- Primario: `Comparar proyectos de esta muestra`.
- Secundario: `Ver composición de la muestra`.
- Contextual: `Ver proyectos`, `Ver evidencia`.

Comparador:

- Primario: `Incluir escenario Viva` mientras no esté incluido.
- Secundario: `Cambiar proyectos`.
- Terciario: `Exportar` si HU-505 se ejecuta.

Una región no puede presentar dos botones rellenos con igual jerarquía. `.text-button` no debe competir visualmente con `.primary-button`.

## Estados

### Benchmark cuantitativo

- `ready`: n >= 3 valores elegibles `source_paired` homogéneos.
- `orientative`: n = 1–2 valores elegibles `source_paired`.
- `insufficient`: n = 0 valores elegibles.
- `orientative_noncomparable`: cocientes de mínimos sin pareja de unidad demostrada; nunca cambia a `ready` por volumen.
- `excluded`: visible en composición, nunca en numerador.
- `contract_unavailable`: payload 2.1–2.2 sin root `benchmark`; F4 degrada sin romper F2/F3.
- `error`: fallo técnico distinto de insuficiencia.

### Benchmark cualitativo

- `ready`: 5 o más proyectos con campo informado; admite patrón observado de publicación.
- `orientative`: 1–4 informados; muestra conteos, no prevalencia o estándar.
- `insufficient`: 0 informados.
- `restricted` y `excluded` se muestran fuera del denominador; `unknown` permanece faltante.

### Comparador

- 0 seleccionados: explicar el primer paso.
- 1 seleccionado: pedir uno más.
- 2–3: matriz activa.
- Dato faltante: `No informado`.
- Discrepancia: estado textual + enlace al inspector.
- Evidencia pending/restricted: metadata permitida, sin `href`, `src` o fetch.

## Responsive

### 1440×900

- Cédula y conclusión visibles sin perder el contexto global.
- Banda cuantitativa a ancho completo.
- Matriz con header y primera columna sticky.

### 1280×720

- Veredicto, denominador y CTA principal visibles antes del primer scroll largo.
- Contexto territorial permanece contraído.

### 390×844 y reflow 200%

Las filas se apilan por métrica:

```text
Precio / m² total
Viva          S/… · simulado
Proyecto A    S/… · observado [Evidencia]
Proyecto B    No informado
```

- No truncar nombres, valores o estados.
- No depender de scroll horizontal como único modo.
- Si una tabla conserva scroll, anunciarlo y fijar la primera columna.
- Overlay/selector ocupa pantalla completa.

## Accesibilidad

- Target táctil mínimo 44×44 px.
- Focus visible de alto contraste.
- `<details>` operable por teclado.
- Header sticky no oculta el foco.
- Los gráficos incluyen equivalente textual.
- Estados tienen texto e icono, no solo color.
- Contraste probado para texto, CTA, badges y links.
- Escape cierra selector/modal y retorna foco.
- Reduced motion elimina animación de la línea de evidencia.

## Evidencia requerida

Capturas antes/después:

- `#market` y `#compare` en 1440×900;
- 1280×720;
- 390×844;
- reflow equivalente al 200%;
- ready, orientative, insufficient y CT-G excluido;
- comparación 2, 3 y 3+Viva columnas.

El checker debe comprobar además teclado, consola, red, restricciones de evidencia y ausencia de overflow bloqueante.
