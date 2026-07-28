# Fase 1 — Plan de ejecución

## Estado

`READY — checker independiente PASS; implementación autorizada el 2026-07-28`

## Objetivo verificable

Generar de forma determinista un JSON v2 compatible con la UI que contenga un piloto de al menos 30 inmobiliarias canónicas, observaciones y hechos trazables, fixtures CT-A/B/G/H ejecutables y reglas de elegibilidad que impidan agregar monedas, áreas o fuentes incompatibles.

## Historias y criterios de aceptación

### HU-DEMO-001 — Dataset piloto controlado

Como analista comercial, quiero saber qué universo y snapshot usa la demo para poder reproducir sus conclusiones.

Aceptación:

1. Existe `contract_version`, `dataset_id`, `cutoff_at` e hashes de inputs.
2. La selección piloto está versionada con regla, fecha y motivo.
3. El build no realiza llamadas de red.
4. Dos builds desde los mismos inputs generan el mismo SHA-256.
5. Un input requerido ausente o corrupto falla explícitamente.
6. El JSON versionado coincide con el resultado del generador.
7. La proyección legacy conserva las siete rutas sin errores.

### HU-DEMO-002 — Modelo multifuente y trazabilidad por campo

Como analista, quiero abrir el origen de cada valor para distinguir observaciones, normalizaciones y cálculos.

Aceptación:

1. Fuentes, observaciones, hechos y evidencias tienen IDs únicos.
2. Toda referencia apunta a una entidad existente.
3. Cada hecho relevante conserva original, normalizado, unidad, fecha, fuente y confianza.
4. `observed`, `derived` y `simulated` se distinguen.
5. Un hecho derivado registra fórmula e inputs.
6. Dos fuentes incompatibles permanecen separadas.
7. Evidencia ausente se marca, no se simula como disponible.

### HU-DEMO-003 — Áreas prudentes

Como analista, quiero diferenciar área techada, libre, total y desconocida para no calcular precios/m² engañosos.

Aceptación:

1. El enum de área se valida.
2. Ningún total se renombra como techado.
3. Cada precio/m² declara denominador.
4. CT-A calcula 10,000.00 y 4,757.28 desde hechos distintos.
5. Faltantes producen `insufficient`, nunca `NaN` o cero.
6. Agregados certificados no mezclan denominadores.

### HU-DEMO-004 — Tipos de precio y moneda

Como analista, quiero distinguir precio publicado, desde, venta, estimado y escenario para no comparar cifras de diferente naturaleza.

Aceptación:

1. Tipo de precio y moneda ISO/unknown son obligatorios.
2. `$` no se interpreta automáticamente como USD.
3. Ningún agregado mezcla PEN, USD o unknown.
4. CT-B conserva PEN 600,000 y PEN 625,000.
5. CT-B genera diferencia 25,000 y conflicto sin elegir verdad.
6. CT-B genera `+4.17%` usando 600,000 como base anterior.
7. Valores simulados quedan fuera del benchmark de mercado.
8. Porcentaje de diferencia declara la base.

### HU-DEMO-005 — Atributos y documentos

Como analista, quiero que acabados, materiales y áreas comunes enlacen evidencia para sustentar comparaciones cualitativas.

Aceptación:

1. Atributo ausente significa `unknown`, no `false`.
2. Todo atributo certificado enlaza observación y evidencia.
3. Documento registra fragmento, fecha, hash y permiso de publicación.
4. Una ruta inexistente no se presenta como evidencia disponible.
5. El output público no incorpora documentos no autorizados.
6. CT-D diferencia `unknown` de `false`.
7. CT-D publica el fragmento autorizado y oculta la ruta del documento restringido.

### HU-DEMO-006 — Histórico y eventos

Como analista, quiero ver el valor anterior y nuevo con vigencia para entender cambios sin atribuir causas no observadas.

Aceptación:

