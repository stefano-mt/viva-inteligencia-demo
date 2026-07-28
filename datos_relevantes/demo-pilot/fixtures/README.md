# Fixtures transversales de la Fase 1

Esta carpeta contiene los casos deterministas que P1-04, P1-05 y P1-06 deben materializar, calcular y validar. Son datos de prueba versionados: no son el dataset público ni autorizan scraping, publicación de activos restringidos o claims comerciales.

## Formato común

Cada JSON usa el mismo sobre:

- `case_id`: identificador transversal estable (`CT-A`, `CT-B`, `CT-D`, `CT-E`, `CT-G` o `CT-H`).
- `classification`: `controlled` cuando los valores existen para probar reglas, u `observed` cuando transcriben un snapshot o material aportado.
- `provenance[]`: procedencia lógica, clasificación y límites. Las rutas usan `/`, son relativas al repositorio y nunca son rutas del equipo local.
- `input`: entidades y registros necesarios para ejecutar el caso.
- `expected.assertions[]`: operaciones deterministas que el validador debe comprobar.
- `expected.result`: salida semántica congelada para comparaciones directas.

Los elementos de `input.sources`, `agencies`, `agency_aliases`, `projects`, `typologies`, `observations`, `facts`, `documents`, `evidence`, `issues` y `events` reutilizan los campos, enums e IDs namespaced de `prototipo_ejecutable/contracts/demo-v2.schema.json`. El sobre de fixture no reemplaza al documento raíz v2.

## Clasificación y significado

### `controlled`

CT-A, CT-B, CT-D y CT-E contienen valores deliberadamente simples para aislar reglas matemáticas, permisos, ausencia e histórico. Un hecho puede ser `observed` dentro de una fuente `controlled_fixture`: esto significa que el valor está declarado directamente por el fixture, no que proceda del mercado.

Los valores controlados no deben incorporarse al universo real del piloto. Cuando un precio es `simulated`, su inelegibilidad se propaga a todo precio por m2 derivado.

### `observed`

CT-G y CT-H preservan observaciones del contexto entregado:

- CT-G transcribe dos capturas de Pardo Coast Tipo 7 y conserva sus SHA-256. Los PNG no se copian y `public_asset_path` permanece `null`.
- CT-H usa nombres, dominios y conteos del snapshot local. No asigna `coverage_tier` ni afirma que los mínimos 30/15/5 ya estén cumplidos.

Un valor observado puede permanecer `reviewable` o `inconsistent`. “Observado” no significa “verdadero” ni “certificado”.

## Casos

| Archivo | Propósito | Resultado bloqueante |
|---|---|---|
| `ct-a.json` | Diferenciar `built`, `free` y `total`; calcular dos denominadores. | 108 m2 libres; 10,000.00 y 4,757.28 PEN/m2; derivados del precio simulado no elegibles. |
| `ct-b.json` | Conservar dos precios `list` incompatibles. | 25,000 PEN y +4.17% con base 600,000; `PRICE_SOURCE_CONFLICT`; verdad seleccionada `null`. |
| `ct-d.json` | Vincular atributo cualitativo a evidencia y respetar permisos. | `cuarzo` abre fragmento autorizado; documento restringido no publica ruta ni fragmento; aire acondicionado es `unknown`, no `false`. |
| `ct-e.json` | Validar histórico, base cero, cambio extremo y orden. | +30,000/+5%; base cero con porcentaje `null`; >50% revisable; causa `null`; orden por fecha e ID. |
| `ct-g.json` | Detectar incompatibilidad tarjeta/plano. | 104.15 m2 de tipo `unknown` vs 53.37 m2 de tipo `total`; delta 50.78 y 48.76%; `inconsistent`; no elegible; sin Park 55 ni activos publicados. |
| `ct-h.json` | Probar canonización sobre nombres reales. | GRUPO T&C/GRUPO TyC comparten ID mediante resolución `rule_based`; dominios ambiguos quedan `manual_review`; vector resoluble >=30. |

## Procedencia y límites específicos

### CT-G

Los hashes se normalizan a minúsculas porque `$defs.sha256` exige `[a-f0-9]{64}`:

- tarjeta: `41ab273c521fcc66025653e8cfe44f894afb01b2f1b9be72847dcf87db2f2c4b`;
- plano: `3c108732cc1f9c0dbd884ed3d171a0abacffc96d9e80a95d994dc1d1a43bd60a`.

La tarjeta y el plano son observaciones distintas del mismo `typology_id`. El 104.15 de Park 55 (`project:nexo-3992`) no participa. La lectura de pisos 8–10 a partir de 807–1007 está marcada como `derived`, confianza `low`, y nunca sustituye el texto observado.

La tarjeta solo muestra 104.15 m2 y se tipa `unknown`; únicamente el plano conserva `area_type=total`. Por ello el delta también es `unknown` y no agregable. El plano se describe a sí mismo como referencial. El caso demuestra discrepancia y necesidad de revisión; no declara cuál fuente es verdadera ni publica una conclusión registral.

### CT-H

El fixture contiene 45 nombres observados. Nueve nombres asociados a dominios compartidos quedan para revisión manual; compartir dominio no basta para fusionar marcas. Los 36 mapeos no ambiguos producen 35 IDs distintos porque GRUPO T&C y GRUPO TyC se consolidan mediante una regla explícita (`rule_based`), no mediante evidencia confirmatoria.

Los mínimos son expectativas para P1-03:

- `base_count >= 30`;
- `enriched_count >= 15`, contando `enriched + deep`;
- `deep_count >= 5`.

`demonstrated_counts` permanece `null` y no existen tiers en este fixture. P1-03 debe probar los niveles con matching y evidencia local; no puede copiar los mínimos como resultados.

## Consumo posterior

### P1-04 — Fuentes, observaciones y evidencia

1. Materializar fuentes, observaciones, documentos y evidencia desde cada `input`.
2. Mantener los IDs del fixture.
3. No crear rutas públicas para documentos con permiso `pending` o `restricted`.
4. No sustituir evidencia ausente por una ruta inexistente.

### P1-05 — Medidas, tipologías y eventos

1. Recalcular resultados desde `input.facts`; no copiar `expected.result` como fuente.
2. Aplicar `half_up` con los dígitos declarados.
3. Propagar calidad e inelegibilidad desde todos los inputs.
4. Crear issues con los códigos exactos.
5. Ordenar eventos por `effective_at` y luego `event_id`.

### P1-06 — Validador

1. Validar cada registro interno contra su `$def` correspondiente.
2. Resolver todas las referencias internas aplicables.
3. Ejecutar `expected.assertions` sin depender del orden de entrada.
4. Rechazar PII de contacto, rutas absolutas/locales, raw payloads y activos restringidos publicados.
5. Confirmar que cada cálculo coincide con `expected.result`.

## Seguridad

Estos archivos no contienen emails, teléfonos, WhatsApp, nombres personales de contacto, direcciones locales ni raw payloads. Las referencias a fuentes públicas registran procedencia, no autorización de ingesta recurrente. Un hash prueba identidad del material observado, no permiso para redistribuirlo.
