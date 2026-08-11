import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  renderJourney,
  renderJourneyTopbar,
} from "../public/js/views/journey.js";
import { JOURNEY_STAGE_IDS } from "../public/js/journey.js";

const manifest = await fs.readFile(
  new URL("../public/styles.css", import.meta.url),
  "utf8",
);
const styles = await fs.readFile(
  new URL("../public/styles/61-journey.css", import.meta.url),
  "utf8",
);

for (const stageId of JOURNEY_STAGE_IDS) {
  const markup = renderJourney({ stageId, status: "ready" });
  assert.match(markup, new RegExp(`data-journey-stage="${stageId}"`, "u"));
  assert.equal((markup.match(/<h1\b/gu) ?? []).length, 1);
  assert.equal(
    (markup.match(/aria-current="step"/gu) ?? []).length,
    2,
    "El rail de escritorio y su control móvil deben señalar la misma etapa",
  );
  assert.equal((markup.match(/data-journey-step=/gu) ?? []).length, 6);
  assert.equal((markup.match(/journey-primary-action/gu) ?? []).length, 1);
  assert.match(markup, /Qué sabemos/u);
  assert.match(markup, /Qué falta o no puede afirmarse/u);
  assert.match(markup, /Explorar análisis/u);
  assert.doesNotMatch(markup, /NaN|Infinity|-Infinity/u);
}

const quality = renderJourney({
  stageId: "quality",
  status: "ready",
  announcement: "Ruta corregida <script>alert(1)</script>",
});
assert.match(quality, /ejemplo de Miraflores para revisar la calidad del dato/iu);
assert.match(quality, /href="#inspector\/case\/f3-ct-g-pardo"/u);
assert.match(quality, /data-journey-expert="inspector"/u);
assert.doesNotMatch(quality, /<script>alert/u);
assert.match(quality, /&lt;script&gt;alert/u);

const depth = renderJourney({ stageId: "depth", status: "ready" });
assert.equal((depth.match(/data-journey-expert=/gu) ?? []).length, 3);
assert.match(depth, /href="#market"/u);
assert.match(depth, /href="#compare"/u);
assert.match(depth, /href="#projects"/u);

const authoritativeQuality = renderJourney({
  stageId: "quality",
  stageModel: {
    stageId: "quality",
    status: "ready",
    data: {
      cardArea: { normalized_value: 104.15 },
      planArea: { normalized_value: 53.37 },
      areaDelta: { normalized_value: 50.78 },
      decision: { benchmarkEligible: false },
    },
    correctiveAction: null,
  },
});
for (const [fact, value] of [
  ["card-area", "104.15"],
  ["plan-area", "53.37"],
  ["area-delta", "50.78"],
]) {
  assert.match(
    authoritativeQuality,
    new RegExp(`data-journey-fact="${fact}"[\\s\\S]*${value.replace(".", "\\.")}`, "u"),
  );
}
assert.match(authoritativeQuality, /Excluido del benchmark/u);

const decisionResponse = renderJourney({
  stageId: "decision",
  stageModel: {
    stageId: "decision",
    status: "ready",
    data: {
      mode: "assistant_response",
      response: {
        scenario: { scopeText: "Miraflores <script>alert(1)</script>" },
        blocks: [
          { type: "answer", items: [{ kind: "text", text: "Priorizar evidencia disponible" }] },
          { type: "data", items: [{ kind: "metric", label: "Comparables elegibles", value: 85, unit: "count" }] },
          { type: "interpretation", items: [{ kind: "text", text: "La muestra permite contrastar la oferta" }] },
          { type: "limitations", items: [{ kind: "text", text: "Sin precio de cierre" }] },
          { type: "references", items: [{ id: "scenario:active", type: "scenario", label: "Miraflores <img src=x>" }] },
          { type: "next_step", items: [{ kind: "action", label: "Preparar checklist" }] },
        ],
      },
      checklist: null,
    },
    correctiveAction: null,
  },
});
assert.match(decisionResponse, /Priorizar evidencia disponible/u);
assert.match(decisionResponse, /Comparables elegibles:\s*85/u);
assert.match(decisionResponse, /La muestra permite contrastar la oferta/u);
assert.match(decisionResponse, /Sin precio de cierre/u);
assert.match(decisionResponse, /Miraflores &lt;img src=x&gt;/u);
assert.match(decisionResponse, /Preparar checklist/u);
assert.doesNotMatch(decisionResponse, /<script>alert/u);
assert.match(decisionResponse, /&lt;script&gt;alert/u);

