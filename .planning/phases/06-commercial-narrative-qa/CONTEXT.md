# Fase 6 — Contexto de narrativa comercial, accesibilidad y QA

**Estado:** borrador para HUMAN-GATE-A.

**Rama:** `feat/phase-6-commercial-narrative-qa`.

**Base:** `25300b1f7f3669fd1f5cc66567a589b69dcb93c2`, merge documental de Fase 5.

## 1. Objetivo

Convertir una demo técnicamente completa en un recorrido comercial que un lector nuevo pueda comprender, operar y recordar sin recibir instrucciones externas. La fase no añade una nueva fuente de datos ni un motor analítico: organiza los resultados de Fases 1–5 en una secuencia de decisión verificable.

La secuencia aprobada por el roadmap es:

```text
escala → geografía → calidad → profundidad → movimiento → decisión
```

## 2. Problema observable

La demo ya contiene ocho módulos correctos, ayudas por sección y navegación accesible. Sin embargo:

- los ocho módulos aparecen al mismo nivel y agrupados solo como `Análisis`/`Decisión`;
- no existe una entrada explícita al recorrido comercial ni un indicador de etapa;
- no hay una acción global de `Anterior`/`Continuar` que conecte la tesis;
- la lente territorial se repite con alta jerarquía en todas las vistas;
- varias páginas superan cinco pantallas de laptop y obligan a descubrir el orden mediante scroll;
- el usuario puede abrir evidencia, pero debe inferir por qué ese hallazgo conduce al siguiente módulo;
- el reinicio recompone el escenario, pero no existe un contrato explícito para reiniciar el recorrido;
- el gate narrativo vigente fue automatizado; falta un ensayo humano bloqueante antes de declarar la demo lista para venta.

## 3. Baseline técnico y de producto

- Fases 0–5: `deployed and verified`.
- Contrato público: `2.4.0`; reader compatible con 2.0–2.4.
- Dataset determinista: 676 proyectos, 184 agencias, 36 eventos históricos y siete intenciones del asistente.
- Rutas expertas: `dashboard`, `projects`, `inspector`, `market`, `compare`, `trust`, `assistant`, `activity`.
- Estado territorial único y serializado en URL.
- GitHub Pages estático; sin backend, autenticación, analítica o persistencia de consultas.
- Mapa, inspector Tipo 7, benchmark, comparador, señales y asistente ya tienen pruebas de dominio, integración, accesibilidad y responsive.

## 4. Hipótesis de solución

Crear una nueva puerta de entrada `Recorrido ejecutivo` con seis etapas enlazadas y reproducibles. Cada etapa responde una pregunta comercial, presenta una sola lectura principal, muestra la evidencia mínima necesaria y ofrece una acción primaria hacia la siguiente decisión.

Los ocho módulos actuales permanecen disponibles como `Explorar análisis`. El recorrido no duplica motores ni fija cifras en el HTML: deriva sus lecturas del escenario y de los índices públicos vigentes.

## 5. Mapeo narrativo propuesto

| Etapa | Pregunta comercial | Momento principal | Profundización |
|---:|---|---|---|
| 1. Escala | ¿Qué mercado observable sostiene la lectura? | cobertura y carga distrital | Benchmark de microzona |
| 2. Geografía | ¿Dónde compite el proyecto? | mapa y alcance territorial | Radar y proyectos comparables |
| 3. Calidad | ¿Qué dato puede utilizarse? | caso Tipo 7 y decisión de elegibilidad | Inspector de evidencia |
| 4. Profundidad | ¿Cómo se diferencia la oferta? | comparación por filas y evidencia | Benchmark, comparador y proyectos |
| 5. Movimiento | ¿Qué cambió en el mercado? | señal certificada y vigencia | Señales del mercado |
| 6. Decisión | ¿Qué hacemos y qué no podemos afirmar? | lectura ejecutiva y límites | Asistente y checklist |

## 6. Historias dentro de alcance

- HU-DEMO-103 — estados vacíos y datos insuficientes, cierre transversal.
- HU-DEMO-104 — ayuda contextual actualizada.
- HU-DEMO-801 — recorrido guiado de la demo.
- HU-DEMO-802 — reducción de densidad y jerarquía visual.
- HU-DEMO-803 — reinicio y reproducibilidad.
- HU-DEMO-804 — navegación orientada a vender la propuesta.

Los Should ya implementados en F3–F5 se conservan. HU-DEMO-505/exportación permanece diferida.

## 7. Restricciones

1. No modificar datos, contrato 2.4, writer, fingerprints ni semántica de elegibilidad.
2. No introducir backend, analítica, autenticación, localStorage, cookies o solicitudes externas.
3. No ocultar evidencia, limitaciones, exclusiones o denominadores para acortar el relato.
4. No presentar precios publicados como precios de cierre ni atribuir causas no observadas.
5. No duplicar estado: escenario y consumidores continúan derivados de `state.js`.
6. No cargar una tipografía o librería externa.
7. No usar hover como única vía de comprensión.
8. No depender solo del color para etapa, calidad o progreso.
9. No hacer merge automático; HUMAN-GATE-A precede runtime y el ensayo humano forma parte del gate final.

## 8. Riesgos principales

| Riesgo | Severidad | Tratamiento |
|---|---:|---|
| El recorrido se convierte en una maqueta desconectada | Alta | todas las cifras se derivan de motores/estado actuales y se prueban contra las vistas expertas |
| Simplificar oculta restricciones | Alta | cada etapa incluye `Qué sabemos`, `Qué falta` y enlace a evidencia |
| Dos fuentes de navegación divergen | Alta | etapa derivada de ruta canónica; un solo catálogo de journey |
| Cambiar `/` rompe deep-links o tests | Alta | conservar aliases; probar `/`, hashes legacy, atrás/adelante y recarga |
| Un stepper genérico no mejora la venta | Media | cada etapa codifica una decisión real y produce un resultado específico |
| Densidad reaparece en móvil/200% | Media | presupuesto de contenido, divulgación progresiva y gate geométrico |
| El ensayo automatizado oculta confusión humana | Alta | ensayo humano nuevo, cronometrado y bloqueante antes de ship |

## 9. Criterio de éxito

Un usuario nuevo inicia el recorrido, completa seis etapas, abre mapa e inspector, llega a una decisión prudente y puede explicar:

1. qué cubre la muestra;
2. cómo se delimita el escenario;
3. por qué Tipo 7 queda excluido;
4. qué diferencias están respaldadas por evidencia;
5. qué cambió y qué no puede afirmar el asistente.

Debe lograrlo en no más de diez minutos, sin consultar código ni recibir instrucciones del implementador.

