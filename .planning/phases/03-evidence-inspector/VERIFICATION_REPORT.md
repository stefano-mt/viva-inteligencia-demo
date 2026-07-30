# Fase 3 — Informe de verificación independiente P3-14

## Veredicto

**PASS**

No se encontraron gaps bloqueantes en las historias Must, CT-D, CT-G, permisos, claims, accesibilidad, responsive, determinismo, regresiones o recorrido comercial. No se requiere `HUMAN-GATE-B`.

Este veredicto cubre la rama funcional antes del PR. No equivale a merge, despliegue ni verificación de GitHub Pages; esos estados corresponden a P3-15, P3-16 y P3-17.

## Identidad y baseline evaluado

- Checker: `/root/phase3_checker`, distinto de los makers.
- Fecha: `2026-07-30`.
- Rama: `feat/phase-3-evidence-inspector`.
- Commit evaluado: `c35646f1adfb4a0603c5838e32af6119ca5f66a1`.
- Commit remoto observado: `c35646f1adfb4a0603c5838e32af6119ca5f66a1`.
- Árbol inicial: limpio.
- Diff de referencia: `main...c35646f`, 92 paths y 21,834 inserciones/509 eliminaciones.
- El cambio de `public/js/scenario.js`, protegido en el plan principal, está amparado por el bridge correctivo P3-04A revisado; no se trató como ampliación silenciosa.

## Alcance y método

Antes de evaluar se leyeron íntegramente:

- `AGENTS.md`;
- `.planning/STATE.md`;
- `.planning/PROJECT.md`;
- `.planning/ROADMAP.md`;
- `CONTEXT.md`;
- `UI-SPEC.md`;
- `CASE-INVENTORY.md`;
- `PLAN.md`;
- `.planning/REQUIREMENTS.md`;
- `.planning/VERIFICATION.md`;
- `.planning/GRAPHIFY.md`;
- la skill `webapp-testing`.

La evaluación combinó:

1. gate automatizado completo;
2. pruebas dirigidas de datos, dominio, UI y navegador;
3. recomposición independiente de los claims CT-D/CT-G y permisos;
4. inspección visual de la evidencia de P3-13;
5. Graphify y lectura dirigida;
6. recorrido comercial por un lector nuevo, sin facilitador ni acceso al código/tests.

P3-14 no modificó código, datos, tests ni otros documentos. Graphify regeneró únicamente su salida local ignorada y este informe es el único path versionable escrito por el checker.

## Resultado por historia

| Historia | Resultado | Evidencia |
|---|---|---|
| HU-DEMO-401 — ficha multifuente | PASS | El expediente identifica proyecto, inmobiliaria, distrito, procedencia, fecha, tipologías y fuentes. Metadata ampliada queda cerrada al cargar. La selección no modifica el escenario territorial. |
| HU-DEMO-402 — discrepancias | PASS | Ledger vertical de cinco filas en orden área → piso/unidad → modelo → dormitorios → baños. Muestra valores originales/normalizados, estados textuales, causa, delta y siguiente acción; ausencia produce `insufficient`. |
| HU-DEMO-403 — visor | PASS | Modos `asset`, `fragment`, `controlled_transcription`, `restricted`, `pending` y `unavailable` verificados. CT-D abre fragmento; CT-G no crea recurso, enlace o petición para originales. Escape y retorno de foco pasan E2E. |
| HU-DEMO-404 — resumen cualitativo (`Should`) | PASS acotado | CT-D separa cuarzo certificado, aire acondicionado no observado y documento restringido. `unknown` nunca se convierte en `false`; el claim certificado abre evidencia. No se infieren atributos desde imágenes. |
| HU-DEMO-405 — navegación inspector | PASS | Ruta directa y canónica `#inspector/case/f3-ct-g-pardo`, selección proyecto → tipología, fallback determinista, CTA desde catálogo, reload/base path y tres viewports verificados. |
| HU-DEMO-406 — conciliación preprocesada | PASS | No existe OCR en cliente. Texto original, normalización, método, fecha y confianza permanecen trazables. `53.37` conserva `total`, `104.15` conserva `unknown`, la inferencia 8–10 es derivada/baja y no se elige una verdad. |
| HU-DEMO-901 — cobertura | PASS | Conteos derivados: 30 base, 22 enriched, 5 deep; niveles acumulativos. Inspector: 10 tipologías, 15 activos visuales autorizados, 10 casos = 1 observado + 9 controlados + 0 simulados. |

## CT-D — evidencia cualitativa

**PASS**

- Caso: `case:f3-ct-d-finishes`.
- Procedencia: `controlled`.
- Roll-up esperado y calculado: `certified`.
- Elegibilidad de tipología: `true`.
- El hecho `countertop_material` abre el fragmento autorizado:
  - `Cubierta de cocina: cuarzo.`
  - fuente, fecha, página, método, confianza y calidad visibles.
- `air_conditioning = unknown` permanece no observado/insuficiente y nunca se presenta como `false`.
- El documento restringido conserva metadata sin ruta, fragmento ni activo público.
- El visor móvil muestra de forma persistente que la representación controlada no es el documento original.

