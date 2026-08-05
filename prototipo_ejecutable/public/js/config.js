import {
  canonicalReturnStageForModule,
  DEFAULT_JOURNEY_STAGE_ID,
  journeyNeighbors,
  journeyStageById,
  JOURNEY_STAGES,
} from "./journey.js";

export const journeyEntry = Object.freeze({
  id: "journey",
  label: "Recorrido ejecutivo",
  hint: "Seis decisiones con evidencia",
  defaultStageId: DEFAULT_JOURNEY_STAGE_ID,
});

export const journeyStages = JOURNEY_STAGES;

export const views = [
  { id: "dashboard", label: "Radar comercial", hint: "Decisión del distrito", group: "Análisis" },
  { id: "projects", label: "Proyectos comparables", hint: "Competidores y detalle", group: "Análisis" },
  { id: "inspector", label: "Inspector de evidencia", hint: "Fuentes, tipologías y calidad", group: "Análisis" },
  { id: "market", label: "Benchmark de microzona", hint: "Muestra, atributos y exclusiones", group: "Análisis" },
  { id: "compare", label: "Comparador comercial", hint: "Diferencias y siguiente acción", group: "Análisis" },
  { id: "trust", label: "Checklist comercial", hint: "Preparación de campaña", group: "Decisión" },
  { id: "assistant", label: "Asistente de estrategia", hint: "Lectura ejecutiva", group: "Decisión" },
  { id: "activity", label: "Señales del mercado", hint: "Cambios y alertas", group: "Decisión" },
];

export const legacyRoutes = {
  sources: "market",
  matching: "compare",
  quality: "trust",
  pipeline: "activity",
};

export const suggestedQuestions = [
  "¿Cuál es la lectura principal del escenario activo?",
  "¿Qué precios publicados cambiaron en este escenario?",
  "¿Qué señal certificada conviene revisar primero?",
  "¿Qué cobertura y limitaciones tiene la muestra?",
  "¿Qué atributos están respaldados por evidencia autorizada?",
  "¿Cómo se comparan los proyectos seleccionados?",
  "¿Qué preguntas no puede responder esta demo?",
];

function freezeGuide({ steps = [], ...guide }) {
  return Object.freeze({
    ...guide,
    steps: Object.freeze([...steps]),
  });
}

function defineSectionGuide(viewId, guide) {
  const returnStageId = canonicalReturnStageForModule(viewId);
  const returnStage = journeyStageById(returnStageId);
  return freezeGuide({
    ...guide,
    id: viewId,
    kind: "expert",
    returnStageId,
    nextHref: `#journey/${returnStageId}`,
    nextLabel: `Volver al recorrido: ${returnStage?.label ?? "Escala"}`,
  });
}

function defineJourneyGuide(stageId, guide) {
  const nextStageId =
    journeyNeighbors(stageId)?.nextStageId ?? DEFAULT_JOURNEY_STAGE_ID;
  return freezeGuide({
    ...guide,
    id: stageId,
    kind: "journey",
    nextStageId,
    nextHref: `#journey/${nextStageId}`,
  });
}

