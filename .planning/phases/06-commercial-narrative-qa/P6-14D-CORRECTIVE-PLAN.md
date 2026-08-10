# P6-14D — Copy comercial transversal y nuevo ensayo independiente

**Fecha:** 2026-08-10

**Estado:** completado y verificado

**Dependencia:** P6-14C, commit `605de1f`

## Objetivo

Revisar el lenguaje visible de las ocho rutas expertas y las seis etapas del recorrido para que un responsable comercial entienda propósito, siguiente acción, alcance y límite sin conocer la arquitectura de la demo. Preparar además un paquete reproducible para repetir P6-14 con un lector humano realmente independiente.

Este paso modifica copy y documentación de prueba. No cambia datos, cálculos, elegibilidad, navegación, estado, URL ni afirmaciones comerciales.

## Historias de usuario

### HU-01 — Entender propósito y siguiente acción

Como responsable comercial, quiero que cada pantalla explique en lenguaje directo para qué sirve y qué debo hacer después, para avanzar sin apoyo del equipo creador.

### HU-02 — Encontrar el mismo concepto con el mismo nombre

Como usuario que recorre varios módulos, quiero una terminología consistente para zona, muestra, evidencia y comparación, para no tener que traducir conceptos técnicos entre pantallas.

### HU-03 — Recuperarme de estados vacíos o insuficientes

Como usuario que encuentra información faltante, quiero que el mensaje explique qué falta, qué significa y dónde continuar, para no interpretar la ausencia como un error del sistema o como un cero.

### HU-04 — Validar la demo sin ayuda del maker

Como observador, quiero un protocolo autocontenido, ligado al SHA real y con plantillas no destructivas, para ejecutar un ensayo independiente y determinar `PASS`, `FAIL` o `INVALID` sin completar resultados por anticipado.

## Glosario visible

| Evitar en la superficie principal | Preferir | Regla |
| --- | --- | --- |
| universo | muestra, grupo de proyectos | “Universo” solo puede permanecer en detalle metodológico si evita una ambigüedad estadística. |
| denominador | base de comparación, proyectos considerados | Los conteos exactos se conservan. |
| benchmark | comparación de mercado, referencia de mercado | El nombre del módulo puede conservar “Benchmark” donde ya funciona como etiqueta de negocio. |
| motor | cálculo, forma de construir la comparación | No exponer arquitectura interna. |
| ledger | detalle, desglose, comparación campo por campo | Los estados de evidencia permanecen intactos. |
| metadata | datos del expediente | No cambiar claves internas. |
| derivado | calculado | El badge contractual `Derivado` puede permanecer; la explicación debe ser llana. |
| contrato/dataset/snapshot/fallback | versión de datos, muestra observada, alternativa | Estos términos no deben aparecer en la vista principal ni en estados de error. |
| intención | tipo de consulta, pregunta | No exponer la taxonomía interna del asistente. |
| trazable/reproducible | con fuente y fecha, verificable | Conservar la exigencia de evidencia. |

## Salvaguardas semánticas

No se eliminarán ni debilitarán:

- la distinción entre publicado, observado, calculado, excluido y no informado;
- fuente, fecha, evidencia, confianza y limitaciones;
- la advertencia de que precio publicado no es precio de cierre;
- la prohibición de atribuir causalidad no observada;
- la advertencia de que la muestra no es exhaustiva;
- la exclusión del caso Tipo 7 y la separación de `184` frente a `30/22/5`;
- distrito, cuadrante o radio como alcance de análisis y no como límite oficial.

## Criterios de aceptación

1. Las ocho rutas expertas y las seis etapas explican su propósito y siguiente acción con verbos directos y vocabulario de negocio.
2. El contenido visible por defecto no muestra `dataset`, `contrato público`, `catálogo canónico`, `snapshot`, `fallback`, `scope_text`, `fingerprint` ni `ledger`.
3. No aparecen por defecto las frases “criterios equivalentes y trazables”, “motor de benchmark”, “Tres universos”, “Ver denominadores”, “Abrir el respaldo completo” ni “elige una intención”.
4. `Cómo usar esta sección` se reduce a una orientación progresiva y mantiene propósito, acción, resultado, límite y continuidad accesibles.
5. Los conceptos de escenario, muestra, base de comparación y evidencia usan nombres consistentes entre Radar, Proyectos, Inspector, Benchmark, Comparador, Checklist, Asistente, Señales y recorrido.
6. Los estados vacíos, insuficientes y no disponibles explican qué falta y ofrecen una acción cuando existe una salida válida.
7. El copy no cambia conteos, valores, fuentes, fechas, estados, claims, navegación, foco, URL ni orden de decisiones.
8. Los detalles técnicos necesarios permanecen disponibles bajo demanda; simplificar no significa ocultar exclusiones o limitaciones.
9. El protocolo del ensayo obtiene el SHA desde la copia que realmente se probará; no contiene un hash obsoleto.
10. Cada repetición crea una carpeta `run-AAAA-MM-DD-alias/`, copia plantillas y nunca sobrescribe evidencia anterior.
11. El protocolo conserva el prompt literal, límite de 10 minutos, cinco respuestas esperadas, seis claims prohibidos, cero ayuda del maker y recorrido crítico mapa–Tipo 7–decisión.
12. Las plantillas registran repositorio, SHA completo y corto, árbol limpio, servidor, URL exacta, navegador, independencia, consentimiento, tiempos, ayudas y resultado.
13. No se crea evidencia ficticia ni se declara `PASS`; P6-14 permanece pendiente hasta una sesión humana real con un lector nuevo.
14. La regresión automática recorre ocho rutas y seis etapas y bloquea la reintroducción de términos internos en el contenido visible por defecto.
15. La verificación integral, accesibilidad, responsive, teclado y zoom 200 % permanecen verdes.