## CT-G — tarjeta/plano incompatibles

**PASS**

- Caso: `case:f3-ct-g-pardo`.
- Proyecto/tipología: `project:nexo-2951` / `typology:pardo-coast-tipo-7`.
- Procedencia: `observed`.
- Tarjeta:
  - `Piso 1`;
  - `104.15 m²`;
  - `area_type = unknown`.
- Plano:
  - `Dep. 807 AL 1007`;
  - `Área Total 53.37 m2`;
  - `area_type = total`.
- Derivados:
  - diferencia absoluta `50.78 m²`;
  - diferencia relativa `48.76%`;
  - base: tarjeta;
  - pisos inferidos 8–10, confianza baja y estado revisable.
- Roll-up: `inconsistent`.
- Elegibilidad: `false`.
- Dos issues bloqueantes: conflicto de área y conflicto piso/rango.
- `selectedTruthFactId = null`: ninguna observación se elige como verdad.
- Los ocho facts CT-G quedan excluidos; ninguno aparece como certificado/elegible.
- `project:nexo-2951` permanece en la lectura territorial F2 y CT-I.
- La tarjeta `pending` y el plano `restricted` tienen `public_asset_path = null`.
- Binarios CT-G publicados: `0`.
- No aparece Park 55 ni cambia el `project_id`.

## Permisos, privacidad y claims

**PASS**

Recomposición independiente del JSON público:

- contrato: `metadata.contract_version = 2.2.0`;
- casos: 10;
- activos manifestados: 15;
- activos con discrepancia de bytes/hash: 0;
- documentos `pending`/`restricted` con ruta o contenido filtrado: 0;
- evidencias `pending`/`restricted` con ruta, fragmento o URL filtrada: 0;
- hashes CT-G de denylist: ausentes de activos públicos;
- rutas autorizadas: locales y bajo `assets/evidence/`;
- red externa del inspector: 0 en E2E.

Claims revisados:

- el inspector no llama “área techada” a `104.15 m²`;
- no usa “verdadero”, “falso” o “error del competidor” para resolver CT-G;
- no presenta la ficha controlada como plano original;
- no equipara `deep` con dossier visual;
- no presenta los casos controlados como mercado observado;
- la elegibilidad se comunica como “según las reglas de la demo”.

## Gate automatizado

Desde `prototipo_ejecutable/`:

```powershell
$env:NODE_PATH='C:\Users\Stefano\AppData\Local\Temp\p3-14-node-runtime\node_modules'
npm.cmd run verify
```

**Resultado: PASS.** El proceso terminó después de `A11y smoke OK`, con `stderr` vacío.

La primera ejecución llegó hasta `test:e2e` y se detuvo porque el checkout local no tenía instalada la dependencia declarada `playwright`. Se instaló exactamente `playwright@1.61.1` en un runtime temporal fuera del repositorio y se repitió el gate sin modificar el árbol. No fue un fallo funcional.

Resultados relevantes del gate:

- sintaxis y módulo alcanzable: PASS;
- arquitectura: 21 módulos alcanzables, sin ciclo nuevo;
- escenario CT-C/CT-I: PASS;
- comparabilidad/mapa/proyectos/asistente: PASS;
- contrato 2.2 y compatibilidad reader 2.0/2.1/2.2: PASS;
- schema, referencias, geografía y aliases: PASS;
- privacidad, manifest y denylist: PASS;
- determinismo:
  - JSON `9cf407c091fbb03b7d489e39079de57fd84af3fe16dc82b8ed559a7eda84646c`;
  - reporte `ff5e7cd93ec8410d562c36924b291c3b6c3db595f1071f9c8d58614eba5041ac`;
  - GeoJSON `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0`;
  - 48 inputs ordenados;
- fixtures CT-D/CT-G: PASS;
- motor y estado: PASS;
- shell, visor y ledger: PASS;
- scenario E2E: PASS;
- inspector E2E: PASS;
- responsive/200%: PASS;
- smoke: 8 rutas × 3 viewports;
- accesibilidad: 8 rutas × 3 viewports.

Pruebas dirigidas adicionales:

```powershell
npm.cmd run test:e2e
npm.cmd run test:smoke
npm.cmd run test:a11y
git diff --check
```

Todas pasaron.

## Evidencia visual y responsive

Evidencia inspeccionada:

```text
C:\Users\Stefano\.codex\visualizations\2026\07\27\019fa397-66b3-7cd1-9b15-f690fbe03730\p3-13-evidence-final
```

Archivos:

- `desktop-1440x900-top.png`;
- `laptop-1280x720-top.png`;
- `mobile-390x844-top.png`;
- `mobile-390x844-ledger-context.png`;
- `mobile-390x844-dialog.png`;
- `chrome-zoom-200-720x450-top.png`;
- `chrome-zoom-200-720x450-ledger-context.png`.

Conclusiones:

