# Fase 7 — Workspace comercial simplificado

**Estado:** propuesta para revisión y `HUMAN-GATE-A`.

**Rama:** `feat/phase-7-commercial-workspace`.

**Base:** `6251442f989df26d5589cadbafa5f13ccaf19e8c`, cierre documental de Fase 6.

## 1. Objetivo

Convertir la demo técnicamente final en un workspace comercial de consulta rápida. Un usuario debe poder identificar el escenario activo, localizar la vista correcta y encontrar la lectura principal o la siguiente acción sin interpretar primero la estructura del producto.

La fase simplifica navegación, densidad y jerarquía. No añade una fuente, un cálculo, un dataset ni una inferencia comercial.

## 2. Problema observable

La auditoría de la versión publicada y las capturas de referencia muestran cinco fricciones:

1. el sidebar dedica mucho espacio a explicar cada destino y al editor completo del escenario;
2. ocho módulos expertos y el recorrido conservan un peso visual parecido;
3. escenario, guía y resumen vuelven a aparecer antes del trabajo principal en varias vistas;
4. bordes, fondos, cards y acentos verdes compiten por atención;
5. el usuario recibe mucha información correcta, pero debe descubrir qué es conclusión, evidencia, control y detalle.

La vista `#dashboard` publica 5,259 caracteres visibles y seis secciones; `#projects`, 5,657 caracteres; `#activity`, 4,680 caracteres y doce secciones. La densidad no se resuelve haciendo el texto más pequeño: se necesita prioridad, filas y divulgación progresiva.

## 3. Referencias de diseño

Las capturas aportadas se usan como referencia de patrones, no como especificación ni como instrucción externa:

- rail persistente y predecible;
- barra de acciones compacta;
- información operativa en filas y tablas;
- búsqueda de navegación invocable;
- whitespace y jerarquía mediante alineación más que mediante cards;
- acciones secundarias visibles solo cuando son pertinentes.

La solución conservará identidad Viva, tono inmobiliario, trazabilidad y limitaciones. No replicará la marca, iconografía, colores ni composición propietaria de la referencia.

## 4. Hipótesis de solución

Crear un **workspace de decisión** con tres niveles:

1. **Navegación primaria:** Recorrido, Panorama, Proyectos, Decidir y Seguimiento.
2. **Profundizar:** Inspector, Benchmark, Comparador y Checklist, accesibles en máximo dos interacciones.
3. **Comando local:** `Ctrl+K` o botón `Ir a…` para navegar por destinos, sin buscar datos ni enviar consultas.

Cada vista adopta una secuencia fija:

```text
título + propósito breve → lectura principal → superficie de trabajo → detalle bajo demanda
```

La firma de Viva será una **línea de decisión** verde: un acento único que conecta `Escenario → Evidencia → Acción`. La marca deja de competir en todos los bordes y pasa a señalar el paso que hace avanzar la decisión.

## 5. Trabajo principal del usuario

> Encontrar en menos de veinte segundos qué ocurre en el escenario activo y qué acción comercial corresponde.

El producto debe ayudar a responder rápidamente:

- ¿qué zona estoy leyendo?;
- ¿cuántos comparables sostienen esta lectura?;
- ¿dónde está la evidencia o limitación crítica?;
- ¿qué hago después?

## 6. Alcance funcional

### Dentro de alcance

- shell, sidebar, topbar y editor del escenario;
- navegación primaria/secundaria y paleta local de destinos;
- sistema transversal de cabecera, lectura, métricas y detalle;
- simplificación de Recorrido y las ocho rutas expertas;
- sustitución de grids de cards por filas cuando el contenido sea comparable;
- densidad, copy, contraste, foco, teclado, responsive y 200%;
- pruebas de paridad para confirmar que simplificar no cambia datos ni decisiones.

### Fuera de alcance

- buscador global de proyectos o documentos;
- nueva ruta, fuente, contrato o dataset;
- autenticación, permisos, telemetría o persistencia;
- backend, framework o dependencia visual nueva;
- exportación de comparación;
- cambios en elegibilidad, benchmark, scoring, histórico o asistente;
- validación humana formal; si se desea, será una UAT nueva posterior.