export const journeyGuides = Object.freeze({
  scale: defineJourneyGuide("scale", {
    purpose: "Delimitar qué mercado observable sostiene la lectura antes de interpretar sus resultados.",
    action: "Distingue el universo modelado, los niveles acumulativos del piloto y la cobertura del escenario activo.",
    steps: ["Revisa los tres denominadores", "Confirma la cobertura territorial", "Conserva las exclusiones visibles"],
    outcome: "Una base de lectura con escala, profundidad y alcance claramente separados.",
    limitation: "La cobertura observada no demuestra exhaustividad del mercado y 184 no se suma a 30/22/5.",
    nextStep: "Continúa a Geografía para comprobar dónde compite el escenario.",
    nextLabel: "Continuar a Geografía",
  }),
  geography: defineJourneyGuide("geography", {
    purpose: "Comprobar el alcance territorial que comparten el mapa, los comparables y las demás lecturas.",
    action: "Revisa el distrito, el tipo de alcance, la cobertura geográfica y las exclusiones del escenario.",
    steps: ["Confirma el territorio", "Lee incluidos y excluidos", "Abre el mapa si necesitas detalle"],
    outcome: "Un conjunto territorial reproducible para continuar el análisis.",
    limitation: "Los cuadrantes son analíticos, no microzonas oficiales, y un proyecto visible puede no ser comparable.",
    nextStep: "Continúa a Calidad para validar qué datos pueden utilizarse.",
    nextLabel: "Validar Calidad",
  }),
  quality: defineJourneyGuide("quality", {
    purpose: "Demostrar por qué una discrepancia entre fuentes puede impedir que un dato alimente el benchmark.",
    action: "Contrasta la tarjeta y el plano del caso Tipo 7 y revisa la decisión de elegibilidad.",
    steps: ["Compara 104.15 m² y 53.37 m²", "Revisa piso y rango", "Abre la evidencia autorizada"],
    outcome: "Una exclusión trazable basada en la incompatibilidad observada.",
    limitation: "Es un caso demostrativo transversal de Miraflores y no pertenece al escenario territorial activo.",
    nextStep: "Continúa a Profundidad para comparar solo diferencias respaldadas.",
    nextLabel: "Comparar con evidencia",
  }),
  depth: defineJourneyGuide("depth", {
    purpose: "Separar diferencias comerciales respaldadas de valores publicados que no son comparables.",
    action: "Lee la comparación por filas, sus denominadores y las referencias de cada atributo.",
    steps: ["Confirma la muestra", "Contrasta atributos equivalentes", "Abre evidencia o metodología"],
    outcome: "Una lectura comparativa explicable, con cobertura y exclusiones visibles.",
    limitation: "Un precio publicado no demuestra precio de cierre ni una pareja precio–área elegible.",
    nextStep: "Continúa a Movimiento para revisar qué publicaciones cambiaron.",
    nextLabel: "Revisar Movimiento",
  }),
  movement: defineJourneyGuide("movement", {
    purpose: "Identificar cambios publicados que merecen seguimiento dentro del escenario vigente.",
    action: "Revisa valor anterior, valor nuevo, fecha, vigencia, estado y evidencia de cada señal.",
    steps: ["Filtra las señales", "Abre el detalle", "Prioriza la agenda derivada"],
    outcome: "Una agenda acotada de movimientos observados para revisión comercial.",
    limitation: "Un cambio publicado no permite afirmar su causa ni anticipar el comportamiento futuro.",
    nextStep: "Continúa a Decisión para formular una recomendación prudente.",
    nextLabel: "Preparar Decisión",
  }),
  decision: defineJourneyGuide("decision", {
    purpose: "Cerrar el recorrido con una recomendación trazable y límites explícitos.",
    action: "Contrasta la respuesta existente del asistente o, si aún no existe, revisa el checklist y formula una consulta.",
    steps: ["Lee la recomendación", "Comprueba límites y referencias", "Define la siguiente acción"],
    outcome: "Una decisión comercial prudente que puede justificarse con la evidencia disponible.",
    limitation: "La demo no infiere precios de cierre, causalidad, exhaustividad ni datos personales.",
    nextStep: "Reinicia el recorrido para reconstruir la lectura desde Escala.",
    nextLabel: "Reiniciar recorrido",
  }),
});