1. Eventos enlazan dos hechos válidos.
2. Conservan valor anterior, nuevo, delta, porcentaje y fecha.
3. Causa es `null` sin evidencia.
4. Moneda y semantic type deben coincidir.
5. Cambios extremos requieren issue/revisión.
6. El orden de inputs no cambia la serie.
7. CT-E produce +30,000 y +5.00% entre 600,000 y 630,000.
8. Base cero produce porcentaje `null` e issue explícito.
9. Cambio absoluto mayor a 50% requiere revisión.

### HU-DEMO-902 — 30 inmobiliarias canónicas

Como responsable de Viva, quiero una cobertura base de 30 inmobiliarias reales y normalizadas para demostrar escala sin inflar el conteo con alias.

Aceptación:

1. Existen al menos 30 IDs canónicos estables.
2. Cada nombre fuente resuelve a cero o un ID.
3. Alias originales se conservan.
4. Casos ambiguos quedan `manual_review`.
5. GRUPO T&C y GRUPO TyC se consolidan.
6. El conteo usa IDs, no strings.
7. Se distinguen niveles `base`, `enriched` y `deep`.
8. Selección y orden son deterministas.
9. El piloto demuestra conteos acumulativos `base_count >=30`, `enriched_count >=15` y `deep_count >=5`.

### CT-G — Bloqueante transversal

1. Dos observaciones independientes apuntan a Pardo Coast/Tipo 7.
2. Conservan 104.15 m² y “Área Total 53.37 m2”.
3. Delta exacto 50.78 m² y relativo 48.76%.
4. No usa el 104.15 de Park 55.
5. Piso 1 y rango 807–1007 generan revisión.
6. Calidad `inconsistent`.
7. `benchmark_eligible=false`.
8. El resultado no depende del orden.
9. No se publica el plano completo sin autorización.

## Archivos protegidos durante la fase

- `prototipo_ejecutable/public/app.js`
- `prototipo_ejecutable/public/js/**`
- `prototipo_ejecutable/public/styles/**`
- `.github/workflows/**`

La UI solo puede modificarse en una tarea posterior aprobada. La proyección legacy absorbe la compatibilidad.

## Ola 1.1 — Contrato y fixtures base

### P1-01 — Contrato ejecutable

- `depends_on`: ninguno.
- `write_set`:
  - `prototipo_ejecutable/contracts/demo-v2.schema.json`
  - `prototipo_ejecutable/contracts/README.md`
- Entrega: esquema, enums, referencias, elegibilidad y política pública.
- Verificación: parseo JSON, casos válidos/inválidos y revisión de backward compatibility.
- Propietario: un implementador de contrato.

### P1-02 — Fixtures transversales

- `depends_on`: P1-01.
- `write_set`:
  - `datos_relevantes/demo-pilot/fixtures/ct-a.json`
  - `datos_relevantes/demo-pilot/fixtures/ct-b.json`
  - `datos_relevantes/demo-pilot/fixtures/ct-d.json`
  - `datos_relevantes/demo-pilot/fixtures/ct-e.json`
  - `datos_relevantes/demo-pilot/fixtures/ct-g.json`
  - `datos_relevantes/demo-pilot/fixtures/ct-h.json`
  - `datos_relevantes/demo-pilot/fixtures/README.md`
- Entrega: valores controlados/observados, procedencia y resultados esperados para CT-A/B/D/E/G/H.
- Restricción CT-G: transcripción y hash; no copiar activo completo sin permiso.

## Ola 1.2 — Trabajos paralelos después del contrato

### P1-03 — Registro canónico y piloto

- `depends_on`: P1-01.
- `write_set`:
  - `datos_relevantes/demo-pilot/agencies.json`
  - `datos_relevantes/demo-pilot/pilot-selection.json`
  - `prototipo_ejecutable/scripts/data/agencies.js`
  - `prototipo_ejecutable/tests/data-agencies.mjs`
- Entrega:
  - IDs estables;
  - alias y revisiones;
  - selección de 30+;
  - niveles de cobertura;
  - reporte de consolidación.
