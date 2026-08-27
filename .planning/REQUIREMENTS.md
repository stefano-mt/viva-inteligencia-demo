# Requisitos y trazabilidad de la demo vNext

## Convención

- **Must:** necesario para validar la propuesta.
- **Should:** importante, pero no bloquea por sí solo la presentación.
- **Could:** opcional si existe capacidad.
- Cada `PLAN.md` debe copiar los criterios de aceptación concretos de las historias que ejecuta. Una lista de IDs sin pruebas observables no está lista para desarrollo.

## Matriz de historias

| ID | Resultado esperado | Prioridad | Fase |
|---|---|---:|---:|
| HU-DEMO-001 | Dataset piloto controlado | Must | 1 |
| HU-DEMO-002 | Modelo multifuente y trazabilidad por campo | Must | 1 |
| HU-DEMO-003 | Desagregación prudente de áreas | Must | 1 |
| HU-DEMO-004 | Tipos de precio y escenario de descuento | Must | 1 |
| HU-DEMO-005 | Atributos cualitativos y documentos | Must | 1 |
| HU-DEMO-006 | Observaciones históricas y eventos | Must | 1 |
| HU-DEMO-101 | Barra global de contexto | Must | 2 |
| HU-DEMO-102 | Fecha de corte, cobertura y confianza | Must | 2 |
| HU-DEMO-103 | Estados vacíos y datos insuficientes | Must | 2/6 |
| HU-DEMO-104 | Ayuda contextual actualizada | Should | 6 |
| HU-DEMO-201 | Selección de microzona o radio | Must | 2 |
| HU-DEMO-202 | Mapa geográfico de competidores | Must | 2 |
| HU-DEMO-203 | Score explicable de comparabilidad | Must | 2 |
| HU-DEMO-204 | Alternar mapa geográfico y posicionamiento | Should | 2 |
| HU-DEMO-205 | Cuadrantes para distritos de alta carga | Must | 2 |
| HU-DEMO-301 | Configurar escenario del proyecto Viva | Must | 2 |
| HU-DEMO-302 | Diagnóstico de precio observado/estimado | Must | 2 |
| HU-DEMO-401 | Ficha multifuente del proyecto | Must | 3 |
| HU-DEMO-402 | Detección visual de discrepancias | Must | 3 |
| HU-DEMO-403 | Visor de evidencia cualitativa | Must | 3 |
| HU-DEMO-404 | Resumen cualitativo del proyecto | Should | 3 |
| HU-DEMO-405 | Inspector de tipologías y planos | Must | 3 |
| HU-DEMO-406 | Extracción/conciliación preprocesada del plano | Must | 3 |
| HU-DEMO-501 | Benchmark de microzona | Must | 4 |
| HU-DEMO-502 | Benchmark cualitativo | Must | 4 |
| HU-DEMO-503 | Comparador en filas agrupadas | Must | 4 |
| HU-DEMO-504 | Conclusión ejecutiva explicable | Should | 4 |
| HU-DEMO-505 | Exportación de comparación | Could | 4 |
| HU-DEMO-601 | Línea de tiempo de cambios | Must | 5 |
| HU-DEMO-602 | Señales con vigencia y estado | Must | 5 |
| HU-DEMO-603 | Resumen semanal priorizado | Should | 5 |
| HU-DEMO-701 | Asistente basado en escenario activo | Must | 5 |
| HU-DEMO-702 | Preguntas cualitativas/documentales | Must | 5 |
| HU-DEMO-703 | Respuesta ante evidencia insuficiente | Must | 5 |
| HU-DEMO-801 | Recorrido guiado de la demo | Must | 6 |
| HU-DEMO-802 | Reducción de densidad y jerarquía visual | Must | 6 |
| HU-DEMO-803 | Reinicio y reproducibilidad | Must | 6 |
| HU-DEMO-804 | Navegación orientada a vender la propuesta | Must | 6 |
| HU-DEMO-805 | Navegación comercial organizada por tareas | Must | 7 |
| HU-DEMO-806 | Escenario compacto y editable bajo demanda | Must | 7 |
| HU-DEMO-807 | Lectura principal inmediata por vista | Must | 7 |
| HU-DEMO-808 | Listas operativas compactas y comparables | Must | 7 |
| HU-DEMO-809 | Detalle y ayuda bajo demanda sin perder límites | Must | 7 |
| HU-DEMO-810 | Acceso rápido local por teclado | Should | 7 |
| HU-DEMO-901 | Cobertura de mercado y fuentes | Must | 3 |
| HU-DEMO-902 | Selección/normalización de 30 inmobiliarias | Must | 1 |

## Casos transversales obligatorios

### CT-A — Área libre y precio/m²

- Fixture: 98 m² techados y 206 m² totales.
- Debe calcular y etiquetar ambos precios/m² sin mezclarlos.

### CT-B — Precio discrepante

- Dos fuentes muestran precios distintos.
- Se conservan ambos; el sistema no elige automáticamente uno como “verdadero”.

### CT-C — Microzona

- Dos proyectos del mismo distrito, uno dentro y otro fuera.
- Mapa, benchmark, comparador y asistente usan el mismo subconjunto.

### CT-D — Evidencia cualitativa

- Un acabado documentado permite abrir fuente, fragmento y fecha.

### CT-E — Cambio histórico

- Muestra valor anterior, nuevo, porcentaje y vigencia.
- No atribuye una causa no observada.

### CT-F — Información insuficiente

- Ante “precio real de cierre del competidor”, el asistente no inventa.
- Explica la limitación u ofrece un escenario estimado correctamente etiquetado.

### CT-G — Tarjeta y plano incompatibles

- Tarjeta: Tipo 7, Piso 1, 104.15 m².
- Plano: Tipo 7, unidades 807–1007, Área Total 53.37 m².
- Conserva ambas evidencias, detecta incompatibilidad, muestra 50.78 m² de diferencia y excluye el registro del precio/m² certificado.

### CT-H — Cobertura de 30 inmobiliarias

- Existen al menos 30 IDs canónicos después de consolidar alias.
- La cobertura base muestra 30; enriquecimiento y planos pueden mostrar subconjuntos menores.

### CT-I — Distrito de alta carga

- Miraflores inicia con 90 proyectos antes de filtros adicionales en el snapshot actual.
- La selección de microzona actualiza todos los consumidores del escenario.

## Definition of Ready

Una tarea puede ejecutarse cuando:

1. Tiene historia, objetivo y criterios observables.
2. Tiene fixture o fuente de datos definida.
3. Distingue datos observados, derivados y simulados.
4. Define estados vacío/error/carga cuando aplican.
5. Declara dependencias y `write_set`.
6. El diseño esperado está acordado si modifica UI.
7. Incluye comandos y evidencia de verificación.
8. No depende de iniciativas fuera de alcance.
