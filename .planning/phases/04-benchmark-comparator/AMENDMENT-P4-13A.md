# Enmienda correctiva P4-13A — coherencia del estado de precio

## Autoridad

Stefano autorizó explícitamente el 2026-08-03:

> Autorizo la enmienda correctiva P4-13A para resolver G1 en scenario-context.js, scenario-context.mjs, benchmark-e2e.mjs y comparison-e2e.mjs, documentarla y repetir P4-13 completo.

La enmienda responde al `FAIL` registrado en `VERIFICATION_REPORT.md` sobre el SHA `30f0ccebf737bc0aa90c85b35aea0923fa24ba8b`.

## Objetivo

Eliminar la contradicción entre el resumen territorial compartido y F4. El resumen no puede afirmar que existe una referencia de precio lista cuando los campos precio y área total no demuestran pertenecer a la misma oferta y el benchmark elegible tiene `n = 0`.

## Write set exacto

- nuevo `.planning/phases/04-benchmark-comparator/AMENDMENT-P4-13A.md`;
- `prototipo_ejecutable/public/js/views/scenario-context.js`;
- `prototipo_ejecutable/tests/scenario-context.mjs`;
- `prototipo_ejecutable/tests/benchmark-e2e.mjs`;
- `prototipo_ejecutable/tests/comparison-e2e.mjs`;
- `.planning/phases/04-benchmark-comparator/VERIFICATION_REPORT.md`, únicamente durante la repetición independiente de P4-13.

Todos los demás archivos permanecen protegidos. En particular, esta corrección no modifica motor, estado, contrato, dataset, pairing, CT-G, estilos ni configuración.

## Contrato narrativo congelado

Cuando el contexto territorial legacy tenga publicaciones con precio y área total:

- estado: cautela, nunca `ready`;
- label: `Referencia de precio no demostrada`;
- detalle: declara el número de publicaciones con ambos campos y aclara que no prueban pertenecer a la misma oferta;
- símbolo: advertencia, no check de aprobación.

Cuando esos campos sean insuficientes, el label continúa siendo `Referencia de precio no demostrada` y el detalle declara la ausencia de una pareja demostrada.

La corrección no cambia el conteo raw legacy. En Miraflores puede mostrar 69 publicaciones que declaran ambos campos; F4 conserva 68 cocientes orientativos después de excluir CT-G por `blocking_issue`. Son universos distintos y ambos deben quedar nombrados sin usar `compatible`, `elegible` o `lista` para el conteo raw.

## Criterios de aceptación

1. `#market` y `#compare` no contienen `Referencia de precio lista` ni `precios publicados compatibles` en texto visible o accesible.
2. Ambas rutas muestran `Referencia de precio no demostrada` antes de la lectura F4.
3. El detalle territorial explica que los valores declarados no prueban pertenecer a la misma oferta.
4. `#market` mantiene 0 parejas elegibles, 68 orientativas y CT-G excluido sin retirarlo del universo territorial.
5. `#compare` mantiene la conclusión `No hay precio por m² elegible para posicionamiento` sin contradicción previa.
6. Las pruebas unitarias cubren estado, tono, símbolo, detalle y negativos del copy prohibido.
7. Los E2E cubren la coherencia en las dos rutas y el árbol accesible.
8. `npm.cmd run verify` y `node tests/benchmark-comparison-responsive.mjs` pasan.
9. Un checker independiente repite P4-13 sobre el nuevo SHA y reemplaza el informe con su nuevo veredicto.

## Rollback

Revertir el commit atómico de P4-13A. No editar el JSON ni rehabilitar cocientes no emparejados para recuperar el estado anterior.
