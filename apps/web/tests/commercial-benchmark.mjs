import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { initializeScenarioData, state } from "../public/js/state.js";
import { renderMarket } from "../public/js/views/market.js";
import {
  createObservedPage,
  openPath,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";

const data = JSON.parse(
  await fs.readFile(new URL("../../../data/generated/viva-platform-demo.json", import.meta.url), "utf8"),
);
const claimsUrl = new URL("./fixtures/commercial-claims.json", import.meta.url);
const claimsSource = await fs.readFile(claimsUrl, "utf8");
const claims = JSON.parse(claimsSource);
const requiredClaimIds = new Set([
  "C07", "C08", "C15", "C16", "C17", "C18", "C19", "C20", "C21", "C22", "C23",
]);
assert.deepEqual(
  new Set(claims.claims.filter(({ id }) => requiredClaimIds.has(id)).map(({ id }) => id)),
  requiredClaimIds,
  "El contrato C07–C08/C15–C23 debe permanecer completo",
);

initializeScenarioData(data, {
  geographyArtifact: {
    status: "valid",
    geojson: { type: "FeatureCollection", features: [] },
    expected_sha256: data.geography.boundary_artifact_sha256,
    actual_sha256: data.geography.boundary_artifact_sha256,
  },
});
assert.equal(state.scenarioContext.price_reference_project_ids.length, 69);
assert.equal(state.benchmarkContext.quantitative.pricePerM2Total.orientative.n, 68);
assert.equal(state.benchmarkContext.quantitative.pricePerM2Total.n, 0);
const html = renderMarket();
assert.match(html, /data-commercial-benchmark-summary/u);
assert.match(html, /data-raw-publications="69"/u);
assert.match(html, /data-orientative-ratios="68"/u);
assert.match(html, /data-eligible-pairs="0"/u);
assert.match(html, /Referencia orientativa; no es un benchmark certificado/u);
assert.match(html, /No representa precios reales de cierre/iu);
assert.match(html, /Faltantes[^]*Excluidos/u);
assert.ok(
  html.indexOf("data-commercial-benchmark-summary") < html.indexOf("benchmark-quantitative"),
  "La conclusión debe anteceder a la referencia técnica",
);
assert.ok(
  html.indexOf("data-commercial-benchmark-summary") < html.indexOf("data-scale-ledger"),
  "La conclusión debe anteceder al contexto de escala",
);
assert.equal((html.match(/class="benchmark-progressive /gu) ?? []).length, 3);
assert.equal(await fs.readFile(claimsUrl, "utf8"), claimsSource, "El fixture es read-only");

const evidenceDir = process.env.EVIDENCE_DIR ? path.resolve(process.env.EVIDENCE_DIR) : null;
if (evidenceDir) await fs.mkdir(evidenceDir, { recursive: true });

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const { page, problems, externalRequests } = await createObservedPage(context, baseUrl);
    await openPath(page, baseUrl, "/#market");
    const summary = page.locator("[data-commercial-benchmark-summary]");
    await summary.waitFor();
    assert.equal(await page.locator(".benchmark-sheet__header h2").count(), 1, `${viewport.name}: un título local`);
    assert.deepEqual(
      await summary.evaluate((element) => ({
        raw: element.dataset.rawPublications,
        orientative: element.dataset.orientativeRatios,
        eligible: element.dataset.eligiblePairs,
      })),
      { raw: "69", orientative: "68", eligible: "0" },
    );
    assert.equal(await page.locator("details.benchmark-progressive:not([open])").count(), 3);
    if (evidenceDir) {
      await page.screenshot({
        path: path.join(evidenceDir, `p7-06-benchmark-${viewport.name}.png`),
        fullPage: true,
      });
    }
    const firstDisclosure = page.locator("details.benchmark-progressive--offer");
    await firstDisclosure.locator(":scope > summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await firstDisclosure.getAttribute("open"), "");
    assert.ok(await firstDisclosure.locator(".benchmark-ledger").count() >= 1);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    assert.ok(overflow <= 2, `${viewport.name}: overflow horizontal ${overflow}px`);
    assert.deepEqual(problems, [], `${viewport.name}: errores\n${problems.join("\n")}`);
    assert.deepEqual(externalRequests, [], `${viewport.name}: red externa`);
    await context.close();
  }
}, { port: 4207 });

console.log(
  "Commercial benchmark OK: C07/C08 partition, decision-first summary, progressive detail, responsive and privacy verified.",
);
