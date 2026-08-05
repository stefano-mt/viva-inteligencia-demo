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
assert.match(quality, /Caso demostrativo transversal · Miraflores/u);
assert.match(quality, /href="#inspector\/case\/f3-ct-g-pardo"/u);
assert.match(quality, /data-journey-expert="inspector"/u);
assert.doesNotMatch(quality, /<script>alert/u);
assert.match(quality, /&lt;script&gt;alert/u);

const depth = renderJourney({ stageId: "depth", status: "ready" });
assert.equal((depth.match(/data-journey-expert=/gu) ?? []).length, 3);
assert.match(depth, /href="#market"/u);
assert.match(depth, /href="#compare"/u);
assert.match(depth, /href="#projects"/u);

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
assert.match(topbar, /<strong>85<\/strong> comparables/u);
assert.match(topbar, /<strong>5<\/strong> fuera o por revisar/u);
assert.match(topbar, /id="menu-toggle"/u);
assert.match(topbar, /id="reset-scenario"/u);

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
  "Journey view OK: six stages, one h1, rail, CTA, expert access, base states and ordered CSS verified.",
);