- 1440×900: propósito, cobertura, selección y veredicto mantienen jerarquía; no hay cuadrícula de KPIs.
- 1280×720: veredicto y CTA `Revisar hallazgos` están visibles sin scroll y las cifras no se truncan.
- 390×844: controles en una columna, targets táctiles suficientes, ledger apilado y sin scroll horizontal principal.
- Visor móvil: pantalla completa, cierre visible, fragmento y cadena de custodia legibles.
- Zoom 200%: navegación, selectores, CTA y ledger refluyen a una columna sin solaparse.
- CTA primario verde oscuro, estado textual y doble anillo de foco mantienen contraste y jerarquía.

No se observó clipping, superposición, texto crítico truncado ni información dependiente exclusivamente de color/hover.

## Accesibilidad

**PASS**

- landmarks y headings verificables;
- selectores y botones con nombres accesibles;
- orden de tabulación funcional;
- Enter/Espacio activan controles aplicables;
- Escape cierra el diálogo;
- foco vuelve al disparador;
- región viva anuncia selección/destino;
- ledger conserva orden lógico en reflow;
- estados incluyen texto, icono/badge y explicación;
- visor no depende de hover;
- 200% permanece operable.

## Regresiones

**PASS**

- 8 rutas × 3 viewports sin errores de consola, HTTP o red externa.
- Las siete vistas previas siguen renderizando.
- CT-C conserva subconjunto canónico.
- CT-I conserva 90 observados, 85 autoritativos y cuadrantes 40/5/5/40.
- Abrir/cerrar inspector no cambia el query territorial.
- `project:nexo-2951` conserva pertenencia territorial.
- El reader 2.2 mantiene compatibilidad con 2.0/2.1 y rechaza versiones/capacidades no permitidas.
- `git diff --check`: PASS.

## Graphify

Comandos:

```powershell
$env:UV_CACHE_DIR="$PWD\.cache\uv"
uvx --from graphifyy graphify extract . --code-only --no-cluster
uvx --from graphifyy graphify god-nodes --top 15
uvx --from graphifyy graphify query "evidence inspector navigation state compatibility eligibility" --budget 3000
```

Resultado:

- 2,605 nodos;
- 5,120 relaciones;
- 77 archivos de código cambiados y 20 sin cambios;
- `escapeHtml`, `formatNumber` y `escapeAttr` siguen siendo los nodos más conectados;
- `buildInspectorViewModel` aparece en posición 8 con 27 relaciones y `renderInspectorModel` en posición 13 con 21;
- el motor puro permanece en `evidence-inspector.js`; estado, navegación, controlador y vista conservan fronteras explícitas;
- no se detectó un ciclo ni un hub compartido nuevo que bloquee la fase.

Limitación conocida de Graphify: `--code-only` no representa adecuadamente CSS, activos o JSON; 16 archivos de datos produjeron cero nodos. Se compensó con hashes, manifest, tests, lectura directa y navegador.

## Gate narrativo — lector nuevo

**PASS**

- Lector: `/root/phase3_checker/phase3_fresh_reader`.
- No maker.
- Sin consulta de código/tests.
- Sin facilitador.
- Inicio con interfaz visible: `2026-07-30T15:13:47.589-05:00`.
- Fin: `2026-07-30T15:15:16.137-05:00`.
- Duración: `00:01:28.548`.
- Gate: `≤ 00:05:00`.

Pasos completados:

1. abrió Pardo Coast · Tipo 7;
2. consultó la guía visible;
3. identificó el flujo Selecciona → Contrasta → Decide;
4. activó `Revisar hallazgos`;
5. explicó 104.15 m², 53.37 m², tipo desconocido, delta 50.78 m² y 48.76%;
6. abrió Fuente A y distinguió permiso pendiente;
7. abrió Fuente B y distinguió evidencia restringida/metadata mínima;
8. explicó 0 hechos elegibles, 8 excluidos y permanencia territorial;
9. explicó el siguiente paso de revisión documental;
10. explicó 30/22/5 y que 10 casos son 1 observado + 9 controlados, no 10 originales de mercado.

No encontró errores funcionales ni confusiones bloqueantes. La guía visible fue suficiente.

## Riesgos residuales y gaps

### Gaps bloqueantes

Ninguno.

### Notas no bloqueantes

1. **Terminología de porcentajes de evidencia — baja.** El lector señaló que un porcentaje de evidencia puede confundirse inicialmente con la escala 30/22/5 si no se lee “Profundidad disponible”. La guía y los denominadores visibles resolvieron la duda dentro del recorrido; no impide explicar la propuesta.
2. **Graphify parcial para CSS/JSON — baja, conocida.** Mitigada mediante tests, manifest, hashes, screenshots y lectura dirigida.
3. **Prerequisito local de Playwright — operativa, baja.** El checkout requiere instalar sus devDependencies antes del gate. `package.json` declara Playwright; no hay dependencia de runtime para la demo publicada.

Ninguna nota altera el veredicto ni exige aceptación humana previa a P3-15.

## Conclusión y siguiente acción

Fase 3 cumple el gate P3-14 en el commit evaluado. Puede avanzar a **P3-15 — memoria y PR funcional**.

El PR debe conservar este SHA o repetir P3-14 si cambia código, datos, tests, activos o comportamiento después de este informe.
