# P3-04A — Bridge correctivo de capacidades 2.1/2.2

## Estado y trigger

- **Severidad:** `P0`, bloqueo de regresión y del gate global.
- **Trigger:** P3-04 cumple su obligación de emitir el contrato público `2.2.0`, pero el runtime territorial conserva una comprobación literal de `2.1.0`. El artefacto generado es válido y determinista; el consumidor lo rechaza antes de evaluar las secciones F2.
- **Evidencia del fallo:** `npm.cmd run verify` se detiene en `test:architecture` porque `public/js/scenario.js` exige `2.1.0`. Los consumidores de escenario que cargan el artefacto comparten el mismo bloqueo. `tests/data-contract.mjs` también conserva una expectativa literal de `2.1.0`.
- **Dependencia:** `P3-04`.
- **Gate de secuencia:** P3-05 permanece pausado hasta que P3-04A cierre con revisión independiente y todos los gates de este plan en `PASS`.

P3-04A corrige una incompatibilidad de lectura. No revierte el writer `2.2.0`, no cambia el contrato ni reabre los datos producidos por P3-04.

## Objetivo

Introducir un bridge explícito de capacidades para que el runtime F2:

1. acepte payloads públicos `2.1.0` y `2.2.0` cuando contienen las secciones territoriales F2 requeridas;
2. rechace `2.0.0`, versiones futuras no auditadas y payloads sin las capacidades F2 necesarias;
3. preserve sin cambios las reglas, IDs, conteos y resultados CT-C/CT-I;
4. permita que el artefacto P3-04 `2.2.0` atraviese el gate completo sin debilitar validaciones.

La compatibilidad se expresa mediante una allowlist exacta de versiones y comprobaciones de capacidades. No se implementa una comparación abierta del tipo “mayor o igual que 2.1”.

## Fuera de alcance

P3-04A no:

- cambia A1–A8 ni la aprobación HUMAN-GATE-A;
- cambia alcance comercial, legal, permisos, procedencia, allowlists o denylists;
- modifica schema, writer, build, catálogos, fixtures fuente, manifest, activos, inspector, UI o lógica analítica;
- añade OCR, scraping, backend, red o servicios externos;
- cambia el significado de `2.1.0` o `2.2.0`;
- acepta automáticamente versiones futuras;
- incorpora tareas P3-05 o posteriores.

## Write set normativo

La implementación puede modificar únicamente:

1. `prototipo_ejecutable/public/js/scenario.js`
2. `prototipo_ejecutable/tests/scenario-domain.mjs`
3. `prototipo_ejecutable/tests/data-contract.mjs`
4. `prototipo_ejecutable/tests/e2e-scenarios/ct-c-public.json`

Este archivo es el artefacto previo de planificación y no amplía el write set de implementación. Cualquier quinto archivo exige detener la corrección, replanificar y obtener una nueva revisión independiente.

## Archivos protegidos

Todo archivo no incluido en el write set anterior está protegido. En particular:

- los 12 archivos del write set P3-04 y sus cambios actuales;
- `prototipo_ejecutable/contracts/**`;
- `prototipo_ejecutable/scripts/**`;
- `datos_relevantes/**`;
- `prototipo_ejecutable/public/demo-data/**`;
- `prototipo_ejecutable/public/assets/**`;
- `prototipo_ejecutable/public/js/state.js`;
- `prototipo_ejecutable/public/js/controller.js`;
- `prototipo_ejecutable/public/js/domain.js`;
- todos los demás tests y descriptores E2E;
- `package.json`, workflows y archivos de planificación/estado distintos de este plan.

No se permite regenerar, reformatear ni “normalizar” archivos protegidos como efecto colateral.

## Baseline y comparación en worktree sucio

P3-04A parte de un worktree que ya contiene los 12 cambios P3-04 sin commit. Por tanto:

- “diff de P3-04A” significa el diff limitado a los cuatro paths de su write set, comparados contra `HEAD`;
- no se espera que `git status` global muestre solo cuatro archivos;
- antes de editar, el revisor debe registrar `git status --short --untracked-files=all`;
- debe calcular y conservar en su evidencia los hashes de contenido de los 12 archivos P3-04, incluido el nuevo `tests/data-inspector.mjs`;
- al terminar, el checker debe repetir esos hashes y demostrar igualdad exacta;
- los cuatro archivos P3-04A se comparan contra `HEAD`, porque P3-04 no los modifica;
- cualquier delta adicional respecto del snapshot inicial detiene la tarea.

El handoff debe presentar por separado:

1. estado global heredado;
2. diff limitado a los cuatro archivos P3-04A;
3. comparación antes/después de hashes de los 12 archivos P3-04 protegidos.

El conjunto exacto que se debe hashear antes y después es:

