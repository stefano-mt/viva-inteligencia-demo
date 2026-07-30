import {
  buildEvidenceDossier,
  resolveEvidencePresentation,
} from "../evidence-inspector.js";
import {
  escapeAttr,
  escapeHtml,
  formatNumber,
} from "../domain.js";
import { state } from "../state.js";

const STATUS_LABELS = Object.freeze({
  certified: "Certificado",
  reviewable: "Revisable",
  inconsistent: "Inconsistente",
  illegible: "Ilegible",
  insufficient: "Insuficiente",
});

const PROVENANCE_LABELS = Object.freeze({
  observed: "Observado",
  controlled: "Controlado",
  simulated: "Simulado",
});

const EXTRACTION_METHOD_LABELS = Object.freeze({
  controlled_transcription: "Transcripción controlada",
  user_provided_metadata_only: "Metadatos proporcionados por el usuario",
  user_provided_screenshot_transcription:
    "Transcripción de captura proporcionada por el usuario",
  user_provided_image_manual_transcription:
    "Transcripción manual de imagen proporcionada por el usuario",
  controlled_fixture: "Dato controlado de demostración",
  controlled_absence: "Ausencia controlada",
  controlled_illegible: "Contenido ilegible controlado",
  controlled_illegible_field: "Campo ilegible controlado",
  deterministic_derivation: "Derivación determinista",
});

const CONFIDENCE_LABELS = Object.freeze({
  high: "alta",
  low: "baja",
  unknown: "desconocida",
});

const FIELD_LABELS = Object.freeze({
  air_conditioning: "Aire acondicionado",
  area_source_delta: "Diferencia de área entre fuentes",
  area_source_delta_percent: "Diferencia porcentual de área entre fuentes",
  bathrooms: "Baños",
  bedrooms: "Dormitorios",
  built_area: "Área construida",
  countertop_material: "Material de la cubierta",
  floor_label: "Piso publicado",
  free_area: "Área libre",
  inferred_floor_max: "Piso máximo inferido",
  inferred_floor_min: "Piso mínimo inferido",
  list_price: "Precio de lista",
  list_price_source_delta: "Diferencia de precio entre fuentes",
  list_price_source_delta_percent:
    "Diferencia porcentual de precio entre fuentes",
  published_area: "Área publicada",
  scenario_price: "Precio del escenario",
  scenario_price_per_built_m2: "Precio por m² construido del escenario",
  scenario_price_per_total_m2: "Precio por m² total del escenario",
  total_area: "Área total",
  unit_range: "Rango de unidades",
});

const PRESET_OPTIONS = Object.freeze([
  Object.freeze({
    value: "inconsistent",
    label: "Caso observado · Inconsistente",
  }),
  Object.freeze({
    value: "certified",
    label: "Caso controlado · Certificado",
  }),
  Object.freeze({
    value: "reviewable",
    label: "Caso controlado · Revisable",
  }),
  Object.freeze({
    value: "insufficient_restricted",
    label: "Caso controlado · Insuficiente o restringido",
  }),
]);

const ROW_LABELS = Object.freeze({
  area: "Área",
  floor_unit: "Piso o unidad",
  model: "Modelo",
  bedrooms: "Dormitorios",
  bathrooms: "Baños",
  other: "Otro campo",
});

const SOURCE_TYPE_LABELS = Object.freeze({
  controlled_fixture: "Fuente controlada",
  portal: "Portal público",
  user_provided: "Aporte del usuario",
});

const EVIDENCE_MODE_LABELS = Object.freeze({
  asset: "Original autorizado",
  fragment: "Fragmento autorizado",
  controlled_transcription: "Transcripción controlada",
  restricted: "Evidencia restringida",
  pending: "Permiso pendiente",
  unavailable: "Evidencia no disponible",
});

const DOCUMENT_TYPE_LABELS = Object.freeze({
  card: "Tarjeta",
  plan: "Recurso visual",
  specification: "Especificación",
  measurement: "Medición",
  source: "Fuente",
});

