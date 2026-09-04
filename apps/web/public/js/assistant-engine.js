const BLOCK_TITLES = Object.freeze({
  answer: "Respuesta breve",
  data: "Datos usados",
  interpretation: "Lectura",
  limitations: "Límites",
  references: "Referencias",
  next_step: "Siguiente paso",
});

const INTENT_PATTERNS = Object.freeze([
  ["intent:coverage-quality", /\b(cobertura|calidad de (la )?muestra|limitaciones? (de|en) (la )?muestra)\b/u],
  ["intent:qualitative-evidence", /\b(atribut|acabado|document|evidencia autorizada|respalda)\w*/u],
  ["intent:project-comparison", /\b(compar|diferencias?).*(proyecto|seleccion)|\bproyectos seleccionados\b/u],
  ["intent:signal-priority", /\b(senal|agenda).*(prior|primero)|\bconviene revisar primero\b/u],
  ["intent:market-changes", /\b(que cambio|cambiaron|cambio de precio|precios publicados cambiaron|historico|evolucion)\b/u],
  ["intent:limitations", /\b(preguntas? no puede|limites? de la demo|limitaciones? de la demo)\b/u],
  ["intent:scenario-summary", /\b(lectura principal|resum|escenario activo|panorama)\w*/u],
]);

const LIMITATION_PATTERNS = Object.freeze([
  [
    "closing_price",
    /\b(precio|valor).*(cierre|cerrado|transaccion|venta real)|\bcierre.*(precio|valor)\b/u,
  ],
  [
    "causality",
    /\b(por que|a que se debe|que explica|que provoco|que origino|explicacion|causa|causo|provoco|origino|genero|motivo|razon).*(cambio|subio|bajo|baja|reduccion|aumento|disminuyo|precio)|\b(cambio|subio|bajo|baja|reduccion|aumento|disminuyo|precio).*(por que|a que se debe|que explica|que provoco|que origino|explicacion|causa|motivo|razon)\b/u,
  ],
  [
    "prediction",
    /\b(predec|prediccion|pronostic|precio futuro|demanda futura|absorcion|forecast|proyeccion)\w*/u,
  ],
  [
    "personal_data",
    /\b(datos personales|ubicacion personal|geolocalizacion|donde viven|personas que consultaron|leads?|clientes?).*(ubicacion|direccion|viven|telefono|correo)?\b/u,
  ],
  [
    "external_data",
    /\b(busca|buscar|consulta|consultar).*(internet|web|google|redes sociales)|\b(web search|scraping)\b/u,
  ],
]);

const safeArray = (value) => (Array.isArray(value) ? value : []);
const finiteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

function safeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value)
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
}

function unique(values) {
  return [...new Set(safeArray(values).filter(Boolean))];
}

