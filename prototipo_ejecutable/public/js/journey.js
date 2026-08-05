export const DEFAULT_JOURNEY_STAGE_ID = "scale";

export const JOURNEY_CAPABILITY_STATUS = Object.freeze({
  available: "available",
  capabilityUnavailable: "capability_unavailable",
  contractUnavailable: "contract_unavailable",
  invalidStage: "invalid_stage",
});

function freezeList(values) {
  return Object.freeze([...values]);
}

function defineStage({
  id,
  position,
  label,
  question,
  primaryActionLabel,
  minimumContractVersion,
  sourceKeys,
  provenanceKeys,
  expertLinks,
  fallbackCode,
  scope = "scenario",
  implicitComputation = false,
}) {
  return Object.freeze({
    id,
    position,
    label,
    question,
    primaryActionLabel,
    minimumContractVersion,
    sourceKeys: freezeList(sourceKeys),
    provenanceKeys: freezeList(provenanceKeys),
    expertLinks: freezeList(expertLinks),
    fallbackCode,
    scope,
    implicitComputation,
  });
}

export const JOURNEY_STAGES = Object.freeze([
  defineStage({
    id: "scale",
    position: 1,
    label: "Escala",
    question: "¿Qué mercado observable sostiene la lectura?",
    primaryActionLabel: "Continuar a geografía",
    minimumContractVersion: "2.1.0",
    sourceKeys: [
      "data.metadata.counts",
      "data.pilot.counts",
      "state.scenarioContext",
    ],
    provenanceKeys: ["metadata", "pilot", "scenario"],
    expertLinks: ["market"],
    fallbackCode: "coverage_unavailable",
    scope: "model_pilot_and_scenario",
  }),
  defineStage({
    id: "geography",
    position: 2,
    label: "Geografía",
    question: "¿Dónde compite el proyecto?",
    primaryActionLabel: "Validar calidad",
    minimumContractVersion: "2.1.0",
    sourceKeys: ["state.scenarioContext", "state.geographyArtifact"],
    provenanceKeys: ["scenario", "geography"],
    expertLinks: ["dashboard", "projects"],
    fallbackCode: "geography_insufficient",
  }),
  defineStage({
    id: "quality",
    position: 3,
    label: "Calidad",
    question: "¿Qué dato puede utilizarse?",
    primaryActionLabel: "Comparar con evidencia",
    minimumContractVersion: "2.2.0",
    sourceKeys: ["data.inspector.case:case:f3-ct-g-pardo"],
    provenanceKeys: ["inspector.case", "evidence", "ledger"],
    expertLinks: ["inspector"],
    fallbackCode: "quality_case_unavailable",
    scope: "transversal_miraflores",
  }),
  defineStage({
    id: "depth",
    position: 4,
    label: "Profundidad",
    question: "¿Cómo se diferencia la oferta?",
    primaryActionLabel: "Revisar movimiento",
    minimumContractVersion: "2.3.0",
    sourceKeys: ["state.benchmarkContext", "comparisonModel"],
    provenanceKeys: ["benchmark", "comparison"],
    expertLinks: ["market", "compare", "projects"],
    fallbackCode: "benchmark_insufficient",
  }),
  defineStage({
    id: "movement",
    position: 5,
    label: "Movimiento",
    question: "¿Qué cambió en el mercado?",
    primaryActionLabel: "Preparar decisión",
    minimumContractVersion: "2.4.0",
    sourceKeys: ["state.historyContext"],
    provenanceKeys: ["history.events", "history.references"],
    expertLinks: ["activity"],
    fallbackCode: "history_unavailable",
  }),
  defineStage({
    id: "decision",
    position: 6,
    label: "Decisión",
    question: "¿Qué hacemos y qué no podemos afirmar?",
    primaryActionLabel: "Reiniciar recorrido",
    minimumContractVersion: "2.4.0",
    sourceKeys: ["state.assistantResponse", "checklist"],
    provenanceKeys: ["assistant.references", "checklist.rules"],
    expertLinks: ["assistant", "trust"],
    fallbackCode: "decision_support_unavailable",
  }),
]);

export const JOURNEY_STAGE_IDS = Object.freeze(
  JOURNEY_STAGES.map(({ id }) => id),
);

export const JOURNEY_MODULE_RETURN_STAGE = Object.freeze({
  dashboard: "geography",
  projects: "depth",
  inspector: "quality",
  market: "scale",
  compare: "depth",
  activity: "movement",
  assistant: "decision",
  trust: "decision",
});

const stageById = new Map(
  JOURNEY_STAGES.map((stage) => [stage.id, stage]),
);

const supportedContractMinor = new Map([
  ["2.0.0", 0],
  ["2.1.0", 1],
  ["2.2.0", 2],
  ["2.3.0", 3],
  ["2.4.0", 4],
]);

export function isJourneyStageId(value) {
  return typeof value === "string" && stageById.has(value);
}

export function journeyStageById(stageId) {
  return isJourneyStageId(stageId) ? stageById.get(stageId) : null;
}

export function journeyNeighbors(stageId) {
  const stage = journeyStageById(stageId);
  if (!stage) return null;
  const index = stage.position - 1;
  return {
    previousStageId: JOURNEY_STAGES[index - 1]?.id ?? null,
    nextStageId: JOURNEY_STAGES[index + 1]?.id ?? null,
  };
}

export function canonicalReturnStageForModule(moduleId) {
  return typeof moduleId === "string"
    ? JOURNEY_MODULE_RETURN_STAGE[moduleId] ?? null
    : null;
}

export function expertLinksForStage(stageId) {
  const stage = journeyStageById(stageId);
  return stage ? [...stage.expertLinks] : [];
}

export function journeyAvailability(contractVersion, stageId) {
  const normalizedVersion =
    typeof contractVersion === "string" ? contractVersion : null;
  const stage = journeyStageById(stageId);
  if (!stage) {
    return {
      stageId: null,
      contractVersion: normalizedVersion,
      available: false,
      status: JOURNEY_CAPABILITY_STATUS.invalidStage,
      minimumContractVersion: null,
    };
  }

  const contractMinor = supportedContractMinor.get(normalizedVersion);
  if (contractMinor === undefined || contractMinor === 0) {
    return {
      stageId: stage.id,
      contractVersion: normalizedVersion,
      available: false,
      status: JOURNEY_CAPABILITY_STATUS.contractUnavailable,
      minimumContractVersion: stage.minimumContractVersion,
    };
  }

  const minimumMinor = supportedContractMinor.get(
    stage.minimumContractVersion,
  );
  const available = contractMinor >= minimumMinor;
  return {
    stageId: stage.id,
    contractVersion: normalizedVersion,
    available,
    status: available
      ? JOURNEY_CAPABILITY_STATUS.available
      : JOURNEY_CAPABILITY_STATUS.capabilityUnavailable,
    minimumContractVersion: stage.minimumContractVersion,
  };
}
