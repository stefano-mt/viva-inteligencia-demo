# Estrategia de verificación y Definition of Done

## Gate automatizado actual

La Fase 0B incorporó un gate reproducible:

```powershell
cd prototipo_ejecutable
npm.cmd run verify
```

`verify` ejecuta sintaxis, grafo de módulos, contrato de datos, smoke browser y accesibilidad. La evidencia visual antes/después se captura configurando `EVIDENCE_DIR`.

## Gate por tarea

Una tarea está lista para verificación cuando:

- el diff solo toca su `write_set`;
- el implementador completó el handoff;
- la verificación dirigida pasó;
- no hay cambios ajenos mezclados;
- criterios y fixtures están identificados.

## Gate técnico

Desde `prototipo_ejecutable/`:

```powershell
npm.cmd run check
npm.cmd run dev
```

Comprobar:

- `GET /` responde 200.
- El JSON carga sin error.
- No hay errores de consola ni recursos 404.
- Cada hash/ruta acordada renderiza contenido.
- Reiniciar conserva el baseline esperado.

Scripts disponibles:

```powershell
npm.cmd run test:data
npm.cmd run test:architecture
npm.cmd run test:smoke
npm.cmd run test:a11y
```

## Gate visual

Capturar como mínimo:

| Viewport | Uso |
|---|---|
| 1440×900 | presentación y escritorio |
| 1280×720 | laptop/proyector |
| 390×844 | móvil |

Para cada vista modificada:

- captura antes y después;
- contenido crítico visible sin solaparse;
- textos y cifras no truncados;
- jerarquía del CTA primario;
- tooltips complementarios, nunca única forma de acceso;
- ejes, leyendas y valores legibles en gráficos;
- progresión vertical y densidad controlada.

## Gate de accesibilidad

- Tab recorre controles en orden lógico.
- Focus visible.
- Escape cierra overlays/modales cuando aplica.
- Enter/Espacio activan controles personalizados.
- Campos y botones tienen nombre accesible.
- Estado no depende solo del color.
- Texto normal y CTA cumplen contraste razonable; cualquier excepción se documenta y corrige.
- Zoom de navegador al 200% no destruye el flujo principal.

## Gate de datos

- IDs únicos y referencias válidas.
- 30 inmobiliarias canónicas como mínimo.
- Fecha/fuente/confianza presentes donde corresponda.
- Valores originales se conservan.
- Agregados excluyen registros no certificados.
- Cálculos toleran faltantes sin producir `NaN`, infinito o texto engañoso.
- El generador produce el mismo resultado lógico desde los mismos inputs.

## Casos de aceptación prioritarios

Ejecutar los casos CT-A a CT-I de `.planning/REQUIREMENTS.md`. CT-C, CT-G, CT-H y CT-I bloquean la presentación de la demo vNext.

## Gate técnico de narrativa y exención de aceptación humana

En P6-15, un verificador técnico que no implementó debe recorrer y contrastar automáticamente:

1. escala de 30 inmobiliarias;
2. precisión por microzona;
3. mapa y comparables;
4. discrepancia tarjeta/plano;
5. benchmark certificado;
6. comparador cualitativo;
7. histórico;
8. asistente con evidencia.

El checker confirmó que el paquete de ensayo conservaba estado `PENDING/DEFERRED` y que ningún artefacto simulaba aprobación humana. P6-15 emitió `PASS WITH RISKS` por `R6-H1`.

P6-20 no fue ejecutado. D-044 registra `WAIVED / NOT RUN` y acepta `R6-H1` como riesgo residual de producto. Este cierre habilita la versión final técnica, no una afirmación de aceptación humana. Una evaluación futura se tratará como UAT nueva y conservará el protocolo archivado.

## Definition of Done por historia

Una historia está terminada cuando:

1. Cumple todos sus criterios de aceptación.
2. Pasa checks dirigidos y gate de fase.
3. No rompe navegación ni filtros.
4. No presenta errores de consola.
5. Funciona en viewports soportados.
6. Contempla vacío, error, carga e insuficiencia cuando aplica.
7. Es operable por teclado en controles principales.
8. No depende solo del color.
9. Los cálculos tienen fixtures conocidos.
10. Muestra fuente/fecha/confianza cuando corresponde.
11. Tiene evidencia registrada por un verificador independiente.
12. Actualiza estado, decisiones y documentación afectada.
13. El PR se puede revisar por historia y tarea.

## Formato del veredicto

```text
Veredicto: PASS | PASS WITH RISKS | FAIL
Historias:
Commit/diff:
Checks:
Evidencia visual:
Casos de datos:
Accesibilidad:
Regresiones:
Riesgos residuales:
Gaps y severidad:
```
