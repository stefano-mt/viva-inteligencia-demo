# Fase 3 — Revisión independiente del plan

## Estado

**PASS** — planificación apta para solicitar HUMAN-GATE-A. No autoriza implementación.

## Alcance revisado

- `CONTEXT.md`;
- `UI-SPEC.md`;
- `CASE-INVENTORY.md`;
- `PLAN.md`;
- `HUMAN-GATE-A-REQUEST.md`;
- fuentes vigentes de proyecto, requisitos, estado, roadmap y verificación;
- fixtures CT-D/CT-G;
- schema 2.1 y fronteras técnicas actuales.

## Revisores

| Revisor | Perspectiva | Separación |
|---|---|---|
| `/root/phase2_plan_reader` | lector nuevo y delegabilidad | solo lectura; no redactó documentos |
| `/root/phase2_final_checker` | contrato, datos, permisos, arquitectura y regresión | solo lectura; no redactó documentos |
| `/root/phase2_revalidator` | recorrido comercial, UX y testeabilidad | solo lectura; no redactó documentos |

## Primera ronda

### Lector de delegación — FAIL

Bloqueos encontrados:

1. write sets genéricos;
2. dependencias incompletas;
3. inventario de casos no congelado;
4. divergencia silenciosa frente a 10–15 planos/imágenes;
5. mezcla entre calidad y permiso;
6. Definition of Ready circular.

### Checker técnico — FAIL

Bloqueos encontrados:

1. contrato 2.2 no decidido;
2. motor dependía de payload aún no integrado;
3. ruta se implementaba antes que `config.views`;
4. elegibilidad ambigua entre hecho, tipología y proyecto;
5. reglas de activos insuficientes;
6. baseline de `PROJECT.md` desactualizado.

### Revisor UX/comercial — PASS WITH RISKS

Gaps:

1. faltaba guion bloqueante de cinco minutos;
2. CTA sin destino/foco exacto;
3. ayuda solo a nivel de sección;
4. procedencia no persistía en todo el recorrido;
5. “benchmark certificado” podía sugerir certificación externa.

## Remediaciones

- Inventario congelado de 10 tipologías sobre cinco proyectos existentes.
- Procedencia: 1 observado, 9 controlados, 0 simulados.
- Siete pares visuales controlados y cero originales observados publicados.
- IDs exactos de casos, proyectos, tipologías, documentos y evidencia.
- Diferencia frente a `PROJECT.md` expuesta en A4.
- Matriz calidad × permiso y reglas específicas CT-G.
- Contrato público obligatorio `2.2.0`:
  - root `inspector`;
  - casos/activos cerrados;
  - records autoritativos en `model`;
  - reader compatible 2.0/2.1/2.2;
  - writer 2.2 en P3-04.
- Tabla normativa de `depends_on`, paralelismo y gates.
- Write sets exactos; `domain.js` protegido.
- P3-05 espera P3-01–P3-04.
- Navegación/ruta movida a integración P3-10.
- Elegibilidad limitada a hechos y tipología; Pardo Coast permanece en F2/CT-I.
- Allowlist PNG/WebP/JPEG/texto, tamaños, hashes, firma mágica, decodificación, dimensiones, archivos huérfanos y denylist de hashes CT-G.
- Diez tests nuevos enumerados e incluidos obligatoriamente en `check` y `verify`.
- Regresión: ocho rutas × tres viewports, CT-C/CT-I, query territorial, base path, reload, foco y red.
- Guion de lector nuevo `≤ 5:00` incorporado a P3-14, evidencia y DoD.
- CTA, ayudas, procedencia, densidad y orden del ledger convertidos en assertions.
- Lenguaje unificado a “Elegible/No elegible según las reglas de la demo”.

## Segunda ronda

### Lector de delegación — PASS

Confirmó:

- write sets exactos;
- dependencias normativas;
- inventario suficiente;
- divergencia comercial visible;
- matriz calidad × permiso;
- Definition of Ready no circular.

### Checker técnico — PASS

Confirmó:

- 10 tipologías usan cinco proyectos existentes;
- schema/reader 2.2 y writer P3-04 están separados;
- tests completos;
- archivos verifican firma, MIME, decodificación y dimensiones;
- no quedan gaps técnicos dentro del alcance.

### Revisor UX/comercial — PASS

Confirmó:

- gate de cinco minutos;
- frase conjunta observado/transcripción controlada;
- lenguaje metodológico;
- veredicto y CTA sin scroll a 1280×720;
- assertions explícitas de ayuda, procedencia y densidad.

## Veredicto

```text
Veredicto: PASS
Historias: HU-DEMO-401–406 y 901 planificadas; 404 como Should
Casos: CT-D y CT-G congelados
Contrato: 2.2.0 propuesto y obligatorio
Permisos: originales CT-G fuera; activos neutrales controlados
UX: recorrido vertical y gate narrativo ≤5:00
Bloqueo vigente: HUMAN-GATE-A
Código/datos/activos F3 modificados: ninguno
```

## Condición de validez

El PASS deja de ser válido si se modifica sin nueva revisión:

- A1–A8;
- contrato 2.2;
- inventario o procedencia;
- permisos/allowlist/denylist;
- alcance de elegibilidad;
- dependencias o write sets;
- CT-D/CT-G;
- recorrido comercial.
