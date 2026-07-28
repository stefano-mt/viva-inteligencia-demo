# Instrucciones persistentes para agentes

## Misión

Evolucionar la demo de Viva Inteligencia Comercial para vender una propuesta clara: pasar de publicaciones dispersas a decisiones comerciales geográficas, comparables, trazables y respaldadas por evidencia.

Este repositorio contiene una demo estática y reproducible. No es una aplicación productiva ni autoriza integraciones, scraping recurrente, OCR en vivo o decisiones automáticas sobre datos dudosos.

## Orden de lectura obligatorio

Antes de planificar o editar:

1. `AGENTS.md`.
2. `.planning/STATE.md`.
3. `.planning/PROJECT.md`.
4. `.planning/ROADMAP.md`.
5. El `CONTEXT.md` y `PLAN.md` de la fase activa.
6. `.planning/VERIFICATION.md`.
7. Solo después, los archivos de código y datos relevantes para la tarea.

No cargues todo el repositorio por defecto. Usa búsqueda dirigida y, si existe un grafo vigente, consulta primero Graphify según `.planning/GRAPHIFY.md`.

## Precedencia de fuentes de verdad

En caso de contradicción:

1. Instrucción explícita y reciente del usuario.
2. Criterios de aceptación aprobados de la fase activa.
3. `.planning/PROJECT.md` y `.planning/REQUIREMENTS.md`.
4. Decisiones registradas en `.planning/DECISIONS.md`.
5. Documentación de implementación existente.
6. Comportamiento actual del código.

El código actual describe el estado presente, no necesariamente el comportamiento deseado. No resuelvas contradicciones en silencio: regístralas y detén la ejecución si cambian alcance, datos o narrativa comercial.

## Alcance de la demo

La versión objetivo debe demostrar:

- Cobertura base de al menos 30 inmobiliarias normalizadas.
- Análisis por microzona o cuadrante en distritos de alta carga.
- Trazabilidad por fuente, campo y fecha.
- Inspector de tipologías que detecte la incompatibilidad entre tarjeta y plano.
- Separación prudente entre área techada, libre y total.
- Benchmark cuantitativo y cualitativo con comparables explicables.
- Histórico y señales sin atribuir causas no observadas.
- Asistente determinístico o simulado que use el mismo escenario y evidencia.
- Recorrido comercial reproducible, con mapa e inspector como momentos centrales.

Quedan fuera de alcance salvo nueva autorización:

- Backend productivo, autenticación, SSO o roles corporativos.
- CRM, ERP, WhatsApp, firma digital, cobranza o gestión de leads.
- Scraping masivo/recurrente, OCR en vivo o inferencias sin evidencia.
- Geolocalización personal, datos personales o claims de ventas/stock no observados.

## Arquitectura actual y restricción de paralelismo

La demo se sirve desde `prototipo_ejecutable/public/` mediante GitHub Pages.

- `public/app.js`: carga, shell y composición.
- `public/js/state.js`: estado mutable único.
- `public/js/config.js`: rutas, aliases, preguntas y guías.
- `public/js/controller.js`: eventos y cambios de escenario.
- `public/js/navigation.js`: navegación y hash.
- `public/js/domain.js`: consultas, cálculos y componentes compartidos; todavía es un hub.
- `public/js/views/*.js`: un archivo propietario por sección.
- `public/styles.css`: manifiesto de ocho bloques ordenados en `public/styles/`.
- `scripts/build-demo-data.js`: normalización y generación del JSON.
- `public/demo-data/viva-platform-demo.json`: dataset estático de la demo.
- `.github/workflows/deploy-pages.yml`: despliegue desde `main`.

La Fase 0 está completa. Se permiten propietarios independientes por vista cuando sus `write_set` no coinciden. `domain.js` y `styles/50-views.css` siguen siendo recursos compartidos: cada ola debe asignarles un único escritor o extraer primero una frontera adicional. Dos tareas que declaren el mismo archivo no pueden ejecutarse en paralelo.

## Flujo obligatorio para cambios no triviales

Usa el ciclo:

`Discutir → especificar UI si aplica → planificar → revisar el plan → ejecutar → verificar de forma independiente → integrar → recordar → PR`

Un cambio es no trivial si modifica comportamiento, datos, más de un archivo, navegación, cálculos, visualizaciones o la narrativa de la demo.

Antes de editar un cambio no trivial debe existir un `PLAN.md` que incluya:

