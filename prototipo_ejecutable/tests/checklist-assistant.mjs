import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  dispatchScenario,
  initializeScenarioData,
  state,
  updateBoundaryArtifact,
} from "../public/js/state.js";
import {
  buildChecklistModel,
  renderChecklistModel,
} from "../public/js/views/checklist.js";
import {
  buildScenarioAssistantResponse,
  renderAssistant,
  renderAssistantResponse,
} from "../public/js/views/assistant.js";

async function readJson(relativePath) {
  return JSON.parse(
    await fs.readFile(new URL(relativePath, import.meta.url), "utf8"),
  );
}

function assertFiniteHtml(html, label) {
  assert.doesNotMatch(html, /\bNaN\b/, `${label} expone NaN`);
  assert.doesNotMatch(
    html,
    /\bInfinity\b/,
    `${label} expone Infinity`,
  );
}

function assertReferenceSubset(response, context) {
  const comparableIds = new Set(
    context.comparable_project_ids ?? [],
  );
  for (const reference of response.references) {
    assert.ok(
      comparableIds.has(reference.projectId),
      `${reference.projectId} debe pertenecer al contexto comparable`,
    );
  }
}

const data = await readJson(
  "../public/demo-data/viva-platform-demo.json",
);
const boundaryGeoJson = await readJson(
  "../public/demo-data/district-boundaries.geojson",
);

initializeScenarioData(data);
updateBoundaryArtifact({
  status: "valid",
  geojson: boundaryGeoJson,
});

const baselineContext = structuredClone(state.scenarioContext);
const baselineChecklist = buildChecklistModel({
  data,
  scenarioContext: baselineContext,
});
const baselineChecklistHtml =
  renderChecklistModel(baselineChecklist);

assert.equal(
  baselineChecklist.comparableCount,
  baselineContext.comparable_project_ids.length,
  "el checklist debe usar exactamente el N del escenario",
);
assert.equal(
  baselineChecklist.priceReferenceCount,
  baselineContext.price_reference_project_ids.length,
  "el checklist debe usar exactamente las referencias de precio",
);
assert.ok(
  baselineChecklist.references.every((reference) =>
    baselineContext.comparable_project_ids.includes(
      reference.projectId,
    ),
  ),
  "las referencias del checklist deben ser un subconjunto comparable",
);
assert.match(
  baselineChecklistHtml,
  /Referencia publicada provisional/,
);
assert.match(
  baselineChecklistHtml,
  /data-scenario-consumer="checklist"/,
  "el checklist debe exponer su hook estable de consumidor",
);
assert.match(baselineChecklistHtml, /Corte/);
assert.match(
  baselineChecklistHtml,
  new RegExp(
    `${baselineContext.comparable_project_ids.length} proyectos comparables`,
  ),
);
assert.doesNotMatch(
  baselineChecklistHtml,
  /fallback|recomendaci[oó]n comercial|benchmark general/i,
);
assertFiniteHtml(baselineChecklistHtml, "checklist baseline");

const baselineAssistant = buildScenarioAssistantResponse({
  data,
  scenarioContext: baselineContext,
  input: "¿Qué evidencia tiene este escenario?",
});
const baselineAssistantHtml =
  renderAssistantResponse(baselineAssistant);
const baselineAssistantViewHtml = renderAssistant();

assert.match(
  baselineAssistant.summary,
  new RegExp(baselineContext.scope_text),
);
assert.match(
  baselineAssistant.summary,
  new RegExp(
    `${baselineContext.comparable_project_ids.length} comparables`,
  ),
);
assertReferenceSubset(baselineAssistant, baselineContext);
assert.match(
  baselineAssistantViewHtml,
  /data-scenario-consumer="assistant"/,
  "el asistente debe exponer su hook estable de consumidor",
);
for (const reference of baselineChecklist.references) {
  assert.match(
    baselineChecklistHtml,
    new RegExp(
      `data-canonical-project-id="${reference.projectId}"`,
    ),
    "cada proyecto citado por el checklist debe exponer su ID canónico",
  );
}
for (const reference of baselineAssistant.references) {
  assert.match(
    baselineAssistantHtml,
    new RegExp(
      `data-canonical-project-id="${reference.projectId}"`,
    ),
    "cada referencia del asistente debe exponer su ID canónico",
  );
}
assertFiniteHtml(baselineAssistantHtml, "asistente baseline");

