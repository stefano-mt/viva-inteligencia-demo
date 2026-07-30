# Fase 3 — Ficha, evidencia e inspector

## Estado

**Revisado — PASS.** No autoriza cambios funcionales, publicación de activos ni ampliación de datos. Requiere `HUMAN-GATE-A`.

## Objetivo

Demostrar que Viva Inteligencia Comercial no solo encuentra proyectos comparables: permite inspeccionar qué fuente respalda cada dato, detectar observaciones incompatibles y decidir si un campo puede entrar en un benchmark certificado.

El momento comercial central será el caso Tipo 7:

- tarjeta observada: `Piso 1`, `104.15 m²`, tipo de área no declarado;
- plano observado: `Dep. 807 AL 1007`, `Área Total 53.37 m2`;
- diferencia derivada: `50.78 m²`;
- diferencia relativa: `48.76%` con base en la tarjeta;
- resultado: incompatibilidad visible, ninguna fuente elegida como “verdad” y exclusión del benchmark certificado.

## Feedback que origina la fase

El cliente necesita:

1. entender para qué sirve cada sección y cada componente;
2. reducir sobrecarga, tarjetas repetidas y columnas horizontales;
3. abrir la evidencia detrás de un dato o hallazgo;
4. distinguir área total, techada, libre o no declarada;
5. detectar contradicciones entre tarjeta, plano y otras fuentes;
6. comprender por qué un registro se certifica, se revisa o se excluye;
7. ver suficiente profundidad de mercado para que la demo venda la propuesta.

## Historias en alcance

- `HU-DEMO-401` — Ficha multifuente del proyecto.
- `HU-DEMO-402` — Detección visual de discrepancias.
- `HU-DEMO-403` — Visor de evidencia cualitativa.
- `HU-DEMO-404` — Resumen cualitativo del proyecto (`Should`).
- `HU-DEMO-405` — Inspector de tipologías y planos.
- `HU-DEMO-406` — Extracción/conciliación preprocesada del plano.
- `HU-DEMO-901` — Cobertura de mercado y fuentes.

Casos bloqueantes: `CT-D` y `CT-G`.

## Baseline confirmado

### Aplicación

- Demo estática en HTML, CSS y JavaScript, desplegada por GitHub Pages.
- Contrato público `2.1.0`.
- `projects.js` presenta catálogo y un detalle basado principalmente en la proyección legacy.
- La navegación tiene siete vistas; todavía no existe una vista propia de inspector.
- `state.js` es la única fuente mutable.
- `domain.js` y `styles/50-views.css` son hubs compartidos.
- Graphify de Fase 2 confirmó fronteras para vistas, controlador y estado, pero no describe con fidelidad CSS, JSON ni relaciones dinámicas.

### Datos

| Elemento | Conteo vigente |
|---|---:|
| Inmobiliarias canónicas de mercado | 180 |
| Inmobiliarias en el modelo | 184 |
| Piloto base / enriched / deep | 30 / 22 / 5 |
| Proyectos autoritativos | 676 |
| Tipologías | 5 |
| Observaciones | 17 |
| Hechos | 26 |
| Documentos | 4 |
| Evidencias | 4 |
| Issues | 5 |

El contrato ya admite:

- valores originales y normalizados;
- valor observado, derivado o simulado;
- `area_type`: `built`, `free`, `total`, `unknown`;
- confianza `high`, `medium`, `low`, `unknown`;
- calidad `certified`, `reviewable`, `inconsistent`, `illegible`, `insufficient`;
- permisos `authorized`, `restricted`, `pending`;
- ruta pública solo bajo `assets/evidence/`;
- regiones de imagen y fragmentos;
- elegibilidad para benchmark y motivo de exclusión.

### Brecha de evidencia

El baseline no permite afirmar que existen cinco dossiers visuales:

- un tier `deep` significa evidencia estructurada y matching alto;
- solo hay una tipología de mercado en el modelo;
- existe un fragmento controlado autorizado de CT-D;
- no existe ningún activo visual público;
- la tarjeta CT-G tiene permiso `pending`;
- el plano CT-G es `restricted`;
- ambos activos CT-G tienen `public_asset_path = null`.

La Fase 3 no puede copiar al repositorio las imágenes aportadas por el usuario ni imágenes de terceros sin autorización explícita y registrable.

## Propuesta de alcance de demostración

### Escala visible

- conservar la cobertura `30 / 22 / 5`;
- explicar que los niveles son acumulativos:
  - base: presencia y normalización;
  - enriched: dos o más fuentes o hechos enriquecidos;
  - deep: profundidad estructurada y matching alto según el contrato de Fase 1;
- no convertir “deep” en sinónimo de “plano público”.

Los conteos de casos observados, controlados, simulados, tipologías inspectables y activos autorizados se muestran como denominadores separados.

### Profundidad inspectable

Objetivo de Fase 3:

- 10 tipologías inspectables como mínimo y 15 como máximo;
- al menos 5 inmobiliarias representadas;
- al menos 5 hallazgos relevantes entre inconsistencias y validaciones;
- al menos 2 casos de información insuficiente o evidencia ilegible/restringida;
- entre 10 y 20 documentos/evidencias;
- CT-D y CT-G siempre presentes.

