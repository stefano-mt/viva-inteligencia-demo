# Evidencia P7-13 — navegación y reinicio

## Paleta `Ir a…`

| Comprobación | Resultado |
|---|---|
| `Ctrl+K` abre un diálogo | PASS |
| Catálogo de nueve destinos | PASS |
| Cinco destinos de Trabajo | PASS |
| Cuatro destinos de Profundizar | PASS |
| Aviso “Solo navega secciones; no busca datos.” | PASS |
| Escape cierra el diálogo | PASS |

Destinos observados: Recorrido, Panorama, Proyectos, Decidir, Seguimiento, Inspector, Benchmark, Comparador y Checklist.

## Reinicio

| Comprobación | Resultado |
|---|---|
| Editor abre desde `Cambiar escenario` | PASS |
| `Reiniciar escenario` disponible | PASS |
| Hash final `#journey/scale` | PASS |
| `h1` Escala único | PASS |
| Foco en `journey-title` | PASS |
| Escenario Miraflores restaurado | PASS |
| Comparación vacía | PASS |

## Consola y dependencias

- 0 errores de consola;
- 0 warnings de consola;
- 0 URLs HTTP(S) externas observadas en atributos `src`/`href`;
- raíz y JSON público responden desde `stefano-mt.github.io` con HTTP 200;
- no se introdujo persistencia, telemetría o transmisión.

## Veredicto

`PASS` técnico. P7-14 solo hace durable este resultado y no cambia el artefacto publicado.
