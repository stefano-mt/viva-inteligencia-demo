import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  createObservedPage,
  openPath,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";

const source = await fs.readFile(
  new URL("../public/js/views/compare.js", import.meta.url),
  "utf8",
);
const styles = await fs.readFile(
  new URL("../public/styles/57-comparison.css", import.meta.url),
  "utf8",
);

assert.match(source, /comparison-decision-sheet/u);
assert.match(source, /index === 0 \? " is-lead"/u);
assert.match(source, /comparison-finding__limit/u);
assert.match(source, /comparison-basis__summary/u);
assert.doesNotMatch(source, /comparison-priority[^-]/u);
assert.match(styles, /\.comparison-decision-sheet/u);
assert.match(styles, /\.comparison-finding\.is-lead/u);

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of [viewports[1], viewports[2]]) {
    const context = await browser.newContext({ viewport });
    const observed = await createObservedPage(context, baseUrl);
    const { page } = observed;
    await openPath(page, baseUrl, "/#compare");

    assert.equal(
      await page.locator("#scenario-summary-title").count(),
      0,
      `${viewport.name}: el Comparador no repite el resumen global`,
    );
    assert.equal(await page.locator(".comparison-decision-sheet").count(), 1);
    assert.equal(await page.locator(".comparison-findings > li").count(), 3);
    assert.equal(await page.locator(".comparison-finding.is-lead").count(), 1);
    assert.equal(
      await page.locator("details.comparison-finding__limit").count(),
      3,
    );
    assert.equal(await page.locator(".comparison-priority").count(), 0);
    assert.equal(await page.locator(".comparison-next-action").count(), 1);
    assert.equal(await page.locator(".comparison-shell .primary-button").count(), 1);

    const conclusionTop = await page
      .locator(".comparison-conclusion")
      .evaluate((element) => element.getBoundingClientRect().top);
    const commandTop = await page
      .locator(".comparison-command")
      .evaluate((element) => element.getBoundingClientRect().top);
    const basisTop = await page
      .locator("details.comparison-basis")
      .evaluate((element) => element.getBoundingClientRect().top);
    const matrixTop = await page
      .locator(".comparison-matrix")
      .evaluate((element) => element.getBoundingClientRect().top);
    assert.ok(conclusionTop < commandTop && commandTop < basisTop && basisTop < matrixTop);

    const basis = page.locator("details.comparison-basis");
    assert.equal(await basis.getAttribute("open"), null);
    assert.match(
      await basis.locator(":scope > summary").innerText(),
      /85.+3.+0/u,
    );
    assert.equal(await page.locator("details.comparison-group[open]").count(), 1);
    assert.equal(
      await page.locator('details.comparison-group[data-comparison-group="price"][open]').count(),
      1,
    );

    const firstFindingLink = page
      .locator(".comparison-findings [data-comparison-row-target]")
      .first();
    const rowId = await firstFindingLink.getAttribute("data-comparison-row-target");
    await firstFindingLink.click();
    const row = page.locator(`[data-comparison-row="${rowId}"]`);
    assert.equal(
      await row.evaluate((element) => document.activeElement === element),
      true,
    );
    assert.equal(await row.locator("xpath=ancestor::details[1]").getAttribute("open"), "");

    if (viewport.name === "laptop") {
      const ctaBottom = await page
        .locator(".comparison-next-action")
        .evaluate((element) => element.getBoundingClientRect().bottom);
      assert.ok(ctaBottom <= viewport.height, `laptop: CTA fuera del primer viewport (${ctaBottom})`);
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    assert.ok(overflow <= 1, `${viewport.name}: overflow horizontal ${overflow}px`);
    assert.deepEqual(observed.problems, [], `${viewport.name}: ${observed.problems.join("\n")}`);
    assert.deepEqual(
      observed.externalRequests,
      [],
      `${viewport.name}: red externa ${observed.externalRequests.join("\n")}`,
    );
    await context.close();
  }
}, { port: 4372 });

console.log(
  "Comparison density OK: decision-first hierarchy, compact denominators, one primary action, focused evidence and responsive flow verified.",
);
