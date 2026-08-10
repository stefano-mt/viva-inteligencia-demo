import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  journeyGuides,
  sectionGuides,
  views,
} from "../public/js/config.js";
import {
  JOURNEY_MODULE_RETURN_STAGE,
  JOURNEY_STAGE_IDS,
} from "../public/js/journey.js";
import {
  componentHelp,
  renderJourneyGuide,
  renderSectionGuide,
} from "../public/js/views/guidance.js";
import {
  createObservedPage,
  openPath,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";

const requiredFields = [
  "purpose",
  "action",
  "outcome",
  "limitation",
  "nextStep",
];
const requiredLabels = [
  "Para qué sirve",
  "Cómo usarla",
  "Qué obtienes",
  "Qué debes tener en cuenta",
  "Siguiente paso",
];

assert.deepEqual(Object.keys(journeyGuides), JOURNEY_STAGE_IDS);
assert.deepEqual(
  Object.keys(sectionGuides),
  views.map(({ id }) => id),
);

for (const [kind, guides] of [
  ["journey", journeyGuides],
  ["expert", sectionGuides],
]) {
  for (const [id, guide] of Object.entries(guides)) {
    assert.equal(guide.kind, kind, `${kind}:${id} kind`);
    assert.equal(Object.isFrozen(guide), true, `${kind}:${id} frozen`);
    assert.equal(Object.isFrozen(guide.steps), true, `${kind}:${id} steps frozen`);
    assert.equal(guide.steps.length, 3, `${kind}:${id} three actions`);
    for (const field of requiredFields) {
      assert.equal(
        typeof guide[field],
        "string",
        `${kind}:${id}.${field} must be text`,
      );
      assert.ok(guide[field].trim(), `${kind}:${id}.${field} must not be empty`);
    }
    assert.match(guide.nextHref, /^#journey\/(?:scale|geography|quality|depth|movement|decision)$/u);
  }
}

for (const view of views) {
  const guide = sectionGuides[view.id];
  const returnStageId = JOURNEY_MODULE_RETURN_STAGE[view.id];
  assert.equal(guide.returnStageId, returnStageId);
  assert.equal(guide.nextHref, `#journey/${returnStageId}`);
  assert.match(guide.nextLabel, /^Volver al recorrido:/u);

  const html = renderSectionGuide(view.id);
  assert.match(html, /<details[\s\S]*<summary>/u);
  assert.match(html, new RegExp(`data-guidance-id="${view.id}"`, "u"));
  assert.match(html, new RegExp(`data-journey-return="${returnStageId}"`, "u"));
  assert.match(html, new RegExp(`href="#journey/${returnStageId}"`, "u"));
  assert.doesNotMatch(html, /\stitle=/u, "Guidance cannot depend on hover text");
  for (const label of requiredLabels) assert.ok(html.includes(label), `${view.id}: ${label}`);
}

for (const stageId of JOURNEY_STAGE_IDS) {
  const guide = journeyGuides[stageId];
  const html = renderJourneyGuide(stageId);
  assert.match(html, /data-guidance-kind="journey"/u);
  assert.match(html, new RegExp(`data-guidance-id="${stageId}"`, "u"));
  assert.match(html, new RegExp(`href="${guide.nextHref}"`, "u"));
  for (const label of requiredLabels) assert.ok(html.includes(label), `${stageId}: ${label}`);
}

const escapedHelp = componentHelp(
  '<img src=x onerror="alert(1)">',
  "<script>alert(1)</script>",
);
assert.doesNotMatch(escapedHelp, /<script>|<img/u);
assert.match(escapedHelp, /&lt;script&gt;/u);
assert.match(escapedHelp, /<details class="component-help">/u);
assert.match(escapedHelp, /<summary aria-label=/u);

const styles = await fs.readFile(
  new URL("../public/styles/30-components.css", import.meta.url),
  "utf8",
);
const domainSource = await fs.readFile(
  new URL("../public/js/domain.js", import.meta.url),
  "utf8",
);
assert.match(styles, /\.section-guide summary:focus-visible/u);
assert.match(styles, /\.guidance-next-link:focus-visible/u);
assert.match(styles, /\.component-help\[open\] summary/u);
assert.match(styles, /\.guidance-next-link\s*\{[\s\S]*min-height:\s*44px/u);
assert.match(styles, /\.guidance-ledger\s*>\s*div/u);
assert.doesNotMatch(domainSource, /function renderSectionGuide/u);
assert.match(domainSource, /from "\.\/views\/guidance\.js"/u);

await withDemoBrowser(async ({ browser, baseUrl }) => {
  const context = await browser.newContext({ viewport: viewports[1] });
  const { page, problems, externalRequests } = await createObservedPage(
    context,
    baseUrl,
  );
  const scenarioPath = "/?sv=1&area=80";

  for (const view of views) {
    await openPath(page, baseUrl, `${scenarioPath}#${view.id}`);
    const guide = page.locator(
      `.section-guide[data-guidance-id="${view.id}"]`,
    );
    const summary = guide.locator("summary");
    await summary.focus();
    await summary.press("Enter");
    assert.equal(await guide.getAttribute("open"), "", `${view.id} opens by keyboard`);
    assert.equal(await guide.locator("dt").count(), 5, `${view.id} five guidance answers`);
    assert.deepEqual(
      await guide.locator("dt").allTextContents(),
      requiredLabels,
      `${view.id} guidance labels`,
    );
    const returnLink = guide.locator("[data-journey-return]");
    assert.equal(
      await returnLink.getAttribute("href"),
      `#journey/${JOURNEY_MODULE_RETURN_STAGE[view.id]}`,
    );
    await returnLink.click();
    await page.waitForFunction(
      (stageId) => window.location.hash === `#journey/${stageId}`,
      JOURNEY_MODULE_RETURN_STAGE[view.id],
    );
    assert.equal(new URL(page.url()).search, "?sv=1&area=80");
  }

  assert.deepEqual(problems, [], `Guidance browser errors:\n${problems.join("\n")}`);
  assert.deepEqual(externalRequests, [], `Guidance external requests:\n${externalRequests.join("\n")}`);
  await context.close();
});

console.log(
  "Journey guidance OK: five answers for 6+8 surfaces, canonical return, keyboard disclosure, escaping and closed network verified.",
);
