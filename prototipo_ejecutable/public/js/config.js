export const views = [
  { id: "dashboard", label: "Radar comercial", hint: "Decisión del distrito", group: "Análisis" },
  { id: "projects", label: "Proyectos comparables", hint: "Competidores y detalle", group: "Análisis" },
  { id: "market", label: "Benchmark distrital", hint: "Oferta, precios y jugadores", group: "Análisis" },
  { id: "compare", label: "Comparador estratégico", hint: "Posicionamiento lado a lado", group: "Análisis" },
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
  "¿Cómo posicionar un proyecto de 2 dormitorios en Miraflores?",
  "¿Qué proyectos compiten en Santiago De Surco?",
  "¿Qué distrito tiene mayor presión competitiva?",
  "¿Qué inmobiliarias dominan Jesus Maria?",
  "¿Qué proyectos podrían presionar mi campaña?",
  "¿Qué argumento comercial usar si mi precio está sobre el promedio?",
  "¿Dónde conviene enfocar una campaña de lanzamiento?",
  "¿Qué atributos debería destacar frente a competidores?",
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
  market: {
    purpose: "Explica la presión competitiva de un distrito y la compara con otras zonas.",
    steps: ["Elige el distrito", "Revisa oferta y jugadores", "Explora las zonas del mapa conceptual"],
    outcome: "Una lectura de mercado para priorizar distritos y referencias de precio.",
  },
  compare: {
    purpose: "Compara dos o tres proyectos con los mismos criterios para evitar decisiones por intuición.",
    steps: ["Busca comparables", "Selecciona hasta tres", "Revisa diferencias y conclusión"],
    outcome: "Una posición relativa clara en precio, área, unidades y atributos.",
  },
  trust: {
    purpose: "Valida si el escenario está listo para convertirse en argumento y campaña comercial.",
    steps: ["Confirma precio", "Revisa competencia y mensaje", "Prioriza riesgos y siguiente acción"],
    outcome: "Un checklist accionable antes de activar la campaña.",
  },
  assistant: {
    purpose: "Transforma una pregunta comercial en una lectura ejecutiva basada en el escenario activo.",
    steps: ["Elige o redacta una pregunta", "Genera la lectura", "Valida referencias y cautelas"],
    outcome: "Una recomendación resumida para discusión y toma de decisión.",
  },
  activity: {
    purpose: "Resume cambios del mercado y prepara los temas de la reunión comercial semanal.",
    steps: ["Revisa señales recientes", "Identifica impacto", "Lleva prioridades a gerencia"],
    outcome: "Una agenda semanal enfocada en movimientos que requieren seguimiento.",
  },
};