export const sectionGuides = Object.freeze({
  dashboard: defineSectionGuide("dashboard", {
    purpose: "Convertir el escenario territorial y de producto en una lectura comercial inicial.",
    action: "Configura el escenario, lee el diagnóstico y contrasta el mapa y los comparables.",
    steps: ["Define el escenario", "Lee el diagnóstico y sus riesgos", "Contrasta competidores y posicionamiento"],
    outcome: "Una hipótesis comercial priorizada para continuar el análisis.",
    limitation: "El diagnóstico es orientativo y depende de la cobertura, comparabilidad y evidencia disponibles.",
    nextStep: "Vuelve a Geografía para conectar esta lectura con el recorrido ejecutivo.",
  }),
  projects: defineSectionGuide("projects", {
    purpose: "Encontrar proyectos del escenario y distinguir cuáles son comparables.",
    action: "Filtra la oferta, selecciona un proyecto y revisa sus datos y fuentes.",
    steps: ["Filtra la oferta", "Selecciona un proyecto", "Revisa precio, atributos y fuente"],
    outcome: "Una lista corta de competidores con evidencia visible.",
    limitation: "Un proyecto visible no es automáticamente comparable ni todos sus campos son elegibles.",
    nextStep: "Vuelve a Profundidad para incorporar los proyectos a una comparación respaldada.",
  }),
  inspector: defineSectionGuide("inspector", {
    purpose: "Contrastar fuentes y decidir qué datos pueden entrar al benchmark.",
    action: "Selecciona un expediente, compara hechos fuente por fuente y abre la evidencia del hallazgo.",
    steps: ["Selecciona un proyecto y una tipología", "Contrasta valores y hallazgos fuente por fuente", "Decide qué se usa, qué se excluye y cuál es el siguiente paso"],
    outcome: "Una decisión trazable por tipología, con evidencia y limitaciones explícitas.",
    limitation: "Una fuente revisable, inconsistente, ilegible o insuficiente no se convierte en certificada por interpretación.",
    nextStep: "Vuelve a Calidad para explicar la exclusión dentro del recorrido.",
  }),
  market: defineSectionGuide("market", {
    purpose: "Explicar qué puede sostenerse de la muestra activa y qué queda fuera.",
    action: "Confirma el alcance, lee denominadores y abre composición, exclusiones y metodología.",
    steps: ["Confirma el alcance", "Lee la referencia y sus denominadores", "Abre composición, exclusiones y metodología"],
    outcome: "Una referencia cuantitativa y cualitativa con limitaciones explícitas.",
    limitation: "La demo no dispone de una pareja precio–área de mercado elegible para inferir precio por m² certificado.",
    nextStep: "Vuelve a Escala para relacionar el benchmark con la cobertura observada.",
  }),
  compare: defineSectionGuide("compare", {
    purpose: "Contrastar proyectos del mismo escenario por criterios equivalentes y trazables.",
    action: "Selecciona hasta tres proyectos, lee la conclusión y abre el respaldo de cada fila.",
    steps: ["Selecciona dos o tres proyectos", "Lee la conclusión y sus criterios", "Abre la evidencia y define la siguiente acción"],
    outcome: "Una comparación trazable con hallazgos, limitaciones y siguiente acción.",
    limitation: "Los campos excluidos o desconocidos permanecen fuera; el escenario Viva se identifica como simulado.",
    nextStep: "Vuelve a Profundidad para conservar la comparación dentro del relato comercial.",
  }),
  trust: defineSectionGuide("trust", {
    purpose: "Comprobar si el escenario está listo para sostener un argumento comercial prudente.",
    action: "Revisa precio, competencia, mensaje, riesgos y acciones pendientes.",
    steps: ["Confirma precio", "Revisa competencia y mensaje", "Prioriza riesgos y siguiente acción"],
    outcome: "Un checklist accionable antes de preparar una campaña.",
    limitation: "Completar el checklist no certifica datos ausentes ni convierte una simulación en un resultado observado.",
    nextStep: "Vuelve a Decisión para cerrar el recorrido con sus límites visibles.",
  }),
  assistant: defineSectionGuide("assistant", {
    purpose: "Convertir una pregunta compatible en una lectura reproducible del escenario activo.",
    action: "Elige o redacta una pregunta, genera la lectura y contrasta sus datos, límites y referencias.",
    steps: ["Elige o redacta una pregunta", "Genera la lectura determinista", "Contrasta datos, límites y referencias"],
    outcome: "Una lectura ejecutiva reproducible con evidencia y siguiente paso.",
    limitation: "El asistente no busca en la web, no conserva consultas y rechaza cierre, causalidad, predicción y PII.",
    nextStep: "Vuelve a Decisión para incorporar literalmente la respuesta vigente.",
  }),
  activity: defineSectionGuide("activity", {
    purpose: "Revisar cambios publicados y priorizar los que requieren seguimiento.",
    action: "Filtra las señales, abre su evidencia y revisa la agenda ordenada por el motor.",
    steps: ["Revisa señales recientes", "Abre el detalle y su vigencia", "Lleva prioridades a la agenda comercial"],
    outcome: "Una agenda enfocada en movimientos observados que requieren revisión.",
    limitation: "La ausencia de causa observada impide explicar por qué ocurrió un cambio o predecir el siguiente.",
    nextStep: "Vuelve a Movimiento para enlazar la señal con la decisión ejecutiva.",
  }),
});