const miraflores = data.geography.districts.find(
  (district) => district.district_id === "150122",
);
dispatchScenario({
  type: "SET_TERRITORY",
  patch: {
    scope_mode: "radius",
    center_latitude: miraflores.median_latitude,
    center_longitude: miraflores.median_longitude,
    radius_meters: 1000,
  },
});
const radiusContext = structuredClone(state.scenarioContext);
const radiusResponse = buildScenarioAssistantResponse({
  data,
  scenarioContext: radiusContext,
  input: "Resume el escenario activo.",
});

assert.equal(radiusContext.scenario.scope_mode, "radius");
assert.match(
  radiusResponse.summary,
  new RegExp(radiusContext.scope_text),
);
assert.match(
  radiusResponse.summary,
  new RegExp(
    `${radiusContext.comparable_project_ids.length} comparables`,
  ),
);
assertReferenceSubset(radiusResponse, radiusContext);

const insufficientContext = {
  ...structuredClone(baselineContext),
  comparable_project_ids: [],
  price_reference_project_ids: [],
  comparability_status: "insufficient",
  price_status: "insufficient",
  evidence_coverage_pct: 0,
  price_diagnosis: {
    reference_count: 0,
    methodology:
      "Referencia publicada provisional; evidencia insuficiente.",
    status: "insufficient",
    p25: null,
    median: null,
    p75: null,
    target_price_per_m2: null,
    position: null,
  },
};
const insufficientChecklist = buildChecklistModel({
  data,
  scenarioContext: insufficientContext,
});
const insufficientChecklistHtml = renderChecklistModel(
  insufficientChecklist,
);
const insufficientAssistant =
  buildScenarioAssistantResponse({
    data,
    scenarioContext: insufficientContext,
    input: "¿Qué precio debería usar?",
  });
const insufficientAssistantHtml = renderAssistantResponse(
  insufficientAssistant,
);

assert.equal(insufficientChecklist.comparableCount, 0);
assert.match(
  insufficientChecklistHtml,
  /Comparables insuficientes|No hay comparables elegibles/,
);
assert.match(
  insufficientAssistant.summary,
  /0 comparables/,
);
assert.match(
  insufficientAssistant.caution,
  /sin comparables|insuficiente/i,
);
assert.deepEqual(insufficientAssistant.references, []);
assertFiniteHtml(
  insufficientChecklistHtml,
  "checklist insuficiente",
);
assertFiniteHtml(
  insufficientAssistantHtml,
  "asistente insuficiente",
);

const partialPriceContext = {
  ...structuredClone(baselineContext),
  price_reference_project_ids:
    baselineContext.price_reference_project_ids.slice(0, 1),
  price_status: "insufficient",
  price_diagnosis: {
    ...structuredClone(baselineContext.price_diagnosis),
    reference_count: 1,
    status: "insufficient",
    p25: null,
    median: null,
    p75: null,
    position: null,
  },
};
const partialPriceChecklistHtml = renderChecklistModel(
  buildChecklistModel({
    data,
    scenarioContext: partialPriceContext,
  }),
);
assert.match(
  partialPriceChecklistHtml,
  />\s*Referencia de precio insuficiente\s*</,
  "el checklist debe mostrar el label exacto cuando hay comparables pero solo una referencia de precio",
);

const deterministicArguments = {
  data,
  scenarioContext: baselineContext,
  input: "¿Qué evidencia tiene este escenario?",
};
assert.deepEqual(
  buildScenarioAssistantResponse(deterministicArguments),
  buildScenarioAssistantResponse(deterministicArguments),
  "la misma entrada debe producir la misma respuesta",
);
assert.deepEqual(
  buildChecklistModel({
    data,
    scenarioContext: baselineContext,
  }),
  buildChecklistModel({
    data,
    scenarioContext: baselineContext,
  }),
  "el checklist debe ser determinista",
);

