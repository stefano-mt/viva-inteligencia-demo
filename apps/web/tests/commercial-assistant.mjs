import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { initializeScenarioData, state } from "../public/js/state.js";
import { renderAssistant } from "../public/js/views/assistant.js";
import {
  createObservedPage,
  openPath,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";

const data = JSON.parse(await fs.readFile(new URL("../public/demo-data/viva-platform-demo.json", import.meta.url), "utf8"));
const claimsUrl = new URL("./fixtures/commercial-claims.json", import.meta.url);
const claimsSource = await fs.readFile(claimsUrl, "utf8");
const claims = JSON.parse(claimsSource);
const requiredClaimIds = new Set(["C12", "C13", "C15", "C16", "C17", "C18", "C19", "C20", "C21", "C22", "C23"]);
assert.deepEqual(
  new Set(claims.claims.filter(({ id }) => requiredClaimIds.has(id)).map(({ id }) => id)),
  requiredClaimIds,
  "El contrato C12–C13/C15–C23 debe permanecer completo",
);

initializeScenarioData(data, {
  geographyArtifact: {
    status: "valid",
    geojson: { type: "FeatureCollection", features: [] },
    expected_sha256: data.geography.boundary_artifact_sha256,
    actual_sha256: data.geography.boundary_artifact_sha256,
  },
});
const html = renderAssistant();
assert.match(html, /data-commercial-assistant-query/u);
assert.match(html, /Pregunta primero\. Verifica antes de decidir\./u);
assert.ok(
  html.indexOf("data-commercial-assistant-query") < html.indexOf("data-assistant-decision=\"idle\""),
  "La consulta debe aparecer antes del estado de decisión",
);
assert.equal(await fs.readFile(claimsUrl, "utf8"), claimsSource, "El fixture es read-only");

const evidenceDir = process.env.EVIDENCE_DIR ? path.resolve(process.env.EVIDENCE_DIR) : null;
if (evidenceDir) await fs.mkdir(evidenceDir, { recursive: true });

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const { page, problems, externalRequests } = await createObservedPage(context, baseUrl);
    await openPath(page, baseUrl, "/#assistant");
    const query = page.locator("[data-commercial-assistant-query]");
    await query.waitFor();
    assert.ok(
      (await query.boundingBox()).y < (await page.locator("[data-assistant-decision=idle]").boundingBox()).y,
      `${viewport.name}: la consulta antecede a la respuesta`,
    );
    await page.locator(".assistant-question").first().click();
    await page.locator("#assistant-input").press("Control+Enter");
    await page.locator("[data-assistant-response=ready]").waitFor();
    assert.equal(await page.locator("[data-assistant-block=answer]").count(), 1);
    assert.equal(await page.locator("[data-assistant-block=limitations]").count(), 1);
    const references = page.locator("[data-assistant-block=references]");
    assert.equal(await references.count(), 1);
    const evidence = page.locator("details.assistant-evidence-disclosure");
    assert.equal(await evidence.getAttribute("open"), null);
    await evidence.locator(":scope > summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await evidence.getAttribute("open"), "");
    assert.match(await references.innerText(), /referencia|fuente/iu);
    if (evidenceDir) await page.screenshot({ path: path.join(evidenceDir, `p7-07-assistant-${viewport.name}.png`), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 2, `${viewport.name}: overflow horizontal ${overflow}px`);
    assert.deepEqual(problems, [], `${viewport.name}: errores\n${problems.join("\n")}`);
    assert.deepEqual(externalRequests, [], `${viewport.name}: red externa`);
    await context.close();
  }
}, { port: 4209 });

assert.ok(state.scenarioContext, "El escenario canónico se conserva");
console.log("Commercial assistant OK: query-first hierarchy, C12/C13/C22 response, responsive and privacy verified.");
