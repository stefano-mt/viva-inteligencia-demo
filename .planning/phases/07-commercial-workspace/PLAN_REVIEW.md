# Fase 7 — Revisión estructural independiente del plan

**Paso:** P7-00B, segunda ejecución.

**Checker:** `/root/p7_00b_plan_checker`.

**Fecha:** 2026-08-21.

**HEAD revisado:** `9ecf1d79186c11a78fc7af2970d1b1d297d45eb8`.

**Veredicto:** `FAIL`.

P7-00C permanece bloqueado. El correctivo cerró DAG, rutas y catálogo de sinónimos, pero `CLAIMS-INVENTORY.md` aún contiene dos P2 que impiden materializar C01–C16 “sin reinterpretación” y podrían convertir una limitación de datos en un claim incorrecto.

## Alcance y método

Se releyeron completos los documentos modificados de Fase 7: `CONTEXT.md`, `UI-SPEC.md`, `PLAN.md` y `CLAIMS-INVENTORY.md`. Se contrastaron sus cambios con las fuentes de verdad ya leídas en la primera ejecución, con la compatibilidad aprobada de Fase 6 y con la semántica geográfica de Fase 2.

Inspecciones read-only ejecutadas:

```text
git status --short --branch
git show --stat --name-status 9ecf1d7
git diff-tree --no-commit-id --name-only -r 9ecf1d7
git diff --check 9ecf1d7^ 9ecf1d7
Test-Path sobre todos los write_set de P7-01–P7-09
rg dirigido sobre DAG, rutas, marcadores (nuevo), C01–C16 y autoridades F2/F6
```

No se ejecutaron tests de runtime: esta repetición revisa planificación y el commit no contiene implementación. No se leyó ni tocó el directorio no rastreado de evidencia de Fase 6.

## Estado de los hallazgos iniciales

| Hallazgo de la primera ejecución | Estado en `9ecf1d7` | Evidencia |
|---|---|---|
| Colisiones sin DAG/serialización | CERRADO | `PLAN.md` §5 declara secuencia estricta y autoriza paralelismo solo entre P7-06A/B/C y P7-07A/B/C. |
| Rutas de write set ambiguas | CERRADO | P7-01–P7-09 usan rutas repo-relative completas; los archivos inexistentes están marcados `(nuevo)`. La comprobación dirigida no encontró marcador falso ni archivo existente marcado como nuevo. |
| Falta de inventario de claims | PARCIAL | Existe `CLAIMS-INVENTORY.md`, P7-01 lo materializa y P7-02/P7-04–P7-10 declaran consumo; quedan inconsistencias de contenido/esquema detalladas abajo. |
| Sinónimos de `Ir a…` abiertos | CERRADO | `UI-SPEC.md` fija nueve destinos, términos admitidos y exclusión explícita de valores de datos; P7-03 materializa exactamente ese catálogo. |

## Resultado por área

| Área | Resultado |
|---|---|
| HU-DEMO-805–810 y A1–A14 | PASS condicionado al cierre del inventario |
| DAG y colisiones | PASS |
| Rutas repo-relative y marcadores `(nuevo)` | PASS |
| Contrato/datos/motores/workflow protegidos | PASS |
| Ocho deep-links, seis etapas y reset | PASS |
| Accesibilidad, responsive, rollback y pruebas | PASS condicionado a C01–C16 |
| Referencias visuales sin copiar identidad | PASS |
| Cero runtime en el correctivo | PASS |
| Inventario/materialización C01–C16 | FAIL |

## Hallazgos vigentes

### P2 — C02 contradice la semántica geográfica autoritativa

`CLAIMS-INVENTORY.md` C02 define “90 observados, 85 comparables, 5 fuera/por revisar”. La fuente de verdad de Fase 2 establece cinco proyectos **observados no reconciliados**, visibles y excluidos de comparabilidad; incluso documenta un observado dentro del alcance pero no reconciliado. No son cinco proyectos “fuera”.

La expresión actual mezcla exclusión territorial con reconciliación de identidad. Si P7-01 la materializa, una prueba podría obligar a publicar una explicación geográfica falsa.

**Condición de cierre:** sustituir “5 fuera/por revisar” por “5 observados no reconciliados/por revisar” y hacer que autoridad/assertion comprueben explícitamente que permanecen visibles como cobertura excluida de comparabilidad, sin llamarlos fuera del distrito o polígono.

### P2 — El contrato del fixture no puede representar varias entradas C01–C16 sin reinterpretación

El contrato exige un `route` singular y un `visibility` con exactamente `mandatory` o `reachable`, mientras que la matriz contiene:

- C04 con dos rutas escritas como `#dashboard/#projects`, sin sintaxis de patrón definida;
- C12 con dos niveles de visibilidad, `mandatory/reachable`, en una sola entrada;
- C14 sin hash/patrón de ruta y sin afirmar que 2.0 falla globalmente, no como capacidad interna por etapa;
- C15 para cuatro contratos y “CTA por ruta” sin matriz de rutas/capacidades;
- C16 para múltiples estados en “cada ruta” sin fixtures ni rutas enumerados.

Esto contradice P7-01, que promete materializar C01–C16 “sin reinterpretación”. También deja abierta una regresión ya cerrada en Fase 6: contrato 2.0 debe conservar el error global y no convertirse en `capability_unavailable` interno.

**Condición de cierre:** normalizar el contrato antes de P7-01. Puede hacerse definiendo arrays tipados de `routes`/`assertions`, o dividiendo entradas en casos estables —por ejemplo C04a/C04b y C12a/C12b—, pero cada caso debe fijar ruta o patrón válido, versión/fixture, autoridad, assertion y una sola visibilidad. C14 debe exigir `global load error` para 2.0; C15 debe enumerar la capacidad esperada por versión/ruta; C16 debe enumerar los estados/fixtures mínimos que realmente se ejecutarán.

## Confirmaciones adicionales

- El DAG elimina las colisiones de `package.json`, `public/app.js`, `public/styles.css` y `tests/browser-a11y.mjs`.
- Las seis subtareas paralelas P7-06A/B/C y P7-07A/B/C tienen write sets disjuntos.
- Todos los paths P7-01–P7-09 existen o están correctamente marcados `(nuevo)`; P7-08 consume, pero no recrea, `commercial-claims.mjs`.
- `9ecf1d7` modifica solo siete archivos bajo `.planning/`; no toca runtime, tests, datos, estilos, assets ni workflow.
- No aparecieron contradicciones nuevas en A1–A14, rutas, accesibilidad, rollback o identidad visual. Las únicas contradicciones nuevas están acotadas al inventario descrito.

## Historial de P7-00B

- Primera ejecución sobre `3907f27`: `FAIL` por tres P2 y un P3.
- Acta inicial persistida en `cb0af8e` (`docs: record phase 7 plan review findings`).
- Correctivo documental `9ecf1d7`: cerró DAG, rutas y sinónimos; la segunda ejecución permanece en `FAIL` por dos P2 del contrato C01–C16.

## Condiciones para una tercera ejecución

1. Corregir C02 y normalizar C04/C12/C14/C15/C16.
2. Mantener P7-01 como único writer del fixture y P7-02/P7-04–P7-10 como consumidores/auditores según el plan.
3. Mantener cero runtime hasta HUMAN-GATE-A.
4. Entregar el nuevo SHA documental y repetir coherencia, materialización, cobertura C01–C16 y diff de runtime.

Hasta obtener `PASS`, no corresponde solicitar A1–A14 ni iniciar P7-00D/P7-01.
