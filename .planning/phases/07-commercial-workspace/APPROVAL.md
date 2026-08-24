# Fase 7 — HUMAN-GATE-A

## Estado

**APROBADA** el 2026-08-24. Habilita P7-00D y, si el baseline pasa, P7-01. No equivale a implementación completa, verificación independiente, merge o despliegue.

## Registro de aprobación

- Responsable: Stefano.
- Fecha y hora de sesión: `2026-08-24T11:28:28.4214512-05:00`.
- Declaración exacta:

> Acepto A1–A14 y autorizo HUMAN-GATE-A de la Fase 7.

- HEAD documental aprobado: `074b15dc6a8535a4b149b9a38f6a034830ccdbe3`.
- Plan normalizado y revisado: `83bb0a526535b14d6008483576d07dcccced4209`.
- Solicitud: `HUMAN-GATE-A-REQUEST.md`.
- Revisión estructural: `PLAN_REVIEW.md`, tercera ejecución `PASS` sin hallazgos P0–P2.

## Condiciones aceptadas

1. La fase es exclusivamente UX/UI y navegación; contrato, datos y motores permanecen protegidos.
2. `/` continúa resolviendo a `#journey/scale` y se conserva el recorrido de seis etapas.
3. El rail primario usa Recorrido, Panorama, Proyectos, Decidir y Seguimiento.
4. Inspector, Benchmark, Comparador y Checklist se agrupan bajo `Profundizar`.
5. Las rutas expertas permanecen accesibles en un máximo de dos interacciones.
6. El escenario se resume en el shell y su editor completo parte cerrado.
7. `Ctrl+K`/`Cmd+K` implementa únicamente navegación local `Ir a…` y se retira si no supera accesibilidad.
8. Se adopta la dirección `Viva Decision Desk` sin copiar identidad visual de las referencias.
9. Proyectos y señales pasan a filas; evidencia, requisitos y diferencias usan ledgers.
10. Una acción primaria y un máximo de tres métricas gobiernan la primera pantalla.
11. Ayuda y metodología se compactan; límites y claims críticos permanecen visibles o alcanzables según C01–C23.
12. No se añaden dependencias, fuentes externas, backend, telemetría o persistencia.
13. La UAT humana no forma parte de Fase 7 salvo nueva instrucción explícita.
14. El usuario conserva merge y despliegue; ningún agente fusiona automáticamente.

## Reglas vinculantes

- Las nueve superficies expertas/destinos definidos y las seis etapas conservan deep-links y reset canónicos.
- El fixture C01–C23 será una copia ejecutable de las autoridades existentes, no una fuente nueva.
- La reorganización visual no puede cambiar cifras, denominadores, exclusiones, elegibilidad, respuestas ni acciones correctivas.
- La paleta `Ir a…` no busca datos, no persiste consultas y no realiza solicitudes de red.
- Las rutas, controles y disclosures deben conservar teclado, foco, contraste, 44×44, responsive y zoom 200%.

## Límites

La aprobación no autoriza modificar contrato 2.4, dataset, writer, fingerprints, motores, elegibilidad, scoring, benchmark, histórico, respuesta del asistente, assets de evidencia o workflow; añadir servicios externos; eliminar claims, límites o referencias; ni omitir verificación independiente, merge humano o comprobación post-merge.

## Condición de validez

P7-00D parte del commit que contiene esta aprobación y debe vincular su evidencia al SHA exacto. P7-01 solo comienza si `npm.cmd run verify`, las 14 superficies, los tres viewports, consola, red, foco, lectura y densidad establecen un baseline reproducible. Cualquier cambio material a A1–A14 o relajación de C01–C23 invalida el gate y exige enmienda y nueva aprobación.
