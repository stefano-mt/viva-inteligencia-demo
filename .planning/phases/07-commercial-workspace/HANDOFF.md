# Handoff — P7-11

## Estado

`P7-11 completo al versionar este documento — Fase 7 verificada con PASS; PR, revisión y merge humano pendientes`

## Identidad de la entrega

- Base histórica de la fase: `main` en `6251442f989df26d5589cadbafa5f13ccaf19e8c`. La base efectiva del PR será la punta vigente de `main` que GitHub muestre al revisarlo.
- Rama: `feat/phase-7-commercial-workspace`.
- Candidato funcional corregido: `23d350532584ead2cbad3ccb15e3ad88aecb08ce`.
- Cierre independiente: `ce52b20c47b898c7f351715d059e1c43c7e8d31a`.
- Veredicto: `PASS`.
- HUMAN-GATE-B: no requerido.
- Snapshot remoto al redactar, antes del propio commit P7-11: la rama estaba publicada hasta `ce52b20`. El estado vigente siempre se deriva con los comandos siguientes.
- PR: cuerpo preparado en este documento, pero PR todavía no abierto.

El SHA del commit documental P7-11 no puede escribirse dentro del propio commit sin alterar su hash. Después de publicarlo, el revisor obtiene el valor autoritativo sin depender de una comunicación externa:

```powershell
git fetch origin
git rev-parse origin/feat/phase-7-commercial-workspace
git show --stat --oneline origin/feat/phase-7-commercial-workspace
```

El segundo comando muestra el HEAD del PR y el tercero confirma que el último commit modifica únicamente `SUMMARY.md`, `HANDOFF.md` y `STATE.md`. La UI de GitHub debe mostrar el mismo commit como punta de `compare`.

La identidad documental se valida además así:

```powershell
git rev-list --count ce52b20..origin/feat/phase-7-commercial-workspace
git rev-parse origin/feat/phase-7-commercial-workspace^
git diff --name-only ce52b20..origin/feat/phase-7-commercial-workspace
```

Resultados esperados: exactamente `1` commit posterior, padre `ce52b20c47b898c7f351715d059e1c43c7e8d31a` y solo estos tres paths:

```text
.planning/STATE.md
.planning/phases/07-commercial-workspace/HANDOFF.md
.planning/phases/07-commercial-workspace/SUMMARY.md
```

## Alcance de P7-11

P7-11 modifica únicamente:

- [SUMMARY.md](SUMMARY.md);
- [HANDOFF.md](HANDOFF.md);
- [STATE.md](../../STATE.md).

No modifica runtime, datos, tests, estilos, capturas, contrato, writer, fingerprints, motores, elegibilidad, navegación o workflow. Los archivos ajenos de evidencia de Fase 6 permanecen fuera de staging y no forman parte de esta entrega.

Si después de `23d3505` aparece un cambio no documental fuera del cierre independiente `ce52b20`, se debe repetir P7-10 antes del merge.

## Qué revisar

La Fase 7 entrega un workspace comercial simplificado:

1. cinco destinos primarios y cuatro accesos bajo `Profundizar`;
2. escenario compacto con editor bajo demanda;
3. `Ir a…` local con nueve destinos y teclado;
4. lectura y trabajo principal antes del detalle;
5. Proyectos y Seguimiento por filas;
6. Inspector, Benchmark, Comparador y Checklist por ledgers;
7. ayuda, metodología y referencias extensas bajo disclosures;
8. una acción primaria y un solo `h1` visible por superficie.

Permanecen intactos el recorrido de seis etapas, las ocho rutas expertas, C01–C23, CT-A–I/P, reset, deep-links, contratos 2.0–2.4 y todos los claims de Fases 1–6.

Rutas que debe usar el revisor:

- Recorrido: `#journey/scale`, `#journey/geography`, `#journey/quality`, `#journey/depth`, `#journey/movement` y `#journey/decision`.
- Expertas: `#dashboard`, `#projects`, `#inspector/case/f3-ct-g-pardo`, `#market`, `#compare`, `#trust`, `#assistant` y `#activity`.

C01–C23 es el inventario ejecutable de claims, calificadores, visibilidad y acciones correctivas de las 14 superficies. CT-A–I/P son los casos prioritarios de aceptación de datos y narrativa definidos en `.planning/REQUIREMENTS.md`. El revisor no necesita reinterpretarlos: confirma su `PASS` en el informe y usa las rutas anteriores para la revisión visual.

## Gate ejecutado

