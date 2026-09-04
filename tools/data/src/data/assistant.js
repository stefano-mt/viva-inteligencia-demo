const REQUIRED_FAMILIES = Object.freeze([
  "scenario_summary",
  "market_changes",
  "signal_priority",
  "coverage_quality",
  "qualitative_evidence",
  "project_comparison",
  "limitations"
]);

const REQUIRED_LIMITATION_TOPICS = Object.freeze([
  "closing_price",
  "causality",
  "prediction",
  "personal_data",
  "external_data"
]);

const compareStrings = (left, right) => String(left).localeCompare(String(right));
const uniqueSorted = (values = []) => [...new Set(values)].sort(compareStrings);

function duplicates(values) {
  const seen = new Set();
  return uniqueSorted(
    values.filter((value) => {
      if (seen.has(value)) return true;
      seen.add(value);
      return false;
    })
  );
}

export function validateAssistantCatalog(catalog) {
  const errors = [];
  if (catalog === null || typeof catalog !== "object" || Array.isArray(catalog)) {
    return ["assistant catalog must be an object"];
  }
  if (catalog.version !== 1) errors.push("assistant version must equal 1");
  if (catalog.policy?.mode !== "deterministic_catalog") {
    errors.push("assistant mode must equal deterministic_catalog");
  }
  if (catalog.policy?.query_persistence !== false) {
    errors.push("query_persistence must equal false");
  }
  if (catalog.policy?.external_requests !== false) {
    errors.push("external_requests must equal false");
  }
  if (!Array.isArray(catalog.intents)) {
    errors.push("assistant intents must be an array");
  } else {
    for (const intentId of duplicates(
      catalog.intents.map((intent) => intent.intent_id)
    )) {
      errors.push(`duplicate intent_id ${intentId}`);
    }
    const families = catalog.intents.map((intent) => intent.family);
    for (const family of REQUIRED_FAMILIES) {
      if (!families.includes(family)) errors.push(`missing intent family ${family}`);
    }
    for (const intent of catalog.intents) {
      if (!Array.isArray(intent.suggested_questions) || intent.suggested_questions.length === 0) {
        errors.push(`${intent.intent_id ?? "unknown intent"} requires suggested questions`);
      }
      if (!Array.isArray(intent.required_capabilities) || intent.required_capabilities.length === 0) {
        errors.push(`${intent.intent_id ?? "unknown intent"} requires capabilities`);
      }
    }
  }
  if (!Array.isArray(catalog.limitations)) {
    errors.push("assistant limitations must be an array");
  } else {
    for (const limitationId of duplicates(
      catalog.limitations.map((limitation) => limitation.limitation_id)
    )) {
      errors.push(`duplicate limitation_id ${limitationId}`);
    }
    const topics = catalog.limitations.map((limitation) => limitation.topic);
    for (const topic of REQUIRED_LIMITATION_TOPICS) {
      if (!topics.includes(topic)) errors.push(`missing limitation topic ${topic}`);
    }
  }
  if (catalog.compatibility?.minimum_contract_version !== "2.4.0") {
    errors.push("assistant minimum contract version must equal 2.4.0");
  }
  return uniqueSorted(errors);
}

function baseResult({ intent, scenarioDistrictId }) {
  return {
    intent_id: intent?.intent_id ?? null,
    family: intent?.family ?? null,
    outcome: "answer",
    scenario_district_id: scenarioDistrictId ?? null,
    query_changes_scenario: false,
    reference_policy: intent?.reference_policy ?? null,
    fact_ids: [],
    evidence_ids: [],
    limitation_id: null,
    reason_codes: [],
    supported_families: []
  };
}

export function evaluateAssistantRequest(input, catalog) {
  const errors = validateAssistantCatalog(catalog);
  if (errors.length > 0) {
    throw new Error(`Invalid assistant catalog:\n- ${errors.join("\n- ")}`);
  }

  const intent = catalog.intents.find(
    ({ intent_id: intentId }) => intentId === input?.intent_id
  );
  const result = baseResult({
    intent,
    scenarioDistrictId: input?.scenario_district_id
  });

  if (!intent) {
    return {
      ...result,
      outcome: catalog.policy.unknown_intent_behavior,
      reason_codes: ["unknown_intent"],
      supported_families: catalog.intents.map(({ family }) => family)
    };
  }

  const limitation = input?.limitation_topic
    ? catalog.limitations.find(({ topic }) => topic === input.limitation_topic)
    : null;
  if (limitation) {
    return {
      ...result,
      outcome: limitation.behavior,
      limitation_id: limitation.limitation_id,
      reason_codes: [limitation.topic]
    };
  }

  const factIds = uniqueSorted(input?.fact_ids ?? []);
  const evidenceIds = uniqueSorted(input?.evidence_ids ?? []);
  const evidenceState = input?.evidence_state ?? "not_required";
  if (intent.reference_policy === "qualitative_evidence_required") {
    if (evidenceState === "restricted") {
      return {
        ...result,
        outcome: "state_insufficient_evidence",
        reason_codes: ["restricted_evidence"]
      };
    }
    if (evidenceState === "unknown") {
      return {
        ...result,
        outcome: "state_insufficient_evidence",
        reason_codes: ["unknown_evidence"]
      };
    }
    if (["conflicting", "incompatible"].includes(evidenceState)) {
      return {
        ...result,
        outcome: "state_insufficient_evidence",
        reason_codes: ["conflicting_evidence"]
      };
    }
    if (evidenceState !== "authorized" || factIds.length === 0 || evidenceIds.length === 0) {
      return {
        ...result,
        outcome: "state_insufficient_evidence",
        reason_codes: ["missing_references"]
      };
    }
    result.fact_ids = factIds;
    result.evidence_ids = evidenceIds;
  }

  if (
    input?.mentioned_district_id &&
    input.mentioned_district_id !== input?.scenario_district_id
  ) {
    result.reason_codes = ["scenario_text_ignored"];
  }
  return result;
}
