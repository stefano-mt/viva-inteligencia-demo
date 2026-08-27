# P7-10A — Corrección de jerarquía y primer viewport

## Autorización

P7-10A fue autorizada para cerrar los dos gaps P2 detectados por la verificación independiente P7-10, sin modificar datos, contratos ni motores.

## Alcance ejecutado

1. Se consolidó un único `h1` visible por superficie. Inspector y Comparador conservan el título canónico del shell y usan `h2` para su encabezado interno.
2. Se simplificó la primera pantalla de Benchmark, Comparador y Seguimiento:
   - Benchmark presenta primero la conclusión y la partición, y desplaza el contexto de escala a continuación.
   - Comparador presenta primero la conclusión y ubica el control de selección dentro de ese bloque, antes del detalle.
   - Seguimiento presenta primero la lectura de la señal y luego la agenda, con menor separación vertical.
   - Los resúmenes territoriales redundantes de estas superficies se retiraron; el escenario permanece visible en el shell.
3. La regresión responsive mide lectura y trabajo con `scrollY === 0`, antes de cualquier helper de foco o desplazamiento.
4. Se añadió cobertura transversal para exigir exactamente un `h1` visible.

## Resultado técnico

- `npm.cmd run verify`: **PASS**.
- P7 responsive: **PASS** en 14 superficies, tres viewports y zoom 200%.
- Smoke: **PASS** en ocho rutas y tres viewports.
- Accesibilidad: **PASS** en 14 superficies y tres viewports.
- C01–C23, CT-A–I/P, compatibilidad 2.0–2.4, privacidad y determinismo: **PASS**.
- Benchmark, Comparador y Seguimiento exponen lectura y trabajo dentro del primer viewport de 1280×720, medidos desde `scrollY = 0`.
- Inspector y Comparador exponen un solo `h1` visible.

## Límites preservados

No se modificaron datasets, contratos públicos, writer, motores de benchmark/comparación/histórico/asistente ni workflows. La verificación formal P7-10 debe repetirse de forma independiente sobre el commit correctivo antes de cerrar el gate.
