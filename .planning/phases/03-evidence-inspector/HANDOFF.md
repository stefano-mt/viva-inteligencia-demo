# Handoff — P3-15

## Estado

`P3-15 done — PASS técnico; PR funcional #11 abierto como borrador; capturas portables, revisión, merge y cierre de ship pendientes`

## Resultado

La Fase 3 está implementada y verificada en `feat/phase-3-evidence-inspector`.

El checker independiente `/root/phase3_checker` emitió `PASS` sobre el commit funcional:

```text
c35646f1adfb4a0603c5838e32af6119ca5f66a1
```

El informe se versionó en `599d619`. No existen gaps bloqueantes ni se requiere `HUMAN-GATE-B`.

La rama incorpora contrato 2.2, catálogo de evidencia, motor puro, estado/controlador, ficha, visor, ledger, navegación, elegibilidad, E2E, responsive y accesibilidad. P3-15 modifica únicamente memoria documental; no cambia código, datos, tests, activos ni comportamiento después del veredicto.

## Alcance de P3-15

P3-15 solo modifica:

- [SUMMARY.md](SUMMARY.md);
- [HANDOFF.md](HANDOFF.md);
- [STATE.md](../../STATE.md);
- [ROADMAP.md](../../ROADMAP.md);
- [DECISIONS.md](../../DECISIONS.md).

No modifica el artefacto público ni exige repetir P3-14. Si después de `c35646f` cambia código, datos, tests, activos o comportamiento, el checker debe evaluar de nuevo el nuevo SHA antes del merge.

## Resultado observable

- Nueva ruta `#inspector`.
- Deep-link CT-G: `#inspector/case/f3-ct-g-pardo`.
- Cobertura 30 base / 22 enriched / 5 deep con significado acumulativo.
- Diez expedientes: 1 observado, 9 controlados y 0 simulados.
- Quince activos visuales autorizados.
- Ledger de cinco filas y visor seguro.
- Visor navegable en modos `asset`, `fragment`, `restricted` y `pending`; `controlled_transcription` y `unavailable` se cubren con fixtures sintéticos del componente.
- CT-D certificado y elegible.
- CT-G inconsistente, sin verdad seleccionada y fuera del benchmark certificado.
- Pardo Coast permanece en la lectura territorial.
- Navegación por teclado, móvil y zoom 200% verificados.

## Criterios

| Criterio | Estado | Evidencia |
|---|---|---|
| Historias 401–406 y 901 | PASS | [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md) |
| CT-D visual y analítico | PASS | Fixture, motor, visor y E2E |
| CT-G visual y analítico | PASS | Deep-link, ledger, permisos y E2E |
| Permisos y activos | PASS | 15 autorizados; 0 fugas pending/restricted |
| Contrato y determinismo | PASS | Reader 2.0/2.1/2.2 y hash reproducible |
| Accesibilidad y responsive | PASS | 8 rutas × 3 viewports y 200% |
| Regresiones F2 | PASS | CT-C/CT-I, escenario y siete vistas previas |
| Recorrido sin facilitador | PASS | 1:28.548, gate ≤5:00 |
| HUMAN-GATE-B | No aplica | P3-14 emitió PASS |

## Verificación ejecutada

| Comando/recorrido | Resultado |
|---|---|
| `npm.cmd run verify` | PASS |
| `npm.cmd run test:e2e` | PASS |
| `npm.cmd run test:smoke` | PASS |
| `npm.cmd run test:a11y` | PASS |
| `git diff --check` | PASS |
| Graphify extract/god-nodes/query | PASS con limitación conocida para CSS/JSON |
| Recorrido comercial independiente | PASS en 00:01:28.548 |

La instalación temporal de `playwright@1.61.1` usada por el checker ocurrió fuera del repositorio. El árbol versionado no recibió dependencias ni artefactos de runtime.

## Evidencia

- Contexto: [CONTEXT.md](CONTEXT.md).
- Especificación UI: [UI-SPEC.md](UI-SPEC.md).
- Inventario: [CASE-INVENTORY.md](CASE-INVENTORY.md).
- Plan: [PLAN.md](PLAN.md).
- Aprobación: [APPROVAL.md](APPROVAL.md).
- Informe: [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md).
- Resumen: [SUMMARY.md](SUMMARY.md).
- Dataset: [viva-platform-demo.json](../../../prototipo_ejecutable/public/demo-data/viva-platform-demo.json).
- Reporte de cobertura: [coverage-report.json](../../../datos_relevantes/demo-pilot/coverage-report.json).

Evidencia visual inspeccionada localmente por P3-14:

```text
C:\Users\Stefano\.codex\visualizations\2026\07\27\019fa397-66b3-7cd1-9b15-f690fbe03730\p3-13-evidence-final
```

Contiene escritorio, laptop, móvil, ledger, diálogo y reflow equivalente a 200%.

Esta ruta no es portable ni accesible desde GitHub. Antes de solicitar el merge, las capturas representativas deben adjuntarse al PR como GitHub user-attachments. No se deben versionar binarios adicionales fuera de un `write_set` aprobado.

