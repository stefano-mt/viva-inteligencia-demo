# Loops de delegación para desarrollo agéntico

## 1. Modelo operativo

El orquestador conserva intención, estado y decisiones. El trabajo pesado se delega en tareas con contexto fresco y acotado. Cada resultado cruza un gate verificable antes de alimentar la siguiente etapa.

```text
Intake
  ↓
Contexto / mapa
  ↓
Decisiones + UI-SPEC
  ↓
Plan por dependencias
  ↓
Plan checker (máx. 3 ciclos)
  ↓
Ejecución por olas y worktrees
  ↓
Verificador independiente
  ├─ falla → diagnóstico → plan de gaps → ejecución (máx. 3 ciclos)
  └─ pasa
  ↓
Integración + PR + verificación desplegada
  ↓
STATE / decisiones / resumen de fase
```

## 2. Loop 0 — Preparación y fuente de verdad

### Entrada

- Feedback o historia de usuario.
- Estado Git y branch base.
- Artefactos de planificación existentes.

### Acciones

1. El orquestador lee `AGENTS.md`, `.planning/STATE.md`, `.planning/PROJECT.md` y la fase.
2. Confirma que la solicitud pertenece a la demo.
3. Identifica requisito, dependencias y restricciones.
4. Consulta Graphify si el grafo existe y está vigente.
5. Delega exploración read-only cuando la tarea pueda generar mucho ruido.
6. Registra contradicciones o preguntas que cambian alcance.

### Salida

Un brief con objetivo, no-objetivos, archivos candidatos, riesgos, criterios y preguntas decisivas.

### Stop rule

No pasa a planificación si falta una decisión que cambia datos, comportamiento o narrativa.

## 3. Loop 1 — Discusión y contrato de UI

Se ejecuta para fases visuales o decisiones no resueltas.

### Roles

- Orquestador/facilitador.
- Diseñador o analista UX.
- Revisor de accesibilidad/datos, solo si aplica.

### Salidas

- `CONTEXT.md`: decisiones, límites, estados y casos borde.
- `UI-SPEC.md`: jerarquía, flujo, contenido, interacciones, responsive, teclado, contraste y evidencia esperada.

### Gate

- No contiene decisiones contradictorias.
- Cada estado relevante tiene comportamiento.
- El diseño favorece mapa/inspector y evita densidad horizontal.
- No introduce claims o fuentes no disponibles.

## 4. Loop 2 — Planificación y revisión del plan

### Planificador

Transforma contexto y requisitos en tareas de tamaño aproximado de una hora o unos cientos de líneas, cuando sea razonable.

Cada tarea declara:

- `task_id`;
- historias y criterios;
- `depends_on`;
- `read_set`;
- `write_set`;
- archivos protegidos;
- instrucciones concretas;
- prueba/evidencia;
- riesgo y rollback;
- condición de handoff.

### Plan checker

Revisa:

1. Cobertura de requisitos.
2. Coherencia con decisiones.
3. Dependencias.
4. Ausencia de `write_set` solapado en una misma ola.
5. Tamaño ejecutable con contexto fresco.
6. Verificación determinista.
7. Estados y accesibilidad.
8. Ausencia de sobrealcance.

### Reintento

Máximo tres ciclos `plan → crítica → revisión`. Cada ciclo debe modificar la estrategia o cerrar un hallazgo concreto. Al tercer fallo, escala al humano con diferencias y opciones.

## 5. Loop 3 — Ejecución por olas

### Regla de worktree

Cada implementador con escritura trabaja en rama/worktree aislado. Agentes read-only pueden compartir checkout.

### Ola

Una ola contiene solo tareas cuyos `write_set` no se solapan y cuyos contratos de entrada están congelados.

### Secuencia del implementador

1. Lee únicamente brief, contexto, plan, archivos asignados y pruebas cercanas.
2. Confirma baseline dirigido.
3. Implementa una tarea atómica.
4. Ejecuta la verificación más estrecha.
5. Revisa `git diff`.
6. Completa el handoff con evidencia y riesgos.
7. No amplía alcance para “aprovechar”.

### Situación actual

Antes de fase 0B:

- UI: una sola tarea de escritura a la vez.
- Datos/generador: puede avanzar en paralelo con documentación o pruebas.
- Graphify, investigación y QA de baseline: paralelos y read-only.

Después de fase 0B, ejemplos de olas seguras:

- `views/map/*` y `views/typology/*`, si no comparten estado ni CSS.
- fixtures de datos y pruebas visuales, tras congelar el schema.
- documentación y verificación read-only.

## 6. Loop 4 — Verificación independiente

El verificador recibe requisitos y diff, no la narrativa justificatoria del implementador como verdad.

### Orden

1. Verificación estructural: archivos permitidos y ausencia de secretos.
2. Sintaxis/build.
3. Pruebas unitarias o de datos.
4. Smoke del recorrido.
5. Consola y red.
6. Capturas/responsive.
7. Teclado, nombres accesibles y contraste.
8. Casos transversales.
9. Cobertura de historias y decisiones.

