# Fase 6 — Auditoría UX/UI del baseline

**Fecha:** 2026-08-05.

**Fuente:** GitHub Pages desplegado para `25300b1`, inspección UI-only y evidencia visual versionada de F4/F5.

## 1. Método

Se recorrieron los ocho botones visibles del menú sin consultar código durante la navegación. Para cada ruta se registró propósito visible, encabezados, botones, longitud textual y altura total en un viewport de 720 px. La auditoría es diagnóstica y read-only.

## 2. Inventario cuantitativo

| Ruta | Altura | Pantallas de 720 px | Caracteres visibles | Hallazgo principal |
|---|---:|---:|---:|---|
| Radar comercial | 5,854 px | 8.1 | 10,392 | mapa, formulario, diagnóstico, score, lista y gráfico compiten en una sola página |
| Proyectos comparables | 7,566 px | 10.5 | 6,907 | la lista y el detalle requieren un scroll excesivo |
| Inspector de evidencia | 2,147 px | 3.0 | 5,265 | momento distintivo claro, pero no enlaza explícitamente con la tesis completa |
| Benchmark de microzona | 3,782 px | 5.3 | 3,462 | 40 regiones/agrupaciones visuales; carga distrital y benchmark compiten |
| Comparador comercial | 3,700 px | 5.1 | 4,009 | matriz útil, pero la siguiente decisión aparece tarde |
| Checklist comercial | 2,122 px | 2.9 | 2,081 | cierre compacto, sin contexto de progreso del recorrido |
| Asistente de estrategia | 1,825 px | 2.5 | 1,853 | flujo vertical sólido; falta entrada desde el relato y salida al cierre |
| Señales del mercado | 3,504 px | 4.9 | 3,629 | señal y agenda son útiles, pero el usuario debe elegir dónde continuar |

## 3. Fortalezas a preservar

- Paleta Viva coherente y contraste ya verificado.
- Una sola lente territorial para todos los consumidores.
- Mapa accesible por selector, no solo por hover.
- Inspector Tipo 7 con evidencia, diferencia y exclusión explícitas.
- Benchmark y comparador distinguen observado, orientativo, simulado y excluido.
- Señales priorizan calidad antes que magnitud.
- Asistente determinista con límites y referencias.
- Ayuda contextual por sección mediante `details`.
- Ocho rutas operables por teclado y responsive.

## 4. Fricciones por navegación

### N1 — El menú describe módulos, no una historia

`Análisis` y `Decisión` son categorías correctas, pero no indican qué debe abrir primero un usuario comercial. Radar, proyectos, inspector, benchmark y comparador compiten con igual peso.

### N2 — No existe progreso global

La interfaz no muestra etapa actual, resultado acumulado, paso anterior o siguiente. Los CTA dentro de cada módulo resuelven acciones locales.

### N3 — La ayuda explica la sección, no el handoff

`Cómo usar esta sección` contiene propósito, pasos y resultado, pero no responde:

- de dónde viene el usuario;
- qué decisión debe llevarse;
- cuál es el siguiente módulo;
- qué limitación debe recordar.

### N4 — Reiniciar no comunica el alcance completo

El botón global recompone el escenario, pero el producto no explica si también reinicia etapa, filtros, selección, detalle o borrador del asistente.

## 5. Fricciones por densidad

### D1 — Lente territorial duplicada

El shell muestra escenario y, en Radar, la vista vuelve a presentar el mismo título y métricas antes del mapa. La repetición ocupa la primera pantalla y retrasa el momento distintivo.

### D2 — Todo parece prioritario

Hay múltiples bordes verdes, llamadas de atención y botones de alto contraste en la misma pantalla. La marca está bien aplicada, pero no siempre distingue la única acción que hace avanzar la decisión.

### D3 — Scroll antes de conclusión

En Radar, Proyectos, Benchmark y Comparador la conclusión o la próxima acción aparece después de varias pantallas. Un usuario de demo puede abandonar antes de llegar al valor.

### D4 — Divulgación progresiva desigual

Asistente, inspector y señales ya usan progresión vertical. Radar y proyectos exponen mucho contenido simultáneo. La fase debe unificar el patrón sin convertir todas las vistas en tarjetas.

## 6. Fricciones por comprensión

- `30% evidencia` requiere contexto inmediato para no parecer un score de mala calidad global.
- `Referencia publicada provisional/orientativa` debe acompañarse siempre de su límite.
- escala de mercado, cobertura territorial y comparabilidad son conceptos distintos, pero se muestran juntos con peso similar;
- el caso Tipo 7 vende la propuesta, pero hoy es un módulo que el usuario debe descubrir;
- la secuencia entre comparador, señales, asistente y checklist no está indicada.

## 7. Oportunidad de diseño

La demo no necesita otra pantalla de resumen genérica. Necesita una estructura que convierta sus módulos existentes en capítulos de una decisión. La solución recomendada es:

1. `Recorrido ejecutivo` como entrada principal;
2. seis etapas con pregunta, lectura, límite y CTA;
3. `Explorar análisis` para acceso experto a los ocho módulos;
4. mapa e inspector como dos momentos de máxima jerarquía;
5. detalle técnico bajo demanda, nunca eliminado;
6. un ensayo humano que mida comprensión, no solo ausencia de errores.

## 8. Baseline de aceptación

Fase 6 debe mejorar estos indicadores sin degradar las pruebas existentes:

- entrada al recorrido visible en la primera pantalla;
- etapa actual y siguiente acción identificables sin abrir ayuda;
- máximo tres bloques de resumen antes del CTA principal en una etapa;
- conclusión principal visible en 1280×720;
- navegación anterior/siguiente, recarga y atrás/adelante reproducibles;
- cero scroll horizontal en 390×844 y reflow 200%;
- ocho rutas expertas todavía accesibles;
- cero cambios en conteos, elegibilidad, hashes o límites narrativos.