Cuando no exista un activo real autorizado, se usará una **ficha controlada de transcripción** sin marcas, imágenes ni diseño de terceros. Se etiquetará “Representación controlada para demo; no es el documento original”. No se dibujará un plano arquitectónico inventado.

## Modelo conceptual de inspección

```text
Proyecto
  └─ Tipología
      ├─ Observación de fuente
      │   ├─ Hecho original
      │   ├─ Valor normalizado
      │   └─ Evidencia / documento
      ├─ Observación de otra fuente
      └─ Issue de compatibilidad
          └─ decisión de elegibilidad
```

### Campo inspeccionable

Cada fila del inspector debe poder mostrar:

- nombre legible del campo;
- valor original;
- valor normalizado;
- unidad;
- etiqueta semántica, por ejemplo `Área total` o `Tipo no declarado`;
- fuente;
- fecha de captura;
- método de extracción;
- confianza;
- estado de calidad;
- enlace a evidencia cuando esté autorizado;
- motivo de exclusión cuando no sea elegible;
- fórmula e insumos cuando el valor sea derivado.

### Dimensiones de compatibilidad

La conciliación preprocesada evalúa, como mínimo:

1. modelo/tipología;
2. piso publicado frente a rango o unidad;
3. unidad o rango de unidades;
4. área y tipo de área;
5. dormitorios;
6. baños.

La ausencia de un campo no equivale a coincidencia ni a contradicción: produce `insufficient`.

## Reglas normativas propuestas

### Conservación de verdad

- Nunca elegir automáticamente una observación como verdadera ante conflicto.
- Nunca renombrar un `area_type = unknown` como techada, libre o total.
- “Área Total 53.37 m2” conserva `area_type = total`.
- La diferencia entre áreas incompatibles se muestra como señal de conflicto, no como una nueva medición agregable.
- La inferencia de pisos 8–10 desde `807–1007` permanece derivada, de confianza baja y revisable.

### Clasificación

La clasificación se deriva de hechos e issues; no de un color ni de texto fijo:

- `certified`: hecho elegible, fuente y fecha presentes, sin issue bloqueante y con evidencia permitida o trazabilidad suficiente según contrato;
- `reviewable`: existe un dato útil, pero requiere validación o contiene una inferencia de confianza limitada;
- `inconsistent`: dos o más observaciones incompatibles generan un issue bloqueante;
- `illegible`: el documento existe, pero el campo no puede leerse con seguridad;
- `insufficient`: no existe evidencia suficiente para afirmar coincidencia o contradicción.

Precedencia de roll-up propuesta:

1. `inconsistent` si existe issue bloqueante por contradicción observada;
2. `illegible` si el dato requerido depende de evidencia no legible;
3. `insufficient` si faltan datos requeridos;
4. `reviewable` si queda una inferencia o validación pendiente;
5. `certified` solo si todas las condiciones bloqueantes están resueltas.

El roll-up evalúa solo los `required_fact_ids` declarados por el expediente. Un atributo cualitativo opcional `unknown` permanece visible, pero no degrada un caso cuyo claim obligatorio está certificado. Esta precedencia requiere aprobación humana y tests de tabla.

### Elegibilidad

Un hecho entra al benchmark certificado solo si:

- `benchmark_eligible === true`;
- `quality_status === "certified"`;
- no está enlazado a un issue con `benchmark_blocking === true`;
- su tipo semántico y denominador son compatibles con el agregado;
- la moneda y el tipo de precio son explícitos cuando aplica.

La Fase 3 produce una decisión trazable al nivel de hecho y tipología. En CT-G, los hechos incompatibles y `typology:pardo-coast-tipo-7` no son elegibles. `project:nexo-2951` permanece en el universo/comparables territoriales de Fase 2 y CT-I; Fase 3 no excluye el proyecto completo ni rediseña los agregados. Fase 4 consumirá la elegibilidad por campo/tipología.

### Evidencia y permisos

| Permiso/disponibilidad | Comportamiento público |
|---|---|
| `authorized` + `available` + activo | abrir activo dentro del visor |
| `authorized` + `available` + fragmento | abrir fragmento/transcripción |
| `pending` | mostrar metadata y estado “permiso pendiente”; no abrir/copiar activo |
| `restricted` | mostrar metadata mínima y razón de restricción; no abrir/copiar activo |
| `unavailable` | mostrar que la referencia existe, pero no está disponible |

El visor nunca intenta evadir una restricción mediante URL externa, hotlink, OCR en vivo o copia en base64.

### Matriz calidad × permiso

Calidad y permiso son ejes independientes. La siguiente matriz es normativa:

| `quality_status` | Permiso/disponibilidad | Elegible | Modo visor | CTA | Metadata | Fragmento/binario | Red externa |
|---|---|---:|---|---|---:|---:|---:|
| `certified` | authorized + available | según `benchmark_eligible` | asset o fragment | Abrir evidencia | sí | sí, solo allowlist | no |
| `reviewable` | authorized + available | no | asset o fragment | Revisar hallazgo | sí | sí, solo allowlist | no |
| `inconsistent` | cualquier permiso | no | modo permitido por permiso | Revisar hallazgos | sí | solo si authorized | no |
| `illegible` | authorized + available | no | asset con aviso | Ver limitación | sí | binario sí; no inventar fragmento | no |
| `insufficient` | authorized + available | no | evidencia disponible | Ver limitación | sí | solo contenido disponible | no |
| cualquiera | pending | no | pending | Ver permiso pendiente | sí | no | no |
| cualquiera | restricted | no | restricted | Ver restricción | metadata mínima | no | no |
| cualquiera | unavailable | no | unavailable | Ver limitación | sí | no | no |

Para CT-G:

- metadata de tarjeta: publicable;
- hechos transcritos de tarjeta: publicables como datos observados;
- ficha de transcripción controlada: publicable si declara que no es el original;
- fragmento/binario de tarjeta: no publicable mientras siga `pending`;
- metadata de plano: publicable;
- hechos transcritos del plano: publicables como datos observados;
- ficha de transcripción controlada: publicable;
- fragmento/binario de plano: no publicable por estado `restricted`.

## Estrategia de activos propuesta

1. **CT-G observado:** conservar metadata, hashes y transcripciones actuales; presentar tarjetas de transcripción controlada y estado de permiso. No publicar las capturas originales.
2. **CT-D controlado:** abrir el fragmento autorizado existente.
3. **Casos adicionales:** crear evidencia neutral y controlada, con contenido original del proyecto de demo, sin logos, planos o estilos de terceros.
4. **Activos reales futuros:** solo se incorporan después de registrar titular, fuente, permiso, alcance de uso y hash.

## Experiencia objetivo

Recorrido principal:

1. Abrir `Inspector de evidencia`.
2. Ver la escala `30 / 22 / 5` y entender qué representa.
3. Seleccionar Pardo Coast → Tipo 7.
4. Leer el veredicto `Inconsistente · fuera del benchmark`.
5. Comparar por filas la tarjeta y el plano.
6. Abrir desde el hallazgo la evidencia disponible o su ficha restringida.
7. Entender el conflicto de área y piso/rango.
8. Ver la decisión analítica y siguiente acción.
9. Cambiar a un caso certificado, insuficiente o restringido.

El usuario no debe necesitar conocer los IDs técnicos ni recibir una explicación verbal externa.

## Fuera de alcance

- OCR en vivo, visión artificial en cliente o extracción en tiempo real.
- Scraping o descarga recurrente.
- Publicación de capturas/planos sin permiso.
- Corrección automática de datos dudosos.
- Backend, login, roles o flujo de aprobación productivo.
- Edición manual persistente o resolución colaborativa de issues.
- Benchmark cualitativo completo de Fase 4.
- Asistente documental de Fase 5.
- Reemplazar todas las vistas existentes.

## Riesgos

| ID | Riesgo | Severidad | Mitigación |
|---|---|---:|---|
| F3-R1 | Confundir `deep` con dossier visual | Alta | Cobertura con definiciones y conteos separados |
| F3-R2 | Publicar activo sin autorización | Crítica | Manifest de permisos, validador estricto y activos neutrales |
| F3-R3 | Representación controlada percibida como original | Alta | Etiqueta persistente y ausencia de branding/diseño copiado |
| F3-R4 | Sobrecarga horizontal | Alta | Flujo vertical, tabla/ledger por filas y detalle bajo demanda |
| F3-R5 | Estado decidido por color | Media | Icono, texto, badge y explicación |
| F3-R6 | Duplicar lógica en `domain.js` | Media | Extraer un módulo puro `evidence-inspector.js` |
| F3-R7 | Romper escenario de Fase 2 | Alta | Inspector lee contexto; no redefine comparables |
| F3-R8 | Demasiados casos controlados reducen credibilidad | Alta | Etiquetado visible y separación mercado/fixture |
| F3-R9 | Selección no reproducible | Media | Estado de inspector serializable o preset CT-G estable |
| F3-R10 | Imagen grande afecta Pages/móvil | Media | formatos optimizados, límites de tamaño y fallback textual |

## Definition of Ready

Fase 3 puede iniciar implementación cuando:

1. `CONTEXT.md`, `UI-SPEC.md` y `PLAN.md` pasan reader-test independiente;
2. HUMAN-GATE-A acepta estrategia de activos, clasificación y exclusión;
3. el plan fija un `write_set` sin escritores paralelos solapados;
4. CT-D y CT-G tienen expectativas de UI y dominio congeladas;
5. los casos adicionales se identifican como observados, controlados o simulados;
6. el inspector no depende de servicios externos;
7. el plan especifica esquema de manifest, allowlist MIME y límite de tamaño;
8. la matriz calidad × permiso define los estados autorizado, restringido, ilegible e insuficiente.

Los activos, hashes y manifest materializados son gate de entrada de P3-04 y parte del Definition of Done, no prerrequisito de HUMAN-GATE-A.
