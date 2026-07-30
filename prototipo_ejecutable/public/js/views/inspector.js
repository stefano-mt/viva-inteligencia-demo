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
              ({ extraction_method: extractionMethod }) => extractionMethod,
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
          <div class="inspector-future-surface">
            <strong>${model.presentation.canOpen ? "Evidencia preparada para apertura" : "Apertura no disponible"}</strong>
            <p>${escapeHtml(
              model.presentation.canOpen
                ? "El visor conservará procedencia, fecha y límites de publicación."
                : model.presentation.reason,
            )}</p>
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
    }),
  );
}
