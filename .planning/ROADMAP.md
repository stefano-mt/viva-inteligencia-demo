# Roadmap por fases — demo vNext

## Regla de avance

Cada fase recorre `Discutir → UI-SPEC → Plan → Ejecutar → Verificar → Ship`. No se inicia una fase dependiente hasta que la anterior tenga verificación aprobada o un contrato explícito estable.

## Fase 0 — Harness agéntico y fronteras seguras

**Objetivo:** permitir delegación repetible sin que los agentes compitan por los mismos archivos.

**Estado:** completada y verificada (`PASS`) el 2026-07-28.

### 0A — Contexto y operación

- Incorporar `AGENTS.md`, fuente de verdad, estado, roadmap, loops, plantillas y gates.
- Registrar baseline técnico y restricciones.
- Integrar Graphify como herramienta de orientación opcional y reproducible.

### 0B — Paridad, pruebas y modularización

- Añadir smoke tests del recorrido actual.
- Capturar baseline visual y de consola.
- Extraer estado, navegación, vistas y utilidades desde `app.js` en módulos ES.
- Separar estilos base, layout, componentes y vistas con orden de importación explícito.
- Mantener la misma salida visible y funcional antes de añadir features.

**Gate de salida:**

- `npm.cmd run check` y smoke tests pasan.
- No hay cambios funcionales no aprobados.
- Las capturas de paridad están revisadas.
- Cada vista futura tiene un propietario de archivos claro.

**Paralelismo:** 0A puede convivir con análisis read-only. 0B tiene un único implementador UI; QA trabaja en paralelo solo después del primer build verificable.

---

## Fase 1 — Datos, contratos y cobertura

**Historias:** 001–006, 902.

**Objetivo:** construir un dataset de demo trazable que cubra 30 inmobiliarias y todos los casos de validación.

**Estado:** completada y verificada (`PASS WITH RISKS`) el 2026-07-28.

**Resultado confirmado:** contrato `2.0.0`, JSON determinista, 180 agencias canónicas de mercado, modelo integrado de 184 agencias, piloto acumulativo 30/22/5 y fixtures CT-A/B/D/E/G/H. Los riesgos de microzonas, activos visuales, benchmark de mercado e histórico amplio se transfieren a F2–F5.

### Ola 1.1 — Contrato

- Esquema de proyecto, fuente, campo, evidencia, tipología, observación y evento.
- IDs canónicos y reglas de alias.
- Fixtures CT-A, CT-B, CT-G y CT-H.

### Ola 1.2 — Generación

- Normalización de 30 inmobiliarias.
- Enriquecimiento multinivel.
- Áreas y precios correctamente etiquetados.
- Histórico preprocesado.

### Ola 1.3 — Validación

- Validadores de esquema, referencias, duplicados y agregados.
- Reporte de cobertura y exclusiones.

**Gate de salida:** 30 inmobiliarias canónicas, fixtures completos, generador determinístico y validaciones automatizadas.

**Paralelismo:** contrato primero; luego datos base, evidencia y validadores pueden ser trabajos separados con archivos disjuntos.

---

## Fase 2 — Contexto, geografía y escenario

**Historias:** 101–103, 201–205, 301–302.

**Objetivo:** definir una zona objetivo y obtener comparables geográficos explicables.

**Estado:** plan revisado con veredicto independiente `PASS WITH RISKS` en `feat/phase-2-geography-scenario`, sin implementación. La ruta cartográfica propone siete relaciones OSM bajo ODbL; requiere HUMAN-GATE-A y su registro P2-00C antes de P2-01. El drift documental 88/90 fue corregido sin alterar el conteo reproducible de 90.

### Línea de trabajo A — Contexto y estado

- Barra global y única fuente de escenario.
- Fecha de corte, cobertura territorial y suficiencia de comparabilidad como ejes separados.
- Persistencia/reinicio reproducible.

### Línea de trabajo B — Geografía

- Límites distritales.
- Cuadrantes o microzonas en distritos de alta carga.
- Selección por radio/polígono de demo.

### Línea de trabajo C — Lectura

- Mapa geográfico con ejes/leyendas/tooltip útiles.
- Score de comparabilidad explicable.
- Diagnóstico de precio del escenario Viva.

**Gate de salida:** CT-C y CT-I pasan; todos los módulos consumen el mismo conjunto de comparables.

**Paralelismo:** datos, contrato, motor y build geográfico avanzan en secuencia hasta P2-07. Solo entonces P2-08/P2-09 y, después, los consumidores con `write_set` disjuntos pueden ejecutarse en paralelo.

---

## Fase 3 — Ficha, evidencia e inspector

**Historias:** 401–406, 901; 404 como Should.

**Objetivo:** demostrar profundidad multifuente y detectar comparaciones engañosas.

### Ola 3.1 — Ficha y cobertura

- Ficha multifuente.
- Módulo de cobertura por nivel y fuente.
- Visor de evidencia.

### Ola 3.2 — Inspector

- Navegación proyecto → tipología → tarjeta/plano.
- Valores originales y normalizados.
- Compatibilidad por modelo, piso/rango, unidad, área y dormitorios/baños.

### Ola 3.3 — Decisión analítica

- Estados certificado, revisable, inconsistente e ilegible.
- Exclusión de registros no certificados.
- Resumen cualitativo opcional.

**Gate de salida:** CT-D y CT-G pasan visual y analíticamente; la evidencia se abre desde el hallazgo.

**Paralelismo:** ficha, cobertura e inspector pueden tener implementadores distintos solo si la fase 0 separó sus archivos.

---

## Fase 4 — Benchmark y comparador

**Historias:** 501–505; 504 Should, 505 Could.

**Objetivo:** comparar por precio, áreas y atributos sin sobrecarga horizontal.

### Olas

1. Agregados certificados por microzona.
2. Comparación cualitativa y por filas agrupadas.
3. Conclusión explicable y exportación opcional.

**Gate de salida:** benchmark excluye inconsistencias, muestra denominadores/fuentes y permite entender diferencias sin depender del hover.

---

## Fase 5 — Histórico, señales y asistente

**Historias:** 601–603, 701–703; 603 Should.

**Objetivo:** explicar qué cambió y responder con el mismo escenario y evidencia.

### Olas

1. Línea de tiempo y vigencia de señales.
2. Capa semántica determinística del asistente.
3. Preguntas cualitativas y rechazo prudente.

**Gate de salida:** CT-E y CT-F pasan; cifras del asistente coinciden con la interfaz y enlazan evidencia.

---

## Fase 6 — Narrativa comercial, accesibilidad y QA

**Historias:** 104, 801–804 y Should/Could aprobadas.

**Objetivo:** convertir módulos correctos en un recorrido que se entiende y se recuerda.

### Olas

1. Arquitectura de navegación y recorrido guiado.
2. Reducción de densidad, contraste y jerarquía.
3. Responsive, teclado, estados y regresión visual.
4. Ensayo del guion comercial completo.

**Gate de salida:** el recorrido “escala → geografía → calidad → profundidad → movimiento → decisión” se completa sin ayuda externa y con evidencia aprobada.

## Estrategia de PR

- PR 0: harness y documentación.
- PR 0B: modularización con paridad.
- Un PR por fase funcional, o sub-PRs si el `PLAN.md` demuestra independencia y contrato estable.
- Nunca fusionar dos fases funcionales en un único PR difícil de revisar.
