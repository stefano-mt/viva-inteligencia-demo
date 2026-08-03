# Fase 4 — Resumen de benchmark y comparador explicable

**Fecha de cierre técnico:** 2026-08-03

**Estado:** implementación y verificación independiente completadas; P4-14 versionada y PR funcional [#13](https://github.com/stefano-mt/viva-inteligencia-demo/pull/13) abierto como borrador; evidencia portable, revisión humana, merge y verificación de GitHub Pages pendientes

**Veredicto independiente:** `PASS`

## Resultado

La Fase 4 convierte la muestra territorial de Fase 2 y la elegibilidad de Fase 3 en una lectura comercial trazable. La demo ya distingue entre datos observados, cocientes orientativos no comparables y referencias elegibles, y permite comparar proyectos por filas sin ocultar faltantes ni rehabilitar evidencia inconsistente.

Las rutas `#market` y `#compare` ofrecen ahora:

- benchmark cuantitativo por escenario con composición y exclusiones explícitas;
- benchmark cualitativo de atributos anunciados, con denominadores y estados de información;
- comparador de dos o tres proyectos, más el escenario Viva cuando está configurado;
- nueve grupos de filas con detalle bajo demanda;
- conclusión ejecutiva derivada de filas identificables;
- enlaces al inspector cuando existe evidencia permitida o una exclusión relevante;
- experiencia responsive, operable con teclado y verificable al 200% de zoom.

La fase no inventa un precio por m² elegible. En Miraflores hay 69 publicaciones territoriales que declaran precio y área total, pero esos campos no prueban pertenecer a la misma oferta. Después del overlay de elegibilidad y la exclusión CT-G quedan 68 cocientes orientativos, mientras el benchmark elegible conserva `n = 0`.

## Historias entregadas

| Historia | Resultado confirmado |
|---|---|
| HU-DEMO-501 | Benchmark de microzona con corte, denominadores, método R-7, composición, exclusiones y estados `ready`, `limited` e `insufficient`. |
| HU-DEMO-502 | Benchmark cualitativo que separa anunciado, documentado, desconocido, restringido y excluido; `No informado` no se interpreta como ausencia. |
| HU-DEMO-503 | Comparador agrupado de 2–3 proyectos y escenario Viva opcional, con máximo tres proyectos y detalle por filas. |
| HU-DEMO-504 (`Should`) | Hasta tres hallazgos derivados que separan hallazgo, implicancia, acción y limitación, con CTA hacia la fila que los sustenta. |
| HU-DEMO-505 (`Could`) | Diferida expresamente por A10; no se incorporó exportación, dependencia ni implementación parcial. |

Los criterios completos y su evidencia están en [PLAN.md](PLAN.md) y [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md).

## Contrato, datos y determinismo

| Dimensión | Resultado |
|---|---:|
| Contrato público | `2.3.0` |
| Compatibilidad del reader | `2.0`–`2.3` |
| Arranque territorial probado | `2.1`, `2.2` y `2.3` |
| Proyectos / agencias | 676 / 184 |
| Observaciones / hechos | 427 / 4,021 |
| Documentos / evidencias | 19 / 19 |
| Issues / eventos | 10 / 3 |
| Entradas benchmark / atributos | 397 / 37 |
| Partición global precio/m² | 0 usadas + 26 faltantes + 371 excluidas = 397 |
| Cocientes no comparables Top 7 | 370 |
| Miraflores | 68 orientativos y 82 cualitativos |
| Fingerprints ordenados | 50 |

Artefactos verificados:

| Artefacto | Bytes | SHA-256 |
|---|---:|---|
| [viva-platform-demo.json](../../../prototipo_ejecutable/public/demo-data/viva-platform-demo.json) | 7,387,136 | `5d8a13b3e0af73d8dc8cee674f83cea541136b4c49bd444780bac3508f562041` |
| [coverage-report.json](../../../datos_relevantes/demo-pilot/coverage-report.json) | — | `3e8fbdb8d3ce73b3a58ea9c70e7b289dc1f5df0d44c0f18f67e445d19c8f4b24` |
| GeoJSON territorial | 46,650 | `ef75b5deb43f2ed94cc9661c3f1926e94608e0b2e4a41c8ce9197dbea71b16c0` |

Dos builds consecutivos produjeron los mismos hashes. Los contratos 2.1/2.2 conservan F2/F3 y degradan únicamente F4 a `contract_unavailable`.

## Benchmark de Miraflores

La lectura verificada conserva universos distintos y nombrados:

- 90 proyectos observados;
- 85 comparables territoriales;
- 5 proyectos por revisar;
- 69 publicaciones raw que declaran precio y área total;
- 68 cocientes orientativos después de excluir CT-G;
- 82 registros con información cualitativa;
- 0 parejas precio–área elegibles.

El resumen territorial muestra `Referencia de precio no demostrada`. No usa `Referencia de precio lista`, `precios publicados compatibles` ni otra formulación que convierta volumen raw en elegibilidad.

El benchmark usa únicamente:

- `Precio publicado desde`;
- `Área total`;
- `Unidades reportadas por la publicación`;
- `Atributos anunciados`.

No afirma precio de cierre, promedio, tasación, demanda, absorción, stock, área techada o área libre.

## Comparador y conclusión

El comparador consume el mismo escenario canónico y permite:

1. seleccionar dos o tres proyectos;
2. añadir el escenario Viva como columna simulada diferenciada;
3. revisar precio, áreas, producto, ubicación, entrega, áreas comunes, acabados, estacionamientos y fuentes/confianza;
4. distinguir valor, desconocido, restringido, inconsistente y no aplicable sin depender solo del color;
5. abrir evidencia permitida o el inspector;
6. enfocar desde la conclusión la fila que sustenta el hallazgo.

Cuando no existe precio por m² elegible, la conclusión declara: `No hay precio por m² elegible para posicionamiento`.

## Casos transversales

| Caso | Resultado |
|---|---|
| CT-A | Área built 98 m² y total 206 m² siguen separadas; precios simulados excluidos del mercado. |
| CT-B | Dos precios incompatibles se conservan sin seleccionar verdad ni agregado. |
| CT-C | Escenario, mapa, benchmark y comparador consumen el mismo subconjunto canónico. |
| CT-D | Cuarzo abre evidencia autorizada; `air_conditioning = unknown` no se convierte en `false`. |
| CT-G | Pardo Coast permanece territorial; Tipo 7 y ocho hechos continúan excluidos; `Abrir inspector` permanece disponible. |
| CT-I | Miraflores conserva 90/85/5 y cuadrantes 40/5/5/40. |
| CT-P | Pairing, duplicados, conflictos, permisos, particiones y estados n=0–5 están cubiertos por fixtures y E2E. |

## Privacidad y permisos

La verificación confirmó:

- cero documentos/evidencias `restricted` o `pending` con ruta, contenido o fragmento público;
- cero binarios CT-G y cero solicitudes externas desde benchmark/comparador;
- apertura únicamente del fragmento autorizado CT-D;
- ausencia de HTML crudo, PII, rutas locales y activos restringidos en el payload;
- quince binarios autorizados preservados;
- exportación diferida para evitar ampliar superficie de privacidad.

La demo permanece estática y no ejecuta scraping, OCR, backend, actualización en vivo ni servicios externos.

## UI, responsive y accesibilidad

Fase 4 reduce densidad horizontal mediante:

1. resumen y propósito;
2. cédula de benchmark;
3. composición y exclusiones bajo demanda;
4. benchmark cualitativo por filas;
5. selector acotado del comparador;
6. matriz agrupada;
7. conclusión ejecutiva y CTA a evidencia.

P4-12 y P4-13 verificaron:

- 1440×900, 1280×720 y 390×844;
- reflow equivalente a 200%;
- targets relevantes de al menos 44×44;
- contraste, foco visible, sticky headers y reduced motion;
- teclado, Escape, retorno de foco y anuncios accesibles;
- ausencia de overflow, truncamiento o solapamiento bloqueante;
- cero errores de consola, página, HTTP, requests fallidos o red externa.

## Verificación independiente

La primera ejecución P4-13 emitió `FAIL` por G1: el resumen territorial hablaba de una referencia de precio lista antes de mostrar un benchmark elegible con `n = 0`.

La enmienda [AMENDMENT-P4-13A.md](AMENDMENT-P4-13A.md) corrigió únicamente el contrato narrativo autorizado. El checker independiente `/root/phase4_gate_checker` repitió P4-13 sobre:

```text
be05fdc456e3ab85da01df26b4cd22daa426dac6
```

Resultado final:

- `npm.cmd run verify`: PASS;
- responsive específico: PASS;
- smoke y accesibilidad: 8 rutas × 3 viewports;
- CT-A/B/C/D/G/I/P: PASS;
- datos, privacidad y determinismo: PASS;
- Graphify: 3,034 nodos y 5,743 relaciones, sin blocker arquitectónico;
- recorrido UI-only: PASS en `00:00:01.725`, sin errores ni red externa.

El cronómetro corresponde a automatización, no a una medición humana. Antes de una presentación real se recomienda un ensayo humano breve.

**Veredicto vigente:** `PASS`.

No se requiere `HUMAN-GATE-B`.

## Commits de la fase

| Tarea | Commit(s) |
|---|---|
| Plan, reader-test y HUMAN-GATE-A | `be5fd33`, `a9f0a45` |
| P4-00D | `88feabc` |
| P4-01 | `b90c966` |
| P4-02 | `54e9947` |
| P4-03 | `8825ac2` |
| P4-04 | `59b1720` |
| P4-05 | `d96a710` |
| P4-06 | `931397b` |
| P4-07 | `4fc5ca5` |
| P4-08 | `032122e` |
| P4-09 | `d4a5ec3` |
| P4-10 | Diferida por A10; sin commit funcional |
| P4-11 | `fc07ee7` |
| P4-12 | `30f0cce` |
| P4-13 inicial | `7e5f703`, veredicto reemplazado `FAIL` |
| P4-13A | `be05fdc` |
| Repetición P4-13 | `6038749`, veredicto `PASS` |

## Enmiendas y trazabilidad

Además de [AMENDMENT-P4-01.md](AMENDMENT-P4-01.md) y P4-13A, se consolidan las autorizaciones explícitas que ampliaron pruebas sin ampliar comportamiento:

1. P4-04 actualizó tres regresiones legacy al contrato 2.3 y a 50 fingerprints.
2. P4-04 adaptó dos integraciones F1 a catálogos públicos extensibles, preservando sus registros originales.
3. P4-11 migró `tests/projects-compare.mjs` e integró los E2E F4 en `package.json`, sin modificar runtime, datos o estilos.

Estas decisiones quedan registradas durablemente en [DECISIONS.md](../../DECISIONS.md).

## Riesgos y notas no bloqueantes

1. Nexo continúa `pending_review`; el snapshot está autorizado solo para esta demo y no sustituye revisión jurídica para producción o distribución adicional.
2. Graphify representa parcialmente CSS/JSON; se complementó con tests, hashes y navegador.
3. El journey cronometrado fue automatizado; se recomienda ensayo humano antes de presentar.
4. Las capturas finales residen en una ruta local temporal. Deben adjuntarse al PR como GitHub user-attachments antes de solicitar merge.

Ninguna nota altera el `PASS` ni exige `HUMAN-GATE-B`.

## Estado de ship

- Implementación P4-01–P4-12: completada; P4-10 diferida por decisión aprobada.
- Corrección P4-13A: completada.
- Checker P4-13 repetido: `PASS`.
- P4-14: memoria versionada y PR funcional #13 abierto como borrador.
- Gate previo a solicitar merge: adjuntar capturas portables y completar revisión humana.
- Merge: exclusivamente humano y pendiente.
- P4-15: verificación read-only de GitHub Pages, bloqueada hasta el merge.
- P4-16: persistencia post-merge en rama/PR documental separados, pendiente.
- Despliegue de Fase 4: **no demostrado todavía**.
