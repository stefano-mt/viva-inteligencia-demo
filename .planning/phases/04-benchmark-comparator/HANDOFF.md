# Handoff — P4-14

## Estado

`P4-14 done — PASS técnico; memoria versionada y PR funcional #13 abierto como borrador; evidencia portable, revisión, merge y cierre de ship pendientes`

## Resultado

La Fase 4 está implementada y verificada en `feat/phase-4-benchmark-comparator`.

El checker independiente `/root/phase4_gate_checker` emitió `PASS` sobre el commit funcional corregido:

```text
be05fdc456e3ab85da01df26b4cd22daa426dac6
```

El informe final se versionó en `6038749`. El gap G1 quedó cerrado, no existen gaps bloqueantes y no se requiere `HUMAN-GATE-B`.

La rama incorpora contrato 2.3, policy y catálogo, fixtures CT-A/B/C/D/G/I/P, materializador, dataset público, motor puro, estado derivado, benchmark, comparador, conclusión, eventos, E2E, responsive y accesibilidad. P4-14 modifica únicamente memoria documental; no cambia código, datos, tests, estilos, activos ni comportamiento después del veredicto.

## Alcance de P4-14

P4-14 solo modifica:

- [SUMMARY.md](SUMMARY.md);
- [HANDOFF.md](HANDOFF.md);
- [STATE.md](../../STATE.md);
- [ROADMAP.md](../../ROADMAP.md);
- [DECISIONS.md](../../DECISIONS.md).

No modifica el artefacto público ni exige repetir P4-13. Si después de `be05fdc` cambia código, datos, tests, estilos, activos o comportamiento, un checker independiente debe repetir P4-13 sobre el nuevo SHA antes del merge.

Los encabezados de estado en `CONTEXT.md` y `PLAN.md` conservan el momento histórico previo a HUMAN-GATE-A. Para el estado operativo vigente mandan `.planning/STATE.md`, este handoff y el informe final.

## Resultado observable

- `#market` muestra benchmark cuantitativo y cualitativo por el escenario canónico.
- `#compare` compara dos o tres proyectos y el escenario Viva opcional.
- Miraflores conserva 90 observados, 85 comparables, 5 por revisar y cuadrantes 40/5/5/40.
- El shell territorial muestra 69 publicaciones raw con `Referencia de precio no demostrada`.
- F4 muestra 0 parejas elegibles, 68 cocientes orientativos y 82 registros cualitativos.
- CT-G permanece territorial y excluido del precio/m² por `blocking_issue`, con enlace al inspector.
- CT-D abre evidencia permitida y no extrapola `unknown` como ausencia.
- La conclusión declara límites y enfoca la fila que sustenta cada hallazgo.
- Navegación por teclado, móvil y zoom 200% verificados.

## Criterios

| Criterio | Estado | Evidencia |
|---|---|---|
| HU-DEMO-501–504 | PASS | [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md) |
| HU-DEMO-505 | Diferida | A10 / [APPROVAL.md](APPROVAL.md) |
| CT-A/B/C/D/G/I/P | PASS | Fixtures, reader, dominio, vistas y E2E |
| Contrato y compatibilidad | PASS | 2.3 público; reader 2.0–2.3; arranque 2.1/2.2/2.3 |
| Pairing y particiones | PASS | 397 = 0 usadas + 26 faltantes + 371 excluidas |
| Privacidad y permisos | PASS | 0 fugas pending/restricted; CT-D autorizado; CT-G sin binarios/red |
| Determinismo | PASS | Dos builds; JSON, reporte y GeoJSON con hashes estables |
| Smoke y accesibilidad | PASS | 8 rutas × 3 viewports |
| Responsive F4 | PASS | 1440×900, 1280×720, 390×844 y reflow 200% |
| Regresiones F2/F3 | PASS | CT-C/I, CT-D/G, permisos, inspector y ocho rutas |
| Recorrido UI-only | PASS | `00:00:01.725`, gate ≤5:00, automatizado |
| HUMAN-GATE-B | No aplica | P4-13 repetido emitió PASS |