- Regla de selección:
  - partir de discovery y scope;
  - excluir no-go legal/operativo;
  - incluir las 10 automatizables;
  - completar con condicionadas por viabilidad, cobertura y relevancia;
  - incluir GRUPO T&C para CT-G;
  - ordenar por matching válido descendente, cobertura descendente, viabilidad descendente e `agency_id` ascendente;
  - versionar la lista final aunque se derive por regla;
  - exigir conteos acumulativos `base_count >=30`, `enriched_count >=15` (`enriched + deep`) y `deep_count >=5`;
  - no fusionar solo por dominio.

### P1-04 — Fuentes, observaciones y evidencia

- `depends_on`: P1-01, P1-02.
- `write_set`:
  - `datos_relevantes/demo-pilot/sources.json`
  - `datos_relevantes/demo-pilot/observations.json`
  - `datos_relevantes/demo-pilot/documents.json`
  - `datos_relevantes/demo-pilot/evidence.json`
  - `datos_relevantes/demo-pilot/evidence/**`
  - `prototipo_ejecutable/scripts/data/evidence.js`
  - `prototipo_ejecutable/tests/data-evidence.mjs`
- Entrega: trazabilidad de CT-A/B/D/E/G y evidencia reproducible.
- Regla: una ruta inexistente se registra como no disponible.

### P1-05 — Medidas, tipologías y eventos

- `depends_on`: P1-01, P1-02.
- `write_set`:
  - `datos_relevantes/demo-pilot/typologies.json`
  - `datos_relevantes/demo-pilot/facts.json`
  - `datos_relevantes/demo-pilot/issues.json`
  - `datos_relevantes/demo-pilot/events.json`
  - `prototipo_ejecutable/scripts/data/measures.js`
  - `prototipo_ejecutable/tests/data-measures.mjs`
- Entrega: áreas, precios, monedas, conflictos, histórico y elegibilidad.
- Casos: CT-A, CT-B, CT-D, CT-E y CT-G.
- Regla: todo derivado hereda la inelegibilidad de un input simulado o inconsistente.

### P1-06 — Biblioteca de validación

- `depends_on`: P1-01.
- `write_set`:
  - `prototipo_ejecutable/scripts/data/validate.js`
  - `prototipo_ejecutable/tests/data-validator-unit.mjs`
- Entrega: validador propio sin dependencia nueva, con casos mínimos válidos e inválidos.
- Alcance: tipos, enums, referencias, elegibilidad y privacidad.
- No corrige datos; solo devuelve errores deterministas.
- Comando dirigido: `node tests/data-validator-unit.mjs`; P1-07 lo registra como `npm.cmd run test:data:validator`.

## Ola 1.3 — Integración serial

### P1-07 — Generador v2 y proyección compatible

- `depends_on`: P1-03, P1-04, P1-05, P1-06.
- `write_set`:
  - `prototipo_ejecutable/scripts/build-demo-data.js`
  - `prototipo_ejecutable/public/demo-data/viva-platform-demo.json`
  - `prototipo_ejecutable/tests/data-contract.mjs`
  - `prototipo_ejecutable/tests/data-schema.mjs`
  - `prototipo_ejecutable/tests/data-references.mjs`
  - `prototipo_ejecutable/tests/data-agencies-integration.mjs`
  - `prototipo_ejecutable/tests/data-evidence-integration.mjs`
  - `prototipo_ejecutable/tests/data-measures-integration.mjs`
  - `prototipo_ejecutable/tests/data-determinism.mjs`
  - `prototipo_ejecutable/tests/data-privacy.mjs`
  - `prototipo_ejecutable/package.json`
- Entrega:
  - modelo autoritativo v2;
  - proyección legacy;
  - build determinista;
  - exclusión de PII pública;
  - agregados por moneda y elegibilidad.