const closingPriceResponse =
  buildScenarioAssistantResponse({
    data,
    scenarioContext: baselineContext,
    input:
      "¿Cuál es el precio real de cierre del competidor?",
  });
assert.match(
  `${closingPriceResponse.title} ${closingPriceResponse.summary}`,
  /precio real de cierre no est[aá] disponible|no puede afirmar el precio final/i,
);
assert.match(
  `${closingPriceResponse.action} ${closingPriceResponse.caution}`,
  /escenario estimado|referencia publicada provisional/i,
);
assertReferenceSubset(closingPriceResponse, baselineContext);

const contextBeforeForeignQuestion =
  JSON.stringify(baselineContext);
const dataBeforeForeignQuestion = JSON.stringify(data);
const foreignDistrictResponse =
  buildScenarioAssistantResponse({
    data,
    scenarioContext: baselineContext,
    input:
      "¿Qué proyectos compiten en Santiago de Surco?",
  });

assert.equal(
  JSON.stringify(baselineContext),
  contextBeforeForeignQuestion,
  "el asistente no debe mutar el contexto",
);
assert.equal(
  JSON.stringify(data),
  dataBeforeForeignQuestion,
  "el asistente no debe mutar los datos",
);
assert.match(
  foreignDistrictResponse.contextNote,
  /conserva el escenario activo y no cambia su distrito/i,
);
assert.match(
  foreignDistrictResponse.summary,
  new RegExp(baselineContext.scope_text),
);
assertReferenceSubset(
  foreignDistrictResponse,
  baselineContext,
);

const firstReferenceId =
  baselineContext.price_reference_project_ids[0] ??
  baselineContext.comparable_project_ids[0];
const legacyId = firstReferenceId.replace(
  "project:nexo-",
  "",
);
const unsafeData = {
  projects: [
    {
      id: legacyId,
      project_name: "<script>alert('x')</script>",
    },
  ],
  geography: data.geography,
};
const unsafeResponse = buildScenarioAssistantResponse({
  data: unsafeData,
  scenarioContext: baselineContext,
  input: "Resume el escenario.",
});
const unsafeAssistantHtml =
  renderAssistantResponse(unsafeResponse);
const unsafeChecklistHtml = renderChecklistModel(
  buildChecklistModel({
    data: unsafeData,
    scenarioContext: baselineContext,
  }),
);

assert.doesNotMatch(unsafeAssistantHtml, /<script>/);
assert.match(unsafeAssistantHtml, /&lt;script&gt;/);
assert.doesNotMatch(unsafeChecklistHtml, /<script>/);
assert.match(unsafeChecklistHtml, /&lt;script&gt;/);

const missingContextResponse =
  buildScenarioAssistantResponse({
    data: null,
    scenarioContext: null,
    input: "precio real de cierre",
  });
const missingContextChecklist = buildChecklistModel({
  data: null,
  scenarioContext: null,
});
assertFiniteHtml(
  renderAssistantResponse(missingContextResponse),
  "asistente sin contexto",
);
assertFiniteHtml(
  renderChecklistModel(missingContextChecklist),
  "checklist sin contexto",
);

const controllerSource = await fs.readFile(
  new URL("../public/js/controller.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(
  controllerSource,
  /buildAssistantResponse|assistantResponse/,
  "controller no debe mantener un segundo cálculo del asistente",
);
assert.match(
  controllerSource,
  /scenario-product-form/,
  "se conserva el submit del formulario de producto",
);
assert.match(
  controllerSource,
  /data-district-chip/,
  "se conserva el manejo de chips distritales",
);
assert.match(
  controllerSource,
  /focusId: button\.id \|\| null/,
  "se conserva la restauración de foco de chips distritales",
);

console.log(
  "Checklist and assistant scenario-context tests passed.",
);
