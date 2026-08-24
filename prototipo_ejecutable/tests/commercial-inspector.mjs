import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { initializeScenarioData } from "../public/js/state.js";
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
const claimsUrl = new URL("./fixtures/commercial-claims.json", import.meta.url);
const claimsSource = await fs.readFile(claimsUrl, "utf8");
const claims = JSON.parse(claimsSource);
const requiredClaimIds = new Set([
  "C06", "C15", "C16", "C17", "C18", "C19", "C20", "C21", "C22", "C23",
]);
assert.deepEqual(
  new Set(claims.claims.filter(({ id }) => requiredClaimIds.has(id)).map(({ id }) => id)),
  requiredClaimIds,
  "El contrato C06/C15–C23 debe permanecer completo",
);

const geographyArtifact = {
  status: "valid",
  geojson: { type: "FeatureCollection", features: [] },
  expected_sha256: data.geography.boundary_artifact_sha256,
  actual_sha256: data.geography.boundary_artifact_sha256,
};
initializeScenarioData(data, { geographyArtifact });

const inspectorCase = data.inspector.cases.find(
  ({ case_id: caseId }) => caseId === "case:f3-ct-g-pardo",
);
assert.ok(inspectorCase, "C06 requiere el expediente CT-G");
const model = buildInspectorViewModel({
  data,
  projectId: inspectorCase.project_id,
  typologyId: inspectorCase.typology_id,
});
const html = renderInspectorModel(model);
assert.match(html, /data-commercial-inspector-summary/u);
assert.match(html, /data-eligible-facts="0"/u);
assert.match(html, /data-excluded-facts="8"/u);
for (const value of ["104.15", "53.37", "50.78"]) assert.match(html, new RegExp(value, "u"));
assert.match(html, /No elegible|no debe entrar a la comparación/iu);
assert.match(html, /queda fuera de la comparación|excluid/iu);
assert.ok(
  html.indexOf("data-commercial-inspector-summary") < html.indexOf("inspector-ledger-shell"),
  "La decisión debe anteceder al detalle probatorio",
);
assert.equal((html.match(/data-inspector-ledger-row=/gu) ?? []).length, 5);
assert.equal(await fs.readFile(claimsUrl, "utf8"), claimsSource, "El fixture es read-only");

const evidenceDir = process.env.EVIDENCE_DIR ? path.resolve(process.env.EVIDENCE_DIR) : null;
if (evidenceDir) await fs.mkdir(evidenceDir, { recursive: true });

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const { page, problems, externalRequests } = await createObservedPage(context, baseUrl);
    await openPath(page, baseUrl, "/#inspector/case/f3-ct-g-pardo");
    await page.locator("[data-commercial-inspector-summary]").waitFor();

    assert.equal(await page.locator(".inspector-view h1").count(), 1, `${viewport.name}: un h1 local`);
    const visibleText = await page.locator("#main-content").innerText();
    for (const value of ["104.15", "53.37", "50.78"]) {
      assert.match(visibleText, new RegExp(value, "u"), `${viewport.name}: C06 ${value}`);
    }
    assert.ok(
      (await page.locator("[data-commercial-inspector-summary]").boundingBox()).y <
        (await page.locator(".inspector-ledger-shell").boundingBox()).y,
      `${viewport.name}: decisión antes del ledger`,
    );
    assert.equal(await page.locator("[data-inspector-ledger-row]").count(), 5);

    const firstRowColumns = await page.locator("[data-inspector-ledger-row]").first().evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length,
    );
    assert.equal(firstRowColumns, viewport.name === "mobile" ? 1 : 2);

    const evidenceButton = page.locator("[data-inspector-evidence]").first();
    await evidenceButton.click();
    await page.locator("#inspector-evidence-dialog[open]").waitFor();
    await page.locator("[data-inspector-close]").first().click();

    if (evidenceDir) {
      await page.screenshot({
        path: path.join(evidenceDir, `p7-06-inspector-${viewport.name}.png`),
        fullPage: true,
      });
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    assert.ok(overflow <= 2, `${viewport.name}: overflow horizontal ${overflow}px`);
    assert.deepEqual(problems, [], `${viewport.name}: errores\n${problems.join("\n")}`);
    assert.deepEqual(externalRequests, [], `${viewport.name}: red externa`);
    await context.close();
  }
}, { port: 4206 });

console.log(
  "Commercial inspector OK: C06, decision-first hierarchy, five evidence rows, disclosure, responsive and privacy verified.",
);
