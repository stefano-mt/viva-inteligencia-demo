import {
  DEFAULT_JOURNEY_STAGE_ID,
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

export const sectionGuides = {
  dashboard: {
    purpose: "Convierte un escenario de distrito, precio y producto en una recomendación comercial inicial.",
    steps: ["Define el escenario", "Lee el diagnóstico y sus riesgos", "Contrasta competidores y posicionamiento"],
    outcome: "Una hipótesis comercial priorizada para continuar el análisis.",
  },
  projects: {
    purpose: "Encuentra proyectos comparables y revisa el detalle que sustenta su cercanía competitiva.",
    steps: ["Filtra la oferta", "Selecciona un proyecto", "Revisa precio, atributos y fuente"],
    outcome: "Una lista corta de competidores con evidencia visible.",
  },
  inspector: {
    purpose: "Contrasta fuentes y decide qué datos pueden entrar al benchmark.",
    steps: [
      "Selecciona un proyecto y una tipología",
      "Contrasta valores y hallazgos fuente por fuente",
      "Decide qué se usa, qué se excluye y cuál es el siguiente paso",
    ],
    outcome: "Una decisión trazable por tipología, con evidencia y limitaciones explícitas.",
  },
  market: {
    purpose: "Explica qué puede sostenerse de la muestra activa, qué queda fuera y con qué evidencia.",
    steps: ["Confirma el alcance", "Lee la referencia y sus denominadores", "Abre composición, exclusiones y metodología"],
    outcome: "Una referencia cuantitativa y cualitativa con limitaciones explícitas.",
  },
  compare: {
    purpose: "Contrasta proyectos del mismo escenario y separa datos observados, excluidos y simulados.",
    steps: ["Selecciona dos o tres proyectos", "Lee la conclusión y sus criterios", "Abre la evidencia y define la siguiente acción"],
    outcome: "Una comparación trazable con hallazgos, limitaciones y siguiente acción.",
  },
  trust: {
    purpose: "Valida si el escenario está listo para convertirse en argumento y campaña comercial.",
    steps: ["Confirma precio", "Revisa competencia y mensaje", "Prioriza riesgos y siguiente acción"],
    outcome: "Un checklist accionable antes de activar la campaña.",
  },
  assistant: {
    purpose: "Convierte una pregunta compatible en una lectura trazable del escenario activo, sin inventar datos ni cambiar su alcance.",
    steps: ["Elige o redacta una pregunta", "Genera la lectura determinista", "Contrasta datos, límites y referencias"],
    outcome: "Una lectura ejecutiva reproducible con evidencia y siguiente paso.",
  },
  activity: {
    purpose: "Resume cambios del mercado y prepara los temas de la reunión comercial semanal.",
    steps: ["Revisa señales recientes", "Identifica impacto", "Lleva prioridades a gerencia"],
    outcome: "Una agenda semanal enfocada en movimientos que requieren seguimiento.",
  },
};