## Verificación ejecutada

| Comando/recorrido | Resultado |
|---|---|
| `npm.cmd run verify` | PASS |
| `node tests/benchmark-comparison-responsive.mjs` | PASS |
| `git diff --check` | PASS |
| Dos builds y recomposición independiente | PASS; hashes estables |
| Graphify extract/god-nodes/query | PASS con limitación conocida para CSS/JSON |
| Recorrido comercial UI-only | PASS en `00:00:01.725` |

## Evidencia

- Contexto: [CONTEXT.md](CONTEXT.md).
- Evaluación de datos: [DATA-ASSESSMENT.md](DATA-ASSESSMENT.md).
- Especificación UI: [UI-SPEC.md](UI-SPEC.md).
- Plan: [PLAN.md](PLAN.md).
- Aprobación: [APPROVAL.md](APPROVAL.md).
- Enmienda del reader: [AMENDMENT-P4-01.md](AMENDMENT-P4-01.md).
- Enmienda correctiva: [AMENDMENT-P4-13A.md](AMENDMENT-P4-13A.md).
- Informe independiente: [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md).
- Resumen: [SUMMARY.md](SUMMARY.md).
- Dataset: [viva-platform-demo.json](../../../prototipo_ejecutable/public/demo-data/viva-platform-demo.json).
- Reporte de cobertura: [coverage-report.json](../../../datos_relevantes/demo-pilot/coverage-report.json).
- Policy: [benchmark-policy.json](../../../datos_relevantes/demo-pilot/benchmark-policy.json).
- Catálogo: [benchmark-attribute-catalog.json](../../../datos_relevantes/demo-pilot/benchmark-attribute-catalog.json).

Evidencia visual final inspeccionada localmente por P4-13A:

```text
C:\Users\Stefano\AppData\Local\Temp\viva-p4-13a-after
```

Contiene las ocho rutas en 1440×900, 1280×720 y 390×844, incluido `desktop-market.png`, `desktop-compare.png`, `mobile-market.png` y `mobile-compare.png`.

Esta ruta es temporal y no es accesible desde GitHub. Antes de solicitar merge, las capturas representativas deben adjuntarse al PR como GitHub user-attachments. No deben versionarse binarios nuevos fuera de un `write_set` aprobado.

## Contratos que debe conservar el siguiente rol

1. `$.model`, `$.inspector` y `$.benchmark` son índices autoritativos; `$.projects` continúa como proyección legacy.
2. El escenario serializado es la única fuente para mapa, benchmark y comparador.
3. `source_paired` exige pareja documentada; compartir página o dividir mínimos no basta.
4. `orientative_noncomparable` nunca entra al benchmark elegible ni sustenta recomendación de precio.
5. `Precio publicado desde`, `Área total`, `Unidades reportadas por la publicación` y `Atributos anunciados` conservan semánticas separadas.
6. `unknown`, `restricted`, `excluded` e insuficiente no significan ausencia.
7. Los umbrales cuantitativos son n≥3 / n=1–2 / n=0; los cualitativos n≥5 / n=1–4 / n=0.
8. CT-G conserva Pardo Coast territorial; Tipo 7 y sus ocho hechos no se rehabilitan.
9. CT-D no se extrapola al mercado y abre solo evidencia permitida.
10. El escenario Viva es simulado y debe permanecer diferenciado.
11. La conclusión deriva de filas identificables y no predice ventas, absorción, demanda ni cierre.
12. HU-DEMO-505 permanece diferida; reabrirla exige enmienda de privacidad y responsive.
13. El runtime 2.1/2.2 preserva F2/F3 y degrada solo F4 a `contract_unavailable`.
14. Un cambio funcional posterior a P4-13 exige una nueva verificación independiente.

## Enmiendas consolidadas

P4-14 registra en [DECISIONS.md](../../DECISIONS.md) las siguientes autorizaciones explícitas:

