import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createObservedPage,
  openPath,
  viewports,
  withDemoBrowser,
} from "../../../../../prototipo_ejecutable/tests/helpers/demo-browser.mjs";

const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
const approvalSha = process.env.BASELINE_SHA;
assert.match(approvalSha ?? "", /^[a-f0-9]{40}$/u, "BASELINE_SHA debe contener el SHA aprobado completo");

const journeyStages = ["scale", "geography", "quality", "depth", "movement", "decision"];
const surfaces = [
  ...journeyStages.map((stage) => ({
    id: `journey-${stage}`,
    path: `/#journey/${stage}`,
    root: `.journey-view[data-journey-stage="${stage}"]`,
  })),
  { id: "expert-dashboard", path: "/#dashboard", root: ".dashboard-grid" },
  { id: "expert-projects", path: "/#projects", root: '[data-scenario-consumer="catalog"]' },
  {
    id: "expert-inspector",
    path: "/#inspector/case/f3-ct-g-pardo",
    root: '.inspector-view[data-inspector-state="ready"]',
  },
  { id: "expert-market", path: "/#market", root: '[data-scenario-consumer="benchmark"]' },
  { id: "expert-compare", path: "/#compare", root: '.comparison-shell[data-comparison-status="ready"]' },
  { id: "expert-trust", path: "/#trust", root: ".checklist-evidence" },
  { id: "expert-assistant", path: "/#assistant", root: ".assistant-workbench" },
  { id: "expert-activity", path: "/#activity", root: '.history-view[data-history-status="ready"]' },
];

const files = [];

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of viewports) {
    for (const surface of surfaces) {
      const context = await browser.newContext({ viewport });
      const observed = await createObservedPage(context, baseUrl);
      const { page } = observed;
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openPath(page, baseUrl, surface.path);
      await page.locator(surface.root).waitFor({ state: "visible" });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

      const label = `${surface.id} ${viewport.width}x${viewport.height}`;
      const metrics = await page.evaluate(({ rootSelector, viewportHeight }) => {
        const visible = (element) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        };
        const main = document.querySelector("#main-content");
        const root = document.querySelector(rootSelector);
        const headings = [...document.querySelectorAll("h1, h2, h3")]
          .filter(visible)
          .map((element) => ({ level: element.tagName.toLowerCase(), text: element.textContent.trim() }));
        const controls = [...main.querySelectorAll("a[href], button, input, select, textarea, summary")]
          .filter((element) => visible(element) && !element.disabled);
        const aboveFoldControls = controls.filter((element) => {
          const box = element.getBoundingClientRect();
          return box.top >= 0 && box.top < viewportHeight;
        });
        const primaryControls = controls.filter((element) =>
          element.matches(
            ".primary-button, .journey-primary-action, .benchmark-primary-action, .comparison-next-action, .assistant-submit, .history-decision-action, #scenario-product-submit, #inspector-primary-action",
          ));
        return {
          title: document.querySelector("h1")?.textContent.trim() ?? null,
          headings,
          h1OrderIndex: headings.findIndex(({ level }) => level === "h1"),
          readingOrderStartsWithH1: headings[0]?.level === "h1",
          documentHeight: document.documentElement.scrollHeight,
          viewportHeight,
          horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          controlCount: controls.length,
          aboveFoldControlCount: aboveFoldControls.length,
          primaryControlCount: primaryControls.length,
          mainTextLength: main?.innerText.trim().length ?? 0,
          rootTextLength: root?.innerText.trim().length ?? 0,
          bodyHasNonFinite: /(?:NaN|Infinity|∞)/u.test(document.body.innerText),
        };
      }, { rootSelector: surface.root, viewportHeight: viewport.height });

      assert.ok(metrics.title, `${label}: falta h1`);
      assert.ok(metrics.h1OrderIndex >= 0, `${label}: el orden de lectura no contiene h1`);
      assert.ok(metrics.rootTextLength > 40, `${label}: superficie sin contenido útil`);
      assert.equal(metrics.horizontalOverflow, 0, `${label}: overflow horizontal`);
      assert.equal(metrics.bodyHasNonFinite, false, `${label}: valor no finito visible`);

      const firstControl = page.locator("#main-content a[href], #main-content button, #main-content input, #main-content select, #main-content textarea, #main-content summary").filter({ visible: true }).first();
      if (await firstControl.count()) {
        await firstControl.focus();
        assert.equal(
          await firstControl.evaluate((element) => document.activeElement === element),
          true,
          `${label}: el primer control no recibe foco`,
        );
      }

      await page.evaluate(() => window.scrollTo(0, 0));
      const file = `${surface.id}-${viewport.width}x${viewport.height}.png`;
      const screenshot = await page.screenshot({ path: path.join(evidenceDirectory, file), fullPage: true });
      files.push({
        file,
        sha256: crypto.createHash("sha256").update(screenshot).digest("hex"),
        surface: surface.id,
        route: surface.path,
        viewport,
        url: page.url(),
        metrics,
      });

      assert.deepEqual(observed.problems, [], `${label}: ${observed.problems.join("\n")}`);
      assert.deepEqual(observed.externalRequests, [], `${label}: ${observed.externalRequests.join("\n")}`);
      await context.close();
    }
  }
}, { port: 4375 });

assert.equal(files.length, 42, "Se esperan 14 superficies × 3 viewports");
await fs.writeFile(
  path.join(evidenceDirectory, "manifest.json"),
  `${JSON.stringify({
    step: "P7-00D",
    approvalSha,
    surfaces: surfaces.map(({ id, path: route, root }) => ({ id, route, root })),
    viewports,
    totals: {
      surfaces: surfaces.length,
      viewportChecks: files.length,
      consoleOrPageErrors: 0,
      externalRequests: 0,
      horizontalOverflowCases: 0,
    },
    files,
  }, null, 2)}\n`,
  "utf8",
);

console.log("P7-00D baseline OK: 14 superficies × 3 viewports, DOM, foco, orden, consola, red y 42 capturas.");
