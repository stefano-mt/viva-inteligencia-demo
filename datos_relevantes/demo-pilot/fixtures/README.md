# Fixtures transversales de las Fases 1 y 2

Esta carpeta contiene los casos deterministas que P1-04, P1-05 y P1-06 deben materializar, calcular y validar. Son datos de prueba versionados: no son el dataset público ni autorizan scraping, publicación de activos restringidos o claims comerciales.

## Formato común

Cada JSON usa el mismo sobre:

- `case_id`: identificador transversal estable (`CT-A`, `CT-B`, `CT-C`, `CT-D`, `CT-E`, `CT-G`, `CT-H` o `CT-I`).
- `classification`: `controlled` cuando los valores existen para probar reglas, u `observed` cuando transcriben un snapshot o material aportado.
- `provenance[]`: procedencia lógica, clasificación y límites. Las rutas usan `/`, son relativas al repositorio y nunca son rutas del equipo local.
- `input`: entidades y registros necesarios para ejecutar el caso.
- `expected.assertions[]`: operaciones deterministas que el validador debe comprobar.
- `expected.result`: salida semántica congelada para comparaciones directas.

Los elementos de `input.sources`, `agencies`, `agency_aliases`, `projects`, `typologies`, `observations`, `facts`, `documents`, `evidence`, `issues` y `events` reutilizan los campos, enums e IDs namespaced de `prototipo_ejecutable/contracts/demo-v2.schema.json`. El sobre de fixture no reemplaza al documento raíz v2.

CT-C y CT-I usan los `$defs` 2.1 `scenarioCatalogs`, `scenarioDefaults` y `geography`. Sus cuadrantes, asignaciones y exclusiones también usan IDs namespaced. Son contratos congelados para los módulos puros posteriores; no deben copiarse al artefacto público como si fueran resultados calculados.

## Clasificación y significado

### `controlled`

CT-A, CT-B, CT-D y CT-E contienen valores deliberadamente simples para aislar reglas matemáticas, permisos, ausencia e histórico. Un hecho puede ser `observed` dentro de una fuente `controlled_fixture`: esto significa que el valor está declarado directamente por el fixture, no que proceda del mercado.

Los valores controlados no deben incorporarse al universo real del piloto. Cuando un precio es `simulated`, su inelegibilidad se propaga a todo precio por m2 derivado.

### `observed`

CT-G, CT-H y CT-I preservan observaciones del contexto entregado:

- CT-G transcribe dos capturas de Pardo Coast Tipo 7 y conserva sus SHA-256. Los PNG no se copian y `public_asset_path` permanece `null`.
- CT-H usa nombres, dominios y conteos del snapshot local. No asigna `coverage_tier` ni afirma que los mínimos 30/15/5 ya estén cumplidos.
- CT-I congela los 90 IDs y coordenadas reales de Miraflores del artefacto público, con 85 mappings `project:nexo-*` y cinco IDs no reconciliados.

Un valor observado puede permanecer `reviewable` o `inconsistent`. “Observado” no significa “verdadero” ni “certificado”.

## Casos

| Archivo | Propósito | Resultado bloqueante |
|---|---|---|
| `ct-a.json` | Diferenciar `built`, `free` y `total`; calcular dos denominadores. | 108 m2 libres; 10,000.00 y 4,757.28 PEN/m2; derivados del precio simulado no elegibles. |
| `ct-b.json` | Conservar dos precios `list` incompatibles. | 25,000 PEN y +4.17% con base 600,000; `PRICE_SOURCE_CONFLICT`; verdad seleccionada `null`. |
| `ct-c.json` | Congelar consistencia de una microzona radial y vectores matemáticos. | ID común en cuatro consumidores; borde exterior/hueco, Haversine, score/cobertura y cuantiles R-7 con resultados exactos. |
| `ct-d.json` | Vincular atributo cualitativo a evidencia y respetar permisos. | `cuarzo` abre fragmento autorizado; documento restringido no publica ruta ni fragmento; aire acondicionado es `unknown`, no `false`. |
| `ct-e.json` | Validar histórico, base cero, cambio extremo y orden. | +30,000/+5%; base cero con porcentaje `null`; >50% revisable; causa `null`; orden por fecha e ID. |
| `ct-g.json` | Detectar incompatibilidad tarjeta/plano. | 104.15 m2 de tipo `unknown` vs 53.37 m2 de tipo `total`; delta 50.78 y 48.76%; `inconsistent`; no elegible; sin Park 55 ni activos publicados. |
| `ct-h.json` | Probar canonización sobre nombres reales. | GRUPO T&C/GRUPO TyC comparten ID mediante resolución `rule_based`; dominios ambiguos quedan `manual_review`; vector resoluble >=30. |
| `ct-i.json` | Congelar el distrito de alta carga Miraflores. | 90 observados reales en cuadrantes 40/5/5/40; 85 autoritativos; cinco gaps visibles; reset 90/85. |

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

### CT-C

El punto objetivo, radio y coordenadas son controlados. El proyecto dentro es el único comparable. El proyecto fuera queda excluido por alcance, el proyecto sin coordenadas por geografía y el observado no reconciliado por reconciliación. Este último puede mostrarse como cobertura excluida, nunca como comparable. Mapa, lectura de mercado, comparador y asistente deben devolver exactamente el mismo ID. `controlled_vectors` congela además borde exterior incluido, borde de hueco excluido, distancia Haversine exactamente igual al radio, componentes de score/cobertura y cuantiles R-7 pares e impares.

### CT-I

El fixture exige cuatro cuadrantes analíticos en orden `NW`, `NE`, `SW`, `SE`, medianas exactas `-12.12101775/-77.02983135` y conteos `40/5/5/40`. Las 90 asignaciones reproducen IDs y coordenadas del JSON público; 85 enlazan con `project:nexo-*`. Los cinco gaps reales (`2798`, `3165`, `3231`, `3250`, `4088`) aparecen con `reason=not_reconciled`. `polygon_valid_count=90` es bloqueante; no se degrada a 89.

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

### P2-03/P2-05/P2-06 — Geografía, escenario y comparabilidad

1. Recalcular CT-C y CT-I desde inputs; no copiar `expected.result`.
2. Comprobar unicidad y pertenencia exacta a un cuadrante por punto válido.
3. Resolver exclusiones por etapa y motivo sin ocultar gaps.
4. Propagar los mismos IDs a contexto territorial, comparabilidad y consumidores.
5. Verificar independencia del orden y reset distrital.

## Seguridad

Estos archivos no contienen emails, teléfonos, WhatsApp, nombres personales de contacto, direcciones locales ni raw payloads. Las referencias a fuentes públicas registran procedencia, no autorización de ingesta recurrente. Un hash prueba identidad del material observado, no permiso para redistribuirlo.
