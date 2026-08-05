# Fase 6 — Especificación UX/UI

**Estado:** propuesta para HUMAN-GATE-A.

## 1. Dirección

La interfaz se organiza como una **ruta de decisión inmobiliaria**, no como un dashboard adicional. La firma visual será una línea de recorrido de seis etapas que conecta cada lectura con la siguiente decisión y conserva un rastro visible de evidencia y limitaciones.

La secuencia numerada es funcional: el orden cambia lo que el usuario puede sostener. No es decoración.

## 2. Sistema visual

### Color

Se preservan los tokens Viva existentes:

| Rol | Token | Hex |
|---|---|---|
| Acción y confianza | `--teal` / `--action` | `#016150` / `#00614f` |
| Acento de avance | `--teal-bright` | `#00943b` |
| Tinta | `--ink` | `#202022` |
| Superficie de lectura | `--surface` | `#ffffff` |
| Superficie cálida para límites | `--surface-warm` | `#f8f5ec` |
| Advertencia | `--amber` / `--amber-soft` | `#8a5400` / `#fff3d9` |

No se añadirá un color de producto desconectado de Viva. Estado y progreso siempre tendrán texto o icono además de color.

### Tipografía

- Display: `Aptos Display`, `Aptos`, `Segoe UI`, sans-serif; uso restringido a tesis y título de etapa.
- Cuerpo: `Aptos`, `Segoe UI`, Arial, sans-serif.
- Datos/IDs: `ui-monospace`, `Consolas`, monospace solo cuando la precisión lo requiera.
- Texto normal ≥16 px en contenido; metadata ≥14 px; escala fluida sin cortes manuales frágiles.

No se cargan fuentes externas.

### Firma

`Ruta de decisión`: un rail/stepper con seis preguntas reales, etapa actual, resultado esperado y siguiente acción. Una línea verde avanza solo entre etapas; no comunica porcentaje de completitud ni éxito analítico.

## 3. Arquitectura de información

### Nivel 1 — Recorrido ejecutivo

- Entrada principal visible en sidebar y primera pantalla.
- Ruta `#journey/<stage>` con slugs estables.
- Seis etapas: `scale`, `geography`, `quality`, `depth`, `movement`, `decision`.
- Anterior/siguiente y deep-link reproducible.
- La etapa se deriva de la ruta; no se guarda un historial oculto de progreso.

### Nivel 2 — Explorar análisis

Los ocho módulos se conservan como acceso experto:

- Radar comercial;
- Proyectos comparables;
- Inspector de evidencia;
- Benchmark de microzona;
- Comparador comercial;
- Señales del mercado;
- Asistente de estrategia;
- Checklist comercial.

El menú deja de presentar ambos niveles con la misma jerarquía.

## 4. Wireframe desktop

```text
┌──────────────────┬──────────────────────────────────────────────────────┐
│ VIVA             │ Escenario canónico · Miraflores · Distrito         │
│                  ├──────────────────────────────────────────────────────┤
│ RECORRIDO        │ 01 Escala — 02 Geografía — 03 Calidad — ...        │
│ [Ver recorrido] ├──────────────────────────────────────────────────────┤
│                  │ ETAPA 03/06 · CALIDAD                               │
│ EXPLORAR         │ ¿Qué dato puede utilizarse?                         │
│ Radar            │ Lectura principal + límite                          │
│ Proyectos        │                                                      │
│ Inspector        │ ┌────────────── Momento Tipo 7 ──────────────────┐   │
│ Benchmark        │ │ 104.15 m² ≠ 53.37 m² · excluido                │   │
│ ...              │ └────────────────────────────────────────────────┘   │
│                  │ [Abrir evidencia]             [Continuar: comparar] │
└──────────────────┴──────────────────────────────────────────────────────┘
```

## 5. Wireframe móvil

```text
┌──────────────────────────────┐
│ Menú · ETAPA 3/6             │
│ Calidad                      │
├──────────────────────────────┤
│ Miraflores · Distrito        │
├──────────────────────────────┤
│ ¿Qué dato puede utilizarse?  │
│ Lectura + límite             │
│                              │
│ Momento Tipo 7               │
│ 104.15 ≠ 53.37 m²            │
│ [Abrir evidencia]            │
│                              │
│ [Continuar: profundidad]     │
│ [Volver]                     │
└──────────────────────────────┘
```

El rail completo se convierte en un resumen `Etapa 3 de 6` más un control desplegable; no se crea un carrusel horizontal.

## 6. Anatomía de una etapa

Cada etapa contiene, en este orden:

1. eyebrow `Etapa n de 6`;
2. pregunta comercial como `h1`;
3. lectura principal derivada;
4. máximo tres datos de respaldo;
5. `Qué sabemos`;
6. `Qué falta o no puede afirmarse`;
7. evidencia o profundización secundaria;
8. una acción primaria para continuar;
9. acción secundaria para volver.

La primera pantalla de 1280×720 debe mostrar 1–6 y el CTA principal, salvo que el estado sea error/carga.

Dentro del recorrido, `Ver recorrido` en el sidebar es navegación secundaria y no adopta estilo de botón primario. La única acción primaria es el CTA de la etapa.

## 7. Contenido por etapa

