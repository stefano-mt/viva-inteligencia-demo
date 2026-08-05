import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  initializeScenarioData,
  state,
} from "../public/js/state.js";
import { renderActivity } from "../public/js/views/activity.js";

const data = JSON.parse(
  await fs.readFile(
    new URL("../public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const source = await fs.readFile(
  new URL("../public/js/views/activity.js", import.meta.url),
  "utf8",
);
const styles = await fs.readFile(
  new URL("../public/styles/58-history-signals.css", import.meta.url),
  "utf8",
);
const styleManifest = await fs.readFile(
  new URL("../public/styles.css", import.meta.url),
  "utf8",
);

function initialize(payload = data) {
  initializeScenarioData(payload, { boundaryArtifactStatus: "valid" });
}

function renderWithoutMutation(label) {
  const before = JSON.stringify({
    scenario: state.scenario,
    scenarioContext: state.scenarioContext,
    historyFilters: state.historyFilters,
    historyContext: state.historyContext,
    selectedHistoryEventId: state.selectedHistoryEventId,
  });
  const markup = renderActivity();
  const after = JSON.stringify({
    scenario: state.scenario,
    scenarioContext: state.scenarioContext,
    historyFilters: state.historyFilters,
    historyContext: state.historyContext,
    selectedHistoryEventId: state.selectedHistoryEventId,
  });
  assert.equal(after, before, `${label}: render must be pure`);
  return markup;
}

assert.doesNotMatch(
  source,
  /\b(?:marketEvents|weeklyRecommendations|buildBenchmark)\s*\(/u,
  "P5-07 must remove the legacy activity feed",
);
assert.doesNotMatch(
  source,
  /price_delta_pct|latest_price_history/u,
  "the view must not rebuild history from legacy fields",
);
assert.doesNotMatch(
  source,
  /\bbuildHistoryContext\s*\(/u,
  "the view must consume state.historyContext",
);

initialize();
const markup = renderWithoutMutation("ready history");
const scenarioIds = new Set(state.scenarioContext.comparable_project_ids);
assert.equal(state.historyContext.timeline.length, 5);
assert.ok(
  state.historyContext.timeline.every(({ project_id: projectId }) =>
    scenarioIds.has(projectId),
  ),
  "all visible signals must belong to the active scenario",
);
assert.match(markup, /data-scenario-consumer="history"/u);
assert.match(markup, /data-history-status="ready"/u);
assert.match(markup, /Cambios publicados en Miraflores/u);
assert.match(markup, /Cuaderno de señales/u);
assert.match(markup, /Revisar señal prioritaria/u);
assert.match(markup, /Ver comparables/u);
assert.equal(
  (markup.match(/class="history-quality-item"/gu) ?? []).length,
  4,
  "quality summary must be a single four-value band",
);
assert.match(markup, /Eventos detectados/u);
assert.match(markup, /Certificados/u);
assert.match(markup, /Por revisar/u);
assert.match(markup, /Cobertura temporal/u);
assert.match(markup, /id="history-status-filter"/u);
assert.match(markup, /id="history-validity-filter"/u);
assert.match(markup, /id="history-direction-filter"/u);
assert.match(markup, /<ol class="history-timeline/u);
assert.equal(
  (markup.match(/data-history-row=/gu) ?? []).length,
  5,
  "default scenario must render its five canonical signals",
);
assert.match(markup, /<time datetime="2026-05-24T18:37:51\.632Z"/u);
assert.match(markup, /Precio publicado desde/u);
assert.match(markup, /Anterior/u);
assert.match(markup, /Nuevo/u);
assert.match(markup, /disminuyó/u);
assert.match(markup, /Certificada/u);
assert.match(markup, /En seguimiento/u);
assert.match(markup, /Ver evidencia/u);
assert.match(markup, /Ver proyecto/u);
assert.doesNotMatch(markup, /Jesús María|Santiago de Surco|La Molina|San Isidro/u);
assert.match(markup, /Agenda de seguimiento/u);
assert.match(markup, /Orden reproducible · calidad antes que magnitud/u);
assert.equal(
  (markup.match(/class="history-agenda__item"/gu) ?? []).length,
  3,
  "the agenda must expose at most its three derived actions",
);
assert.match(markup, /data-history-agenda-position="1"/u);
assert.match(markup, /data-history-agenda-position="2"/u);
assert.match(markup, /data-history-agenda-position="3"/u);
assert.match(markup, /Revisar cambio observado/u);
assert.match(markup, /Señal de origen/u);
assert.match(markup, /2 hechos · 2 evidencias/u);
assert.match(markup, /Abrir señal de origen/u);
assert.equal(
  (markup.match(/data-history-agenda-event=/gu) ?? []).length,
  3,
);
assert.doesNotMatch(markup, /esta semana|semanal/iu);

const oversizedAgenda = structuredClone(state.historyContext);
oversizedAgenda.agenda.push(
  { ...structuredClone(oversizedAgenda.agenda[0]), agenda_item_id: "agenda:four", position: 4 },
  { ...structuredClone(oversizedAgenda.agenda[0]), agenda_item_id: "agenda:five", position: 5 },
);
state.historyContext = oversizedAgenda;
const boundedAgendaMarkup = renderWithoutMutation("bounded agenda");
assert.equal(
  (boundedAgendaMarkup.match(/class="history-agenda__item"/gu) ?? []).length,
  3,
  "the view must never render more than three agenda rows",
);
assert.doesNotMatch(boundedAgendaMarkup, /data-history-agenda-position="4"/u);

const selectedId = state.historyContext.timeline[0].history_event_id;
state.selectedHistoryEventId = selectedId;
const detailMarkup = renderWithoutMutation("selected detail");
assert.match(detailMarkup, /aria-expanded="true"/u);
assert.match(detailMarkup, /Detalle y evidencia/u);
assert.match(detailMarkup, /Causa no observada/u);
assert.match(detailMarkup, /Precio publicado, no precio de cierre/u);
assert.match(detailMarkup, /Observación anterior/u);
assert.match(detailMarkup, /Observación nueva/u);
assert.match(detailMarkup, /Evidencia autorizada/u);
assert.match(detailMarkup, /Abrir fuente pública/u);
assert.ok(detailMarkup.includes(selectedId));

const expandedContext = structuredClone(state.historyContext);
const sixth = structuredClone(expandedContext.timeline[0]);
sixth.history_event_id = "history_event:controlled-sixth";
sixth.project.canonical_name = "Señal controlada adicional";
expandedContext.timeline.push(sixth);
expandedContext.coverage.shown_count = 6;
state.historyContext = expandedContext;
state.selectedHistoryEventId = sixth.history_event_id;
const expandedMarkup = renderWithoutMutation("progressive disclosure");
assert.match(expandedMarkup, /Ver 1 señal más/u);
assert.match(expandedMarkup, /<details class="history-more" open>/u);
assert.match(expandedMarkup, /Señal controlada adicional/u);

initialize();
state.historyContext = {
  ...structuredClone(state.historyContext),
  status: "empty",
  timeline: [],
  agenda: [{
    agenda_item_id: "agenda:history-expand-or-review-scope",
    position: 1,
    action: "expand_or_review_scope",
    title: "Validar cobertura o ampliar el escenario",
    description:
      "No hay señales certificadas visibles; revise filtros y cobertura antes de concluir.",
    references: { history_event_ids: [], fact_ids: [], evidence_ids: [] },
  }],
  coverage: {
    ...state.historyContext.coverage,
    shown_count: 0,
    filtered_out_count: 5,
  },
};
const filteredEmptyMarkup = renderWithoutMutation("filtered empty");
assert.match(filteredEmptyMarkup, /No hay señales con estos filtros/u);
assert.match(filteredEmptyMarkup, /Limpiar filtros/u);
assert.equal(
  (filteredEmptyMarkup.match(/class="history-agenda__item"/gu) ?? []).length,
  1,
);
assert.match(filteredEmptyMarkup, /Validar cobertura o ampliar el escenario/u);
assert.match(filteredEmptyMarkup, /Origen · cobertura del escenario/u);
assert.match(filteredEmptyMarkup, /Revisar filtros/u);
assert.match(filteredEmptyMarkup, /data-history-focus="history-status-filter"/u);
assert.doesNotMatch(filteredEmptyMarkup, /data-history-agenda-event=/u);

state.historyContext.coverage.scenario_event_count = 0;
state.historyContext.coverage.filtered_out_count = 0;
const scenarioEmptyMarkup = renderWithoutMutation("scenario empty");
assert.match(scenarioEmptyMarkup, /No hay cambios elegibles en este escenario/u);
assert.match(scenarioEmptyMarkup, /Ver comparables/u);

initialize();
const restrictedContext = structuredClone(state.historyContext);
restrictedContext.timeline[0].effective_status = "insufficient";
restrictedContext.timeline[0].evidence_status = "restricted";
restrictedContext.timeline[0].reason_codes = ["restricted_evidence"];
restrictedContext.timeline[0].evidence.forEach((evidence) => {
  evidence.publishable = false;
  evidence.publish_permission = "restricted";
});
state.historyContext = restrictedContext;
state.selectedHistoryEventId = restrictedContext.timeline[0].history_event_id;
const restrictedMarkup = renderWithoutMutation("restricted evidence");
assert.match(restrictedMarkup, /Evidencia restringida/u);
assert.match(restrictedMarkup, /No disponible para consulta pública/u);
assert.doesNotMatch(restrictedMarkup, /Abrir fuente pública/u);

initialize();
const maliciousContext = structuredClone(state.historyContext);
maliciousContext.timeline[0].project.canonical_name =
  '<img src=x onerror="globalThis.pwned=true">';
maliciousContext.agenda[0].title = '<script data-test="agenda">pwned()</script>';
state.historyContext = maliciousContext;
const escapedMarkup = renderWithoutMutation("escaped content");
assert.doesNotMatch(escapedMarkup, /<img src=x/u);
assert.match(
  escapedMarkup,
  /&lt;img src=x onerror=&quot;globalThis\.pwned=true&quot;&gt;/u,
);
assert.doesNotMatch(escapedMarkup, /<script data-test/u);
assert.match(
  escapedMarkup,
  /&lt;script data-test=&quot;agenda&quot;&gt;pwned\(\)&lt;\/script&gt;/u,
);

const legacy = structuredClone(data);
legacy.metadata.contract_version = "2.3.0";
delete legacy.history;
initialize(legacy);
const legacyMarkup = renderWithoutMutation("legacy contract");
assert.match(legacyMarkup, /data-history-status="contract_unavailable"/u);
assert.match(legacyMarkup, /Histórico no disponible/u);
assert.match(legacyMarkup, /El análisis territorial sigue disponible/u);
assert.doesNotMatch(legacyMarkup, /history-timeline__row/u);

assert.match(styleManifest, /\.\/styles\/58-history-signals\.css/u);
assert.ok(
  styleManifest.indexOf("./styles/57-comparison.css") <
    styleManifest.indexOf("./styles/58-history-signals.css"),
);
assert.ok(
  styleManifest.indexOf("./styles/58-history-signals.css") <
    styleManifest.indexOf("./styles/60-states.css"),
);
assert.match(styles, /--history-spine:\s*#00943b/iu);
assert.match(styles, /\.history-timeline::before/u);
assert.match(styles, /\.history-agenda__item/u);
assert.match(styles, /\.history-agenda__position/u);
assert.match(styles, /:focus-visible/u);
assert.match(styles, /min-height:\s*44px/iu);
assert.match(styles, /@media\s*\(max-width:\s*900px\)/u);
assert.match(styles, /@media\s*\(max-width:\s*620px\)/u);
assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/u);
assert.doesNotMatch(styles, /font-size:\s*(?:10|11|12|13)px/iu);
assert.doesNotMatch(styles, /transition:\s*all/iu);

console.log(
  "Activity view OK: canonical timeline, quality band, evidence detail, honest states, escaping and responsive CSS verified.",
);
