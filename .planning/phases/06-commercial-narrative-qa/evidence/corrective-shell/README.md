# Evidencia visual P6-14A

## Alcance

Evidencia de la simplificación correctiva del shell y de la estación territorial lateral. La línea base funcional es `0167224`; las capturas representan el diff de P6-14A antes de su commit atómico.

## Capturas dirigidas

- `dashboard-desktop.png`: 1440×900, shell y mapa.
- `projects-laptop.png`: 1280×720, catálogo y navegación.
- `compare-laptop.png`: 1280×720, comparador y detalle técnico cerrado.
- `inspector-laptop.png`: 1280×720, inspector y contexto único.
- `journey-laptop.png`: 1280×720, recorrido y estación territorial.
- `dashboard-mobile-drawer.png`: 390×844, drawer abierto y controles territoriales.

Las capturas se obtuvieron con Chrome headless sobre `npm.cmd run dev`, sin errores de consola ni red externa.

## Gate automatizado relacionado

`evidence/responsive/` contiene la regeneración completa de 14 superficies en 1440×900, 1280×720, 390×844 y reflow equivalente a zoom 200 %. El manifiesto fue generado por `tests/phase6-responsive.mjs`.

La primera repetición detectó que la transición del drawer podía cubrir el foco durante el cambio artificial de viewport con `prefers-reduced-motion: reduce`. Se corrigió anulando esa transición bajo la preferencia y la repetición terminó `PASS`.

## Resultado dirigido

- escenario y URL canónica: PASS;
- ocho rutas, CT-C/CT-I, móvil y cero resultados: PASS;
- reset, Tipo 7, foco y recarga: PASS;
- accesibilidad 14 superficies × 3 viewports: PASS;
- responsive, zoom 200 %, contraste y targets: PASS.

Esta evidencia no reemplaza ni cierra el ensayo comercial humano P6-14.
