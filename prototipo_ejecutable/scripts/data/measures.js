const MARKET_CURRENCIES = new Set(["PEN", "USD"]);
const KNOWN_AREA_TYPES = new Set(["built", "free", "total"]);
const PRICE_TYPES = new Set([
  "list",
  "from",
  "sale",
  "estimated",
  "scenario",
]);
const RFC3339_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/;

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function factValue(fact) {
  return finiteNumber(fact?.normalized_value) ? fact.normalized_value : null;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function unavailable(status, reason, extra = {}) {
  return {
    status,
    value: null,
    benchmark_eligible: false,
    exclusion_reasons: [reason],
    ...extra,
  };
}

function compatibleUnits(leftFact, rightFact) {
  const semanticType = leftFact?.semantic_type;
  const priceTypeCompatible =
    !["price", "price_per_m2"].includes(semanticType) ||
    (
      PRICE_TYPES.has(leftFact?.price_type) &&
      PRICE_TYPES.has(rightFact?.price_type) &&
      leftFact.price_type === rightFact.price_type
    );
  return (
    semanticType === rightFact?.semantic_type &&
    leftFact?.unit === rightFact?.unit &&
    leftFact?.currency === rightFact?.currency &&
    priceTypeCompatible
  );
}

function parseRfc3339(value) {
  if (typeof value !== "string") return null;
  const match = RFC3339_PATTERN.exec(value);
  if (!match) return null;

  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
    ,
    offsetHourText,
    offsetMinuteText,
  ] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour =
    offsetHourText === undefined ? 0 : Number(offsetHourText);
  const offsetMinute =
    offsetMinuteText === undefined ? 0 : Number(offsetMinuteText);
  const leapYear =
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth[month - 1] ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    return null;
  }

  const timestamp = Date.parse(value);
  return finiteNumber(timestamp) ? timestamp : null;
}

function issueIdForEvent(eventId, suffix) {
  const localId = String(eventId ?? "")
    .replace(/^[a-z][a-z0-9_-]*:/, "")
    .replace(/[^a-z0-9._-]+/g, "-");
  return `issue:${localId}-${suffix}`;
}

function cloneRecord(record) {
  return structuredClone(record);
}

function collectRecords(fixtures, key) {
  return fixtures.flatMap((fixture) => fixture?.input?.[key] ?? []).map(cloneRecord);
}

function sortById(records, idField) {
  return [...records].sort((left, right) =>
    left[idField].localeCompare(right[idField]),
  );
}

