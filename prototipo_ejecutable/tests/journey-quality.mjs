import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  buildInspectorViewModel,
  renderInspectorModel,
} from "../public/js/views/inspector.js";
import {
  createObservedPage,
  openPath,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";

const data = JSON.parse(
  await fs.readFile(
    new URL("../public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const source = await fs.readFile(
  new URL("../public/js/views/inspector.js", import.meta.url),
  "utf8",
);
const css = await fs.readFile(
  new URL("../public/styles/55-inspector.css", import.meta.url),
  "utf8",
);

const transversalCase = data.inspector.cases.find(
  ({ provenance_classification: provenance }) => provenance === "observed",
);
assert.ok(transversalCase, "The public inspector must expose its observed case");

const model = buildInspectorViewModel({
  data,
  projectId: transversalCase.project_id,
  typologyId: transversalCase.typology_id,
  preset: transversalCase.case_id,
});
assert.equal(model.available, true);
assert.deepEqual(
  {
    district: model.qualityMoment?.district,
    cardArea: model.qualityMoment?.cardArea.value,
    planArea: model.qualityMoment?.planArea.value,
    areaDelta: model.qualityMoment?.areaDelta.value,
    eligible: model.qualityMoment?.benchmarkEligible,
  },
  {
    district: "Miraflores",
    cardArea: 104.15,
    planArea: 53.37,
    areaDelta: 50.78,
    eligible: false,
  },
);

const markup = renderInspectorModel(model);
for (const phrase of [
  "Ejemplo de calidad de datos en Miraflores",
  "independiente del escenario activo",
  "Tipo 7 no debe entrar al benchmark",
  "104.15 m²",
  "53.37 m²",
  "50.78 m²",
  "No elegible",
  "Revisar evidencia permitida",
]) {
  assert.ok(markup.includes(phrase), phrase);
}
assert.match(markup, /data-benchmark-eligible="false"/u);
assert.match(
  markup,
  /class="inspector-quality-evidence-link"[\s\S]*data-inspector-evidence=/u,
);
assert.ok(
  markup.indexOf("data-inspector-quality-moment") <
    markup.indexOf("inspector-coverage-title"),
  "The decision must precede coverage detail",
);
assert.ok(
  markup.indexOf("data-inspector-quality-moment") <
    markup.indexOf("inspector-ledger-title"),
  "The decision must precede the field ledger",
);
assert.equal(
  (markup.match(/class="inspector-primary-action"/gu) ?? []).length,
  1,
  "The inspector keeps one primary action",
);
assert.doesNotMatch(markup, /NaN|Infinity|undefined/gu);

const authoritativeFacts = new Map(
  data.model.facts.map((fact) => [fact.fact_id, fact]),
);
assert.equal(
  model.qualityMoment.cardArea.value,
  authoritativeFacts.get("fact:pardo-coast-card-area").normalized_value,
);
assert.equal(
  model.qualityMoment.planArea.value,
  authoritativeFacts.get("fact:pardo-coast-plan-area").normalized_value,
);
assert.equal(
  model.qualityMoment.areaDelta.value,
  authoritativeFacts.get("fact:pardo-coast-area-delta").normalized_value,
);
assert.doesNotMatch(
  source,
  /(?:104\.15|53\.37|50\.78)/u,
  "Visible quality values must not be hardcoded in the view",
);

const controlledCase = data.inspector.cases.find(
  ({ provenance_classification: provenance }) => provenance === "controlled",
);
const controlledModel = buildInspectorViewModel({
  data,
  projectId: controlledCase.project_id,
  typologyId: controlledCase.typology_id,
  preset: controlledCase.case_id,
});
assert.equal(
  controlledModel.qualityMoment,
  null,
  "Controlled dossiers must not inherit the transversal observed-case label",
);
assert.doesNotMatch(
  renderInspectorModel(controlledModel),
  /data-inspector-quality-moment/u,
);

assert.match(css, /\.inspector-quality-moment\s*\{/u);
assert.match(css, /\.inspector-quality-evidence-link:focus-visible/u);
assert.match(css, /@media\s*\(max-width:\s*620px\)/u);

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of [viewports[1], viewports[2]]) {
    const context = await browser.newContext({ viewport });
    const { page, problems, externalRequests } = await createObservedPage(
      context,
      baseUrl,
    );

    await openPath(page, baseUrl, "/#inspector/case/f3-ct-g-pardo");
    const moment = page.locator("[data-inspector-quality-moment]");
    await moment.waitFor({ state: "visible" });
    assert.equal(await moment.getAttribute("data-card-area"), "104.15");
    assert.equal(await moment.getAttribute("data-plan-area"), "53.37");
    assert.equal(await moment.getAttribute("data-area-delta"), "50.78");
    assert.equal(await moment.getAttribute("data-benchmark-eligible"), "false");
    assert.equal(await page.locator("main h1").count(), 1);

    const verticalOrder = await page.evaluate(() => ({
      moment: document
        .querySelector("[data-inspector-quality-moment]")
        .getBoundingClientRect().top,
      ledger: document
        .querySelector(".inspector-ledger-shell")
        .getBoundingClientRect().top,
    }));
    assert.ok(verticalOrder.moment < verticalOrder.ledger);

    const alternateDistrict = await page
      .locator("#top-district option")
      .evaluateAll((options) =>
        options
          .map((option) => option.value)
          .find((value) => value && value !== "district:miraflores"),
      );
    assert.ok(alternateDistrict);
    await page.locator("#top-district").selectOption(alternateDistrict);
    await page.waitForFunction(
      (value) => document.querySelector("#top-district")?.value === value,
      alternateDistrict,
    );
    assert.match(await moment.innerText(), /transversal · Miraflores/iu);
    assert.equal(await moment.getAttribute("data-card-area"), "104.15");

    const evidenceButton = moment.locator(".inspector-quality-evidence-link");
    await evidenceButton.focus();
    assert.equal(
      await page.evaluate(() => document.activeElement?.classList.contains("inspector-quality-evidence-link")),
      true,
    );
    await evidenceButton.press("Enter");
    await page.locator("#inspector-evidence-dialog[open]").waitFor({
      state: "visible",
    });
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => !document.querySelector("#inspector-evidence-dialog")?.open,
    );

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    assert.ok(overflow <= 1, `${viewport.name} horizontal overflow: ${overflow}px`);
    assert.deepEqual(problems, [], `${viewport.name} browser errors:\n${problems.join("\n")}`);
    assert.deepEqual(externalRequests, [], `${viewport.name} external requests:\n${externalRequests.join("\n")}`);
    await context.close();
  }
}, { port: 4198 });

console.log(
  "Journey quality OK: transversal Type 7 conclusion, authoritative values, evidence access, scenario independence and responsive rendering verified.",
);
