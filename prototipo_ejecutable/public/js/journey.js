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

export const JOURNEY_STAGE_STATUS = Object.freeze({
  ready: "ready",
  empty: "empty",
  insufficient: "insufficient",
  error: "error",
  capabilityUnavailable: JOURNEY_CAPABILITY_STATUS.capabilityUnavailable,
  contractUnavailable: JOURNEY_CAPABILITY_STATUS.contractUnavailable,
});

const CORRECTIVE_ACTIONS = Object.freeze({
  scale: Object.freeze({
    label: "Reiniciar escenario",
    href: "#journey/scale",
  }),
  geography: Object.freeze({
    label: "Ajustar escenario",
    href: "#dashboard",
  }),
  quality: Object.freeze({
    label: "Volver a geografÃ­a",
    href: "#journey/geography",
  }),
  depth: Object.freeze({
    label: "Revisar benchmark",
    href: "#market",
  }),
  movement: Object.freeze({
    label: "Volver a profundidad",
    href: "#journey/depth",
  }),
  decision: Object.freeze({
    label: "Formular consulta en el asistente",
    href: "#assistant",
  }),
});

function cloneValue(value) {
  return value === null || value === undefined
    ? null
    : structuredClone(value);
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function stageEnvelope(contractVersion, stageId, buildAvailableStage) {
  const capability = journeyAvailability(contractVersion, stageId);
  if (!capability.available) {
    return {
      stageId,
      status: capability.status,
      capability,
      data: null,
      correctiveAction: cloneValue(CORRECTIVE_ACTIONS[stageId]),
    };
  }
  return buildAvailableStage(capability);
}

function scaleStage({ contractVersion, metadataCounts, pilotCounts, scenarioContext }) {
  return stageEnvelope(contractVersion, "scale", (capability) => {
    const modelAgencyCount = finiteNumber(metadataCounts?.canonical_agencies);
    const baseCount = finiteNumber(pilotCounts?.base_count);
    const enrichedCount = finiteNumber(pilotCounts?.enriched_count);
    const deepCount = finiteNumber(pilotCounts?.deep_count);
    const observedProjectCount = finiteNumber(
      scenarioContext?.scope?.observed_project_count,
    );
    const comparableProjectCount = finiteNumber(
      scenarioContext?.market_reading?.comparable_project_count,
    );
    const complete = [
      modelAgencyCount,
      baseCount,
      enrichedCount,
      deepCount,
      observedProjectCount,
      comparableProjectCount,
    ].every((value) => value !== null);
    return {
      stageId: "scale",
      status: complete
        ? JOURNEY_STAGE_STATUS.ready
        : JOURNEY_STAGE_STATUS.insufficient,
      capability,
      data: {
        modelAgencyCount,
        pilot: { baseCount, enrichedCount, deepCount },
        scenario: {
          scopeText: scenarioContext?.scope_text ?? null,
          observedProjectCount,
          comparableProjectCount,
        },
      },
      correctiveAction: complete ? null : cloneValue(CORRECTIVE_ACTIONS.scale),
    };
  });
}

function geographyStage({ contractVersion, scenarioContext, geographyArtifact }) {
  return stageEnvelope(contractVersion, "geography", (capability) => {
    const observedProjectCount = finiteNumber(
      scenarioContext?.scope?.observed_project_count,
    );
    const data = {
      scopeText: scenarioContext?.scope_text ?? null,
      scope: cloneValue(scenarioContext?.scope),
      coverage: cloneValue(scenarioContext?.geography_coverage),
      comparableProjectCount: finiteNumber(
        scenarioContext?.market_reading?.comparable_project_count,
      ),
      excludedProjectCount: Array.isArray(scenarioContext?.excluded_projects)
        ? scenarioContext.excluded_projects.length
        : null,
      geographyStatus: scenarioContext?.geography_status ?? null,
      artifact: cloneValue(geographyArtifact),
    };
    const hasContext = Boolean(
      scenarioContext && data.coverage && data.comparableProjectCount !== null,
    );
    const artifactReady = geographyArtifact?.status === "valid";
    const status = !hasContext || !artifactReady
      ? JOURNEY_STAGE_STATUS.insufficient
      : observedProjectCount === 0
        ? JOURNEY_STAGE_STATUS.empty
        : JOURNEY_STAGE_STATUS.ready;
    return {
      stageId: "geography",
      status,
      capability,
      data,
      correctiveAction:
        status === JOURNEY_STAGE_STATUS.ready
          ? null
          : cloneValue(CORRECTIVE_ACTIONS.geography),
    };
  });
}

function factById(dossier, factId) {
  return dossier?.facts?.find(({ fact_id: candidate }) => candidate === factId) ?? null;
}

function qualityStage({ contractVersion, qualityDossier }) {
  return stageEnvelope(contractVersion, "quality", (capability) => {
    const dossier = qualityDossier ?? null;
    const available = Boolean(
      dossier?.inspectorCase?.case_id === "case:f3-ct-g-pardo" &&
        dossier?.decision,
    );
    return {
      stageId: "quality",
      status: available
        ? JOURNEY_STAGE_STATUS.ready
        : JOURNEY_STAGE_STATUS.empty,
      capability,
      data: available
        ? {
            transversal: true,
            scopeLabel: "Ejemplo de calidad de datos en Miraflores",
            caseId: dossier.inspectorCase.case_id,
            routeSlug: dossier.inspectorCase.route_slug,
            project: {
              projectId: dossier.project?.project_id ?? null,
              name: dossier.project?.canonical_name ?? null,
              district: dossier.project?.location?.district ?? null,
            },
            typology: cloneValue(dossier.selectedTypology),
            cardArea: cloneValue(
              factById(dossier, "fact:pardo-coast-card-area"),
            ),
            planArea: cloneValue(
              factById(dossier, "fact:pardo-coast-plan-area"),
            ),
            areaDelta: cloneValue(
              factById(dossier, "fact:pardo-coast-area-delta"),
            ),
            decision: cloneValue(dossier.decision),
            issues: cloneValue(dossier.issues) ?? [],
            sources: cloneValue(dossier.sources) ?? [],
            evidence: cloneValue(dossier.evidence) ?? [],
          }
        : null,
      correctiveAction:
        available ? null : cloneValue(CORRECTIVE_ACTIONS.quality),
    };
  });
}

function depthStage({ contractVersion, benchmarkContext, comparisonModel }) {
  return stageEnvelope(contractVersion, "depth", (capability) => {
    const benchmarkStatus = benchmarkContext?.status ?? null;
    const quantitative = benchmarkContext?.quantitative?.pricePerM2Total ?? null;
    const comparison = comparisonModel ?? null;
    let status = JOURNEY_STAGE_STATUS.ready;
    if (!benchmarkContext || !comparison) {
      status = JOURNEY_STAGE_STATUS.insufficient;
    } else if (benchmarkStatus === "error" || comparison.status === "error") {
      status = JOURNEY_STAGE_STATUS.error;
    } else if (
      benchmarkStatus === "contract_unavailable" ||
      comparison.status === "contract_unavailable"
    ) {
      status = JOURNEY_STAGE_STATUS.capabilityUnavailable;
    } else if (finiteNumber(quantitative?.n) === 0) {
      status = JOURNEY_STAGE_STATUS.insufficient;
    }
    return {
      stageId: "depth",
      status,
      capability,
      data: benchmarkContext
        ? {
            benchmarkStatus,
            scope: cloneValue(benchmarkContext.scope),
            quantitative: cloneValue(quantitative),
            qualitative: cloneValue(benchmarkContext.qualitative),
            comparison: cloneValue(comparison),
          }
        : null,
      correctiveAction:
        status === JOURNEY_STAGE_STATUS.ready
          ? null
          : cloneValue(CORRECTIVE_ACTIONS.depth),
    };
  });
}

function movementStage({ contractVersion, historyContext }) {
  return stageEnvelope(contractVersion, "movement", (capability) => {
    const historyStatus = historyContext?.status ?? null;
    const timeline = Array.isArray(historyContext?.timeline)
      ? historyContext.timeline
      : null;
    let status = JOURNEY_STAGE_STATUS.ready;
    if (!historyContext || !timeline) {
      status = JOURNEY_STAGE_STATUS.insufficient;
    } else if (["invalid_context", "error"].includes(historyStatus)) {
      status = JOURNEY_STAGE_STATUS.error;
    } else if (historyStatus === "contract_unavailable") {
      status = JOURNEY_STAGE_STATUS.capabilityUnavailable;
    } else if (timeline.length === 0) {
      status = JOURNEY_STAGE_STATUS.empty;
    }
    return {
      stageId: "movement",
      status,
      capability,
      data: historyContext
        ? {
            historyStatus,
            coverage: cloneValue(historyContext.coverage),
            timeline: cloneValue(historyContext.timeline) ?? [],
            agenda: cloneValue(historyContext.agenda) ?? [],
          }
        : null,
      correctiveAction:
        status === JOURNEY_STAGE_STATUS.ready
          ? null
          : cloneValue(CORRECTIVE_ACTIONS.movement),
    };
  });
}

function checklistSummary(scenarioContext) {
  if (!scenarioContext) {
    return {
      available: false,
      scopeText: "Escenario no disponible",
      comparableCount: 0,
      priceReferenceCount: 0,
      evidenceCoverage: 0,
      cutoffAt: null,
      comparabilityStatus: null,
      priceStatus: null,
    };
  }
  return {
    available: true,
    scopeText: scenarioContext.scope_text ?? "Alcance sin nombre",
    comparableCount:
      finiteNumber(scenarioContext.market_reading?.comparable_project_count) ?? 0,
    priceReferenceCount:
      finiteNumber(scenarioContext.market_reading?.price_reference_count) ?? 0,
    evidenceCoverage:
      finiteNumber(scenarioContext.evidence_coverage_pct) ?? 0,
    cutoffAt: scenarioContext.cutoff_at ?? null,
    comparabilityStatus: scenarioContext.comparability_status ?? null,
    priceStatus: scenarioContext.price_status ?? null,
  };
}

function decisionStage({
  contractVersion,
  scenarioContext,
  assistantCatalog,
  assistantResponse,
}) {
  return stageEnvelope(contractVersion, "decision", (capability) => {
    const checklist = checklistSummary(scenarioContext);
    const response = cloneValue(assistantResponse);
    const catalogAvailable = Array.isArray(assistantCatalog?.intents);
    const status = response || (checklist.available && catalogAvailable)
      ? JOURNEY_STAGE_STATUS.ready
      : JOURNEY_STAGE_STATUS.insufficient;
    return {
      stageId: "decision",
      status,
      capability,
      data: {
        mode: response ? "assistant_response" : "checklist",
        response,
        checklist,
      },
      correctiveAction: response
        ? null
        : cloneValue(CORRECTIVE_ACTIONS.decision),
    };
  });
}

export function buildJourneyContext({
  contractVersion = null,
  metadataCounts = null,
  pilotCounts = null,
  scenarioContext = null,
  geographyArtifact = null,
  qualityDossier = null,
  benchmarkContext = null,
  comparisonModel = null,
  historyContext = null,
  assistantCatalog = null,
  assistantResponse = null,
} = {}) {
  const stages = {
    scale: scaleStage({
      contractVersion,
      metadataCounts,
      pilotCounts,
      scenarioContext,
    }),
    geography: geographyStage({
      contractVersion,
      scenarioContext,
      geographyArtifact,
    }),
    quality: qualityStage({ contractVersion, qualityDossier }),
    depth: depthStage({
      contractVersion,
      benchmarkContext,
      comparisonModel,
    }),
    movement: movementStage({ contractVersion, historyContext }),
    decision: decisionStage({
      contractVersion,
      scenarioContext,
      assistantCatalog,
      assistantResponse,
    }),
  };
  const contractAvailable = JOURNEY_STAGE_IDS.some(
    (stageId) => stages[stageId].capability.available,
  );
  return {
    contractVersion:
      typeof contractVersion === "string" ? contractVersion : null,
    status: contractAvailable
      ? JOURNEY_STAGE_STATUS.ready
      : JOURNEY_STAGE_STATUS.contractUnavailable,
    stages,
  };
}