function assertUnique(records, idField) {
  const ids = records.map((record) => record[idField]);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Duplicate ${idField} in materialized measure records.`);
  }
}

export function halfUp(value, digits = 2) {
  if (!finiteNumber(value) || !Number.isInteger(digits) || digits < 0 || digits > 8) {
    return null;
  }

  const factor = 10 ** digits;
  const magnitude = Math.abs(value);
  if (!finiteNumber(factor) || !finiteNumber(magnitude)) return null;
  const scaled = magnitude * factor;
  if (!finiteNumber(scaled)) return null;
  const adjustment =
    Number.EPSILON * Math.max(1, scaled);
  if (!finiteNumber(adjustment)) return null;
  const roundedMagnitude = Math.floor(
    scaled + 0.5 + adjustment,
  );
  if (!finiteNumber(roundedMagnitude)) return null;
  const result = (Math.sign(value) * roundedMagnitude) / factor;
  return finiteNumber(result) ? result : null;
}

export function evaluateDerivedEligibility(inputFacts, options = {}) {
  const {
    compatible = true,
    semanticKnown = true,
    additionalReasons = [],
  } = options;
  const reasons = [...additionalReasons];

  if (!Array.isArray(inputFacts) || inputFacts.length === 0) {
    reasons.push("missing_inputs");
  } else {
    for (const fact of inputFacts) {
      if (!fact) {
        reasons.push("missing_input");
        continue;
      }
      if (fact.value_kind === "simulated") reasons.push("simulated_input");
      if (fact.benchmark_eligible !== true) reasons.push("input_ineligible");
      if (fact.quality_status !== "certified") {
        reasons.push(`input_quality_${fact.quality_status}`);
      }
      if (
        fact.currency === "unknown" ||
        fact.area_type === "unknown" ||
        fact.denominator_area_type === "unknown"
      ) {
        reasons.push("unknown_semantics");
      }
    }
  }

  if (!compatible) reasons.push("incompatible_inputs");
  if (!semanticKnown) reasons.push("unknown_semantics");

  const exclusionReasons = uniqueSorted(reasons);
  return {
    benchmark_eligible: exclusionReasons.length === 0,
    exclusion_reasons: exclusionReasons,
  };
}

export function calculatePricePerM2(
  priceFact,
  areaFact,
  options = {},
) {
  const denominatorAreaType =
    options.denominatorAreaType ?? areaFact?.area_type ?? null;
  const digits = options.digits ?? 2;
  const price = factValue(priceFact);
  const area = factValue(areaFact);

  if (price === null || area === null) {
    return unavailable(
      "insufficient",
      "missing_numeric_input",
      {
        currency: priceFact?.currency ?? null,
        unit: null,
        price_type: priceFact?.price_type ?? null,
        denominator_area_type: denominatorAreaType,
      },
    );
  }

  if (area <= 0) {
    return unavailable(
      "insufficient",
      "non_positive_area",
      {
        currency: priceFact?.currency ?? null,
        unit: null,
        price_type: priceFact?.price_type ?? null,
        denominator_area_type: denominatorAreaType,
      },
    );
  }

  const currency = priceFact?.currency;
  const compatible =
    priceFact?.semantic_type === "price" &&
    areaFact?.semantic_type === "area" &&
    MARKET_CURRENCIES.has(currency) &&
    priceFact?.unit === currency &&
    areaFact?.unit === "m2" &&
    KNOWN_AREA_TYPES.has(denominatorAreaType) &&
    areaFact?.area_type === denominatorAreaType &&
    PRICE_TYPES.has(priceFact?.price_type);

  if (!compatible) {
    return unavailable(
      "incompatible",
      "incompatible_currency_or_denominator",
      {
        currency: MARKET_CURRENCIES.has(currency) ? currency : null,
        unit: null,
        price_type: priceFact?.price_type ?? null,
        denominator_area_type: denominatorAreaType,
      },
    );
  }

  const rawValue = price / area;
  if (!finiteNumber(rawValue)) {
    return unavailable(
      "insufficient",
      "non_finite_result",
      {
        currency,
        unit: `${currency}/m2`,
        price_type: priceFact.price_type,
        denominator_area_type: denominatorAreaType,
      },
    );
  }
  const value = halfUp(rawValue, digits);
  if (value === null) {
    return unavailable(
      "insufficient",
      "non_finite_result",
      {
        currency,
        unit: `${currency}/m2`,
        price_type: priceFact.price_type,
        denominator_area_type: denominatorAreaType,
      },
    );
  }

  const eligibility = evaluateDerivedEligibility([priceFact, areaFact]);
  return {
    status: eligibility.benchmark_eligible ? "certified" : "review_required",
    value,
    currency,
    unit: `${currency}/m2`,
    price_type: priceFact.price_type,
    denominator_area_type: denominatorAreaType,
    price_fact_id: priceFact.fact_id,
    area_fact_id: areaFact.fact_id,
    ...eligibility,
  };
}

export function calculateFreeArea(totalAreaFact, builtAreaFact, options = {}) {
  const digits = options.digits ?? 2;
  const totalArea = factValue(totalAreaFact);
  const builtArea = factValue(builtAreaFact);

  if (totalArea === null || builtArea === null) {
    return unavailable(
      "insufficient",
      "missing_numeric_input",
      { area_type: "free", unit: "m2" },
    );
  }

  const compatible =
    totalAreaFact?.semantic_type === "area" &&
    builtAreaFact?.semantic_type === "area" &&
    totalAreaFact?.unit === "m2" &&
    builtAreaFact?.unit === "m2" &&
    totalAreaFact?.area_type === "total" &&
    builtAreaFact?.area_type === "built";

  if (!compatible || totalArea < builtArea) {
    return unavailable(
      "incompatible",
      compatible ? "negative_free_area" : "incompatible_area_semantics",
      { area_type: "free", unit: "m2" },
    );
  }

  const rawValue = totalArea - builtArea;
  if (!finiteNumber(rawValue)) {
    return unavailable(
      "insufficient",
      "non_finite_result",
      { area_type: "free", unit: "m2" },
    );
  }
  const value = halfUp(rawValue, digits);
  if (value === null) {
    return unavailable(
      "insufficient",
      "non_finite_result",
      { area_type: "free", unit: "m2" },
    );
  }

  const eligibility = evaluateDerivedEligibility([
    totalAreaFact,
    builtAreaFact,
  ]);
  return {
    status: eligibility.benchmark_eligible ? "certified" : "review_required",
    value,
    area_type: "free",
    unit: "m2",
    total_area_fact_id: totalAreaFact.fact_id,
    built_area_fact_id: builtAreaFact.fact_id,
    ...eligibility,
  };
}

export function calculateDifference(
  minuendFact,
  subtrahendFact,
  options = {},
) {
  const percentageBaseFact = options.percentageBaseFact ?? minuendFact;
  const allowAreaTypeMismatch = options.allowAreaTypeMismatch === true;
  const digits = options.digits ?? 2;
  const minuend = factValue(minuendFact);
  const subtrahend = factValue(subtrahendFact);
  const percentageBase = factValue(percentageBaseFact);

  if (minuend === null || subtrahend === null || percentageBase === null) {
    return {
      status: "insufficient",
      delta: null,
      percentage: null,
      percentage_base_fact_id: percentageBaseFact?.fact_id ?? null,
      result_area_type: null,
      benchmark_eligible: false,
      exclusion_reasons: ["missing_numeric_input"],
      issue_codes: [],
    };
  }

  const unitsCompatible =
    compatibleUnits(minuendFact, subtrahendFact) &&
    compatibleUnits(minuendFact, percentageBaseFact);
  const isArea = minuendFact?.semantic_type === "area";
  const isPricePerM2 =
    minuendFact?.semantic_type === "price_per_m2";
  const areaTypesMatch =
    !isArea ||
    (
      minuendFact?.area_type === subtrahendFact?.area_type &&
      minuendFact?.area_type === percentageBaseFact?.area_type
    );
  const denominatorAreaTypesMatch =
    !isPricePerM2 ||
    (
      KNOWN_AREA_TYPES.has(minuendFact?.denominator_area_type) &&
      minuendFact.denominator_area_type ===
        subtrahendFact?.denominator_area_type &&
      minuendFact.denominator_area_type ===
        percentageBaseFact?.denominator_area_type
    );

  if (
    !unitsCompatible ||
    !denominatorAreaTypesMatch ||
    (!areaTypesMatch && !allowAreaTypeMismatch)
  ) {
    return {
      status: "incompatible",
      delta: null,
      percentage: null,
      percentage_base_fact_id: percentageBaseFact?.fact_id ?? null,
      result_area_type: null,
      benchmark_eligible: false,
      exclusion_reasons: ["incompatible_inputs"],
      issue_codes: [],
    };
  }

  const rawDelta = minuend - subtrahend;
  if (!finiteNumber(rawDelta)) {
    return {
      status: "insufficient",
      delta: null,
      percentage: null,
      percentage_base_fact_id: percentageBaseFact.fact_id,
      result_area_type: null,
      benchmark_eligible: false,
      exclusion_reasons: ["non_finite_result"],
      issue_codes: [],
    };
  }
  const delta = halfUp(rawDelta, digits);
  if (delta === null) {
    return {
      status: "insufficient",
      delta: null,
      percentage: null,
      percentage_base_fact_id: percentageBaseFact.fact_id,
      result_area_type: null,
      benchmark_eligible: false,
      exclusion_reasons: ["non_finite_result"],
      issue_codes: [],
    };
  }
  let percentage = null;
  if (percentageBase !== 0) {
    const rawRatio = delta / percentageBase;
    const rawPercentage = rawRatio * 100;
    if (!finiteNumber(rawRatio) || !finiteNumber(rawPercentage)) {
      return {
        status: "insufficient",
        delta: null,
        percentage: null,
        percentage_base_fact_id: percentageBaseFact.fact_id,
        result_area_type: null,
        benchmark_eligible: false,
        exclusion_reasons: ["non_finite_result"],
        issue_codes: [],
      };
    }
    percentage = halfUp(rawPercentage, digits);
    if (percentage === null) {
      return {
        status: "insufficient",
        delta: null,
        percentage: null,
        percentage_base_fact_id: percentageBaseFact.fact_id,
        result_area_type: null,
        benchmark_eligible: false,
        exclusion_reasons: ["non_finite_result"],
        issue_codes: [],
      };
    }
  }
  const issueCodes = percentageBase === 0 ? ["PERCENT_BASE_ZERO"] : [];
  const eligibility = evaluateDerivedEligibility(
    [minuendFact, subtrahendFact, percentageBaseFact],
    {
      compatible:
        unitsCompatible &&
        areaTypesMatch &&
        denominatorAreaTypesMatch,
    },
  );

  return {
    status:
      issueCodes.length > 0 || !eligibility.benchmark_eligible
        ? "review_required"
        : "certified",
    delta,
    percentage,
    percentage_base_fact_id: percentageBaseFact.fact_id,
    result_area_type: isArea
      ? areaTypesMatch
        ? minuendFact.area_type
        : "unknown"
      : null,
    ...eligibility,
    issue_codes: issueCodes,
  };
}

export function calculateChange(previousFact, newFact, options = {}) {
  return calculateDifference(newFact, previousFact, {
    ...options,
    percentageBaseFact: previousFact,
    allowAreaTypeMismatch: false,
  });
}

export function buildChangeEvent(options) {
  const {
    eventId,
    previousFact,
    newFact,
    previousCapturedAt:
      explicitPreviousCapturedAt = null,
    newCapturedAt: explicitNewCapturedAt = null,
    previousObservation = null,
    newObservation = null,
    effectiveAt,
    observedAt,
    cause = null,
    causeEvidenceIds = [],
    extremeThreshold = 50,
    zeroBaseIssueId = null,
    extremeIssueId = null,
  } = options;
  const previousCapturedAt =
    explicitPreviousCapturedAt ??
    previousObservation?.captured_at ??
    null;
  const newCapturedAt =
    explicitNewCapturedAt ??
    newObservation?.captured_at ??
    null;
  const previousTimestamp = parseRfc3339(previousCapturedAt);
  const newTimestamp = parseRfc3339(newCapturedAt);
  const effectiveTimestamp = parseRfc3339(effectiveAt);
  const observedTimestamp = parseRfc3339(observedAt);
  const change = calculateChange(previousFact, newFact);
  const eventFactsCompatible =
    previousFact?.entity_id === newFact?.entity_id &&
    previousFact?.field_name === newFact?.field_name;
  const observationFactsCompatible =
    (
      previousObservation === null ||
      previousObservation?.observation_id ===
        previousFact?.observation_id
    ) &&
    (
      newObservation === null ||
      newObservation?.observation_id ===
        newFact?.observation_id
    ) &&
    (
      explicitPreviousCapturedAt === null ||
      previousObservation === null ||
      explicitPreviousCapturedAt ===
        previousObservation?.captured_at
    ) &&
    (
      explicitNewCapturedAt === null ||
      newObservation === null ||
      explicitNewCapturedAt ===
        newObservation?.captured_at
    );
  const chronologyValid =
    previousTimestamp !== null &&
    newTimestamp !== null &&
    effectiveTimestamp !== null &&
    observedTimestamp !== null &&
    previousTimestamp < newTimestamp &&
    observedAt === newCapturedAt &&
    effectiveTimestamp > previousTimestamp &&
    effectiveTimestamp <= newTimestamp;

  if (
    !eventId ||
    !previousFact ||
    !newFact ||
    !effectiveAt ||
    !observedAt ||
    !eventFactsCompatible ||
    !observationFactsCompatible ||
    !chronologyValid ||
    change.status === "insufficient" ||
    change.status === "incompatible"
  ) {
    return {
      status:
        !eventFactsCompatible ||
        !observationFactsCompatible ||
        change.status === "incompatible"
          ? "incompatible"
          : "insufficient",
      event: null,
      issues: [],
    };
  }

  if (cause !== null && causeEvidenceIds.length === 0) {
    return {
      status: "incompatible",
      event: null,
      issues: [],
    };
  }

  const extreme =
    change.percentage !== null &&
    Math.abs(change.percentage) > extremeThreshold;
  const zeroBase = change.percentage === null;
  const qualityStatus =
    extreme || zeroBase || !change.benchmark_eligible
      ? "reviewable"
      : "certified";
  const event = {
    event_id: eventId,
    entity_id: newFact.entity_id,
    field_name: newFact.field_name,
    previous_fact_id: previousFact.fact_id,
    new_fact_id: newFact.fact_id,
    effective_at: effectiveAt,
    observed_at: observedAt,
    delta: change.delta,
    percentage: change.percentage,
    percentage_base_fact_id: previousFact.fact_id,
    cause,
    cause_evidence_ids: uniqueSorted(causeEvidenceIds),
    quality_status: qualityStatus,
  };
  const issues = [];

  if (zeroBase) {
    issues.push({
      issue_id:
        zeroBaseIssueId ??
        issueIdForEvent(eventId, "percent-base-zero"),
      entity_type: "event",
      entity_id: eventId,
      fact_ids: [previousFact.fact_id, newFact.fact_id],
      issue_code: "PERCENT_BASE_ZERO",
      severity: "medium",
      quality_status: "reviewable",
      detail: "El valor anterior es cero; el delta es calculable y el porcentaje no.",
      next_action: "Mostrar porcentaje como no disponible y conservar el delta numérico.",
      benchmark_blocking: true,
    });
  }

  if (extreme) {
    issues.push({
      issue_id:
        extremeIssueId ??
        issueIdForEvent(eventId, "extreme-change-review"),
      entity_type: "event",
      entity_id: eventId,
      fact_ids: [previousFact.fact_id, newFact.fact_id],
      issue_code: "EXTREME_CHANGE_REVIEW",
      severity: "high",
      quality_status: "reviewable",
      detail: `El cambio absoluto de ${Math.abs(change.percentage)}% supera el umbral de revisión de ${extremeThreshold}%.`,
      next_action: "Revisar las observaciones antes de certificar el evento.",
      benchmark_blocking: true,
    });
  }

  return {
    status:
      issues.length > 0 || qualityStatus !== "certified"
        ? "review_required"
        : "certified",
    event,
    issues,
  };
}

export function sortEvents(events) {
  return [...events].map(cloneRecord).sort((left, right) => {
    const byDate = left.effective_at.localeCompare(right.effective_at);
    return byDate || left.event_id.localeCompare(right.event_id);
  });
}

export function aggregateCertifiedMean(facts, options = {}) {
  const digits = options.digits ?? 2;
  if (!Array.isArray(facts) || facts.length === 0) {
    return unavailable(
      "insufficient",
      "missing_inputs",
      {
        currency: null,
        price_type: null,
        denominator_area_type: null,
        count: 0,
      },
    );
  }

  const values = facts.map(factValue);
  if (values.some((value) => value === null)) {
    return unavailable(
      "insufficient",
      "missing_numeric_input",
      {
        currency: null,
        price_type: null,
        denominator_area_type: null,
        count: facts.length,
      },
    );
  }

  const currencies = new Set(facts.map((fact) => fact.currency));
  const priceTypes = new Set(facts.map((fact) => fact.price_type));
  const denominators = new Set(
    facts.map((fact) => fact.denominator_area_type),
  );
  const compatible =
    facts.every(
      (fact) =>
        fact.semantic_type === "price_per_m2" &&
        fact.benchmark_eligible === true &&
        fact.quality_status === "certified" &&
        MARKET_CURRENCIES.has(fact.currency) &&
        PRICE_TYPES.has(fact.price_type) &&
        KNOWN_AREA_TYPES.has(fact.denominator_area_type) &&
        fact.unit === `${fact.currency}/m2`,
    ) &&
    currencies.size === 1 &&
    priceTypes.size === 1 &&
    denominators.size === 1;

  if (!compatible) {
    return unavailable(
      "incompatible",
      "mixed_currency_denominator_or_quality",
      {
        currency: currencies.size === 1 ? [...currencies][0] : null,
        price_type:
          priceTypes.size === 1 && PRICE_TYPES.has([...priceTypes][0])
            ? [...priceTypes][0]
            : null,
        denominator_area_type:
          denominators.size === 1 ? [...denominators][0] : null,
        count: facts.length,
      },
    );
  }

  const value = halfUp(
    values.reduce((total, current) => total + current, 0) / values.length,
    digits,
  );
  if (value === null) {
    return unavailable(
      "insufficient",
      "non_finite_result",
      {
        currency: [...currencies][0],
        price_type: [...priceTypes][0],
        denominator_area_type: [...denominators][0],
        count: facts.length,
      },
    );
  }

  return {
    status: "certified",
    value,
    currency: [...currencies][0],
    price_type: [...priceTypes][0],
    denominator_area_type: [...denominators][0],
    count: facts.length,
    benchmark_eligible: true,
    exclusion_reasons: [],
  };
}

export const F3_SUPPLEMENTAL_IDS = Object.freeze({
  typologies: Object.freeze([
    "typology:f3-area-match",
    "typology:f3-bathroom-conflict",
    "typology:f3-bedroom-conflict",
    "typology:f3-floor-review",
    "typology:f3-illegible-area",
    "typology:f3-insufficient-source"
  ]),
  facts: Object.freeze([
    "fact:f3-area-match-card-area",
    "fact:f3-area-match-measurement-area",
    "fact:f3-bathroom-conflict-card-bathrooms",
    "fact:f3-bathroom-conflict-measurement-bathrooms",
    "fact:f3-bedroom-conflict-card-bedrooms",
    "fact:f3-bedroom-conflict-measurement-bedrooms",
    "fact:f3-floor-review-card-floor",
    "fact:f3-floor-review-inferred-floor-max",
    "fact:f3-floor-review-inferred-floor-min",
    "fact:f3-floor-review-measurement-unit-range",
    "fact:f3-illegible-area-card-area",
    "fact:f3-illegible-area-measurement-area",
    "fact:f3-insufficient-source-card-area",
    "fact:f3-insufficient-source-missing-area"
  ]),
  issues: Object.freeze([
    "issue:f3-bathroom-source-conflict",
    "issue:f3-bedroom-source-conflict",
    "issue:f3-floor-review-inference",
    "issue:f3-illegible-area-evidence",
    "issue:f3-insufficient-source-absence"
  ]),
  events: Object.freeze([])
});

function mergeSupplementalRecords(
  baseline,
  supplemental,
  idField,
  allowedSupplementalIds,
  sorter = (records) => sortById(records, idField)
) {
  if (!Array.isArray(supplemental)) {
    throw new Error(`Supplemental ${idField} catalog must be an array.`);
  }
  const merged = new Map(baseline.map((record) => [record[idField], record]));
  const allowed = new Set(allowedSupplementalIds);
  const observedSupplemental = new Set();
  for (const record of supplemental) {
    const id = record?.[idField];
    if (merged.has(id)) {
      if (JSON.stringify(merged.get(id)) !== JSON.stringify(record)) {
        throw new Error(`Supplemental record conflicts with fixture baseline: ${id}`);
      }
      continue;
    }
    if (!allowed.has(id)) {
      throw new Error(`Unexpected supplemental record: ${id}`);
    }
    observedSupplemental.add(id);
    merged.set(id, structuredClone(record));
  }
  const missing = allowedSupplementalIds.filter(
    (id) => !observedSupplemental.has(id)
  );
  if (missing.length > 0) {
    throw new Error(`Missing supplemental records: ${missing.join(", ")}`);
  }
  const records = sorter([...merged.values()]);
  assertUnique(records, idField);
  return records;
}

export function materializeMeasureRecords(fixtures, { supplemental } = {}) {
  if (!Array.isArray(fixtures) || fixtures.length === 0) {
    throw new Error("At least one fixture is required.");
  }

  let typologies = sortById(
    collectRecords(fixtures, "typologies"),
    "typology_id",
  );
  let facts = sortById(collectRecords(fixtures, "facts"), "fact_id");
  let issues = sortById(collectRecords(fixtures, "issues"), "issue_id");
  let events = sortEvents(collectRecords(fixtures, "events"));

  assertUnique(typologies, "typology_id");
  assertUnique(facts, "fact_id");
  assertUnique(issues, "issue_id");
  assertUnique(events, "event_id");

  if (supplemental) {
    typologies = mergeSupplementalRecords(
      typologies,
      supplemental.typologies,
      "typology_id",
      F3_SUPPLEMENTAL_IDS.typologies
    );
    facts = mergeSupplementalRecords(
      facts,
      supplemental.facts,
      "fact_id",
      F3_SUPPLEMENTAL_IDS.facts
    );
    issues = mergeSupplementalRecords(
      issues,
      supplemental.issues,
      "issue_id",
      F3_SUPPLEMENTAL_IDS.issues
    );
    events = mergeSupplementalRecords(
      events,
      supplemental.events,
      "event_id",
      F3_SUPPLEMENTAL_IDS.events,
      sortEvents
    );
  }

  return {
    typologies,
    facts,
    issues,
    events,
    external_references: {
      observation_ids: uniqueSorted(
        facts.map((fact) => fact.observation_id),
      ),
      project_ids: uniqueSorted(
        typologies.map((typology) => typology.project_id),
      ),
    },
  };
}
