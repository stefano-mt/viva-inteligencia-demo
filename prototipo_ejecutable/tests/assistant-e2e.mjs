import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  createObservedPage,
  openRoute,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";

const evidenceDir = process.env.EVIDENCE_DIR
  ? path.resolve(process.env.EVIDENCE_DIR)
  : null;

await withDemoBrowser(
  async ({ browser, baseUrl }) => {
    const desktop = await browser.newContext({ viewport: viewports[0] });
    const observed = await createObservedPage(desktop, baseUrl);
    const { page } = observed;
    await openRoute(page, baseUrl, "assistant");
    await page.locator('[data-scenario-consumer="assistant"]').waitFor();

    assert.equal(
      await page.locator('[data-scenario-consumer="assistant"]').getAttribute("data-assistant-status"),
      "idle",
    );
    assert.equal(await page.locator(".assistant-question").count(), 7);
    assert.equal(
      await page.locator(".assistant-question-bank > .assistant-suggestions .assistant-question").count(),
      3,
    );
    assert.equal(await page.locator("#assistant-live").getAttribute("aria-live"), "polite");

    const input = page.locator("#assistant-input");
    await input.fill("Consulta todavía no enviada");
    await input.press("Enter");
    assert.equal(await page.locator("[data-assistant-response]").count(), 0);
    assert.match(await input.inputValue(), /\n$/u, "plain Enter must not submit");

    await page.locator(".assistant-question").nth(1).click();
    assert.equal(
      await input.inputValue(),
      "¿Qué precios publicados cambiaron en este escenario?",
    );
    assert.equal(await input.evaluate((element) => document.activeElement === element), true);
    await input.press("Control+Enter");
    await page.locator('[data-assistant-response="ready"]').waitFor();
    assert.equal(await page.locator("[data-assistant-block]").count(), 6);
    assert.equal(
      await page.locator("#assistant-response-title").evaluate(
        (element) => document.activeElement === element,
      ),
      true,
    );
    assert.doesNotMatch(page.url(), /Consulta|precios|assistantInput/iu);
    if (evidenceDir) {
      await fs.mkdir(evidenceDir, { recursive: true });
      await page.screenshot({
        path: path.join(evidenceDir, "assistant-ready-1440x900.png"),
        fullPage: true,
      });
    }

    await page.locator('[data-assistant-reference-route="activity"]').first().click();
    await page.locator('[data-view="activity"][aria-current="page"]').waitFor();
    assert.equal(new URL(page.url()).hash, "#activity");

    await openRoute(page, baseUrl, "assistant");
    await input.fill("¿Cuál es el precio real de cierre del competidor?");
    await input.press("Control+Enter");
    await page.locator('[data-assistant-response="refused"]').waitFor();
    assert.match(
      await page.locator("[data-assistant-block=limitations]").innerText(),
      /precio real de cierre/iu,
    );
    await page.locator('[data-assistant-route="assistant"]').click();
    assert.equal(new URL(page.url()).hash, "#assistant");
    assert.equal(await page.locator("[data-assistant-response]").count(), 0);
    assert.equal(
      await page.locator(".assistant-question").first().evaluate(
        (element) => document.activeElement === element,
      ),
      true,
    );

    await page.locator(".assistant-question").first().click();
    await input.press("Control+Enter");
    await page.locator('[data-assistant-response="ready"]').waitFor();
    await page.locator('[data-assistant-reference-route="benchmark"]').first().click();
    await page.locator('[data-view="market"][aria-current="page"]').waitFor();
    assert.equal(new URL(page.url()).hash, "#market");
    assert.deepEqual(observed.problems, []);
    assert.deepEqual(observed.externalRequests, []);
    await desktop.close();

    const mobile = await browser.newContext({ viewport: viewports[2] });
    const mobileObserved = await createObservedPage(mobile, baseUrl);
    const mobilePage = mobileObserved.page;
    await openRoute(mobilePage, baseUrl, "assistant");
    await mobilePage.locator('[data-scenario-consumer="assistant"]').waitFor();
    await mobilePage.locator(".assistant-question").first().click();
    await mobilePage.locator("#assistant-input").press("Control+Enter");
    await mobilePage.locator('[data-assistant-response="ready"]').waitFor();
    assert.equal(
      await mobilePage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
      "mobile assistant must not introduce horizontal scroll",
    );
    if (evidenceDir) {
      await mobilePage.screenshot({
        path: path.join(evidenceDir, "assistant-ready-390x844.png"),
        fullPage: true,
      });
    }
    assert.deepEqual(mobileObserved.problems, []);
    assert.deepEqual(mobileObserved.externalRequests, []);
    await mobile.close();
  },
  { port: 4188 },
);

console.log(
  "Assistant E2E OK: guided/free query, Ctrl+Enter, focus, six blocks, assistant/benchmark handoffs, session-only input and mobile reflow verified.",
);