1. P4-04: tres regresiones legacy al contrato 2.3 y 50 fingerprints.
2. P4-04: dos integraciones F1 adaptadas a catálogos públicos extensibles, sin cambiar sus registros originales.
3. P4-11: migración de `tests/projects-compare.mjs` e integración de E2E F4 en `package.json`, sin modificar runtime, datos ni estilos.
4. P4-13A: corrección narrativa exacta y repetición completa del checker.

Estas enmiendas no amplían el alcance comercial aprobado ni crean precedente para modificar un `write_set` sin autorización previa.

## Notas y deuda deliberada

| Nota | Severidad | Tratamiento |
|---|---|---|
| Nexo `pending_review` | Legal/operativa | Solo snapshot fijo de demo; revisión jurídica antes de producción o distribución adicional. |
| Graphify parcial para CSS/JSON | Baja/conocida | Complementar siempre con tests, hashes y navegador. |
| Journey cronometrado automatizado | Operativa/baja | Ensayo humano breve antes de una presentación real. |
| Dependencias de desarrollo en un clon nuevo | Operativa/baja | Ejecutar `npm.cmd ci` en `prototipo_ejecutable` antes del gate. |
| Capturas locales no portables | Gate de PR | Adjuntar capturas representativas como GitHub user-attachments antes de solicitar merge. |
| Exportación HU-505 | Diferida | No reabrir sin enmienda de privacidad y responsive. |

## Pull request funcional

Base: `main`.

Compare: `feat/phase-4-benchmark-comparator`.

PR: [#13 — feat: add explainable benchmark and project comparison](https://github.com/stefano-mt/viva-inteligencia-demo/pull/13).

Estado observado al abrirlo: `OPEN / DRAFT / MERGEABLE / CLEAN`.

HEAD observado al abrirlo: `edc71ea87829896944d36ec1d8d5c1ec8efefa9f`. Los commits posteriores solo pueden actualizar los cinco documentos de P4-14. El revisor debe usar el HEAD que GitHub muestre en #13 como autoridad final.

El PR debe incluir:

- historias 501–504 y HU-505 diferida;
- contrato 2.3 y compatibilidad;
- 69 raw / 68 orientativos / 0 elegibles;
- benchmark cualitativo y nueve grupos del comparador;
- CT-A/B/C/D/G/I/P;
- permisos y pruebas negativas de contenido restringido;
- verificación 8 rutas × 3 viewports y 200%;
- evidencia visual adjunta y portable, no una ruta local;
- veredicto P4-13 `PASS`;
- notas no bloqueantes;
- condición de merge humano;
- pasos P4-15/P4-16 posteriores al merge.

El PR debe permanecer como borrador hasta adjuntar evidencia visual portable y completar la revisión humana.

## Instrucción al siguiente rol

### Revisor humano del PR

1. Confirmar que el último commit funcional es `be05fdc` y que los commits posteriores son solo el informe P4-13 y memoria P4-14.
2. Revisar `#market` y `#compare` en escritorio y móvil.
3. Confirmar que 69 raw, 68 orientativos y 0 elegibles se distinguen sin contradicción.
4. Verificar que CT-G permanece territorial, excluido del agregado y enlazado al inspector.
5. Verificar que las capturas están adjuntas y accesibles para un revisor remoto.
6. Confirmar que el PR no promete despliegue antes del merge.
7. Realizar el merge manual solo si GitHub muestra checks y base actualizados.

### P4-15 — después del merge

Verificar de forma read-only:

- PR y SHA del merge;
- workflow Pages en `success`;
- HTTP 200 y contrato 2.3;
- CT-C, CT-G y CT-I;
- benchmark y comparador;
- activos permitidos y ausencia de contenido restringido;
- escritorio, móvil, consola y red.

### P4-16 — después de P4-15

Crear una rama y PR documental separados para:

- `POSTMERGE_REPORT.md`;
- `.planning/STATE.md`.

No declarar Fase 4 `deployed and verified` hasta que ese resultado esté fusionado en `main`.
