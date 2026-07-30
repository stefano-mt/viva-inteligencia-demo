# P3-16 — Verificación post-merge de GitHub Pages

**Fecha de verificación:** 2026-07-30T16:44:37-05:00

**Veredicto:** `PASS`

**Estado técnico verificado:** `deployed and verified`

## Resumen ejecutivo

El PR funcional #11 fue fusionado por un humano y GitHub Pages desplegó el mismo SHA de merge. La URL pública, el contrato `2.2.0`, los quince activos autorizados y los recorridos CT-D/CT-G fueron verificados de forma read-only por un checker independiente.

El despliegue conserva las reglas de seguridad de evidencia: los activos autorizados responden correctamente, mientras que tarjeta y plano originales de CT-G permanecen ausentes de rutas, fragmentos y solicitudes del navegador. No se detectaron errores de consola, página, HTTP ni red externa.

## Evidencia de despliegue

| Evidencia | Resultado |
|---|---|
| PR funcional | [#11 — feat: add evidence inspector and certified eligibility](https://github.com/stefano-mt/viva-inteligencia-demo/pull/11), `MERGED` |
| Fecha del merge | `2026-07-30T21:38:19Z` |
| Head funcional del PR | `a9feb0590f1d45c45f65541878441c6cab821281` |
| SHA del merge y despliegue | `cc51769fbc4c0be270fc48295b8a604db0382378` |
| Workflow | [Deploy demo to GitHub Pages — run 30584187019](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/30584187019), `success` |
| Job | [deploy — 91011554167](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/30584187019/job/91011554167), `success` |
| Despliegue completado | `2026-07-30T21:38:45Z` |
| URL pública | [https://stefano-mt.github.io/viva-inteligencia-demo/](https://stefano-mt.github.io/viva-inteligencia-demo/), HTTP 200 |
| Última modificación observada | `2026-07-30T21:38:41Z` |
| Checker independiente | `/root/phase3_checker`, `PASS` |

El `headSha` del workflow coincide exactamente con el SHA del merge funcional.

## Integridad del artefacto público

| Artefacto | HTTP | Bytes | Resultado |
|---|---:|---:|---|
| Raíz de la demo | 200 | 421 | GitHub Pages operativo |
| `demo-data/viva-platform-demo.json` | 200 | 3,656,852 | Contrato `2.2.0` y hash coincidente |

Datos recompuestos desde el JSON público:

- dataset: `dataset:viva-platform-demo-2026-07-28`;
- SHA-256: `9cf407c091fbb03b7d489e39079de57fd84af3fe16dc82b8ed559a7eda84646c`;
- 10 expedientes y 10 tipologías inspectables;
- 1 caso observado, 9 controlados y 0 simulados;
- 15 activos visuales autorizados.

Los quince activos del manifest respondieron HTTP 200 y sus bytes coincidieron exactamente con los valores versionados.

## Criterios P3-16

| # | Criterio | Resultado | Evidencia |
|---:|---|---|---|
| 1 | PR fusionado y SHA trazable | PASS | PR #11 y merge `cc51769fbc4c0be270fc48295b8a604db0382378`. |
| 2 | Workflow Pages exitoso para el mismo SHA | PASS | Run `30584187019`, job `91011554167`, conclusión `success`. |
| 3 | URL pública y dataset HTTP 200 | PASS | Raíz pública y JSON `2.2.0` disponibles. |
| 4 | CT-D público | PASS | Caso certificado, elegible y fragmento de cuarzo autorizado. |
| 5 | CT-G público | PASS | Caso inconsistente, no elegible y sin selección automática de verdad. |
| 6 | Activos autorizados disponibles | PASS | 15/15 activos responden 200 con bytes exactos. |
| 7 | Activos restringidos y pendientes ausentes | PASS | Rutas y fragmentos CT-G nulos; ningún original solicitado. |
| 8 | Escritorio, móvil, consola y red | PASS | Viewports, reflow, accesibilidad y red sin errores. |

## CT-D público

Deep-link verificado:

[https://stefano-mt.github.io/viva-inteligencia-demo/#inspector/case/f3-ct-d-finishes](https://stefano-mt.github.io/viva-inteligencia-demo/#inspector/case/f3-ct-d-finishes)

Resultado:

- estado `certified` y tipología elegible;
- fragmento autorizado: `Cubierta de cocina: cuarzo.`;
- `air_conditioning` permanece `unknown`, nunca `false`;
- el documento restringido no publica activo ni fragmento.

## CT-G público

Deep-link verificado:

[https://stefano-mt.github.io/viva-inteligencia-demo/#inspector/case/f3-ct-g-pardo](https://stefano-mt.github.io/viva-inteligencia-demo/#inspector/case/f3-ct-g-pardo)

Observaciones y decisión:

| Fuente | Piso/unidad | Área | Tipo |
|---|---|---:|---|
| Tarjeta | `Piso 1` | 104.15 m² | `unknown` |
| Plano | `Dep. 807 AL 1007` | 53.37 m² | `total` |

- diferencia documentada: 50.78 m² y 48.76%, con base en la tarjeta;
- inferencia de pisos 8–10: derivada, de confianza baja;
- resultado `inconsistent`;
- 0 hechos elegibles y 8 excluidos;
- tipología no elegible para benchmark certificado;
- ninguna fuente seleccionada como verdad;
- tarjeta `pending` y plano `restricted`, con rutas y fragmentos públicos nulos;
- ningún original CT-G fue solicitado por el navegador.

## Navegador, responsive y accesibilidad

Sobre la URL pública pasaron:

- E2E del inspector para CT-D, CT-G y permisos;
- deep-link y recarga;
- escritorio 1440×900 y móvil 390×844;
- responsive, contraste, foco, diálogo y reflow equivalente al 200%;
- smoke de 8 rutas × 3 viewports;
- accesibilidad de 8 rutas × 3 viewports.

Resultado de observabilidad:

- 0 errores de consola;
- 0 errores de página;
- 0 respuestas HTTP 4xx/5xx;
- 0 fallos de red;
- 0 solicitudes externas no aprobadas.

## Cierre

- P3-16 fue read-only y no modificó el repositorio ni recursos externos.
- No existen gaps o riesgos nuevos derivados del despliegue.
- Fase 3 cumple el gate técnico `deployed and verified` para `cc51769fbc4c0be270fc48295b8a604db0382378`.
- Este resultado se vuelve memoria oficial de `main` únicamente cuando un humano fusione el PR documental de P3-17.