export function normalizeAssistantQuery(value) {
  return safeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function minimumContractAvailable(version, minimum) {
  const current = String(version ?? "").split(".").map(Number);
  const required = String(minimum ?? "").split(".").map(Number);
  if (
    current.length !== 3 ||
    required.length !== 3 ||
    [...current, ...required].some((part) => !Number.isInteger(part) || part < 0)
  ) {
    return false;
  }
  for (let index = 0; index < 3; index += 1) {
    if (current[index] > required[index]) return true;
    if (current[index] < required[index]) return false;
  }
  return true;
}

function catalogIntent(catalog, intentId) {
  return safeArray(catalog?.intents).find(
    ({ intent_id: candidate }) => candidate === intentId,
  ) ?? null;
}

function catalogLimitation(catalog, topic) {
  return safeArray(catalog?.limitations).find(
    ({ topic: candidate }) => candidate === topic,
  ) ?? null;
}

function exactSuggestedIntent(catalog, normalizedInput) {
  return safeArray(catalog?.intents).find((intent) =>
    safeArray(intent.suggested_questions).some(
      (question) => normalizeAssistantQuery(question) === normalizedInput,
    ),
  ) ?? null;
}

export function classifyAssistantIntent({ catalog, input, intentId = null } = {}) {
  const normalizedInput = normalizeAssistantQuery(input);
  for (const [topic, pattern] of LIMITATION_PATTERNS) {
    if (!pattern.test(normalizedInput)) continue;
    const limitation = catalogLimitation(catalog, topic);
    if (limitation) {
      return {
        intentId: "intent:limitations",
        family: "limitations",
        limitationId: limitation.limitation_id,
        topic,
        matchedBy: "limitation",
      };
    }
  }

  const explicit = catalogIntent(catalog, intentId);
  if (explicit) {
    return {
      intentId: explicit.intent_id,
      family: explicit.family,
      limitationId: null,
      topic: null,
      matchedBy: "explicit_intent",
    };
  }
  const suggested = exactSuggestedIntent(catalog, normalizedInput);
  if (suggested) {
    return {
      intentId: suggested.intent_id,
      family: suggested.family,
      limitationId: null,
      topic: null,
      matchedBy: "suggested_question",
    };
  }
  for (const [candidateIntentId, pattern] of INTENT_PATTERNS) {
    if (!pattern.test(normalizedInput)) continue;
    const intent = catalogIntent(catalog, candidateIntentId);
    if (intent) {
      return {
        intentId: intent.intent_id,
        family: intent.family,
        limitationId: null,
        topic: null,
        matchedBy: "keyword_catalog",
      };
    }
  }
  return {
    intentId: null,
    family: null,
    limitationId: null,
    topic: null,
    matchedBy: "unknown",
  };
}

function supportedIntents(catalog) {
  return safeArray(catalog?.intents).map((intent) => ({
    intentId: intent.intent_id,
    family: intent.family,
    label: safeText(intent.label),
    question: safeText(intent.suggested_questions?.[0]),
  }));
}

function scenarioModel(scenarioContext) {
  const scenario = scenarioContext?.scenario ?? {};
  const scope = scenarioContext?.scope ?? {};
  return {
    districtId: scenario.district_id ?? scope.district_id ?? null,
    scopeMode: scenario.scope_mode ?? scope.scope_mode ?? null,
    quadrantId: scenario.quadrant_id ?? scope.quadrant_id ?? null,
    radiusMeters: scenario.radius_meters ?? scope.radius_meters ?? null,
    scopeText: safeText(scenarioContext?.scope_text, "Escenario activo"),
    comparableProjectCount: safeArray(
      scenarioContext?.comparable_project_ids,
    ).length,
    comparableProjectIds: unique(scenarioContext?.comparable_project_ids),
    cutoffAt: scenarioContext?.cutoff_at ?? null,
    status: scenarioContext?.scenario_status ?? null,
  };
}

function reference({ id, type, label, status, route, ...rest }) {
  return {
    id: safeText(id),
    type: safeText(type),
    label: safeText(label),
    status: safeText(status, "available"),
    route: route ? safeText(route) : null,
    ...rest,
  };
}

function scenarioReference(scenario) {
  return reference({
    id: "scenario:active",
    type: "scenario",
    label: scenario.scopeText,
    status: scenario.status ?? "available",
    route: "dashboard",
    districtId: scenario.districtId,
    scopeMode: scenario.scopeMode,
    comparableProjectCount: scenario.comparableProjectCount,
    cutoffAt: scenario.cutoffAt,
  });
}

function dedupeReferences(references) {
  const seen = new Set();
  return references.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function block(type, items = []) {
  return {
    type,
    title: BLOCK_TITLES[type],
    items: safeArray(items),
  };
}

function assemble({
  catalog,
  status,
  intent,
  limitationId = null,
  scenario,
  reasonCodes = [],
  answer = [],
  data = [],
  interpretation = [],
  limitations = [],
  references = [],
  nextStep = [],
}) {
  const finalReferences = dedupeReferences([
    ...(scenario?.districtId ? [scenarioReference(scenario)] : []),
    ...references,
  ]);
  const itemMap = {
    answer,
    data,
    interpretation,
    limitations,
    references: finalReferences,
    next_step: nextStep,
  };
  const blockTypes = safeArray(catalog?.answer_contract?.block_types);
  return {
    version: 1,
    mode: "deterministic_catalog",
    status,
    intentId: intent?.intent_id ?? null,
    family: intent?.family ?? null,
    responseKind: intent?.response_kind ?? null,
    limitationId,
    reasonCodes: unique(reasonCodes),
    scenario,
    blocks: blockTypes.map((type) => block(type, itemMap[type])),
    references: finalReferences,
    supportedIntents: supportedIntents(catalog),
  };
}

function textItem(id, text, tone = "neutral") {
  return { id, kind: "text", text: safeText(text), tone };
}

function actionItem(id, label, route, detail = null) {
  return {
    id,
    kind: "action",
    label: safeText(label),
    route: safeText(route),
    detail: detail ? safeText(detail) : null,
  };
}

function metricItem(id, label, value, unit = null, status = "observed") {
  return {
    id,
    kind: "metric",
    label: safeText(label),
    value,
    unit,
    status,
  };
}

function districtMentionWasIgnored(data, input, scenario) {
  const normalizedInput = normalizeAssistantQuery(input);
  if (!normalizedInput || !scenario.districtId) return false;
  return safeArray(data?.geography?.districts).some((district) => {
    if (district.district_id === scenario.districtId) return false;
    return unique([district.district_name, district.source_name]).some((name) => {
      const normalizedName = normalizeAssistantQuery(name);
      return normalizedName && normalizedInput.includes(normalizedName);
    });
  });
}

function dynamicLimitations({ foreignDistrict, extra = [] } = {}) {
  return [
    ...(foreignDistrict
      ? [
          textItem(
            "limitation:scenario-text-ignored",
            "La mención a otro distrito no cambia el escenario activo; la respuesta conserva su territorio y muestra canónicos.",
            "caution",
          ),
        ]
      : []),
    ...extra,
  ];
}

function benchmarkReferences(benchmarkContext, limit = 3) {
  const quantitative = benchmarkContext?.quantitative?.pricePerM2Total;
  const records = quantitative?.records?.length
    ? quantitative.records
    : quantitative?.orientative?.records;
  return safeArray(records)
    .slice(0, limit)
    .flatMap((record) => [
      ...(record.factId
        ? [
            reference({
              id: record.factId,
              type: "fact",
              label: `Precio publicado por m² · ${record.projectId}`,
              status: quantitative?.records?.length ? "certified" : "orientative",
              route: "benchmark",
              projectId: record.projectId,
            }),
          ]
        : []),
      ...safeArray(record.pairingEvidenceIds).map((evidenceId) =>
        reference({
          id: evidenceId,
          type: "evidence",
          label: `Evidencia de ${record.projectId}`,
          status: "available",
          route: "inspector",
          projectId: record.projectId,
        }),
      ),
    ]);
}

function scenarioSummary({ catalog, intent, scenario, scenarioContext, benchmarkContext, foreignDistrict }) {
  const quantitative = benchmarkContext?.quantitative?.pricePerM2Total;
  const eligibleCount = Number.isInteger(quantitative?.n) ? quantitative.n : 0;
  const orientativeCount = Number.isInteger(quantitative?.orientative?.n)
    ? quantitative.orientative.n
    : 0;
  const priceReferenceCount = safeArray(
    scenarioContext?.price_reference_project_ids,
  ).length;
  const benchmarkReady = benchmarkContext && !["error", "contract_unavailable"].includes(benchmarkContext.status);
  const status = scenario.comparableProjectCount > 0 && benchmarkReady
    ? "ready"
    : "insufficient";
  const extraLimits = [];
  if (!eligibleCount && orientativeCount) {
    extraLimits.push(
      textItem(
        "limitation:orientative-price",
        "Los cocientes orientativos no sustentan posicionamiento de precio porque precio y área no están vinculados a la misma oferta o tipología.",
        "caution",
      ),
    );
  }
  if (!scenario.comparableProjectCount) {
    extraLimits.push(
      textItem(
        "limitation:no-comparables",
        "No hay proyectos comparables en el escenario activo.",
        "caution",
      ),
    );
  }
  return assemble({
    catalog,
    status,
    intent,
    scenario,
    reasonCodes: status === "ready" ? [] : ["SCENARIO_EVIDENCE_INSUFFICIENT"],
    answer: [
      textItem(
        "answer:scenario",
        `${scenario.scopeText} reúne ${scenario.comparableProjectCount} proyectos comparables y ${priceReferenceCount} referencias publicadas de precio.`,
      ),
    ],
    data: [
      metricItem("metric:comparable-projects", "Proyectos comparables", scenario.comparableProjectCount, "projects"),
      metricItem("metric:price-references", "Referencias publicadas de precio", priceReferenceCount, "projects"),
      metricItem("metric:benchmark-eligible", "Parejas elegibles para precio por m²", eligibleCount, "projects", quantitative?.status ?? "insufficient"),
      metricItem("metric:benchmark-orientative", "Cocientes orientativos", orientativeCount, "projects", orientativeCount ? "orientative" : "insufficient"),
    ],
    interpretation: [
      textItem(
        "interpretation:scenario",
        eligibleCount
          ? "La lectura de posicionamiento utiliza únicamente pares elegibles del benchmark."
          : "La muestra permite revisar oferta visible, pero no afirmar un posicionamiento certificado de precio por m².",
      ),
    ],
    limitations: dynamicLimitations({ foreignDistrict, extra: extraLimits }),
    references: benchmarkReferences(benchmarkContext),
    nextStep: [
      actionItem("action:open-benchmark", "Revisar benchmark y cobertura", "benchmark"),
    ],
  });
}

function historyEventReferences(event) {
  const projectName = safeText(event?.project?.canonical_name, event?.project_id);
  return [
    reference({
      id: event.history_event_id,
      type: "history_event",
      label: `${projectName} · ${event.current_observed_at}`,
      status: event.effective_status,
      route: "activity",
      projectId: event.project_id,
    }),
    ...safeArray(event.fact_ids).map((factId) =>
      reference({
        id: factId,
        type: "fact",
        label: `Hecho de precio publicado · ${projectName}`,
        status: event.effective_status,
        route: "activity",
        projectId: event.project_id,
      }),
    ),
    ...safeArray(event.evidence_ids).map((evidenceId) =>
      reference({
        id: evidenceId,
        type: "evidence",
        label: `Evidencia temporal · ${projectName}`,
        status: event.evidence_status,
        route: "activity",
        projectId: event.project_id,
      }),
    ),
  ];
}

function historyDataItem(event) {
  return {
    id: event.history_event_id,
    kind: "history_change",
    label: safeText(event?.project?.canonical_name, event.project_id),
    projectId: event.project_id,
    previousValue: finiteNumber(event.previous_value),
    currentValue: finiteNumber(event.current_value),
    deltaAbsolute: finiteNumber(event.delta_absolute),
    deltaPercent: finiteNumber(event.delta_pct),
    unit: event.unit ?? null,
    currency: event.currency ?? null,
    previousObservedAt: event.previous_observed_at,
    currentObservedAt: event.current_observed_at,
    validity: event.validity,
    status: event.effective_status,
    cause: event.cause ?? null,
  };
}

function marketChanges({ catalog, intent, scenario, historyContext, foreignDistrict }) {
  const events = safeArray(historyContext?.timeline).slice(0, 3);
  const ready = historyContext?.status === "ready" && events.length > 0;
  return assemble({
    catalog,
    status: ready ? "ready" : "insufficient",
    intent,
    scenario,
    reasonCodes: ready ? [] : ["HISTORY_EVIDENCE_INSUFFICIENT"],
    answer: [
      textItem(
        "answer:market-changes",
        ready
          ? `El histórico muestra ${historyContext.coverage.shown_count} cambios de precio publicado en el escenario activo; se presentan primero los de mayor calidad según la política.`
          : "No hay cambios históricos utilizables con los filtros y el escenario activos.",
      ),
    ],
    data: events.map(historyDataItem),
    interpretation: [
      textItem(
        "interpretation:market-changes",
        "Cada cambio compara dos observaciones publicadas. No demuestra el momento exacto del cambio ni una causa comercial.",
      ),
    ],
    limitations: dynamicLimitations({
      foreignDistrict,
      extra: [
        textItem(
          "limitation:no-causality",
          "No se atribuyen causas cuando no existe evidencia causal autorizada.",
          "caution",
        ),
      ],
    }),
    references: events.flatMap(historyEventReferences),
    nextStep: [
      actionItem("action:open-history", "Abrir el cuaderno de señales", "activity"),
    ],
  });
}

function signalPriority({ catalog, intent, scenario, historyContext, foreignDistrict }) {
  const agendaItem = safeArray(historyContext?.agenda)[0] ?? null;
  const eventId = agendaItem?.references?.history_event_ids?.[0] ?? null;
  const event = safeArray(historyContext?.timeline).find(
    ({ history_event_id: candidate }) => candidate === eventId,
  ) ?? null;
  const ready = Boolean(
    agendaItem &&
      event &&
      ["review_observed_change", "validate_signal"].includes(agendaItem.action),
  );
  const dataItems = ready
    ? [{
        id: agendaItem.agenda_item_id,
        kind: "agenda_item",
        position: agendaItem.position,
        action: agendaItem.action,
        label: safeText(agendaItem.title),
        description: safeText(agendaItem.description),
        event: historyDataItem(event),
      }]
    : [];
  return assemble({
    catalog,
    status: ready ? "ready" : "insufficient",
    intent,
    scenario,
    reasonCodes: ready ? [] : ["PRIORITY_SIGNAL_UNAVAILABLE"],
    answer: [
      textItem(
        "answer:signal-priority",
        ready
          ? `${agendaItem.title}: ${agendaItem.description}`
          : "No existe una señal elegible para priorizar; corresponde revisar cobertura y filtros.",
      ),
    ],
    data: dataItems,
    interpretation: [
      textItem(
        "interpretation:signal-priority",
        ready
          ? "La prioridad proviene del orden calidad-primero del motor histórico, no de la magnitud aislada."
          : "La ausencia de una señal elegible no se convierte en una recomendación positiva.",
      ),
    ],
    limitations: dynamicLimitations({ foreignDistrict }),
    references: event ? historyEventReferences(event) : [],
    nextStep: [
      actionItem(
        ready ? "action:review-signal" : "action:review-history-filters",
        ready ? "Revisar la señal y su evidencia" : "Revisar filtros del histórico",
        "activity",
      ),
    ],
  });
}

function coverageQuality({ catalog, intent, scenario, historyContext, benchmarkContext, foreignDistrict }) {
  const historyCoverage = historyContext?.coverage ?? {};
  const quantitative = benchmarkContext?.quantitative?.pricePerM2Total ?? {};
  const qualitative = benchmarkContext?.qualitative ?? {};
  const ready = Boolean(
    scenario.districtId &&
      historyContext &&
      !["contract_unavailable", "invalid_context"].includes(historyContext.status) &&
      benchmarkContext &&
      !["contract_unavailable", "error"].includes(benchmarkContext.status),
  );
  return assemble({
    catalog,
    status: ready ? "ready" : "insufficient",
    intent,
    scenario,
    reasonCodes: ready ? [] : ["COVERAGE_CONTEXT_INSUFFICIENT"],
    answer: [
      textItem(
        "answer:coverage",
        ready
          ? `El escenario contiene ${scenario.comparableProjectCount} comparables; el histórico muestra ${historyCoverage.shown_count ?? 0} cambios y el benchmark usa ${quantitative.n ?? 0} pares elegibles.`
          : "La cobertura no puede evaluarse con los contextos disponibles.",
      ),
    ],
    data: [
      metricItem("metric:scenario-comparables", "Comparables del escenario", scenario.comparableProjectCount, "projects"),
      metricItem("metric:history-shown", "Cambios históricos visibles", historyCoverage.shown_count ?? 0, "events", historyContext?.status ?? "insufficient"),
      metricItem("metric:history-excluded", "Cambios excluidos por integridad", historyCoverage.scenario_excluded_count ?? 0, "events"),
      metricItem("metric:benchmark-eligible", "Pares cuantitativos elegibles", quantitative.n ?? 0, "projects", quantitative.status ?? "insufficient"),
      metricItem("metric:qualitative-informed", "Proyectos con atributos informados", qualitative.coverage?.usedProjectIds?.length ?? 0, "projects", qualitative.status ?? "insufficient"),
    ],
    interpretation: [
      textItem(
        "interpretation:coverage",
        "Cobertura territorial, histórica, cuantitativa y cualitativa son denominadores distintos y no deben sumarse ni intercambiarse.",
      ),
    ],
    limitations: dynamicLimitations({
      foreignDistrict,
      extra: quantitative.orientative?.n
        ? [
            textItem(
              "limitation:orientative-count",
              `${quantitative.orientative.n} cocientes son orientativos y no sustentan posicionamiento de precio.`,
              "caution",
            ),
          ]
        : [],
    }),
    references: benchmarkReferences(benchmarkContext),
    nextStep: [
      actionItem("action:inspect-methodology", "Revisar metodología y exclusiones", "benchmark"),
    ],
  });
}

function authorizedQualitativeFacts(inspectorDossier, scenario) {
  if (!inspectorDossier?.project?.project_id) return [];
  if (!scenario.comparableProjectIds.includes(inspectorDossier.project.project_id)) {
    return [];
  }
  const observations = new Map(
    safeArray(inspectorDossier.observations).map((item) => [
      item.observation_id,
      item,
    ]),
  );
  const evidence = new Map(
    safeArray(inspectorDossier.evidence).map((item) => [item.evidence_id, item]),
  );
  const eligible = new Set(
    safeArray(inspectorDossier?.decision?.eligibleFactIds),
  );
  return safeArray(inspectorDossier.facts)
    .filter(
      (fact) =>
        eligible.has(fact.fact_id) &&
        fact.semantic_type === "attribute" &&
        fact.quality_status === "certified" &&
        fact.normalized_value !== "unknown",
    )
    .map((fact) => {
      const observation = observations.get(fact.observation_id);
      const authorizedEvidence = safeArray(observation?.evidence_ids)
        .map((evidenceId) => evidence.get(evidenceId))
        .filter(
          (item) =>
            item?.publish_permission === "authorized" &&
            item?.availability === "available",
        );
      return { fact, observation, evidence: authorizedEvidence };
    })
    .filter(({ evidence }) => evidence.length > 0)
    .sort((left, right) => left.fact.fact_id.localeCompare(right.fact.fact_id));
}

function qualitativeEvidence({ catalog, intent, scenario, inspectorDossier, foreignDistrict }) {
  const records = authorizedQualitativeFacts(inspectorDossier, scenario);
  const ready = records.length > 0;
  const references = records.flatMap(({ fact, evidence }) => [
    reference({
      id: fact.fact_id,
      type: "fact",
      label: `${safeText(fact.field_name)} · ${safeText(fact.normalized_value)}`,
      status: fact.quality_status,
      route: "inspector",
      projectId: inspectorDossier.project.project_id,
    }),
    ...evidence.map((item) =>
      reference({
        id: item.evidence_id,
        type: "evidence",
        label: safeText(item.fragment, "Evidencia documental autorizada"),
        status: "available",
        route: "inspector",
        projectId: inspectorDossier.project.project_id,
        capturedAt: item.captured_at,
      }),
    ),
  ]);
  return assemble({
    catalog,
    status: ready ? "ready" : "insufficient",
    intent,
    scenario,
    reasonCodes: ready ? [] : ["AUTHORIZED_QUALITATIVE_EVIDENCE_REQUIRED"],
    answer: [
      textItem(
        "answer:qualitative",
        ready
          ? `El expediente activo contiene ${records.length} atributo${records.length === 1 ? "" : "s"} certificado${records.length === 1 ? "" : "s"} con evidencia autorizada.`
          : "No existe una afirmación cualitativa certificada y respaldada por evidencia autorizada dentro del escenario activo.",
      ),
    ],
    data: records.map(({ fact, evidence }) => ({
      id: fact.fact_id,
      kind: "qualitative_fact",
      label: safeText(fact.field_name),
      value: safeText(fact.normalized_value),
      originalValue: safeText(fact.original_value),
      status: fact.quality_status,
      evidenceIds: evidence.map(({ evidence_id: id }) => id),
    })),
    interpretation: [
      textItem(
        "interpretation:qualitative",
        ready
          ? "La respuesta describe únicamente lo documentado; no generaliza el atributo a otros proyectos o tipologías."
          : "Ausencia, restricción o incompatibilidad de evidencia se trata como información insuficiente, no como atributo falso.",
      ),
    ],
    limitations: dynamicLimitations({ foreignDistrict }),
    references,
    nextStep: [
      actionItem("action:open-inspector", "Abrir el expediente y la evidencia", "inspector"),
    ],
  });
}

function comparisonReferences(comparisonModel) {
  return safeArray(comparisonModel?.groups)
    .flatMap(({ rows }) => safeArray(rows))
    .filter(({ id }) => safeArray(comparisonModel?.priorityRows).includes(id))
    .flatMap(({ values }) => safeArray(values))
    .filter(({ factId }) => factId)
    .map((value) =>
      reference({
        id: value.factId,
        type: "fact",
        label: `Dato comparado · ${value.projectId}`,
        status: value.state,
        route: "compare",
        projectId: value.projectId,
      }),
    );
}

function projectComparison({ catalog, intent, scenario, comparisonModel, foreignDistrict }) {
  const priorityIds = safeArray(comparisonModel?.priorityRows);
  const rows = safeArray(comparisonModel?.groups)
    .flatMap(({ rows: groupRows }) => safeArray(groupRows))
    .filter(({ id }) => priorityIds.includes(id));
  const ready = comparisonModel?.status === "ready" && rows.length > 0;
  return assemble({
    catalog,
    status: ready ? "ready" : "insufficient",
    intent,
    scenario,
    reasonCodes: ready ? [] : ["COMPARISON_SELECTION_INSUFFICIENT"],
    answer: [
      textItem(
        "answer:comparison",
        ready
          ? `La comparación encuentra ${rows.length} fila${rows.length === 1 ? "" : "s"} prioritaria${rows.length === 1 ? "" : "s"} entre ${comparisonModel.selected.length} proyectos seleccionados.`
          : "Se requieren al menos dos proyectos comparables y datos referenciados para producir una lectura.",
      ),
    ],
    data: rows.map((row) => ({
      id: row.id,
      kind: "comparison_row",
      label: safeText(row.label),
      hasDifference: row.hasDifference,
      hasExcluded: row.hasExcluded,
      values: safeArray(row.values).map((value) => ({
        projectId: value.projectId,
        state: value.state,
        value: value.normalizedValue ?? null,
        unit: value.unit ?? null,
        currency: value.currency ?? null,
        factId: value.factId ?? null,
      })),
    })),
    interpretation: safeArray(comparisonModel?.conclusion).map((finding) =>
      textItem(finding.id, `${finding.finding} ${finding.implication}`),
    ),
    limitations: dynamicLimitations({
      foreignDistrict,
      extra: safeArray(comparisonModel?.limitations).map((text, index) =>
        textItem(`limitation:comparison-${index + 1}`, text, "caution"),
      ),
    }),
    references: comparisonReferences(comparisonModel),
    nextStep: [
      actionItem("action:open-comparison", "Revisar la comparación por filas", "compare"),
    ],
  });
}

function limitationsAnswer({ catalog, intent, scenario, foreignDistrict }) {
  return assemble({
    catalog,
    status: "ready",
    intent,
    scenario,
    answer: [
      textItem(
        "answer:limitations",
        "La demo responde sobre escenario, benchmark, histórico, atributos documentados y comparaciones; no sustituye evidencia que el dataset no contiene.",
      ),
    ],
    data: [],
    interpretation: [
      textItem(
        "interpretation:limitations",
        "Una respuesta prudente puede ser insuficiente o un rechazo explícito; eso protege la trazabilidad del análisis.",
      ),
    ],
    limitations: dynamicLimitations({
      foreignDistrict,
      extra: safeArray(catalog.limitations).map((item) =>
        textItem(item.limitation_id, item.message, "caution"),
      ),
    }),
    references: [],
    nextStep: [
      actionItem("action:choose-question", "Elegir una pregunta compatible", "assistant"),
    ],
  });
}

function refusal({ catalog, scenario, classification, foreignDistrict }) {
  const intent = catalogIntent(catalog, "intent:limitations");
  const limitation = safeArray(catalog.limitations).find(
    ({ limitation_id: id }) => id === classification.limitationId,
  );
  return assemble({
    catalog,
    status: "refused",
    intent,
    limitationId: classification.limitationId,
    scenario,
    reasonCodes: [
      `REFUSED_${String(classification.topic).toUpperCase()}`,
      ...(foreignDistrict ? ["MENTIONED_DISTRICT_IGNORED"] : []),
    ],
    answer: [
      textItem(
        "answer:refusal",
        limitation?.message ?? "La evidencia disponible no permite responder esa pregunta.",
        "caution",
      ),
    ],
    data: [],
    interpretation: [
      textItem(
        "interpretation:refusal",
        "El asistente no transforma precios publicados en cierres, no atribuye causas, no predice y no amplía el dataset mediante solicitudes externas.",
      ),
    ],
    limitations: dynamicLimitations({
      foreignDistrict,
      extra: limitation
        ? [textItem(limitation.limitation_id, limitation.message, "caution")]
        : [],
    }),
    references: [],
    nextStep: [
      actionItem(
        "action:choose-supported-question",
        "Elegir una pregunta compatible sobre datos observados",
        "assistant",
      ),
    ],
  });
}

function unavailableResponse({ catalog, scenario, status, reasonCode, message }) {
  return assemble({
    catalog,
    status,
    intent: null,
    scenario,
    reasonCodes: [reasonCode],
    answer: [textItem("answer:unavailable", message, "caution")],
    interpretation: [
      textItem(
        "interpretation:unavailable",
        "No se genera una respuesta parcial ni se consulta una fuente externa.",
      ),
    ],
    limitations: [],
    references: [],
    nextStep: [
      actionItem("action:choose-question", "Elegir una pregunta compatible", "assistant"),
    ],
  });
}

export function buildAssistantResponse({
  data,
  scenarioContext,
  historyContext = null,
  benchmarkContext = null,
  comparisonModel = null,
  inspectorDossier = null,
  input = "",
  intentId = null,
} = {}) {
  const catalog = data?.assistant;
  const scenario = scenarioModel(scenarioContext);
  const fallbackCatalog = catalog?.answer_contract?.block_types
    ? catalog
    : {
        intents: [],
        limitations: [],
        answer_contract: { block_types: Object.keys(BLOCK_TITLES) },
      };
  if (
    !catalog ||
    catalog.version !== 1 ||
    !minimumContractAvailable(
      data?.metadata?.contract_version,
      catalog?.compatibility?.minimum_contract_version,
    )
  ) {
    return unavailableResponse({
      catalog: fallbackCatalog,
      scenario,
      status: "contract_unavailable",
      reasonCode: "ASSISTANT_CONTRACT_UNAVAILABLE",
      message: "El contrato activo no publica un catálogo semántico compatible.",
    });
  }
  const inputLength = typeof input === "string" ? input.length : 0;
  const normalizedInputLength = normalizeAssistantQuery(input).length;
  if (
    normalizedInputLength === 0 ||
    inputLength > catalog.policy.maximum_input_characters
  ) {
    return unavailableResponse({
      catalog,
      scenario,
      status: "invalid_input",
      reasonCode: normalizedInputLength === 0 ? "INPUT_REQUIRED" : "INPUT_TOO_LONG",
      message:
        normalizedInputLength === 0
          ? "Escriba o elija una pregunta compatible."
          : `La consulta supera el límite de ${catalog.policy.maximum_input_characters} caracteres.`,
    });
  }

  const classification = classifyAssistantIntent({ catalog, input, intentId });
  const foreignDistrict = districtMentionWasIgnored(data, input, scenario);
  if (classification.limitationId) {
    return refusal({ catalog, scenario, classification, foreignDistrict });
  }
  const intent = catalogIntent(catalog, classification.intentId);
  if (!intent) {
    const response = unavailableResponse({
      catalog,
      scenario,
      status: "unknown_intent",
      reasonCode: "UNKNOWN_INTENT",
      message: "La consulta no coincide con una pregunta compatible del catálogo.",
    });
    response.supportedIntents = supportedIntents(catalog);
    return response;
  }
  if (
    !scenario.districtId ||
    !Array.isArray(scenarioContext?.comparable_project_ids)
  ) {
    return assemble({
      catalog,
      status: "insufficient",
      intent,
      scenario,
      reasonCodes: ["SCENARIO_CONTEXT_REQUIRED"],
      answer: [
        textItem(
          "answer:scenario-required",
          "No existe un escenario canónico disponible para responder esta pregunta.",
          "caution",
        ),
      ],
      interpretation: [
        textItem(
          "interpretation:scenario-required",
          "El asistente no construye un territorio o una muestra alternativa desde el texto de la consulta.",
        ),
      ],
      limitations: [
        textItem(
          "limitation:scenario-required",
          "Seleccione o restaure un escenario válido antes de generar la lectura.",
          "caution",
        ),
      ],
      nextStep: [
        actionItem(
          "action:restore-scenario",
          "Restaurar el escenario",
          "dashboard",
        ),
      ],
    });
  }

  const common = {
    catalog,
    intent,
    scenario,
    foreignDistrict,
  };
  let response;
  if (intent.intent_id === "intent:scenario-summary") {
    response = scenarioSummary({
      ...common,
      scenarioContext,
      benchmarkContext,
    });
  } else if (intent.intent_id === "intent:market-changes") {
    response = marketChanges({ ...common, historyContext });
  } else if (intent.intent_id === "intent:signal-priority") {
    response = signalPriority({ ...common, historyContext });
  } else if (intent.intent_id === "intent:coverage-quality") {
    response = coverageQuality({
      ...common,
      historyContext,
      benchmarkContext,
    });
  } else if (intent.intent_id === "intent:qualitative-evidence") {
    response = qualitativeEvidence({ ...common, inspectorDossier });
  } else if (intent.intent_id === "intent:project-comparison") {
    response = projectComparison({ ...common, comparisonModel });
  } else {
    response = limitationsAnswer(common);
  }
  if (foreignDistrict && !response.reasonCodes.includes("MENTIONED_DISTRICT_IGNORED")) {
    response.reasonCodes.push("MENTIONED_DISTRICT_IGNORED");
  }
  return response;
}