| Comando o recorrido | Resultado |
|---|---|
| `npm.cmd run verify` | PASS sobre `23d3505` después del correctivo |
| C01–C23 | PASS, fixture estable después de P7-01 |
| CT-A–I/P y contratos 2.0–2.4 | PASS |
| Smoke | PASS, ocho rutas × tres viewports |
| Responsive y a11y | PASS, 14 superficies × tres viewports + zoom 200 % |
| Browser adversarial P7-10A | PASS independiente sobre `23d3505`, G1/G2 cerrados a `scrollY=0` |
| Consola y red | 0 problemas; 0 requests cross-origin o a servicios externos |
| Graphify | PASS sobre `6a6a60c`, 4,020 nodos / 8,105 aristas; correctivo posterior auditado por diff |
| `git show --check 23d3505` | PASS |
| Protegidos | Sin cambios en datos, contratos, writer, motores o workflows |

Todos los checks incluidos por `npm.cmd run verify` —C01–C23, CT-A–I/P, smoke, responsive y accesibilidad— se repitieron sobre `23d3505`. `ce52b20` añade únicamente el informe/evidencia del checker; P7-11 añade únicamente los tres documentos declarados.

Auditoría reproducible de protegidos desde la base histórica:

```powershell
git diff --name-only 6251442..origin/feat/phase-7-commercial-workspace -- `
  prototipo_ejecutable/contracts `
  prototipo_ejecutable/scripts/build-demo-data.js `
  prototipo_ejecutable/scripts/data `
  prototipo_ejecutable/public/demo-data `
  datos_relevantes `
  "prototipo_ejecutable/public/js/*-engine.js" `
  .github/workflows
```

Resultado esperado: salida vacía.

## Evidencia prioritaria

- [Resumen de fase](SUMMARY.md).
- [Informe independiente](VERIFICATION_REPORT.md).
- [Matriz responsive](evidence/responsive/).
- [Repetición P7-10A](evidence/verification/p7-10a-browser-verification.json).
- [Benchmark 1280×720](evidence/verification/p7-10a-market-1280x720.png).
- [Comparador 1280×720](evidence/verification/p7-10a-compare-1280x720.png).
- [Seguimiento 1280×720](evidence/verification/p7-10a-activity-1280x720.png).
- [Inspector 1280×720](evidence/verification/p7-10a-inspector-1280x720.png).

## Contratos que debe conservar el siguiente rol

1. El contrato público sigue en 2.4 y el reader en 2.0–2.4.
2. Dataset, writer, fingerprints, motores, elegibilidad y workflow permanecen sin cambios.
3. `/` continúa en `#journey/scale`; reset, aliases, recarga y atrás/adelante son canónicos.
4. Las seis etapas y ocho rutas expertas permanecen disponibles.
5. Escala distingue 184 de los subconjuntos acumulativos 30/22/5.
6. Tipo 7 conserva 104.15/53.37/50.78 m², pertenece a Miraflores y no contamina el escenario activo.
7. Benchmark conserva 85 comparables, 68 referencias orientativas y 0 parejas elegibles; no promete precio real de cierre.
8. Comparador no fabrica conclusión sin selección suficiente.
9. Histórico no atribuye causas, ventas o cierre no observados.
10. Asistente no ejecuta consultas implícitas y no persiste texto.
11. C01–C23 es una copia ejecutable de autoridades, no una nueva fuente de verdad.
12. `Ir a…` solo navega; no busca datos, no persiste y no realiza red.
13. Una acción primaria, un `h1` y límites interpretativos visibles gobiernan cada primera pantalla.
14. A13 excluye UAT humana de Fase 7; el merge y despliegue siguen bajo control del usuario.

## Cómo abrir el pull request