- objetivo y requisitos/historias cubiertas;
- archivos permitidos (`write_set`) y archivos protegidos;
- dependencias y ola de ejecución;
- tareas atómicas;
- criterios de aceptación observables;
- comandos y evidencia de verificación;
- riesgos, supuestos y condición de rollback.

Los cambios pequeños y localizados pueden usar un plan breve dentro del handoff, pero nunca omiten verificación.

## Roles y separación maker/checker

- **Orquestador:** mantiene intención, dependencias, estado y límites; no implementa en paralelo con sus delegados.
- **Explorador de contexto:** solo lectura; devuelve rutas, relaciones, riesgos y preguntas.
- **Planificador:** transforma requisitos en tareas verificables y conjuntos de escritura.
- **Implementador de datos:** modifica contratos, fixtures y generador de datos.
- **Implementador UI:** modifica únicamente la vista o componente asignado.
- **Verificador:** no debe ser el mismo agente que implementó; prueba criterios y reúne evidencia.
- **Revisor:** busca regresiones, sobrealcance, deuda y afirmaciones no sustentadas.
- **Integrador:** resuelve el orden de integración, ejecuta el gate completo y prepara el PR.

Cada delegado recibe una tarea acotada y devuelve el contrato de `.planning/templates/HANDOFF.md`. No delegues “mejorar toda la demo”.

## Reglas de implementación

- Preserva la naturaleza estática y reproducible de la demo salvo decisión aprobada.
- No añadas una dependencia si HTML/CSS/JS existente resuelve el caso con claridad.
- Mantén una única fuente de estado por interacción.
- Los cálculos visibles deben derivarse del dataset, no de texto fijo desconectado.
- Conserva valor original, valor normalizado, fuente, fecha y confianza cuando aplique.
- Un valor dudoso no alimenta un agregado “certificado”.
- No llames “área techada” a un área que la fuente solo etiqueta como “área total”.
- Los estados no dependen solo del color.
- Todo control relevante debe funcionar con teclado y tener nombre accesible.
- Botones primarios deben tener contraste y jerarquía inequívocos.
- Los estados vacío, error, carga e información insuficiente se diseñan explícitamente.
- No conviertas la demo en una cuadrícula de tarjetas; prioriza progresión vertical, detalle bajo demanda y comparación por filas.

## Verificación mínima

Desde `prototipo_ejecutable/`:

```powershell
npm.cmd run check
npm.cmd run dev
```

La validación de sintaxis no demuestra el comportamiento. Para cambios visuales o interactivos también se exige:

- recorrido principal en navegador;
- ausencia de errores de consola;
- evidencia visual en 1440×900, 1280×720 y 390×844;
- navegación por teclado;
- comprobación de los casos de datos afectados;
- comparación antes/después cuando sea un cambio de UI.

Consulta el gate completo en `.planning/VERIFICATION.md`.

## Git, ramas y pull requests

- Nunca trabajes directamente sobre `main`.
- Sincroniza `main` antes de abrir una fase nueva.
- Usa una rama o worktree por fase o unidad realmente independiente.
- Un commit debe representar una tarea atómica verificada.
- No mezcles cambios no relacionados ni reescribas cambios del usuario.
- No hagas merge porque “los tests pasan”; exige cobertura de requisitos y evidencia.
- El PR debe incluir historias cubiertas, decisiones, pruebas ejecutadas, capturas y riesgos residuales.
- GitHub Pages se actualiza al fusionar en `main`; la URL desplegada se verifica después del merge.

## Memoria y handoff

Al terminar una tarea significativa:

1. Completa el handoff.
2. Actualiza el resumen o verificación de la fase.
3. Actualiza `.planning/STATE.md` solo con hechos vigentes.
4. Registra decisiones no obvias en `.planning/DECISIONS.md`.
5. No guardes logs extensos en el estado; enlaza la evidencia.

Un agente nuevo debe poder continuar leyendo archivos del repositorio, sin depender del chat anterior.

## Condiciones de parada

Detén y escala cuando:

- una decisión cambia el alcance aprobado;
- faltan datos para un claim comercial;
- se requiere una credencial, integración o permiso no autorizado;
- dos agentes necesitan editar el mismo archivo en la misma ola;
- la verificación falla tres veces sin una hipótesis nueva;
- la solución exige ocultar un error, inventar datos o debilitar el gate;
- el árbol de trabajo contiene cambios ajenos que se solapan con la tarea.
