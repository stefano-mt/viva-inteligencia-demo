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

**Estado:** completada, desplegada y verificada (`PASS WITH RISKS`) el 2026-07-29. Los PR #7–#10 fueron fusionados por un humano; P2-18 final pasó 7/7 criterios para `ebe9795e` y el cierre documental quedó integrado en `main`.

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

**Estado:** completada, fusionada, desplegada y verificada. PR funcional #11 y PR documental #12 fusionados; P3-16 `PASS` en Pages y P3-17 integrado en `main`.

**Contrato implementado:** `2.2.0`, con índice `inspector` y registros autoritativos integrados en `model`; reader compatible con 2.0/2.1/2.2.

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

**Resultado técnico:** CT-D/CT-G PASS; 10 expedientes, 15 activos autorizados, 8 rutas × 3 viewports, zoom 200% y lector comercial en 1:28.548. HUMAN-GATE-B no aplica.

**Ship:** `deployed and verified`.

---

## Fase 4 — Benchmark y comparador

**Historias:** 501–505; 504 Should, 505 Could.

**Objetivo:** comparar por precio, áreas y atributos sin sobrecarga horizontal.

**Estado:** `deployed and verified`. El PR funcional #13 y el PR documental post-merge #14 fueron fusionados; P4-15 verificó GitHub Pages con `PASS` y P4-16 persistió el resultado en `main`.

**Contrato implementado:** `2.3.0`, con índice autoritativo `benchmark`; reader compatible con 2.0–2.3 y runtime territorial probado con 2.1/2.2/2.3.

### Olas

1. Agregados certificados por microzona.
2. Comparación cualitativa y por filas agrupadas.
3. Conclusión explicable y exportación opcional.

**Gate de salida:** benchmark excluye inconsistencias, muestra denominadores/fuentes y permite entender diferencias sin depender del hover.

**Resultado técnico:** HU-DEMO-501–504 PASS; HU-DEMO-505 diferida. Miraflores distingue 69 publicaciones raw, 68 cocientes orientativos y 0 parejas elegibles; CT-A/B/C/D/G/I/P PASS; 8 rutas × 3 viewports, zoom 200%, privacidad, determinismo y recorrido UI-only PASS.

**Ship:** `deployed and verified`.

---

## Fase 5 — Histórico, señales y asistente

**Historias:** 601–603, 701–703; 603 Should.

**Objetivo:** explicar qué cambió y responder con el mismo escenario y evidencia.

**Estado:** `deployed and verified`. El PR funcional #15 y el PR documental #16 fueron fusionados; P5-15 verificó GitHub Pages con `PASS` para `8d4c6de` y P5-16 quedó integrado en `main` mediante `25300b1`.

**Contrato implementado:** `2.4.0`, con índices autoritativos `history` y `assistant`, reader compatible con 2.0–2.4 y degradación explícita en payloads anteriores.

### Olas

1. Línea de tiempo y vigencia de señales.
2. Capa semántica determinística del asistente.
3. Preguntas cualitativas y rechazo prudente.

**Gate de salida:** CT-E y CT-F pasan; cifras del asistente coinciden con la interfaz y enlazan evidencia.

---

## Fase 6 — Narrativa comercial, accesibilidad y QA

**Historias:** 104, 801–804 y Should/Could aprobadas.

**Objetivo:** convertir módulos correctos en un recorrido que se entiende y se recuerda.

**Estado:** P6-01–P6-16 completados; P6-15A cerró G1–G5 y P6-15 terminó `PASS WITH RISKS` únicamente por `R6-H1`. El PR funcional #17 fue fusionado y P6-18 verificó Pages con `PASS` para el SHA `12cefbf82a4971d75e1578d962f510b06fc0b457`. P6-19 persiste el resultado en un PR documental separado. P6-14 continúa `PENDING/DEFERRED` por D-042 y la declaración final queda reservada al `PASS` humano de P6-20.

### Olas

1. Arquitectura de navegación y recorrido guiado.
2. Reducción de densidad, contraste y jerarquía.
3. Responsive, teclado, estados y regresión visual.
4. Verificación técnica, despliegue y persistencia.
5. Testing humano integral final sobre Pages.

**Gate de salida técnica:** el recorrido “escala → geografía → calidad → profundidad → movimiento → decisión” pasa verificación independiente y Pages coincide con el SHA desplegado.

**Salida técnica:** `PASS`. Estado máximo: `deployed and technically verified; human acceptance pending`.

**Gate de aceptación final:** un lector nuevo completa el recorrido público sin ayuda externa, dentro de 10 minutos y con evidencia aprobada en P6-20. Solo entonces F6 queda `deployed and verified` y `ready for client`.

## Estrategia de PR

- PR 0: harness y documentación.
- PR 0B: modularización con paridad.
- Un PR por fase funcional, o sub-PRs si el `PLAN.md` demuestra independencia y contrato estable.
- Nunca fusionar dos fases funcionales en un único PR difícil de revisar.