1. Crear y publicar el commit documental P7-11; derivar su SHA con los comandos anteriores.
2. Abrir [la comparación `main...feat/phase-7-commercial-workspace`](https://github.com/stefano-mt/viva-inteligencia-demo/compare/main...feat/phase-7-commercial-workspace?expand=1).
3. Confirmar `base: main` y `compare: feat/phase-7-commercial-workspace`.
4. Copiar el título y cuerpo siguientes.
5. Crear el PR; no fusionarlo todavía.

## Cómo revisar la rama localmente

Desde cualquier PowerShell:

```powershell
git -C "C:\Users\Stefano\Documents\Codex\2026-07-27\e\work\viva-inteligencia-demo" fetch origin
git -C "C:\Users\Stefano\Documents\Codex\2026-07-27\e\work\viva-inteligencia-demo" switch feat/phase-7-commercial-workspace
git -C "C:\Users\Stefano\Documents\Codex\2026-07-27\e\work\viva-inteligencia-demo" pull --ff-only origin feat/phase-7-commercial-workspace
cd "C:\Users\Stefano\Documents\Codex\2026-07-27\e\work\viva-inteligencia-demo\prototipo_ejecutable"
npm.cmd ci
npm.cmd run dev
```

Abrir `http://localhost:4173/#journey/scale`. La terminal del servidor debe permanecer abierta durante la revisión. Si el puerto 4173 está ocupado, definir otro antes de iniciar, por ejemplo `$env:PORT=4174`, y abrir la URL equivalente.

### Política ante drift de `main`

Antes del merge:

```powershell
git fetch origin
git rev-parse origin/main
```

Si `origin/main` sigue en `6251442f989df26d5589cadbafa5f13ccaf19e8c`, el candidato verificado conserva su base. Si difiere, P7-12 se detiene: no basta con que GitHub diga “sin conflictos”. Se debe integrar la nueva `main` en la rama mediante un commit explícito, ejecutar nuevamente `npm.cmd run verify` y repetir el checker P7-10 sobre el resultado antes de autorizar el merge.

**Título sugerido:**

```text
feat: simplify the Viva commercial workspace
```

**Cuerpo listo para copiar:**

```markdown
## Resultado

Simplifica la demo como un workspace comercial de lectura rápida. Reduce cards, columnas, repetición y configuración visible; conserva el recorrido de seis etapas, las ocho rutas expertas, el escenario, los datos y la trazabilidad existentes.

## Historias cubiertas

- HU-DEMO-805: shell comercial y navegación simplificada.
- HU-DEMO-806: escenario compacto, editor bajo demanda y rutas canónicas.
- HU-DEMO-807: lectura y trabajo en la primera pantalla.
- HU-DEMO-808: filas y ledgers operativos.
- HU-DEMO-809: detalle, ayuda y metodología bajo demanda.
- HU-DEMO-810: navegación local `Ir a…` con teclado y sin persistencia.

## Cambios principales

- Cinco destinos primarios y cuatro accesos bajo `Profundizar`.
- Escenario resumido en el shell; editor completo cerrado por defecto.
- Paleta local `Ctrl+K`/`Cmd+K` con nueve destinos.
- Recorrido y Panorama priorizan pregunta, lectura, límite y mapa.
- Proyectos y Seguimiento se presentan por filas.
- Inspector, Benchmark, Comparador y Checklist usan ledgers.
- Asistente abre con la consulta y conserva sus seis bloques verificables.
- Una acción primaria y un solo `h1` visible por superficie.

## Contratos preservados

- Contrato público 2.4 y reader compatible con 2.0–2.4.
- Dataset, writer, fingerprints, motores, elegibilidad y workflow sin cambios.
- C01–C23, CT-A–I/P, seis etapas, ocho rutas expertas, deep-links y reset preservados.
- Cero backend, dependencias nuevas, telemetría, almacenamiento o red externa.
- Tipo 7 conserva 104.15/53.37/50.78 m² y su exclusión explicable.
- Benchmark conserva 85 comparables, 68 orientativos y 0 parejas elegibles.

## Verificación

- Candidato funcional: `23d350532584ead2cbad3ccb15e3ad88aecb08ce`.
- Cierre independiente: `ce52b20c47b898c7f351715d059e1c43c7e8d31a`.
- Veredicto: `PASS`; HUMAN-GATE-B no requerido.
- `npm.cmd run verify`: PASS.
- C01–C23, CT-A–I/P y compatibilidad 2.0–2.4: PASS.
- Smoke: ocho rutas × tres viewports.
- Responsive/a11y: 14 superficies × tres viewports + zoom 200 %.
- Browser adversarial P7-10A: un `h1`; lectura y borde superior del trabajo con `y < 720` en 1280×720 y sin scroll.
- Graphify: 4,020 nodos / 8,105 aristas.
- Consola/página y solicitudes externas: 0.

## Evidencia

- [Resumen](https://github.com/stefano-mt/viva-inteligencia-demo/blob/feat/phase-7-commercial-workspace/.planning/phases/07-commercial-workspace/SUMMARY.md)
- [Informe independiente](https://github.com/stefano-mt/viva-inteligencia-demo/blob/feat/phase-7-commercial-workspace/.planning/phases/07-commercial-workspace/VERIFICATION_REPORT.md)
- [Matriz responsive](https://github.com/stefano-mt/viva-inteligencia-demo/tree/feat/phase-7-commercial-workspace/.planning/phases/07-commercial-workspace/evidence/responsive)
- [Repetición P7-10A](https://github.com/stefano-mt/viva-inteligencia-demo/blob/feat/phase-7-commercial-workspace/.planning/phases/07-commercial-workspace/evidence/verification/p7-10a-browser-verification.json)
- [Capturas P7-10A](https://github.com/stefano-mt/viva-inteligencia-demo/tree/feat/phase-7-commercial-workspace/.planning/phases/07-commercial-workspace/evidence/verification)

## Riesgos y límites

- No existen gaps técnicos P0–P3 abiertos.
- La Fase 7 no incluye UAT humana por A13.
- P7-12 es revisión de código, evidencia y aceptación de merge por el propietario; no es un estudio con usuario nuevo ni sustituye una UAT.
- Este PR aún no equivale a despliegue público; P7-13 verificará Pages después del merge.

## Revisión y ship

- [ ] Confirmar base `main` y compare `feat/phase-7-commercial-workspace`.
- [ ] Revisar Recorrido, Panorama, Proyectos, Decidir y Seguimiento.
- [ ] Abrir Inspector, Benchmark, Comparador y Checklist desde `Profundizar`.
- [ ] Probar `Ctrl+K`, editor del escenario, reset y un deep-link experto.
- [ ] Confirmar Tipo 7 y las lecturas de Benchmark/Comparador/Seguimiento.
- [ ] Revisar evidencia desktop, laptop, móvil y zoom 200 %.
- [ ] Confirmar que GitHub muestra el PR sin conflictos.
- [ ] Hacer merge manual únicamente después de completar la revisión.

Después del merge: P7-13 verifica Pages de forma read-only y P7-14 persiste el resultado en una rama y PR documental separados.
```

## Instrucción al siguiente rol

### P7-12 — Revisor humano

1. Confirmar base, compare, ausencia de drift de `main` y derivar el HEAD remoto del commit documental P7-11 con los comandos anteriores.
2. Verificar que `23d3505` es el último commit funcional y que `ce52b20` más P7-11 son cierre/verificación/documentación.
3. Recorrer las cinco entradas primarias y las cuatro de `Profundizar`.
4. Probar `Ctrl+K`, flechas, Enter, Escape y retorno de foco.
5. Abrir/cerrar el editor del escenario y confirmar que no cambia el contexto hasta aplicar.
6. Probar reset a `/#journey/scale` y un deep-link experto.
7. Revisar Tipo 7, Benchmark, Comparador y Seguimiento en 1280×720.
8. Revisar `VERIFICATION_REPORT.md` y las capturas finales.
9. Confirmar que GitHub muestra el PR sin conflictos.
10. Realizar el merge manual solo después de completar la revisión. Esta revisión autoriza integración; no se registra como UAT humana de producto.

### P7-13 — Después del merge

Verificar de forma read-only:

- SHA completo del merge;
- [workflow Pages](https://github.com/stefano-mt/viva-inteligencia-demo/actions/workflows/deploy-pages.yml) en `success`: abrir el run disparado por el merge y confirmar que su commit/head SHA coincide con el SHA fusionado;
- HTTP 200 y contrato 2.4 en [la URL pública](https://stefano-mt.github.io/viva-inteligencia-demo/);
- seis etapas y ocho rutas expertas;
- cinco destinos primarios, cuatro de profundización y `Ir a…`;
- escenario, reset, desktop, laptop, móvil y zoom 200 %;
- consola limpia y cero requests cross-origin o a servicios externos; las cargas same-origin de HTML/CSS/JS/JSON son permitidas.

Procedimiento mínimo:

```powershell
git fetch origin
$phase7MergeSha = git rev-parse origin/main
(Invoke-WebRequest -Uri "https://stefano-mt.github.io/viva-inteligencia-demo/" -UseBasicParsing).StatusCode
$phase7Payload = Invoke-RestMethod -Uri "https://stefano-mt.github.io/viva-inteligencia-demo/demo-data/viva-platform-demo.json"
$phase7Payload.metadata.contract_version
```

Resultados esperados: HTTP `200` y contrato `2.4.0`. En el run de Actions disparado por el merge, el commit mostrado debe coincidir con `$phase7MergeSha`, independientemente de si GitHub creó merge commit, squash o rebase. Para red, abrir DevTools → Network, recargar cada ruta crítica y confirmar que todos los requests pertenecen a `stefano-mt.github.io`; consola y Network no deben mostrar fallos.

### P7-14 — Persistencia post-merge

Crear `docs/phase-7-postmerge-report` desde el `main` verificado y modificar solo:

- `.planning/phases/07-commercial-workspace/POSTMERGE_REPORT.md`;
- `.planning/phases/07-commercial-workspace/evidence/postmerge/*`;
- `.planning/STATE.md`;
- `.planning/ROADMAP.md`.

El informe debe registrar PR, SHA merge, run/workflow, URL, HTTP, contrato, rutas, viewports, consola, red y veredicto P7-13. Publicar esa rama y abrir un PR documental separado contra `main`. Solo después de fusionarlo se declara Fase 7 `deployed and verified`.