const insufficientScale = renderJourney({
  stageId: "scale",
  stageModel: {
    stageId: "scale",
    status: "insufficient",
    data: {
      modelAgencyCount: null,
      pilot: { baseCount: null, enrichedCount: 22, deepCount: 5 },
      scenario: {
        scopeText: "Miraflores · Distrito completo",
        observedProjectCount: 90,
        comparableProjectCount: 85,
      },
    },
    correctiveAction: { label: "Revisar cobertura", href: "#projects" },
  },
});
assert.match(
  insufficientScale,
  /data-journey-fact="model-agencies"[\s\S]*No disponible/u,
);
assert.match(
  insufficientScale,
  /data-journey-fact="pilot-levels"[\s\S]*No disponible\s*\/\s*22\s*\/\s*5/u,
);
assert.doesNotMatch(insufficientScale, /Inmobiliarias modeladas[\s\S]{0,120}<dd>0<\/dd>/u);

const unavailableDecision = renderJourney({
  stageId: "decision",
  stageModel: {
    stageId: "decision",
    status: "capability_unavailable",
    capability: {
      contractVersion: "2.1.0",
      minimumContractVersion: "2.4.0",
    },
    data: null,
    correctiveAction: { label: "Formular consulta", href: "#assistant" },
  },
});
assert.match(unavailableDecision, /data-journey-state="capability_unavailable"/u);
assert.match(unavailableDecision, /contrato 2\.1\.0.*requiere 2\.4\.0/iu);
assert.match(unavailableDecision, /journey-primary-action" href="#assistant">Formular consulta/u);

for (const [status, expected] of [
  ["loading", /Preparando la etapa/u],
  ["unavailable", /Lectura no disponible/u],
  ["error", /No pudimos preparar la etapa/u],
]) {
  const markup = renderJourney({ stageId: "movement", status });
  assert.match(markup, expected);
  assert.equal((markup.match(/<h1\b/gu) ?? []).length, 1);
  assert.match(markup, new RegExp(`data-journey-state="${status}"`, "u"));
}

const errorState = renderJourney({ stageId: "movement", status: "error" });
assert.equal((errorState.match(/journey-primary-action/gu) ?? []).length, 1);
assert.match(errorState, /journey-primary-action" href="#journey\/scale">Reiniciar recorrido/u);
assert.doesNotMatch(errorState, /Continuar a decisi[oó]n/iu);

const unavailableState = renderJourney({
  stageId: "movement",
  status: "unavailable",
});
assert.equal((unavailableState.match(/journey-primary-action/gu) ?? []).length, 1);
assert.match(unavailableState, /journey-primary-action" href="#dashboard">Ajustar escenario/u);
assert.doesNotMatch(unavailableState, /Continuar a decisi[oó]n/iu);

assert.equal(
  renderJourney({ stageId: "not-real", status: "ready" }),
  renderJourney({ stageId: "scale", status: "ready" }),
  "La vista debe fallar cerrada hacia Escala",
);

const topbar = renderJourneyTopbar(
  {
    scopeTitle: "Miraflores · Distrito completo",
    cutoffLabel: "Corte 24 may. 2026",
    comparableCount: 85,
    reviewCount: 5,
    mobileNavOpen: false,
    loading: false,
  },
  "quality",
);
assert.equal((topbar.match(/<h1\b/gu) ?? []).length, 0);
assert.match(topbar, /Recorrido ejecutivo/u);
assert.match(topbar, /Etapa 3 de 6/u);
assert.match(topbar, /Miraflores · Distrito completo/u);
assert.match(topbar, /id="menu-toggle"/u);
assert.doesNotMatch(topbar, /comparables|fuera o por revisar/u);
assert.doesNotMatch(topbar, /id="reset-scenario"|Viva Inteligencia/u);

assert.match(manifest, /\.\/styles\/61-journey\.css/u);
assert.equal((manifest.match(/\.\/styles\/61-journey\.css/gu) ?? []).length, 1);
assert.ok(
  manifest.indexOf("./styles/60-states.css") <
    manifest.indexOf("./styles/61-journey.css"),
);
assert.ok(
  manifest.indexOf("./styles/61-journey.css") <
    manifest.indexOf("./styles/90-responsive.css"),
);
assert.match(styles, /\.journey-rail/u);
assert.match(styles, /\.journey-primary-action/u);
assert.match(styles, /@media\s*\(max-width:\s*900px\)/u);
assert.match(styles, /@media\s*\(max-width:\s*620px\)/u);
assert.match(styles, /@media\s*\(min-width:\s*901px\)\s*and\s*\(max-height:\s*760px\)/u);
assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/u);
assert.doesNotMatch(styles, /transition:\s*all/iu);

console.log(
  "Journey view OK: six stages, authoritative facts and responses, states, CTA, escaping and ordered CSS verified.",
);
