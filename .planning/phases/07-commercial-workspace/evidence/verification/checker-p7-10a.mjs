import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createObservedPage,
  withDemoBrowser,
} from "../../../../../prototipo_ejecutable/tests/helpers/demo-browser.mjs";

const candidate = "23d350532584ead2cbad3ccb15e3ad88aecb08ce";
const viewport = { width: 1280, height: 720 };
const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
const surfaces = [
  {
    id: "inspector",
    path: "/#inspector/case/f3-ct-g-pardo",
    root: '.inspector-view[data-inspector-state="ready"]',
    h1: true,
  },
  {
    id: "market",
    path: "/#market",
    root: '[data-scenario-consumer="benchmark"]',
    reading: "[data-commercial-benchmark-summary]",
    work: ".benchmark-decision-ledger",
  },
  {
    id: "compare",
    path: "/#compare",
    root: ".comparison-shell",
    h1: true,
    reading: "[data-commercial-comparison-summary]",
    work: "details.comparison-selector",
  },
  {
    id: "activity",
    path: "/#activity",
    root: '.history-view[data-history-status="ready"]',
    reading: ".history-signal-brief",
    work: ".history-agenda",
  },
];

function absoluteUrl(baseUrl, relativePath) {
  return new URL(relativePath, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).href;
}

async function navigateWithoutScroll(page, baseUrl, surface) {
  await page.goto(absoluteUrl(baseUrl, surface.path), { waitUntil: "networkidle" });
  await page.locator(surface.root).waitFor({ state: "visible" });
  if (surface.reading) await page.locator(surface.reading).first().waitFor({ state: "visible" });
  if (surface.work) await page.locator(surface.work).first().waitFor({ state: "visible" });
  await page.evaluate(() => document.fonts?.ready);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

function assertClean(observed, label) {
  assert.deepEqual(observed.problems, [], `${label}: errores de navegador`);
  assert.deepEqual(observed.externalRequests, [], `${label}: solicitudes externas`);
}

await fs.mkdir(evidenceDirectory, { recursive: true });
const result = {
  gate: "P7-10A",
  candidate,
  verifier: "/root/p7_10a_checker",
  viewport: "1280x720",
  measurementPolicy: "scrollY=0; selectors measured before focus, keyboard, click, screenshot or explicit scroll",
  surfaces: [],
  browserProblems: [],
  externalRequests: [],
  verdict: "PASS",
};

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const surface of surfaces) {
    const context = await browser.newContext({ viewport });
    const observed = await createObservedPage(context, baseUrl);
    const { page } = observed;
    await navigateWithoutScroll(page, baseUrl, surface);

    const scrollY = await page.evaluate(() => window.scrollY);
    assert.equal(scrollY, 0, `${surface.id}: la página se desplazó antes de medir`);

    const h1Count = await page.locator("h1:visible").count();
    if (surface.h1) {
      assert.equal(h1Count, 1, `${surface.id}: debe existir exactamente un h1 visible`);
    }

    const boxes = {};
    for (const [role, selector] of [["reading", surface.reading], ["work", surface.work]]) {
      if (!selector) continue;
      const box = await page.locator(selector).first().boundingBox();
      assert.ok(box && box.width > 0 && box.height > 0, `${surface.id}:${role} no es visible`);
      assert.ok(box.y >= 0, `${surface.id}:${role} comienza sobre el viewport (${box.y})`);
      assert.ok(box.y < viewport.height, `${surface.id}:${role} comienza bajo el pliegue (${box.y})`);
      boxes[role] = {
        selector,
        x: Number(box.x.toFixed(2)),
        y: Number(box.y.toFixed(2)),
        width: Number(box.width.toFixed(2)),
        height: Number(box.height.toFixed(2)),
      };
    }

    assertClean(observed, surface.id);
    const screenshot = `p7-10a-${surface.id}-1280x720.png`;
    const screenshotPath = path.join(evidenceDirectory, screenshot);
    await page.screenshot({ path: screenshotPath });
    const screenshotBytes = await fs.readFile(screenshotPath);
    result.surfaces.push({
      id: surface.id,
      path: surface.path,
      scrollY,
      visibleH1: h1Count,
      boxes,
      screenshot,
      sha256: crypto.createHash("sha256").update(screenshotBytes).digest("hex"),
    });
    await context.close();
  }
}, { port: 4385 });

await fs.writeFile(
  path.join(evidenceDirectory, "p7-10a-browser-verification.json"),
  `${JSON.stringify(result, null, 2)}\n`,
  "utf8",
);

console.log("P7-10A browser adversarial PASS: G1 y G2 cerrados a scrollY=0 en 1280x720.");