## Write set permitido

- `.planning/phases/06-commercial-narrative-qa/P6-14D-CORRECTIVE-PLAN.md`
- `.planning/phases/06-commercial-narrative-qa/P6-14D-HANDOFF.md`
- `.planning/phases/06-commercial-narrative-qa/COMMERCIAL_REHEARSAL.md`
- `.planning/phases/06-commercial-narrative-qa/evidence/rehearsal/*`
- `prototipo_ejecutable/public/app.js`
- `prototipo_ejecutable/public/js/config.js`
- `prototipo_ejecutable/public/js/journey.js`
- `prototipo_ejecutable/public/js/views/guidance.js`
- `prototipo_ejecutable/public/js/views/journey.js`
- `prototipo_ejecutable/public/js/views/scenario-context.js`
- `prototipo_ejecutable/public/js/views/geographic-map.js`
- `prototipo_ejecutable/public/js/views/market.js`
- `prototipo_ejecutable/public/js/views/compare.js`
- `prototipo_ejecutable/public/js/views/inspector.js`
- `prototipo_ejecutable/public/js/views/assistant.js`
- `prototipo_ejecutable/public/js/views/activity.js`
- `prototipo_ejecutable/public/js/views/checklist.js`
- `prototipo_ejecutable/public/styles/90-responsive.css` únicamente para corregir un overflow demostrado por el copy en el popover móvil del Comparador
- pruebas textuales afectadas y `prototipo_ejecutable/package.json`
- evidencia funcional/responsive y manifiestos regenerados por las suites autorizadas

## Archivos protegidos

- Dataset público, schema, writer, scripts de datos y fingerprints públicos.
- Motores de benchmark, comparación, histórico y asistente.
- `state.js`, `controller.js`, `navigation.js` y contrato de URL.
- Valores, IDs, estados contractuales y relaciones de evidencia.
- CSS, salvo que una prueba visual demuestre un problema real provocado por el nuevo copy.

### Enmienda controlada del write set

La primera corrida de `test:phase6:responsive` demostró overflow horizontal en los popovers de ayuda del Comparador a `390 × 844` (`667/390` en el elemento más distante). Se autoriza una alineación móvil específica en `90-responsive.css`; no cambia tipografía, color, densidad ni layout de otras vistas.

## Secuencia de ejecución

1. Crear una prueba de lenguaje visible y demostrar su fallo contra el baseline.
2. Crear una prueba estructural del paquete de ensayo y demostrar el SHA obsoleto.
3. Ajustar copy por superficie, sin modificar ramas lógicas ni valores derivados.
4. Actualizar expectativas textuales únicamente cuando representen la interfaz nueva.
5. Corregir protocolo y plantillas; dejar el resultado en `PENDING`.
6. Ejecutar pruebas dirigidas, inspección DOM y capturas en tres viewports más zoom 200 %.
7. Ejecutar `npm.cmd run verify`, revisar el diff y registrar handoff.

## Verificación

Desde `prototipo_ejecutable/`:

```powershell
node tests/copy-language.mjs
node tests/rehearsal-packet.mjs
npm.cmd run test:phase6:responsive
npm.cmd run test:a11y
npm.cmd run verify
```

Además, revisar manualmente el texto visible de ocho rutas y seis etapas, consola del navegador, overflow y continuidad de los enlaces.

## Riesgos y mitigaciones

- **Simplificación que debilita prudencia:** toda sustitución conserva fuente, fecha, exclusiones y límites; se revisan los cinco claims del ensayo.
- **Pruebas frágiles por frases exactas:** la nueva regresión valida vocabulario prohibido y anclas semánticas, no párrafos completos.
- **SHA circular en la documentación:** el protocolo registra el SHA del candidato después del commit final; nunca lo fija dentro del propio commit.
- **Falso ensayo independiente:** las plantillas quedan vacías y el estado permanece `PENDING`; el maker no completa la rúbrica.
- **Evidencia sobrescrita:** cada corrida usa una carpeta única y conserva repeticiones fallidas o inválidas.

## Rollback

Revertir el commit atómico de P6-14D y ejecutar `npm.cmd run verify`. El rollback debe retirar conjuntamente copy, pruebas y paquete de ensayo para no dejar una rúbrica que describa otra interfaz.

## Resultado de ejecución

- Las ocho rutas expertas y las seis etapas del recorrido quedaron cubiertas por una regresión de lenguaje visible.
- El copy principal usa términos comerciales consistentes para zona, muestra, comparación, fuentes, límites y siguiente acción; la semántica contractual permanece intacta.
- El paquete del nuevo ensayo exige obtener el SHA real, crear una carpeta única por sesión, conservar evidencia previa y registrar independencia, consentimiento, tiempos y ayuda recibida.
- El resultado humano permanece `PENDING`: no se fabricó una sesión ni se declaró `PASS`.
- La matriz responsive demostró y permitió corregir un overflow de 11 px en el control de ayuda del Comparador móvil, conservando su objetivo táctil de 44 × 44 px.
- `npm.cmd run verify`, `npm.cmd run test:phase6:responsive` y `npm.cmd run test:a11y` terminaron con código `0`.
- La inspección visual de Escala, Calidad/Tipo 7, Comparador, Decisión y Comparador móvil confirmó jerarquía legible, continuidad de acciones y ausencia de recortes.

## Condición de cierre

P6-14D termina cuando los criterios 1–15 están demostrados, el gate integral está verde y el handoff declara de forma explícita que el ensayo humano sigue pendiente. D-042 difiere ese ensayo al testing integral final de P6-20: P6-15 puede continuar con verificación técnica, pero no puede emitir un `PASS` absoluto ni habilitar la declaración `ready for client` mientras falte el `PASS` humano real.