1. `prototipo_ejecutable/scripts/data/evidence.js`
2. `prototipo_ejecutable/scripts/data/measures.js`
3. `prototipo_ejecutable/scripts/data/validate.js`
4. `prototipo_ejecutable/scripts/build-demo-data.js`
5. `datos_relevantes/demo-pilot/coverage-report.json`
6. `prototipo_ejecutable/public/demo-data/viva-platform-demo.json`
7. `prototipo_ejecutable/tests/data-evidence.mjs`
8. `prototipo_ejecutable/tests/data-measures.mjs`
9. `prototipo_ejecutable/tests/data-validator-unit.mjs`
10. `prototipo_ejecutable/tests/data-determinism.mjs`
11. `prototipo_ejecutable/tests/data-privacy.mjs`
12. `prototipo_ejecutable/tests/data-inspector.mjs`

El revisor y el checker deben ejecutar `Get-FileHash -Algorithm SHA256` sobre esos 12 paths explícitos y adjuntar ambas tablas al handoff. Esta comparación incluye el archivo no rastreado `data-inspector.mjs` y no depende del índice de Git.

## Precondición de revisión independiente

Antes de editar cualquiera de los cuatro archivos de implementación:

1. un revisor distinto del planner y del futuro maker debe leer este plan en modo solo lectura;
2. debe contrastar el trigger contra el diff P3-04 y reproducir el fallo de versión;
3. debe emitir `PASS` explícito sobre alcance, write set, bridge y gates;
4. un resultado `PASS WITH RISKS` se escala al orquestador y no habilita escritura hasta que el riesgo sea aceptado o el plan sea corregido;
5. `FAIL` obliga a replanificar.

La revisión independiente no puede editar código ni convertirse en maker de esta corrección.

## Tareas atómicas

### P3-04A-00 — Confirmar baseline y revisión

**Rol:** revisor independiente, solo lectura.

**Checks:**

- confirmar que el payload generado declara `2.2.0`;
- confirmar que el fallo nace de una comparación literal de versión en el runtime, no de una ausencia real de secciones F2;
- confirmar que `tests/data-contract.mjs` conserva la expectativa anterior;
- confirmar que el diff previo permanece limitado a P3-04;
- emitir el veredicto requerido antes de habilitar P3-04A-01.

**Gate:** `PASS` independiente persistido en el handoff de ejecución.

### P3-04A-01 — Implementar el bridge de capacidades

**Archivo:** `prototipo_ejecutable/public/js/scenario.js`.

**Cambios permitidos:**

- sustituir la igualdad exclusiva con `2.1.0` por una allowlist exacta `2.1.0`/`2.2.0`;
- exigir las capacidades F2 actuales: `scenario_catalogs`, `scenario_defaults` y `geography`;
- conservar los catálogos obligatorios `typologies`, `bedrooms`, `delivery_years`, `scope_modes`, `quadrants`, `radius_meters` y `visualizations`, incluidas las listas cerradas ya verificadas;
- conservar `scenario_defaults.version`, `source="default"`, un distrito por defecto presente en geografía y arrays válidos `geography.districts`/`geography.assignments`;
- hacer fallar explícitamente `2.0.0`, ausencia de versión, versiones malformadas y cualquier futura versión no auditada, incluida `2.3.0`;
- mantener idéntica la salida del dominio para un mismo conjunto de secciones F2.

**Prohibiciones:**

- no ignorar `contract_version`;
- no aceptar por prefijo `2.*`, por rango abierto ni por comparación semántica expansiva;
- no introducir ramas específicas del inspector en el motor territorial;
- no mutar el payload recibido.

### P3-04A-02 — Congelar compatibilidad en el dominio

**Archivo:** `prototipo_ejecutable/tests/scenario-domain.mjs`.

**Cobertura mínima:**

- un payload F2 `2.1.0` válido pasa;
- el mismo payload F2 declarado `2.2.0` pasa y produce resultados equivalentes;
- `2.0.0` falla;
- `2.3.0` y otra versión futura representativa fallan;
- una versión admitida sin las secciones F2 requeridas falla;
- CT-C y CT-I conservan IDs, conteos, filtros, cuadrantes y resultados esperados.

La prueba debe demostrar compatibilidad por capacidades, no limitarse a cambiar el literal esperado. Para una versión permitida debe cubrir, como mínimo, ausencia individual de `scenario_catalogs`, `scenario_defaults` y `geography`, además de un catálogo obligatorio vacío o incompatible.

### P3-04A-03 — Actualizar el contrato de integración público

**Archivo:** `prototipo_ejecutable/tests/data-contract.mjs`.

**Cambios permitidos:**

- esperar que el artefacto versionado actual sea `2.2.0`;
- conservar todas las aserciones legacy existentes;
- añadir aserciones sobre `root.inspector`, sus referencias nativas y su cobertura;
- exigir exactamente 48 fingerprints ordenados y únicos;
- comprobar que el reporte de cobertura identifica por SHA y bytes el mismo artefacto `2.2.0`;
- mantener los gates territoriales CT-C/CT-I y los conteos F2.

**Invariantes mínimos:**

- 714 proyectos legacy;
- 676 proyectos autoritativos;
- 184 agencias canónicas/controladas;
- 7 distritos geográficos;
- 433 asignaciones geográficas;
- Miraflores `90/90`, con `85` autoritativos y `5` gaps;
- 10 casos de inspector y 15 activos autorizados;
- ningún original restringido CT-G publicado.