### Veredicto

- **PASS:** evidencia completa y sin gaps bloqueantes.
- **PASS WITH RISKS:** solo riesgos residuales explícitamente aceptables.
- **FAIL:** criterio incumplido, regresión o evidencia insuficiente.

“El agente dice que funciona” nunca es evidencia.

## 7. Loop 5 — Diagnóstico y cierre de gaps

Ante `FAIL`:

1. Crear un hallazgo por síntoma, con repro y severidad.
2. Delegar diagnóstico read-only por hallazgo independiente.
3. Comparar hipótesis y elegir causa raíz.
4. Crear plan de gaps; no parchear desde el informe.
5. Ejecutar solo los cambios necesarios.
6. Repetir la verificación completa afectada.

Máximo tres ciclos. Un cuarto intento exige decisión humana porque indica especificación ambigua, arquitectura inadecuada o verificación incorrecta.

## 8. Loop 6 — Integración y ship

### Integrador

1. Verifica que todos los handoffs estén completos.
2. Integra en orden de dependencias.
3. Resuelve conflictos desde el contrato, no combinando ciegamente.
4. Ejecuta el gate completo.
5. Actualiza `STATE.md`, decisiones y resumen.
6. Prepara PR con historias, capturas, pruebas y riesgos.
7. Tras merge, verifica GitHub Pages.

### Human checkpoint

El humano aprueba:

- cambios de alcance;
- nueva dependencia o servicio;
- claims comerciales sensibles;
- decisión de incluir datos dudosos;
- merge del PR.

## 9. Loop 7 — Memoria

Después de cada tarea o fase:

- `SUMMARY.md`: qué cambió y qué no.
- `VERIFICATION.md`: evidencia y gaps.
- `.planning/STATE.md`: posición actual y siguiente acción.
- `.planning/DECISIONS.md`: decisiones duraderas.
- Handoff: cambios, comandos, resultados, riesgos y commit.

La memoria se compacta: hechos vigentes en `.planning/STATE.md`; historial en la fase. No copiar logs completos.

## 10. Prompts de delegación

### Explorador

```text
Rol: explorador read-only.
Objetivo: responder [pregunta concreta].
Lee: AGENTS.md, .planning/STATE.md, [archivos].
Usa Graphify primero si está vigente.
No edites ni propongas implementación extensa.
Devuelve: rutas/líneas, flujo, dependencias, riesgos, incertidumbres y máximo 5 recomendaciones.
```

### Planificador

```text
Rol: planificador sin escritura de código.
Entrada: [historias], CONTEXT.md, UI-SPEC.md, hallazgos.
Produce tareas atómicas con depends_on, read_set, write_set, criterios, verificación y rollback.
No pongas dos tareas con el mismo write_set en la misma ola.
El plan debe poder ejecutarlo un agente sin el chat previo.
```

### Implementador

```text
Rol: implementador de [área].
Ejecuta solo TASK-[id].
Archivos permitidos: [write_set].
Archivos protegidos: [lista].
Criterios: [lista].
Verificación obligatoria: [comandos/capturas].
Si necesitas ampliar el write_set o cambiar un contrato, detente.
Devuelve el HANDOFF completo; no declares done sin evidencia.
```

### Verificador

```text
Rol: verificador independiente y read-only salvo autorización de fixtures de prueba.
Evalúa el diff contra criterios y decisiones.
Reproduce la experiencia, ejecuta checks y registra evidencia.
No arregles los defectos durante la revisión.
Devuelve PASS, PASS WITH RISKS o FAIL con repro y severidad.
```

### Integrador

```text
Rol: integrador.
Comprueba dependencias y handoffs, integra en orden, ejecuta el gate completo y prepara el PR.
No omitas una verificación porque ya pasó en un worktree.
Actualiza la memoria del repositorio con hechos comprobados.
```

## 11. Uso con GSD Core

Instalación opcional y consciente:

```powershell
npx @opengsd/gsd-core@latest
```

Para Codex, los comandos instalados usan `$`; para Claude Code, `/`.

Secuencia esperada:

```text
$gsd-onboard
$gsd-discuss-phase N
$gsd-ui-phase N
$gsd-plan-phase N
$gsd-execute-phase N
$gsd-verify-work N
$gsd-ship N
```

La instalación no reemplaza estas reglas. El plan checker y el verificador siguen sujetos a los gates de Viva.

## 12. Portabilidad Codex / Claude Code

### Codex

- Pedir explícitamente subagentes para tareas independientes.
- Usar worktrees para escritura paralela.
- Mantener instrucciones duraderas en `AGENTS.md`.
- Si la superficie no aplica perfiles personalizados, incluir el rol completo en el mensaje delegado y verificar el comportamiento real.

### Claude Code

- Usar Plan Mode para cambios amplios.
- Usar subagentes para exploración y revisión.
- Establecer `isolation: worktree` o sesiones `--worktree` para escritura paralela.
- Mantener maker y checker separados.

En ambos casos, el límite real es la independencia de tareas y la capacidad humana de revisar evidencia, no el número máximo de agentes.