| Etapa | Lectura principal | Evidencia visible | CTA primario |
|---|---|---|---|
| Escala | tamaño y cobertura observable | modelo 184, piloto 30/22/5 y cobertura actual, con denominadores diferenciados | `Continuar a geografía` |
| Geografía | alcance y comparables del escenario | mapa y conteos derivados del escenario; nunca 90/85 fijados | `Validar calidad` |
| Calidad | dato apto vs. excluido | caso transversal Tipo 7, Miraflores, 104.15/53.37/50.78 m² | `Comparar con evidencia` |
| Profundidad | diferencias que afectan decisión | matriz por filas, denominadores, referencias | `Revisar movimiento` |
| Movimiento | cambios publicados prioritarios | anterior/nuevo, vigencia, estado, causa nula | `Preparar decisión` |
| Decisión | lectura prudente y siguiente acción | respuesta, límites, referencias, checklist | `Reiniciar recorrido` |

En Decisión, una `state.assistantResponse` existente se reproduce literalmente. Si no existe, la etapa muestra solo el resumen prudente del checklist y `Formular consulta en el asistente`; no genera una pregunta ni elige una intención por el usuario.

## 8. Ayuda contextual

La ayuda debe responder siempre:

- `Para qué sirve`;
- `Qué debes hacer`;
- `Qué resultado obtienes`;
- `Qué no puedes concluir`;
- `Dónde continuar`.

El resumen visible no repite todo el cuerpo. Los componentes complejos mantienen ayuda accesible por click/teclado, nunca solo hover.

## 9. Densidad y jerarquía

- Una única acción primaria verde por viewport/etapa.
- Máximo tres resúmenes en una fila; móvil siempre una columna.
- Las listas largas muestran primero 3–5 elementos y permiten expandir.
- Las metodologías, referencias completas y tablas equivalentes quedan en `details` o en el módulo experto.
- El escenario territorial se muestra en una banda compacta dentro del recorrido; las vistas expertas conservan su detalle.
- No se elimina información para alcanzar el presupuesto visual.
- No se usa una cuadrícula de cards como estructura principal.

## 10. Estados

| Estado | Comportamiento |
|---|---|
| Carga | skeleton/texto de etapa y escenario; navegación no salta |
| Vacío | explica qué falta y ofrece volver/configurar escenario |
| Insuficiente | conserva límite y enlaza evidencia/metodología |
| Error | identifica recurso fallido y ofrece reintentar/reiniciar |
| Legacy 2.0–2.3 | recorrido degrada capacidades sin inventar índices 2.4 |
| Deep-link inválido | corrige a `scale` con anuncio accesible y URL canónica |

Reglas de legacy: 2.0 produce `contract_unavailable` global; 2.1 habilita escala/geografía; 2.2 agrega calidad; 2.3 agrega profundidad; 2.4 agrega movimiento/decisión. Una capacidad ausente se explica y no se presenta como un vacío de negocio.

## 10.1. Retorno entre recorrido y módulos

| Módulo | Etapa canónica de retorno |
|---|---|
| `dashboard` | `geography` |
| `projects` | `depth` |
| `inspector` | `quality` |
| `market` | `scale` |
| `compare` | `depth` |
| `activity` | `movement` |
| `assistant` | `decision` |
| `trust` | `decision` |

| Etapa | Enlaces expertos permitidos |
|---|---|
| `scale` | `market` |
| `geography` | `dashboard`, `projects` |
| `quality` | `inspector` con `case:f3-ct-g-pardo` |
| `depth` | `market`, `compare`, `projects` |
| `movement` | `activity` |
| `decision` | `assistant`, `trust` |

El retorno es canónico, no depende de memoria oculta. Al entrar a un módulo, la UI muestra `Volver al recorrido: <etapa>` según esta tabla.

## 10.2. Contrato de reinicio

`Reiniciar escenario` debe restaurar en una sola transición:

- URL final `/#journey/scale` con query del escenario por defecto y sin alias residuales;
- escenario, geografía y revisiones a `scenario_defaults`;
- filtros de proyectos, límite 18, búsqueda, orden y selección a los inicializadores canónicos;
- comparación vacía, `includeTarget=false` y query vacía;
- filtros de historial normalizados y evento seleccionado nulo;
- input, intención, respuesta y revisión del asistente vacíos/recalculados;
- inspector al caso inicial exacto: `inspectorProjectId="project:nexo-2951"`, `inspectorTypologyId="typology:pardo-coast-tipo-7"`, `inspectorPreset="case:f3-ct-g-pardo"`; `inspectorEvidenceId=null` e `inspectorDialogOpen=false`;
- menú móvil y divulgaciones transitorias cerrados;
- foco en el `h1` de Escala y anuncio accesible de reinicio.

Atrás/adelante debe recorrer URLs reales, no reponer valores borrados por el reinicio. Recargar cualquier `#journey/<stage>` conserva el escenario serializado y reconstruye la misma lectura.

## 11. Accesibilidad y movimiento

- Landmarks y un solo `h1` por etapa.
- Stepper como lista ordenada; etapa actual con `aria-current="step"`.
- Anuncios de cambio de etapa en `aria-live` sin duplicar títulos.
- Foco se mueve al `h1` después de anterior/siguiente.
- Escape cierra divulgaciones/modal si existieran.
- Objetivos táctiles ≥44×44 px.
- Contraste AA ≥4.5:1 para texto normal.
- Reflow 200% sin doble eje.
- La única transición distintiva es el avance de la línea/etapa; `prefers-reduced-motion` la elimina.

## 12. Autocrítica de diseño

Se descartó un dashboard-resumen con seis tarjetas porque repetiría el patrón que causa sobrecarga. También se descartó ocultar los módulos actuales detrás de un modal obligatorio. La ruta propuesta es específica al proceso de decisión inmobiliaria, preserva exploración experta y gasta la audacia visual en una sola estructura: el rastro de decisión y evidencia.