## Contratos que debe conservar el siguiente rol

1. `$.model` y `$.inspector` son autoritativos; `$.projects` continúa como proyección legacy.
2. La elegibilidad se decide por hecho/tipología, no por pertenencia territorial.
3. `project:nexo-2951` permanece en CT-I y comparables geográficos.
4. CT-G conserva `104.15 m² / unknown` y `53.37 m² / total`.
5. Ninguna observación CT-G se selecciona como verdad.
6. Los originales CT-G no se publican.
7. `pending` y `restricted` no crean ruta, fragmento, enlace, recurso ni solicitud externa.
8. Las representaciones controladas deben declararse como no originales.
9. El inspector no ejecuta OCR, scraping ni integraciones vivas.
10. Un cambio funcional posterior a P3-14 exige una nueva verificación independiente.
11. El JSON conserva fingerprints completos de cadena de custodia y el `source_url` público de la tarjeta CT-G; la UI debe mantenerlos no activables para estados `pending`/`restricted` y mostrar como máximo un hash abreviado.

## Notas y deuda deliberada

| Nota | Severidad | Tratamiento |
|---|---|---|
| Posible confusión entre porcentaje de evidencia y 30/22/5 | Baja | La guía y los denominadores visibles resolvieron la lectura; observar en futuras pruebas comerciales. |
| Graphify parcial para CSS/JSON | Baja/conocida | Complementar siempre con tests, hashes, manifest y navegador. |
| Dependencias de desarrollo no instaladas en un clon nuevo | Operativa/baja | Ejecutar `npm install` en `prototipo_ejecutable` antes del gate. |
| F4 no dispone todavía de precio por m² de mercado elegible | Bloqueo de F4, no de F3 | No inventar agregados; resolver en planificación de F4. |
| Alcance “17–20 documentos/evidencias” | Documental/baja | Se materializaron 19 documentos y 19 evidencias emparejados 1:1; P3-14 aceptó la lectura por colección. Reabrir alcance si se pretendía un máximo combinado. |
| Capturas locales no portables | Gate de PR | Adjuntar capturas representativas como GitHub user-attachments antes de solicitar merge. |

## Pull request funcional

Base: `main`.

Compare: `feat/phase-3-evidence-inspector`.

PR: [#11 — feat: add evidence inspector and certified eligibility](https://github.com/stefano-mt/viva-inteligencia-demo/pull/11).

Estado al crear este handoff: `OPEN / DRAFT / MERGEABLE / CLEAN`.

HEAD observado al abrir el PR: `9a03bd9efba0f73c15a1cd9a7fa2e9ff676eee5f`. Este SHA integra `origin/main` sin cambiar el árbol verificado; el merge tree y `HEAD^{tree}` coincidieron en `b40c7d28620d26e62bdc728fd20eaee33dab991c`.

Los commits posteriores a ese HEAD solo pueden actualizar los cinco documentos de P3-15. El revisor debe usar el HEAD que GitHub muestre en #11 como autoridad final.

El PR debe incluir:

- historias 401–406 y 901;
- contrato 2.2 y compatibilidad;
- cobertura e inventario;
- CT-D y CT-G;
- permisos y prueba negativa de originales restringidos;
- verificación 8 rutas × 3 viewports;
- evidencia visual adjunta y portable, no una ruta local;
- veredicto P3-14 `PASS`;
- notas no bloqueantes;
- condición de merge humano;
- pasos P3-16/P3-17 posteriores al merge.

El cuerpo del PR ya contiene historias, resultado, permisos, verificación, notas y checklist. Continúa como borrador hasta adjuntar evidencia visual portable.

## Instrucción al siguiente rol

### Revisor humano del PR

1. Confirmar que el diff funcional termina en `c35646f` y que los commits posteriores son solo P3-14/P3-15 documental.
2. Revisar CT-G en escritorio y móvil.
3. Verificar que ningún activo original pendiente/restringido aparece en Files changed o en red.
4. Distinguir metadata serializada (`sha256` y `source_url`) de enlaces/recursos activables; `pending`/`restricted` no deben generar CTA, `href`, `src` ni fetch.
5. Confirmar que las capturas están adjuntas al PR y accesibles para un revisor remoto.
6. Confirmar que el PR no promete despliegue antes del merge.
7. Realizar el merge manual solo si GitHub muestra checks y base actualizados.

### P3-16 — después del merge

Verificar de forma read-only:

- workflow de Pages en success;
- SHA desplegado;
- HTTP 200;
- CT-D y CT-G en la URL pública;
- activos autorizados 200;
- activos restringidos ausentes;
- escritorio, móvil, consola y red.

### P3-17 — después de P3-16

Crear una rama y PR documental separados para:

- `POSTMERGE_REPORT.md`;
- `.planning/STATE.md`.

No declarar Fase 3 `deployed and verified` hasta que ese resultado esté fusionado en `main`.