## 7. Baseline que debe preservarse

- contrato público `2.4.0` y compatibilidad 2.0–2.4;
- 676 proyectos, 184 agencias y todos los fingerprints vigentes;
- escenario territorial único y serializado en URL;
- seis etapas del recorrido y ocho deep-links expertos;
- caso Tipo 7, denominadores, exclusiones, referencias y límites;
- respuesta determinista del asistente, sin red ni persistencia;
- reinicio canónico `/#journey/scale`;
- CT-A–I y CT-P;
- GitHub Pages estático.

## 8. Historias de usuario

### HU-DEMO-805 — Navegación por tareas

Como integrante del equipo comercial, quiero ver primero los destinos que corresponden a mi trabajo para elegir una vista sin interpretar nueve módulos equivalentes.

### HU-DEMO-806 — Escenario compacto y editable

Como usuario, quiero reconocer el escenario activo de inmediato y editarlo solo cuando lo necesito para conservar espacio para el análisis.

### HU-DEMO-807 — Lectura principal inmediata

Como usuario, quiero que cada vista declare una conclusión o propósito principal antes del detalle para saber dónde mirar primero.

### HU-DEMO-808 — Listas operativas compactas

Como usuario, quiero recorrer proyectos, señales, evidencias y checklist en filas comparables para escanear información sin saltar entre cards.

### HU-DEMO-809 — Detalle bajo demanda

Como usuario, quiero abrir metodología, ayuda y evidencia secundaria cuando la necesito sin perder limitaciones críticas.

### HU-DEMO-810 — Acceso rápido por teclado

Como usuario frecuente, quiero abrir una paleta local de destinos y navegar por teclado para llegar a cualquier módulo rápidamente.

## 9. Restricciones vinculantes

1. Ninguna cifra, estado, fuente, referencia o conclusión puede recalcularse en la vista.
2. Una limitación que cambia la interpretación nunca se oculta como detalle opcional.
3. La ayuda contextual puede compactarse, no eliminarse.
4. Las ocho rutas expertas permanecen disponibles en máximo dos interacciones.
5. `Ctrl+K` solo navega; no se presenta como buscador de datos.
6. No se cargan fuentes, iconos, librerías o recursos externos.
7. Texto de contenido normal ≥16 px; metadata ≥13 px; objetivos táctiles ≥44×44 px.
8. La simplificación no puede depender únicamente de hover, color o truncamiento.
9. El runtime no se modifica antes de la aprobación del plan.

## 10. Criterio de éxito

- escenario, título, lectura y acción primaria visibles en 1280×720 en las vistas prioritarias;
- máximo una acción primaria verde por viewport;
- navegación primaria de cinco destinos y acceso experto en máximo dos interacciones;
- ayuda permanente reemplazada por una invocación compacta, sin perder su contenido;
- proyectos y señales se leen en filas; no hay grid de cards como estructura dominante;
- la primera decisión útil aparece antes que metodología y detalle;
- cero pérdida de claims, referencias, límites o estados;
- cero overflow horizontal en 390×844 y reflow 200%;
- navegación completa por teclado y contraste AA;
- suite integral y comparación DOM↔estado en `PASS`.

## 11. Riesgos

| Riesgo | Severidad | Tratamiento |
|---|---:|---|
| Simplificar elimina contexto necesario | Alta | inventario de claims protegidos y pruebas DOM↔modelo |
| Menú compacto vuelve invisibles módulos expertos | Alta | agrupación explícita, `Ctrl+K` y máximo dos interacciones |
| Escenario colapsado oculta cambios activos | Alta | resumen siempre visible, editor invocable y anuncio accesible |
| Filas demasiado densas reducen legibilidad | Media | 16 px, altura mínima, columnas prioritarias y detalle expandible |
| Una paleta local parece búsqueda global | Media | copy `Ir a…`, catálogo cerrado y sin resultados de datos |
| El rediseño altera demasiadas vistas a la vez | Alta | olas seriales, write sets cerrados y rollback por tarea |
