# P6-18 — Verificación post-merge de GitHub Pages

**Fecha de verificación:** 2026-08-11

**Veredicto técnico:** `PASS`

**Estado máximo habilitado por P6-19:** `deployed and technically verified; human acceptance pending`

**Riesgo residual:** `R6-H1 — validación humana diferida`

## Resumen ejecutivo

El PR funcional [#17 — feat: add commercial decision journey and phase 6 QA](https://github.com/stefano-mt/viva-inteligencia-demo/pull/17) fue fusionado por un humano. GitHub Pages desplegó exactamente el SHA de merge `12cefbf82a4971d75e1578d962f510b06fc0b457` mediante el [workflow #18](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/31535245095), que terminó en `success`.

La [URL pública de la demo](https://stefano-mt.github.io/viva-inteligencia-demo/) cargó el recorrido ejecutivo en `#journey/scale`. P6-18 verificó de forma read-only las seis etapas del recorrido y las ocho rutas expertas en tres viewports, además de los handoffs críticos, el reinicio canónico, la respuesta real del asistente, la consola y los recursos observados.

No se detectaron errores o warnings de consola, desbordamiento horizontal, rutas sin contenido, recursos externos ni divergencias visibles entre los hitos del recorrido y sus módulos expertos. P6-18 no modificó el repositorio ni el artefacto desplegado.

Este `PASS` es técnico. D-042 mantiene P6-14 como `PENDING/DEFERRED` y reserva la aceptación humana integral a P6-20. Hasta que P6-20 termine con `PASS`, quedan bloqueadas las declaraciones `ready for client` y `deployed and verified`.

## Alcance documental de P6-19

P6-19 se limita a:

- `.planning/phases/06-commercial-narrative-qa/POSTMERGE_REPORT.md`;
- `.planning/phases/06-commercial-narrative-qa/evidence/postmerge/*`;
- `.planning/STATE.md`;
- `.planning/ROADMAP.md`.

No modifica runtime, contrato, dataset, writer, tests, estilos, activos o configuración de despliegue. Su función es hacer durable el resultado read-only de P6-18 y preparar el handoff a P6-20.

## Trazabilidad del despliegue

| Evidencia | Resultado |
|---|---|
| PR documental P6-19 | [#18 — docs: record phase 6 postmerge technical verification](https://github.com/stefano-mt/viva-inteligencia-demo/pull/18), abierto y pendiente de merge humano |
| PR funcional | [#17](https://github.com/stefano-mt/viva-inteligencia-demo/pull/17), `MERGED` |
| Head final del PR #17 | `cb52acce482b1b6d58fbc386e6898198c69adf0f` |
| Último commit funcional verificado | `a94f25159fb20770599b97c8fdfa37a2dabe551b` |
| Cierre técnico independiente | `8ca5aab1e9333a2e326e538dcfed8d3cdfeb3fa2` |
| SHA del merge desplegado | `12cefbf82a4971d75e1578d962f510b06fc0b457` |
| Fecha observada del merge | `2026-08-11 15:53 -05:00` |
| Workflow Pages | [run 31535245095](https://github.com/stefano-mt/viva-inteligencia-demo/actions/runs/31535245095), `success` |
| Duración observada del workflow | `20 s` |
| URL pública | [https://stefano-mt.github.io/viva-inteligencia-demo/](https://stefano-mt.github.io/viva-inteligencia-demo/), operativa |
| Ruta inicial | `#journey/scale` |

El workflow exitoso corresponde al mismo SHA completo del merge. La comprobación pública no utilizó una rama intermedia ni una reconstrucción local como sustituto de Pages.

## Matriz pública de superficies

Se recorrieron 14 superficies en `1440×900`, `1280×720` y `390×844`: 42 comprobaciones públicas.

| Grupo | Superficie | Ruta | Resultado en 3 viewports |
|---|---|---|---|
| Recorrido | Escala | `#journey/scale` | PASS |
| Recorrido | Geografía | `#journey/geography` | PASS |
| Recorrido | Calidad | `#journey/quality` | PASS |
| Recorrido | Profundidad | `#journey/depth` | PASS |
| Recorrido | Movimiento | `#journey/movement` | PASS |
| Recorrido | Decisión | `#journey/decision` | PASS |
| Experto | Radar comercial | `#dashboard` | PASS |
| Experto | Proyectos comparables | `#projects` | PASS |
| Experto | Inspector de evidencia | `#inspector` | PASS |
| Experto | Benchmark de microzona | `#market` | PASS |
| Experto | Comparador comercial | `#compare` | PASS |
| Experto | Checklist comercial | `#trust` | PASS |
| Experto | Asistente de estrategia | `#assistant` | PASS |
| Experto | Señales del mercado | `#activity` | PASS |

En las 42 comprobaciones, el hash y el `h1` correspondieron a la superficie esperada y no apareció overflow horizontal. El reflow equivalente a 200 % se comprobó en `720×450`: título y acción primaria permanecieron visibles y sin desbordamiento.

## Recorrido crítico post-merge

### Escala

- 184 inmobiliarias modeladas visibles;
- piloto anidado 30 / 22 / 5 visible y explicado;
- Miraflores muestra 90 observados y 85 comparables;
- cobertura general, piloto y escenario permanecen diferenciados.

### Geografía → Radar comercial

- `#journey/geography` presenta el escenario y sus conteos;
- el handoff abre `#dashboard`;
- Radar comercial conserva Miraflores, la lectura territorial y el mapa;
- no se observó overflow.

### Calidad → Inspector de evidencia

- el caso Tipo 7 muestra tarjeta `104.15 m²`, plano `53.37 m²` y diferencia derivada `50.78 m²`;
- la etapa declara la exclusión del benchmark;
- el handoff abre `#inspector/case/f3-ct-g-pardo`;
- el Inspector conserva las tres cifras y la decisión de elegibilidad.

### Profundidad → Comparador

- `#journey/depth` presenta un estado honesto de información insuficiente cuando no existe selección;
- el estado ofrece una acción correctiva;
- `#compare` conserva un vacío explicable y una llamada a seleccionar proyectos;
- no se fabrican conclusiones sin comparables.

### Movimiento → Señales del mercado

- `#journey/movement` separa cambio publicado de causalidad no observada;
- el handoff abre `#activity`;
- la vista experta conserva señales, fuente y límite interpretativo.

### Decisión → Asistente y Checklist

- una pregunta compatible generó una respuesta real y reproducible;
- la respuesta contiene los seis bloques: respuesta, datos usados, interpretación, límites, referencias y siguiente paso;
- las referencias permanecen bajo divulgación progresiva;
- el handoff abre `#trust`, que conserva el checklist y la jerarquía de decisión;
- `#journey/decision` enlaza de vuelta al Asistente y al Checklist y mantiene el límite de lo que no puede afirmarse.

### Reinicio

- `Reiniciar escenario` conduce a `#journey/scale`;
- el foco termina en `#journey-title`;
- la escala vuelve a mostrar 184 y 30 / 22 / 5;
- el Comparador vuelve al estado vacío esperado.

## Consola, recursos y privacidad

| Comprobación | Resultado |
|---|---|
| Consola en escritorio | 0 errores, 0 warnings |
| Consola en móvil | 0 errores, 0 warnings |
| Consola en 1280×720 | 0 errores, 0 warnings |
| Recursos observados | 49 |
| Scripts | 27 |
| Hojas de estilo | 19 |
| Datos públicos | 2 |
| Imágenes | 1 |
| Hosts externos | 0 |

Los 49 recursos observados pertenecen a `stefano-mt.github.io/viva-inteligencia-demo`: CSS, módulos JavaScript, el JSON público, el GeoJSON y el logo. No se observó tráfico a fuentes externas durante la verificación.

La respuesta del asistente se generó desde el catálogo determinista de la demo. La consulta no se incorporó a la URL ni se utilizó como evidencia persistida por P6-18.

## Criterios de salida de P6-18

| # | Criterio | Resultado |
|---:|---|---|
| 1 | PR funcional fusionado y SHA completo trazable | PASS |
| 2 | Workflow Pages exitoso para el mismo SHA | PASS |
| 3 | URL pública operativa y contrato 2.4 consumido por la demo | PASS |
| 4 | Seis etapas y ocho rutas públicas | PASS |
| 5 | Recorrido crítico escala → mapa → Tipo 7 → Comparador → Señal → Decisión | PASS |
| 6 | 1440×900, 1280×720 y 390×844 sin overflow | PASS |
| 7 | Reflow equivalente a 200 % | PASS |
| 8 | Reinicio canónico y foco | PASS |
| 9 | Consola limpia | PASS |
| 10 | Cero hosts externos observados | PASS |

## Riesgo residual y claims bloqueados

`R6-H1` sigue siendo el único riesgo residual. P6-18 y P6-19 no ejecutan ni simulan aceptación humana.

Hasta el `PASS` de P6-20:

- no declarar `ready for client`;
- no declarar `deployed and verified`;
- no presentar el ensayo diferido como completado;
- no sustituir al lector nuevo con el maker, automatización o evidencia histórica;
- usar como máximo `deployed and technically verified; human acceptance pending`.

## Cierre y siguiente paso

P6-18 concluye `PASS`. P6-19 persiste ese resultado mediante el [PR documental #18](https://github.com/stefano-mt/viva-inteligencia-demo/pull/18). Tras su merge humano, el estado técnico de la Fase 6 queda registrado como `deployed and technically verified; human acceptance pending`.

El siguiente y último paso de la fase es P6-20: un lector nuevo debe ejecutar el protocolo público, lograr 5/5 respuestas correctas, 0 claims prohibidos y una duración máxima de 10 minutos, sin ayuda del maker. Solo su `PASS` habilita `ready for client` y `deployed and verified`.