### P3-04A-04 — Actualizar la proyección CT-C

**Archivo:** `prototipo_ejecutable/tests/e2e-scenarios/ct-c-public.json`.

Solo se puede cambiar el descriptor de versión pública de `2.1.0` a `2.2.0`. El JSON posterior debe ser estructuralmente idéntico a `HEAD` después de eliminar `contract_version` de ambos objetos. Además, el diff textual debe contener únicamente la sustitución de esa línea; no se admite reformateo.

El checker debe leer el baseline con `git show HEAD:prototipo_ejecutable/tests/e2e-scenarios/ct-c-public.json`, comparar ambos JSON ignorando únicamente `contract_version` y revisar el diff textual del path.

### P3-04A-05 — Verificación integral

Ejecutar desde `prototipo_ejecutable/`:

```powershell
npm.cmd run check
npm.cmd run test:data
npm.cmd run test:scenario
npm.cmd run test:architecture
npm.cmd run test:scenario:e2e
npm.cmd run test:smoke
npm.cmd run test:a11y
npm.cmd run verify
```

Además:

```powershell
node tests/data-contract-compatibility.mjs
node tests/data-geography.mjs
node tests/data-inspector.mjs
git diff --check
git status --short --untracked-files=all
git diff -- prototipo_ejecutable/public/js/scenario.js prototipo_ejecutable/tests/scenario-domain.mjs prototipo_ejecutable/tests/data-contract.mjs prototipo_ejecutable/tests/e2e-scenarios/ct-c-public.json
```

El gate no se considera verde por pasar comandos parciales. `npm.cmd run verify` debe terminar con código `0`.

## Criterios de aceptación

1. El runtime territorial acepta exactamente contratos `2.1.0` y `2.2.0` con las capacidades F2 requeridas.
2. El runtime rechaza `2.0.0`, versiones ausentes/malformadas y toda versión futura no auditada.
3. Un payload `2.1.0` y su equivalente `2.2.0` producen la misma salida F2.
4. El descriptor CT-C cambia únicamente su versión declarada.
5. `data-contract.mjs` conserva todos los checks legacy y valida inspector, 48 fingerprints, SHA y bytes.
6. CT-C y CT-I conservan exactamente sus IDs, conteos y resultados.
7. Los 12 cambios P3-04 permanecen intactos.
8. No cambia A1–A8 ni el alcance comercial, legal, de permisos o procedencia.
9. El diff limitado de P3-04A contiene únicamente los cuatro archivos del write set; el estado global puede seguir mostrando los 12 cambios P3-04 heredados.
10. Todos los comandos de P3-04A-05, incluido `npm.cmd run verify`, pasan.
11. Un checker independiente revisa el diff y emite `PASS` antes del handoff al integrador.
12. No se crea commit durante la ejecución solicitada.

## Riesgos y mitigaciones

- **Aceptar una versión futura accidentalmente.** Mitigación: allowlist exacta y tests negativos `2.0.0`/`2.3.0`.
- **Confundir versión con capacidad.** Mitigación: validar tanto versión admitida como presencia de secciones F2.
- **Debilitar F2 al habilitar 2.2.** Mitigación: igualdad de resultados 2.1/2.2 y regresión CT-C/CT-I completa.
- **Ocultar una regresión cambiando solo el test.** Mitigación: cambio productivo mínimo en `scenario.js` y gates de arquitectura/E2E/browser.
- **Deriva del descriptor CT-C.** Mitigación: baseline desde `HEAD`, igualdad estructural sin `contract_version` y diff textual de una sola línea.
- **Sobrepasar el write set para hacer verde `verify`.** Mitigación: allowlist cerrada de cuatro archivos; cualquier archivo adicional detiene la tarea.

## Condiciones de parada

Detener y escalar si:

- el payload `2.2.0` carece de una capacidad F2 que sí existe en `2.1.0`;
- hacer pasar CT-C/CT-I exige cambiar datos, IDs, conteos o lógica territorial;
- aparece un fallo de `verify` cuya corrección requiere un quinto archivo;
- la revisión independiente no emite `PASS`;
- se detecta que la corrección altera A1–A8, permisos o alcance comercial/legal.

## Rollback

Si el bridge introduce una regresión:

1. revertir únicamente los cambios de los cuatro archivos P3-04A;
2. conservar intactos el writer y los artefactos P3-04 `2.2.0`;
3. marcar P3-04A como fallido y mantener P3-05 bloqueado;
4. replanificar la frontera de consumo; no degradar el writer a `2.1.0` ni editar datos para acomodar el runtime;
5. repetir revisión independiente antes de cualquier segundo intento.

## Handoff requerido

El maker debe entregar:

- diff exacto de cuatro archivos;
- veredicto independiente previo y checker final;
- tabla de gates con comando, resultado y código de salida;
- prueba de equivalencia F2 entre `2.1.0` y `2.2.0`;
- prueba de rechazo para `2.0.0` y versiones futuras;
- comparación CT-C antes/después que muestre un único cambio de versión;
- confirmación de invariantes CT-C/CT-I y del write set protegido;
- estado explícito `sin commit`.