const AUTHORIZED_ASSET_MEDIA_TYPES = new Set(["image/webp"]);
const FULL_HASH_MODES = new Set([
  "asset",
  "fragment",
  "controlled_transcription",
]);
const CONTROLLED_REPRESENTATION_WARNING =
  "Representación controlada para demo; no es el documento original.";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function compareIds(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function titleFromCanonicalName(value) {
  const text = String(value ?? "").trim();
  if (!text) return "Proyecto sin nombre";
  if (text !== text.toLocaleUpperCase("es-PE")) return text;
  return text
    .toLocaleLowerCase("es-PE")
    .replace(/(^|[\s-])\p{L}/gu, (letter) =>
      letter.toLocaleUpperCase("es-PE"),
    );
}

function provenanceLabel(value) {
  return PROVENANCE_LABELS[value] ?? "Procedencia no informada";
}

function statusLabel(value) {
  return STATUS_LABELS[value] ?? "Estado no disponible";
}

function latestCapturedAt(...recordGroups) {
  return recordGroups
    .flatMap(toArray)
    .map(({ captured_at: capturedAt }) => capturedAt)
    .filter((capturedAt) => Number.isFinite(Date.parse(capturedAt)))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
}

function captureDateLabel(value) {
  const calendarDate = String(value ?? "").match(/^\d{4}-\d{2}-\d{2}/u)?.[0];
  if (!calendarDate) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${calendarDate}T12:00:00Z`));
}

function countedNoun(count, singular, plural) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

function readableFieldName(value) {
  if (FIELD_LABELS[value]) return FIELD_LABELS[value];
  const words = String(value ?? "")
    .trim()
    .replaceAll("_", " ");
  return words
    ? `${words[0].toLocaleUpperCase("es-PE")}${words.slice(1)}`
    : "Campo relacionado";
}

function extractionMethodLabel(value) {
  return EXTRACTION_METHOD_LABELS[value] ?? "Método no informado";
}

function confidenceLabel(value) {
  return CONFIDENCE_LABELS[value] ?? CONFIDENCE_LABELS.unknown;
}

function validSha256(value) {
  const hash = String(value ?? "");
  return /^[a-f0-9]{64}$/u.test(hash) ? hash : null;
}

function evidenceHash({ evidence, documentRecord, mode }) {
  const hash =
    validSha256(evidence.sha256) ?? validSha256(documentRecord.sha256);
  if (!hash) return null;
  const canRevealFull =
    FULL_HASH_MODES.has(mode) &&
    evidence.publish_permission === "authorized" &&
    documentRecord.publish_permission === "authorized";
  return {
    abbreviated: `${hash.slice(0, 8)}…`,
    full: canRevealFull ? hash : null,
  };
}

function finiteRegionNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizedEvidenceRegion(region, asset) {
  if (!region || typeof region !== "object" || Array.isArray(region)) {
    return null;
  }
  const x = finiteRegionNumber(region.x);
  const y = finiteRegionNumber(region.y);
  const width = finiteRegionNumber(region.width);
  const height = finiteRegionNumber(region.height);
  if (
    x === null ||
    y === null ||
    width === null ||
    height === null ||
    x < 0 ||
    y < 0 ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  let scaleWidth = 1;
  let scaleHeight = 1;
  if (region.coordinate_space === "pixels") {
    scaleWidth = finiteRegionNumber(asset?.width);
    scaleHeight = finiteRegionNumber(asset?.height);
    if (
      scaleWidth === null ||
      scaleHeight === null ||
      scaleWidth <= 0 ||
      scaleHeight <= 0
    ) {
      return null;
    }
  } else if (region.coordinate_space !== "normalized") {
    return null;
  }

  if (x + width > scaleWidth || y + height > scaleHeight) return null;
  return {
    left: (x / scaleWidth) * 100,
    top: (y / scaleHeight) * 100,
    width: (width / scaleWidth) * 100,
    height: (height / scaleHeight) * 100,
  };
}

function authorizedAssetManifestEntry({
  inspector,
  documentRecord,
  evidence,
  presentation,
}) {
  const matches = toArray(inspector?.assets).filter(
    ({ document_id: documentId }) =>
      documentId === documentRecord.document_id,
  );
  if (matches.length !== 1) return null;
  const asset = matches[0];
  const documentHash = validSha256(documentRecord.sha256);
  const evidenceHashValue = validSha256(evidence.sha256);
  const assetHash = validSha256(asset.sha256);
  if (
    asset.logical_path !== documentRecord.public_asset_path ||
    asset.logical_path !== presentation.publicUrl ||
    asset.publish_permission !== "authorized" ||
    !AUTHORIZED_ASSET_MEDIA_TYPES.has(asset.media_type) ||
    !documentHash ||
    !evidenceHashValue ||
    !assetHash ||
    documentHash !== evidenceHashValue ||
    assetHash !== documentHash
  ) {
    return null;
  }
  return asset;
}

function evidenceContext(dossier, inspector, evidenceId) {
  if (typeof evidenceId !== "string" || !evidenceId) return null;
  const evidence = dossier.evidence.find(
    ({ evidence_id: candidateId }) => candidateId === evidenceId,
  );
  if (!evidence) return null;
  const documentRecord = dossier.documents.find(
    ({ document_id: documentId }) =>
      documentId === evidence.document_id,
  );
  const observation = dossier.observations.find(
    ({ observation_id: observationId }) =>
      observationId === evidence.observation_id,
  );
  if (!documentRecord || !observation) return null;
  if (
    !Array.isArray(observation.evidence_ids) ||
    !observation.evidence_ids.includes(evidence.evidence_id)
  ) {
    return null;
  }
  const source = dossier.sources.find(
    ({ source_id: sourceId }) => sourceId === observation.source_id,
  );
  if (!source || documentRecord.source_id !== source.source_id) return null;
  const presentation = resolveEvidencePresentation({
    document: documentRecord,
    evidence,
  });
  const mode = presentation.mode;
  const asset =
    mode === "asset"
      ? authorizedAssetManifestEntry({
          inspector,
          documentRecord,
          evidence,
          presentation,
        })
      : null;
  if (mode === "asset" && !asset) return null;
  const contentAllowed = [
    "fragment",
    "controlled_transcription",
  ].includes(mode);
  const region =
    mode === "asset"
      ? normalizedEvidenceRegion(evidence.region, asset)
      : null;
  return {
    safe: true,
    evidenceId: evidence.evidence_id,
    mode,
    modeLabel: EVIDENCE_MODE_LABELS[mode] ?? "Estado de evidencia",
    title: documentRecord.title || "Evidencia sin título",
    type:
      DOCUMENT_TYPE_LABELS[documentRecord.document_type] ??
      documentRecord.document_type ??
      "Tipo no informado",
    capturedAt:
      evidence.captured_at ??
      documentRecord.captured_at ??
      observation.captured_at ??
      null,
    capturedLabel: captureDateLabel(
      evidence.captured_at ??
        documentRecord.captured_at ??
        observation.captured_at,
    ),
    source: source.name || "Fuente no informada",
    method: extractionMethodLabel(observation.extraction_method),
    page: Number.isInteger(evidence.page) && evidence.page > 0
      ? evidence.page
      : null,
    hash: evidenceHash({ evidence, documentRecord, mode }),
    provenance: provenanceLabel(
      dossier.inspectorCase.provenance_classification,
    ),
    relatedFacts: dossier.facts
      .filter(
        ({ observation_id: observationId }) =>
          observationId === observation.observation_id,
      )
      .map((fact) => ({
        id: fact.fact_id,
        field: readableFieldName(fact.field_name),
        confidence: confidenceLabel(fact.confidence),
        qualityStatus: fact.quality_status,
      })),
    publicUrl: mode === "asset" ? presentation.publicUrl : null,
    content: contentAllowed ? evidence.fragment : null,
    controlledRepresentation:
      (["asset", "fragment", "controlled_transcription"].includes(mode) &&
        dossier.inspectorCase.provenance_classification === "controlled") ||
      asset?.provenance === "controlled_original",
    reason: presentation.reason,
    region,
  };
}

function buildEvidenceOptions(dossier, inspector) {
  return dossier.evidence.map((evidence, index) => {
    const context = evidenceContext(
      dossier,
      inspector,
      evidence.evidence_id,
    );
    if (!context) {
      throw new Error("Evidence option ownership is invalid");
    }
    return {
      id: evidence.evidence_id,
      controlId: `inspector-evidence-option-${index + 1}`,
      label: context.title,
      mode: context.mode,
      modeLabel: context.modeLabel,
    };
  });
}

function buildProjectOptions(data, selectedProjectId) {
  const projectById = new Map(
    toArray(data?.model?.projects).map((project) => [
      project.project_id,
      project,
    ]),
  );
  const provenanceByProject = new Map();
  for (const inspectorCase of toArray(data?.inspector?.cases)) {
    const values = provenanceByProject.get(inspectorCase.project_id) ?? new Set();
    values.add(provenanceLabel(inspectorCase.provenance_classification));
    provenanceByProject.set(inspectorCase.project_id, values);
  }

  return [...provenanceByProject]
    .sort(([left], [right]) => compareIds(left, right))
    .map(([projectId, provenance]) => ({
      value: projectId,
      label: `${titleFromCanonicalName(
        projectById.get(projectId)?.canonical_name,
      )} · ${[...provenance].sort().join(" / ")}`,
      selected: projectId === selectedProjectId,
    }));
}

function buildTypologyOptions(data, projectId, selectedTypologyId) {
  const typologyById = new Map(
    toArray(data?.model?.typologies).map((typology) => [
      typology.typology_id,
      typology,
    ]),
  );
  return toArray(data?.inspector?.cases)
    .filter((inspectorCase) => inspectorCase.project_id === projectId)
    .sort((left, right) => compareIds(left.case_id, right.case_id))
    .map((inspectorCase) => ({
      value: inspectorCase.typology_id,
      label: `${
        typologyById.get(inspectorCase.typology_id)?.model ??
        "Tipología sin nombre"
      } · ${provenanceLabel(inspectorCase.provenance_classification)}`,
      selected: inspectorCase.typology_id === selectedTypologyId,
    }));
}

function buildPresetOptions(caseId, provenance, qualityStatus) {
  return [
    {
      value: caseId,
      label: `Expediente actual · ${provenance} · ${statusLabel(qualityStatus)}`,
      selected: true,
      disabled: true,
    },
    ...PRESET_OPTIONS.map((option) => ({
      ...option,
      selected: false,
      disabled: false,
    })),
  ];
}

function primaryEvidencePresentation(dossier) {
  if (!dossier.primaryEvidence) {
    return {
      mode: "unavailable",
      publicUrl: null,
      canOpen: false,
      reason: "El expediente no declara evidencia principal.",
    };
  }
  const documentRecord = dossier.documents.find(
    ({ document_id: documentId }) =>
      documentId === dossier.primaryEvidence.document_id,
  );
  if (!documentRecord) {
    return {
      mode: "unavailable",
      publicUrl: null,
      canOpen: false,
      reason: "La evidencia principal no tiene un documento trazable.",
    };
  }
  return resolveEvidencePresentation({
    document: documentRecord,
    evidence: dossier.primaryEvidence,
  });
}

function firstBlockingRow(dossier) {
  return (
    dossier.compatibilityRows.find(
      (row) =>
        row.benchmarkBlocking &&
        row.issueIds.some((issueId) =>
          dossier.decision.blockingIssueIds.includes(issueId),
        ),
    ) ?? dossier.compatibilityRows.find((row) => row.benchmarkBlocking)
  );
}

function decisionCause(dossier) {
  const blockingIssue = dossier.decision.blockingIssueIds
    .map((issueId) =>
      dossier.issues.find(({ issue_id: candidateId }) => candidateId === issueId),
    )
    .find(Boolean);
  if (blockingIssue?.detail) return blockingIssue.detail;
  if (dossier.decision.benchmarkEligible) {
    return "Los hechos requeridos del expediente son elegibles y no tienen bloqueos activos.";
  }
  return "El expediente no cumple todavía las condiciones de elegibilidad de la demo.";
}

function primaryAction(dossier, presentation) {
  const row = firstBlockingRow(dossier);
  const rowHref = `#inspector-row-${row?.key ?? "other"}`;
  if (dossier.decision.qualityStatus === "inconsistent") {
    return {
      kind: "link",
      label: "Revisar hallazgos",
      destination: rowHref,
      evidenceId: null,
    };
  }
  if (dossier.decision.qualityStatus === "reviewable") {
    return {
      kind: "link",
      label: "Revisar hallazgo",
      destination: rowHref,
      evidenceId: null,
    };
  }
  if (
    dossier.decision.qualityStatus === "certified" &&
    presentation.canOpen
  ) {
    return {
      kind: "button",
      label: "Abrir evidencia",
      destination: "#inspector-evidence-shell",
      evidenceId: dossier.primaryEvidence.evidence_id,
    };
  }
  return {
    kind: "link",
    label: "Ver limitación",
    destination: "#inspector-limitations",
    evidenceId: null,
  };
}

function unavailableModel(reasonCode, message) {
  return {
    available: false,
    reasonCode,
    message,
  };
}

export function buildInspectorViewModel({
  data,
  projectId,
  typologyId,
  preset = null,
  evidenceId = null,
  dialogOpen = false,
} = {}) {
  if (!data?.model || !data?.inspector || !data?.pilot?.counts) {
    return unavailableModel(
      "INSPECTOR_DATA_UNAVAILABLE",
      "No hay un dataset de evidencia disponible para construir el inspector.",
    );
  }
  if (!projectId || !typologyId) {
    return unavailableModel(
      "INSPECTOR_SELECTION_UNAVAILABLE",
      "Selecciona un proyecto y una tipología inspectable para continuar.",
    );
  }

  try {
    const dossier = buildEvidenceDossier({
      model: data.model,
      inspector: data.inspector,
      projectId,
      typologyId,
    });
    const presentation = primaryEvidencePresentation(dossier);
    const selectedCase = dossier.inspectorCase;
    const provenance = provenanceLabel(
      selectedCase.provenance_classification,
    );
    const latestDate = latestCapturedAt(
      dossier.observations,
      dossier.evidence,
      dossier.documents,
    );
    const blockingRow = firstBlockingRow(dossier);
    const agency = toArray(data.model.agencies).find(
      ({ agency_id: agencyId }) => agencyId === dossier.project.agency_id,
    );
    const territorialContinuity =
      selectedCase.provenance_classification === "observed" &&
      !dossier.decision.benchmarkEligible
        ? "El proyecto permanece en la lectura territorial; esta tipología y sus hechos incompatibles quedan fuera del benchmark certificado."
        : null;
    const viewer = evidenceContext(
      dossier,
      data.inspector,
      evidenceId,
    );
    const evidenceOptions = buildEvidenceOptions(
      dossier,
      data.inspector,
    );

    return {
      available: true,
      caseId: selectedCase.case_id,
      preset,
      project: {
        id: dossier.project.project_id,
        name: titleFromCanonicalName(dossier.project.canonical_name),
      },
      typology: {
        id: dossier.selectedTypology.typology_id,
        name: dossier.selectedTypology.model || "Tipología sin nombre",
      },
      provenance,
      provenanceNote:
        selectedCase.provenance_classification === "observed"
          ? "Caso observado · evidencia presentada como transcripción controlada; no es el original."
          : `Caso ${provenance.toLocaleLowerCase(
              "es-PE",
            )} · representación preparada para verificar las reglas de la demo.`,
      pilotCoverage: {
        base: safeCount(data.pilot.counts.base_count),
        enriched: safeCount(data.pilot.counts.enriched_count),
        deep: safeCount(data.pilot.counts.deep_count),
      },
      inspectorCoverage: {
        cases: safeCount(dossier.coverage.total_cases),
        observed: safeCount(dossier.coverage.observed_cases),
        controlled: safeCount(dossier.coverage.controlled_cases),
        simulated: safeCount(dossier.coverage.simulated_cases),
        typologies: safeCount(dossier.coverage.inspectable_typologies),
        assets: safeCount(dossier.coverage.authorized_visual_assets),
      },
      selectors: {
        projects: buildProjectOptions(data, projectId),
        typologies: buildTypologyOptions(data, projectId, typologyId),
        presets: buildPresetOptions(
          selectedCase.case_id,
          provenance,
          dossier.decision.qualityStatus,
        ),
      },
      verdict: {
        status: dossier.decision.qualityStatus,
        statusLabel: statusLabel(dossier.decision.qualityStatus),
        eligible: dossier.decision.benchmarkEligible,
        eligibilityLabel: dossier.decision.benchmarkEligible
          ? "Elegible según las reglas de la demo"
          : "No elegible según las reglas de la demo",
        cause: decisionCause(dossier),
        sourceCount: dossier.sources.length,
        latestDate,
        latestDateLabel: captureDateLabel(latestDate),
        selectedTruthFactId: dossier.decision.selectedTruthFactId,
      },
      metadata: {
        projectName: titleFromCanonicalName(dossier.project.canonical_name),
        agencyName:
          String(agency?.canonical_name ?? "").trim() ||
          "Inmobiliaria no informada",
        district:
          String(dossier.project.location?.district ?? "").trim() ||
          "Distrito no informado",
        projectStatus:
          String(dossier.project.status ?? "").trim() ||
          "Estado no informado",
        cutoffAt: data.metadata?.cutoff_at ?? null,
        cutoffLabel: captureDateLabel(data.metadata?.cutoff_at),
        sourceTypes: [
          ...new Set(
            dossier.sources.map(
              (source) =>
                SOURCE_TYPE_LABELS[source.type] ?? "Fuente declarada",
            ),
          ),
        ],
        observationCount: dossier.observations.length,
        methods: [
          ...new Set(
            dossier.observations.map(
              ({ extraction_method: extractionMethod }) =>
                extractionMethodLabel(extractionMethod),
            ),
          ),
        ],
      },
      blockingRow: {
        key: blockingRow?.key ?? "other",
        label: ROW_LABELS[blockingRow?.key] ?? ROW_LABELS.other,
      },
      decision: {
        eligibleFactCount: dossier.decision.eligibleFactIds.length,
        excludedFactCount: dossier.decision.excludedFactIds.length,
        territorialContinuity,
      },
      presentation: {
        mode: presentation.mode,
        canOpen: presentation.canOpen,
        reason: presentation.reason,
      },
      evidenceOptions,
      viewer,
      dialogOpen: Boolean(dialogOpen && viewer?.safe),
      primaryAction: primaryAction(dossier, presentation),
    };
  } catch {
    return unavailableModel(
      "INSPECTOR_INVALID_DATA",
      "El expediente seleccionado no pudo validarse con el contrato de evidencia.",
    );
  }
}

function renderOptions(options) {
  return options
    .map(
      ({ value, label, selected, disabled }) =>
        `<option value="${escapeAttr(value)}"${
          selected ? " selected" : ""
        }${disabled ? " disabled" : ""}>${escapeHtml(label)}</option>`,
    )
    .join("");
}

function renderPrimaryAction(action) {
  if (action.kind === "button") {
    return `
      <button
        id="inspector-primary-action"
        class="inspector-primary-action"
        type="button"
        data-inspector-primary
        data-inspector-evidence="${escapeAttr(action.evidenceId)}"
        aria-controls="inspector-evidence-shell"
      >
        ${escapeHtml(action.label)}
      </button>
    `;
  }
  return `
    <a
      id="inspector-primary-action"
      class="inspector-primary-action"
      data-inspector-primary
      href="${escapeAttr(action.destination)}"
    >
      ${escapeHtml(action.label)}
    </a>
  `;
}

function renderEvidenceOptions(options) {
  return `
    <div class="inspector-evidence-index" aria-label="Evidencias del expediente">
      ${options
        .map(
          (option) => `
            <button
              id="${escapeAttr(option.controlId)}"
              class="inspector-evidence-option"
              type="button"
              data-inspector-evidence="${escapeAttr(option.id)}"
            >
              <span>${escapeHtml(option.label)}</span>
              <small>${escapeHtml(option.modeLabel)}</small>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function regionStyle(region) {
  if (!region) return "";
  const values = [
    ["left", region.left],
    ["top", region.top],
    ["width", region.width],
    ["height", region.height],
  ];
  if (
    values.some(([, value]) => !Number.isFinite(value) || value < 0 || value > 100)
  ) {
    return "";
  }
  return values
    .map(([property, value]) => `${property}:${value.toFixed(4)}%`)
    .join(";");
}

function renderEvidenceBody(viewer) {
  if (viewer.mode === "asset") {
    const overlayStyle = regionStyle(viewer.region);
    return `
      <figure class="inspector-evidence-asset">
        <div class="inspector-evidence-image-frame">
          <img
            src="${escapeAttr(viewer.publicUrl)}"
            alt="${escapeAttr(`Evidencia visual: ${viewer.title}`)}"
          >
          ${
            overlayStyle
              ? `<span class="inspector-evidence-region" style="${escapeAttr(overlayStyle)}" aria-hidden="true"></span>`
              : ""
          }
        </div>
        <figcaption>Activo local autorizado para esta demostración.</figcaption>
      </figure>
    `;
  }
  if (
    viewer.mode === "fragment" ||
    viewer.mode === "controlled_transcription"
  ) {
    return `
      <blockquote class="inspector-evidence-fragment">
        ${escapeHtml(viewer.content)}
      </blockquote>
    `;
  }
  return `
    <div class="inspector-evidence-blocked" role="status">
      <strong>${escapeHtml(viewer.modeLabel)}</strong>
      <p>${escapeHtml(
        viewer.reason ??
          "La referencia no contiene una representación pública disponible.",
      )}</p>
    </div>
  `;
}

function renderEvidenceDialog(model) {
  if (!model.dialogOpen || !model.viewer?.safe) return "";
  const viewer = model.viewer;
  return `
    <dialog
      id="inspector-evidence-dialog"
      class="inspector-evidence-dialog"
      aria-modal="true"
      aria-labelledby="inspector-evidence-dialog-title"
      aria-describedby="inspector-evidence-description"
      data-inspector-evidence-mode="${escapeAttr(viewer.mode)}"
    >
      <div class="inspector-dialog-shell">
        <header class="inspector-dialog-header">
          <div>
            <p class="inspector-section-label">Mesa de evidencia · ${escapeHtml(viewer.provenance)}</p>
            <h2 id="inspector-evidence-dialog-title">${escapeHtml(viewer.title)}</h2>
            <p id="inspector-evidence-description">
              Revisa la representación permitida junto con su cadena de custodia.
            </p>
          </div>
          <button
            id="inspector-dialog-close"
            class="inspector-dialog-close"
            type="button"
            data-inspector-close
            aria-label="Cerrar visor de evidencia"
          >
            <span aria-hidden="true">×</span>
            <span>Cerrar</span>
          </button>
        </header>
        <div class="inspector-dialog-grid">
          <section class="inspector-evidence-stage" aria-label="${escapeAttr(viewer.modeLabel)}">
            <span class="inspector-evidence-mode">${escapeHtml(viewer.modeLabel)}</span>
            ${
              viewer.controlledRepresentation
                ? `
                  <p class="inspector-transcription-warning" role="note">
                    ${CONTROLLED_REPRESENTATION_WARNING}
                  </p>
                `
                : ""
            }
            ${renderEvidenceBody(viewer)}
          </section>
          <aside class="inspector-evidence-custody" aria-label="Cadena de custodia">
            <h3>Cadena de custodia</h3>
            <dl>
              <div>
                <dt>Tipo</dt>
                <dd>${escapeHtml(viewer.type)}</dd>
              </div>
              <div>
                <dt>Fuente</dt>
                <dd>${escapeHtml(viewer.source)}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd><time datetime="${escapeAttr(viewer.capturedAt ?? "")}">${escapeHtml(viewer.capturedLabel)}</time></dd>
              </div>
              <div>
                <dt>Método</dt>
                <dd>${escapeHtml(viewer.method)}</dd>
              </div>
              ${
                viewer.page
                  ? `
                    <div>
                      <dt>Página</dt>
                      <dd>${formatNumber(viewer.page)}</dd>
                    </div>
                  `
                  : ""
              }
              ${
                viewer.hash
                  ? `
                    <div>
                      <dt>Huella abreviada</dt>
                      <dd><code data-inspector-hash="abbreviated">${escapeHtml(viewer.hash.abbreviated)}</code></dd>
                    </div>
                    ${
                      viewer.hash.full
                        ? `
                          <div>
                            <dt>Verificación</dt>
                            <dd>
                              <details class="inspector-full-hash">
                                <summary>Ver huella completa</summary>
                                <code data-inspector-hash="complete">${escapeHtml(viewer.hash.full)}</code>
                              </details>
                            </dd>
                          </div>
                        `
                        : ""
                    }
                  `
                  : ""
              }
            </dl>
            <div class="inspector-related-facts">
              <h3>Hechos relacionados</h3>
              ${
                viewer.relatedFacts.length
                  ? `
                    <ul>
                      ${viewer.relatedFacts
                        .map(
                          (fact) => `
                            <li data-inspector-related-fact="${escapeAttr(fact.id)}">
                              <strong>${escapeHtml(fact.field)}</strong>
                              <span>${escapeHtml(statusLabel(fact.qualityStatus))} · confianza ${escapeHtml(fact.confidence)}</span>
                            </li>
                          `,
                        )
                        .join("")}
                    </ul>
                  `
                  : "<p>Sin hechos vinculados a esta observación.</p>"
              }
            </div>
          </aside>
        </div>
      </div>
    </dialog>
  `;
}

function renderUnavailable(model) {
  return `
    <section class="inspector-view inspector-unavailable" data-inspector-state="unavailable">
      <p class="inspector-breadcrumb">Viva Inteligencia / Evidencia</p>
      <span class="inspector-kicker">Custodia de datos</span>
      <h1>Inspector de evidencia</h1>
      <p>Contrasta fuentes y decide qué datos pueden entrar al benchmark.</p>
      <div class="inspector-notice" role="status">
        <strong>Inspector no disponible</strong>
        <p>${escapeHtml(model.message)}</p>
      </div>
    </section>
  `;
}

export function renderInspectorModel(model) {
  if (!model?.available) {
    return renderUnavailable(
      model ??
        unavailableModel(
          "INSPECTOR_MODEL_UNAVAILABLE",
          "No hay información suficiente para mostrar el inspector.",
        ),
    );
  }

  return `
    <article
      class="inspector-view"
      data-inspector-state="ready"
      data-inspector-provenance="${escapeAttr(model.provenance)}"
    >
      <header class="inspector-intro">
        <div class="inspector-intro-copy">
          <p class="inspector-breadcrumb">Viva Inteligencia / Evidencia</p>
          <span class="inspector-kicker">Custodia de datos</span>
          <h1>Inspector de evidencia</h1>
          <p class="inspector-purpose">
            Contrasta fuentes y decide qué datos pueden entrar al benchmark.
          </p>
        </div>
        <div class="inspector-journey" aria-label="Cómo usar el inspector">
          <span>Selecciona</span>
          <span>Contrasta</span>
          <span>Decide</span>
          <p>Resultado: una decisión trazable por tipología.</p>
        </div>
      </header>
      <div
        class="inspector-sr-only"
        id="inspector-live"
        aria-live="polite"
        aria-atomic="true"
      ></div>

      <div class="inspector-custody">
        <section class="inspector-module inspector-coverage" aria-labelledby="inspector-coverage-title">
          <div class="inspector-module-heading">
            <span class="inspector-step" aria-hidden="true">01</span>
            <div>
              <p class="inspector-section-label">Cobertura</p>
              <h2 id="inspector-coverage-title">Profundidad disponible</h2>
              <p class="inspector-module-help">Muestra cuánta profundidad de fuente existe realmente</p>
            </div>
          </div>
          <ol class="inspector-depth-track" aria-label="Niveles acumulativos del piloto">
            <li style="--inspector-depth-weight: ${safeCount(model.pilotCoverage.base)}">
              <strong>${formatNumber(model.pilotCoverage.base)}</strong>
              <span>Base</span>
              <small>presencia y normalización</small>
            </li>
            <li style="--inspector-depth-weight: ${safeCount(model.pilotCoverage.enriched)}">
              <strong>${formatNumber(model.pilotCoverage.enriched)}</strong>
              <span>Enriquecida</span>
              <small>dos fuentes o hechos ampliados</small>
            </li>
            <li style="--inspector-depth-weight: ${safeCount(model.pilotCoverage.deep)}">
              <strong>${formatNumber(model.pilotCoverage.deep)}</strong>
              <span>Estructurada</span>
              <small>profundidad y matching alto</small>
            </li>
          </ol>
          <p class="inspector-coverage-denominators">
            Inspector:
            <strong>${formatNumber(model.inspectorCoverage.typologies)} tipologías</strong>
            · <strong>${formatNumber(model.inspectorCoverage.assets)} activos visuales autorizados</strong>
            · ${formatNumber(model.inspectorCoverage.cases)} casos
            (${countedNoun(model.inspectorCoverage.observed, "observado", "observados")},
            ${countedNoun(model.inspectorCoverage.controlled, "controlado", "controlados")},
            ${countedNoun(model.inspectorCoverage.simulated, "simulado", "simulados")}).
          </p>
        </section>

        <section class="inspector-module inspector-selection" aria-labelledby="inspector-selection-title">
          <div class="inspector-module-heading">
            <span class="inspector-step" aria-hidden="true">02</span>
            <div>
              <p class="inspector-section-label">Selección</p>
              <h2 id="inspector-selection-title">Expediente a contrastar</h2>
              <p class="inspector-module-help" id="inspector-selection-help">Elige el proyecto y la tipología que vas a contrastar</p>
            </div>
          </div>
          <div class="inspector-selectors">
            <label for="inspector-project-selector">
              <span>Proyecto</span>
              <select
                id="inspector-project-selector"
                data-inspector-project
                aria-describedby="inspector-selection-help"
              >
                ${renderOptions(model.selectors.projects)}
              </select>
            </label>
            <label for="inspector-typology-selector">
              <span>Tipología</span>
              <select
                id="inspector-typology-selector"
                data-inspector-typology
                aria-describedby="inspector-selection-help"
              >
                ${renderOptions(model.selectors.typologies)}
              </select>
            </label>
            <label for="inspector-case-selector">
              <span>Preset de demostración</span>
              <select
                id="inspector-case-selector"
                data-inspector-preset
                aria-describedby="inspector-selection-help"
              >
                ${renderOptions(model.selectors.presets)}
              </select>
            </label>
          </div>
        </section>

        <section
          class="inspector-module inspector-verdict"
          data-inspector-quality="${escapeAttr(model.verdict.status)}"
          aria-labelledby="inspector-verdict-title"
        >
          <div class="inspector-module-heading">
            <span class="inspector-step" aria-hidden="true">03</span>
            <div>
              <p class="inspector-section-label">Veredicto</p>
              <h2 id="inspector-verdict-title">${escapeHtml(model.project.name)} · ${escapeHtml(model.typology.name)}</h2>
              <p class="inspector-module-help">Resume si los datos son elegibles según las reglas de la demo</p>
            </div>
          </div>
          <div class="inspector-verdict-body">
            <div class="inspector-verdict-copy">
              <div class="inspector-verdict-flags">
                <strong class="inspector-status">${escapeHtml(model.verdict.statusLabel)}</strong>
                <span>${escapeHtml(model.verdict.eligibilityLabel)}</span>
                <span>${escapeHtml(model.provenance)}</span>
              </div>
              <p class="inspector-cause">${escapeHtml(model.verdict.cause)}</p>
              <p class="inspector-provenance">${escapeHtml(model.provenanceNote)}</p>
              <p class="inspector-verdict-meta">
                ${formatNumber(model.verdict.sourceCount)} fuentes · Última captura:
                <time datetime="${escapeAttr(model.verdict.latestDate ?? "")}">${escapeHtml(model.verdict.latestDateLabel)}</time>
              </p>
            </div>
            ${renderPrimaryAction(model.primaryAction)}
          </div>
          <details class="inspector-metadata" data-inspector-metadata>
            <summary>Ver metadata del expediente</summary>
            <dl>
              <div>
                <dt>Proyecto</dt>
                <dd>${escapeHtml(model.metadata.projectName)}</dd>
              </div>
              <div>
                <dt>Inmobiliaria</dt>
                <dd>${escapeHtml(model.metadata.agencyName)}</dd>
              </div>
              <div>
                <dt>Distrito</dt>
                <dd>${escapeHtml(model.metadata.district)}</dd>
              </div>
              <div>
                <dt>Estado del proyecto</dt>
                <dd>${escapeHtml(model.metadata.projectStatus)}</dd>
              </div>
              <div>
                <dt>Fecha de corte</dt>
                <dd><time datetime="${escapeAttr(model.metadata.cutoffAt ?? "")}">${escapeHtml(model.metadata.cutoffLabel)}</time></dd>
              </div>
              <div>
                <dt>Tipos de fuente</dt>
                <dd>${escapeHtml(model.metadata.sourceTypes.join(" · ") || "Sin fuentes declaradas")}</dd>
              </div>
              <div>
                <dt>Observaciones</dt>
                <dd>${formatNumber(model.metadata.observationCount)}</dd>
              </div>
              <div>
                <dt>Métodos registrados</dt>
                <dd>${escapeHtml(model.metadata.methods.join(" · ") || "Sin método registrado")}</dd>
              </div>
            </dl>
          </details>
        </section>

        <section class="inspector-module inspector-ledger-shell" aria-labelledby="inspector-ledger-title">
          <div class="inspector-module-heading">
            <span class="inspector-step" aria-hidden="true">04</span>
            <div>
              <p class="inspector-section-label">Ledger</p>
              <h2 id="inspector-ledger-title">Contraste por campo</h2>
              <p class="inspector-module-help">Compara valores fuente por fuente y explica cada incompatibilidad</p>
            </div>
          </div>
          <div
            class="inspector-future-surface"
            id="inspector-row-${escapeAttr(model.blockingRow.key)}"
            tabindex="-1"
          >
            <span>Primer foco de revisión</span>
            <strong>${escapeHtml(model.blockingRow.label)}</strong>
            <p>La comparación detallada por filas se incorpora en el siguiente incremento.</p>
          </div>
        </section>

        <section class="inspector-module inspector-viewer-shell" id="inspector-evidence-shell" aria-labelledby="inspector-viewer-title">
          <div class="inspector-module-heading">
            <span class="inspector-step" aria-hidden="true">05</span>
            <div>
              <p class="inspector-section-label">Visor</p>
              <h2 id="inspector-viewer-title">Evidencia permitida</h2>
              <p class="inspector-module-help">Abre únicamente evidencia permitida y conserva su contexto</p>
            </div>
          </div>
          <div class="inspector-viewer-index">
            <p>
              Selecciona una referencia para abrir su representación permitida.
              Los estados restringidos conservan solo metadata segura.
            </p>
            ${renderEvidenceOptions(model.evidenceOptions)}
          </div>
        </section>

        <section class="inspector-module inspector-decision" id="inspector-limitations" aria-labelledby="inspector-decision-title">
          <div class="inspector-module-heading">
            <span class="inspector-step" aria-hidden="true">06</span>
            <div>
              <p class="inspector-section-label">Decisión</p>
              <h2 id="inspector-decision-title">Uso en el benchmark</h2>
              <p class="inspector-module-help">Explica qué se usa, qué se excluye y cuál es el siguiente paso</p>
            </div>
          </div>
          <div class="inspector-decision-summary">
            <p>
              <strong>${formatNumber(model.decision.eligibleFactCount)}</strong>
              hechos elegibles ·
              <strong>${formatNumber(model.decision.excludedFactCount)}</strong>
              hechos excluidos.
            </p>
            ${
              model.decision.territorialContinuity
                ? `<p>${escapeHtml(model.decision.territorialContinuity)}</p>`
                : ""
            }
            <p>Siguiente paso: ${escapeHtml(model.primaryAction.label)}.</p>
          </div>
        </section>
      </div>
      ${renderEvidenceDialog(model)}
    </article>
  `;
}

export function renderInspector() {
  return renderInspectorModel(
    buildInspectorViewModel({
      data: state.data,
      projectId: state.inspectorProjectId,
      typologyId: state.inspectorTypologyId,
      preset: state.inspectorPreset,
      evidenceId: state.inspectorEvidenceId,
      dialogOpen: state.inspectorDialogOpen,
    }),
  );
}
