# Fase 6 — Solicitud de HUMAN-GATE-A

**Estado:** aprobación pendiente.

## Decisión solicitada

Autorizar la ejecución de Fase 6 sobre la rama `feat/phase-6-commercial-narrative-qa`, con el contrato, alcance y gates definidos en `CONTEXT.md`, `UX-AUDIT.md`, `UI-SPEC.md` y `PLAN.md`.

No se modificará runtime antes de una aceptación textual.

## Supuestos a aceptar

1. **A1 — Arquitectura:** GitHub Pages estático; sin servicios externos.
2. **A2 — Datos:** contrato 2.4, dataset, writer, hashes y elegibilidad protegidos.
3. **A3 — Entrada:** `Recorrido ejecutivo` será la entrada comercial principal.
4. **A4 — Ruta raíz:** `/` sin hash abrirá `#journey/scale`; `#dashboard` y deep-links existentes seguirán válidos.
5. **A5 — Secuencia:** escala → geografía → calidad → profundidad → movimiento → decisión.
6. **A6 — Reproducibilidad:** etapa en hash, escenario en query canónica y cero progreso oculto persistido.
7. **A7 — Densidad:** una acción primaria y máximo tres resúmenes antes del detalle.
8. **A8 — Jerarquía y alcance del caso:** mapa e inspector Tipo 7 son los dos momentos centrales. Tipo 7 es un caso demostrativo transversal de Miraflores, independiente del escenario activo y sin efecto sobre sus agregados.
9. **A9 — Acceso experto:** los ocho módulos permanecen disponibles y completos.
10. **A10 — Marca:** se preservan paleta, logo y tipografías locales; sin librería visual externa.
11. **A11 — Diferido:** HU-DEMO-505/exportación permanece fuera de alcance.
12. **A12 — Ensayo humano:** lector nuevo, ≤10 minutos y cinco claims correctos; gate bloqueante.
13. **A13 — Riesgos:** HUMAN-GATE-B no puede aceptar claims falsos ni regresiones Must.

La aprobación también acepta la matriz de autoridad y compatibilidad: 2.0 degrada globalmente; 2.1 habilita escala/geografía; 2.2 agrega calidad; 2.3 agrega profundidad; 2.4 agrega movimiento/decisión. Ninguna etapa recalcula cifras de las vistas expertas.

## Qué autoriza el gate

- crear el catálogo y la ruta guiada;
- reorganizar shell, navegación, ayudas y jerarquía de vistas;
- reducir densidad mediante progresión y divulgación;
- ampliar pruebas y evidencia de Fase 6;
- ejecutar el ensayo humano definido.

## Qué no autoriza

- cambiar contrato o dataset;
- añadir backend, IA generativa, analítica o persistencia;
- eliminar evidencia o restricciones;
- exportación HU-DEMO-505;
- merge automático.

## Fórmula de aprobación

```text
Acepto A1–A13 y autorizo HUMAN-GATE-A de la Fase 6.
```

Si algún supuesto requiere cambio, debe citarse por ID antes de autorizar la implementación.
