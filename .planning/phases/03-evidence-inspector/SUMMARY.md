# Fase 3 — Resumen de ficha, evidencia e inspector

**Fecha de cierre técnico:** 2026-07-30

**Estado:** implementación y verificación independiente completadas; P3-15 prepara memoria y PR funcional; merge y verificación de GitHub Pages pendientes

**Veredicto independiente:** `PASS`

## Resultado

La Fase 3 incorpora el momento comercial central de Viva Inteligencia Comercial: un inspector que permite pasar de un dato publicado a su procedencia, contrastar observaciones incompatibles y comprender por qué un hecho o tipología puede o no alimentar un benchmark certificado.

La nueva ruta `#inspector` ofrece:

- cobertura multifuente con denominadores separados;
- navegación proyecto → tipología → expediente;
- ficha de procedencia y cadena de custodia;
- ledger vertical de compatibilidad;
- visor seguro para activos, fragmentos, restricciones y permisos pendientes;
- estados `certified`, `reviewable`, `inconsistent`, `illegible` e `insufficient`;
- decisión de elegibilidad explicable al nivel de hecho y tipología;
- enlace desde el catálogo de proyectos;
- experiencia responsive, operable con teclado y verificable al 200% de zoom.

El inspector conserva el escenario territorial de Fase 2. La elegibilidad de evidencia no elimina el proyecto del universo geográfico: únicamente impide que hechos o tipologías incompatibles se presenten como certificados.

## Historias entregadas

| Historia | Resultado confirmado |
|---|---|
| HU-DEMO-401 | Ficha multifuente con proyecto, inmobiliaria, distrito, procedencia, fecha, tipologías, observaciones y metadata bajo demanda. |
| HU-DEMO-402 | Ledger por filas con valores originales/normalizados, estado, diferencia, causa y siguiente acción. |
| HU-DEMO-403 | Visor accesible de activo, fragmento, restricción y permiso pendiente en el payload; transcripción controlada y no disponible quedan cubiertos mediante fixtures sintéticos del componente. |
| HU-DEMO-404 (`Should`) | Resumen cualitativo acotado que separa atributos certificados, no observados y restringidos sin inferir desde imágenes. |
| HU-DEMO-405 | Navegación reproducible a `#inspector/case/f3-ct-g-pardo`, fallback determinista y CTA desde catálogo. |
| HU-DEMO-406 | Conciliación preprocesada sin OCR en runtime, con conservación de texto original, tipo semántico, método, fecha y confianza. |
| HU-DEMO-901 | Cobertura derivada de 30/22/5 y denominadores separados para casos, procedencia y activos autorizados. |

Los criterios completos y su evidencia están en [PLAN.md](PLAN.md) y [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md).

## Contrato, datos y cobertura

| Dimensión | Resultado |
|---|---:|
| Contrato público | `2.2.0` |
| Compatibilidad de lectura | `2.0`, `2.1` y `2.2` |
| Proyectos autoritativos | 676 |
| Agencias en el modelo | 184 |
| Tipologías en el modelo | 11 |
| Observaciones | 30 |
| Hechos | 40 |
| Documentos / evidencias | 19 / 19, emparejados uno a uno |
| Issues | 10 |
| Casos del inspector | 10 |
| Tipologías inspectables | 10 |
| Activos visuales autorizados | 15 |
| Procedencia de casos | 1 observado / 9 controlados / 0 simulados |
| Calidad de casos | 3 certificados / 1 revisable / 4 inconsistentes / 1 ilegible / 1 insuficiente |
| Elegibilidad de casos | 3 elegibles / 7 excluidos |

El piloto de mercado conserva los niveles acumulativos:

- 30 inmobiliarias base;
- 22 enriquecidas;
- 5 estructuradas (`deep`).

Estos niveles no equivalen a expedientes visuales. Los diez casos del inspector y los quince activos autorizados se comunican con denominadores propios.

Artefacto de build público verificado localmente:

| Artefacto | Bytes | SHA-256 |
|---|---:|---|
| [viva-platform-demo.json](../../../prototipo_ejecutable/public/demo-data/viva-platform-demo.json) | 3,656,852 | `9cf407c091fbb03b7d489e39079de57fd84af3fe16dc82b8ed559a7eda84646c` |

El reporte de cobertura determinista está en [coverage-report.json](../../../datos_relevantes/demo-pilot/coverage-report.json).

## CT-D — evidencia cualitativa

CT-D demuestra un expediente controlado certificado:

- `countertop_material = quartz` abre el fragmento autorizado “Cubierta de cocina: cuarzo”;
- fuente, fecha, página, método, confianza y estado permanecen visibles;
- `air_conditioning = unknown` se presenta como no observado, nunca como `false`;
- el documento restringido expone metadata mínima sin ruta, fragmento o binario;
- la tipología permanece elegible según las reglas de la demo.

## CT-G — tarjeta/plano incompatibles

El deep-link canónico es `#inspector/case/f3-ct-g-pardo`.

Observaciones conservadas:

| Fuente | Piso/unidad | Área | Tipo semántico |
|---|---|---:|---|
| Tarjeta | `Piso 1` | 104.15 m² | `unknown` |
| Plano | `Dep. 807 AL 1007` | 53.37 m² | `total` |

Derivaciones visibles:

- diferencia absoluta: 50.78 m²;
- diferencia relativa: 48.76%, con base en la tarjeta;
- pisos 8–10 inferidos desde el rango, con confianza baja y estado revisable.

Decisión:

- roll-up `inconsistent`;
- dos issues bloqueantes: área y piso/rango;
- `selectedTruthFactId = null`;
- ocho hechos excluidos;
- tipología no elegible para benchmark certificado;
- el proyecto `project:nexo-2951` permanece en el universo territorial y CT-I.

La tarjeta continúa con permiso `pending` y el plano con permiso `restricted`. Ningún original CT-G, ruta pública, fragmento o hotlink fue publicado.

## Seguridad de evidencia y permisos

El manifest materializa quince activos neutrales/autorizados bajo `assets/evidence/`. La validación confirmó:

- cero discrepancias de bytes o hash;
- cero rutas o contenido filtrado para documentos/evidencias `pending` o `restricted`;
- cero binarios originales CT-G;
- cero solicitudes externas desde el inspector;
- representaciones controladas etiquetadas persistentemente como no originales;
- la UI solo muestra hash completo para evidencia autorizada y disponible;
- el JSON conserva fingerprints completos como metadata de cadena de custodia, incluso para CT-G, y conserva el `source_url` público de la tarjeta pendiente; el inspector no los convierte en CTA, `href`, recurso incrustado ni solicitud de red.

La demo no ejecuta OCR, scraping, descarga recurrente ni servicios externos.

## UI, responsive y accesibilidad

El inspector reemplaza una cuadrícula horizontal por una progresión vertical:

1. propósito y cobertura;
2. selección de expediente;
3. veredicto y siguiente acción;
4. ledger por filas;
5. visor de evidencia;
6. decisión analítica.

P3-13 y P3-14 verificaron:

- 1440×900, 1280×720 y 390×844;
- reflow equivalente a Chrome al 200%;
- CTA principal visible y con contraste;
- cinco filas del ledger en orden área → piso/unidad → modelo → dormitorios → baños;
- metadata cerrada al cargar;
- visor móvil a pantalla completa;
- foco visible, Escape y retorno al disparador;
- targets táctiles suficientes;
- ausencia de scroll horizontal principal, clipping y contenido dependiente solo de color o hover.

## Verificación

El checker independiente `/root/phase3_checker` evaluó el commit funcional:

```text
c35646f1adfb4a0603c5838e32af6119ca5f66a1
```

Resultado:

- `npm.cmd run verify`: PASS;
- CT-D y CT-G en dominio y navegador: PASS;
- smoke: 8 rutas × 3 viewports;
- accesibilidad: 8 rutas × 3 viewports;
- determinismo y privacidad: PASS;
- regresiones CT-C/CT-I y siete vistas previas: PASS;
- red externa, consola y HTTP: PASS;
- Graphify: 2,605 nodos y 5,120 relaciones, sin hub o ciclo nuevo bloqueante.

Un lector nuevo, sin acceso al código/tests y sin facilitador, completó el guion comercial en `00:01:28.548`, por debajo del gate de cinco minutos. Explicó valor, procedencia, restricciones, motivo de no elegibilidad, siguiente acción y significado de 30/22/5.

**Veredicto vigente:** `PASS`.

No se requiere `HUMAN-GATE-B`.

Los modos `controlled_transcription` y `unavailable` fueron verificados con fixtures sintéticos del componente; el payload vigente ofrece como rutas navegables `asset`, `fragment`, `restricted` y `pending`.

## Commits de la fase

| Tarea | Commit(s) |
|---|---|
| Preparación, plan y HUMAN-GATE-A | `2ca7cf3`, `a5f3b31` |
| P3-01 | `b1d47ad` |
| P3-02 | `5b3a5a4` |
| P3-03 | `3647f30` |
| Enmienda P3-04A | `d894649` |
| P3-04 | `3a5c4d9` |
| P3-05 | `e299fb8` |
| P3-06 | `96d3a51` |
| P3-07 | `5f0e81d` |
| P3-08 | `ad60427` |
| P3-09 | `6c90b1c` |
| P3-10 | `1567e94` |
| P3-11 | `f232908` |
| P3-12 | `abf74ee` |
| P3-13 | `c35646f` |
| P3-14 | `599d619` |

## Aclaraciones y notas no bloqueantes

1. El rango aprobado de 17–20 se materializó como 19 documentos y 19 evidencias emparejados uno a uno. P3-14 aceptó esa interpretación por colección; si el stakeholder pretendía un máximo combinado entre ambas colecciones, debe reabrirse el alcance antes de ampliarlas.
2. Un porcentaje de evidencia puede confundirse inicialmente con 30/22/5 si se omite la explicación “Profundidad disponible”; el lector resolvió la diferencia durante el recorrido.
3. Graphify no representa adecuadamente CSS, JSON y activos; se complementó con tests, hashes, manifest, Playwright y revisión visual.
4. El checkout debe instalar sus dependencias de desarrollo para ejecutar Playwright; no es una dependencia de runtime de la demo.
5. Las capturas validadas por P3-14 residen en una ruta local de Codex. Deben adjuntarse al PR como GitHub user-attachments antes de solicitar el merge; la ruta local no es evidencia portable para revisores remotos.

Ninguna nota altera el `PASS` ni requiere HUMAN-GATE-B.

## Estado de ship

- Implementación P3-01–P3-13: completada.
- Checker P3-14: `PASS`.
- P3-15: memoria preparada; creación y enriquecimiento del PR funcional pendientes dentro de esta tarea.
- Merge: humano y pendiente.
- P3-16: verificación read-only de GitHub Pages, pendiente y bloqueada hasta el merge.
- P3-17: persistencia post-merge en rama/PR documental separados, pendiente.
- Despliegue de Fase 3: **no demostrado todavía**.