- Regla: no cambiar componentes UI para ocultar una incompatibilidad.
- Privacidad: escaneo recursivo de claves/valores, rutas locales, payloads y permisos de publicación.

### P1-08 — Reporte de cobertura y exclusiones

- `depends_on`: P1-07.
- `write_set`:
  - `datos_relevantes/demo-pilot/coverage-report.json`
- Entrega:
  - 30+ canónicas;
  - conteos acumulativos `base_count >=30`, `enriched_count >=15`, `deep_count >=5`;
  - fuentes/evidencia disponible;
  - exclusiones por calidad/moneda;
  - gaps que pasan a Fases 2–5.

## Ola 1.4 — Checker independiente

### P1-09 — Verificación final

- `depends_on`: P1-07, P1-08.
- `write_set`:
  - `.planning/phases/01-data-contracts/VERIFICATION_REPORT.md`
- No edita generador, contratos, fixtures o JSON.
- Debe emitir `PASS`, `PASS WITH RISKS` o `FAIL`.

### P1-10 — Memoria y handoff

- `depends_on`: P1-09.
- `write_set`:
  - `.planning/phases/01-data-contracts/SUMMARY.md`
  - `.planning/phases/01-data-contracts/HANDOFF.md`
  - `.planning/STATE.md`
  - `.planning/DECISIONS.md`
  - `.planning/ROADMAP.md`
- Registra únicamente resultados confirmados por el checker.
- Si P1-09 falla, documenta gaps; no marca la fase como completada.

## Comandos de verificación

Desde `prototipo_ejecutable/`:

```powershell
npm.cmd run check
npm.cmd run test:architecture
npm.cmd run test:data
npm.cmd run test:data:validator
npm.cmd run test:data:schema
npm.cmd run test:data:references
npm.cmd run test:data:agencies
npm.cmd run test:data:evidence
npm.cmd run test:data:measures
npm.cmd run test:data:determinism
npm.cmd run data:build
npm.cmd run verify
```

Verificaciones adicionales:

- ejecutar build dos veces y comparar SHA-256;
- comparar JSON generado contra el versionado;
- buscar campos públicos de contacto;
- probar input faltante y JSON inválido;
- ejecutar CT-A/B/G/H;
- ejecutar CT-D y CT-E;
- comprobar que moneda/denominador incompatibles no entran a agregados;
- smoke browser de las siete rutas para confirmar compatibilidad.

## Definition of Done

1. Todas las historias de esta fase cumplen aceptación.
2. CT-A/B/D/E/G/H pasan como pruebas ejecutables.
3. Hay 30+ IDs canónicos y los conteos acumulativos demuestran 15+ enriquecidas y 5+ profundas, con aliases consolidados.
4. Build y orden son deterministas.
5. No hay referencias rotas.
6. El JSON público no contiene PII de contacto.
7. PEN, USD y unknown no se mezclan.
8. Datos inconsistentes no son elegibles para benchmark certificado.
9. La UI actual carga sin errores.
10. Checker independiente emite `PASS` o un riesgo explícitamente aceptado.
11. Estado, decisiones, resumen y handoff están actualizados.
12. El PR puede revisarse por tareas y fixtures.

## Condición de rollback

Si la proyección v2 rompe la UI o no puede demostrar paridad:

1. conservar contratos, fixtures y validadores;
2. no reemplazar el JSON legacy;
3. publicar v2 en un archivo separado;
4. abrir un gap de adaptación UI;
5. no debilitar validaciones para forzar el merge.

## Condiciones de parada

- Falta autorización para publicar evidencia visual.
- La selección de 30 requiere inventar entidades.
- Un alias ambiguo solo puede resolverse por intuición.
- Una conversión monetaria carece de fuente/fecha.
- Se propone reutilizar 104.15 de Park 55 para Pardo Coast.
- El build exige scraping o servicios externos.
- No se pueden demostrar 15 enriquecidas y 5 profundas con evidencia local.
- Dos tareas paralelas comparten write set.
