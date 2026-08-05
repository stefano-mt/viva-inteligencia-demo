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

await withDemoBrowser(async ({ browser, baseUrl }) => {
  const desktop = await browser.newContext({ viewport: viewports[0] });
  const desktopObserved = await createObservedPage(desktop, baseUrl);
  const page = desktopObserved.page;
  await openRoute(page, baseUrl, "activity");

  assert.equal(await page.locator("h1").first().textContent(), "Señales del mercado");
  assert.equal(await page.locator('[data-history-status="ready"]').count(), 1);
  assert.equal(await page.locator("[data-history-row]").count(), 5);
  assert.equal(await page.locator(".history-quality-item").count(), 4);
  assert.equal(await page.locator("text=Cambios publicados en Miraflores").count(), 1);
  assert.equal(await page.locator(".history-agenda__item").count(), 3);
  assert.equal(await page.locator("[data-history-agenda-event]").count(), 3);
  assert.equal(
    await page.locator(".history-agenda").innerText().then((text) => /semana/iu.test(text)),
    false,
  );
  if (evidenceDir) {
    await fs.mkdir(evidenceDir, { recursive: true });
    await page.screenshot({
      path: path.join(evidenceDir, "desktop-activity.png"),
      fullPage: true,
    });
  }

  const firstToggle = page.locator("[data-history-event]").first();
  const firstToggleId = await firstToggle.getAttribute("id");
  await firstToggle.focus();
  await page.keyboard.press("Enter");
  assert.equal(await firstToggle.getAttribute("aria-expanded"), "true");
  assert.equal(await page.locator(".history-detail").count(), 1);
  assert.equal(await page.evaluate(() => document.activeElement?.id), firstToggleId);
  await page.keyboard.press("Space");
  assert.equal(await page.locator(".history-detail").count(), 0);

  const firstAgendaAction = page.locator("[data-history-agenda-event]").first();
  const agendaEventId = await firstAgendaAction.getAttribute(
    "data-history-agenda-event",
  );
  await firstAgendaAction.focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator(".history-detail").count(), 1);
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    `history-evidence-${agendaEventId.replace(/[^a-zA-Z0-9_-]/gu, "-")}`,
  );
  await page.keyboard.press("Enter");
  assert.equal(await page.locator(".history-detail").count(), 0);

  await page.locator("#history-status-filter").selectOption("reviewable");
  assert.equal(await page.locator("[data-history-row]").count(), 0);
  assert.equal(await page.locator("text=No hay señales con estos filtros").count(), 1);
  assert.equal(await page.locator(".history-agenda__item").count(), 1);
  assert.equal(await page.locator("[data-history-focus]").count(), 1);
  await page.locator("[data-history-clear]").click();
  assert.equal(await page.locator("[data-history-row]").count(), 5);

  await page.locator("[data-history-priority]").click();
  assert.equal(await page.locator(".history-detail").count(), 1);
  await page.locator("[data-history-project]").first().click();
  await page.locator('[data-view="projects"][aria-current="page"]').waitFor();
  assert.equal(new URL(page.url()).hash, "#projects");

  assert.deepEqual(desktopObserved.problems, []);
  assert.deepEqual(desktopObserved.externalRequests, []);
  await desktop.close();

  const laptop = await browser.newContext({ viewport: viewports[1] });
  const laptopObserved = await createObservedPage(laptop, baseUrl);
  await openRoute(laptopObserved.page, baseUrl, "activity");
  assert.equal(await laptopObserved.page.locator("[data-history-row]").count(), 5);
  assert.equal(
    await laptopObserved.page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  if (evidenceDir) {
    await laptopObserved.page.screenshot({
      path: path.join(evidenceDir, "laptop-activity.png"),
      fullPage: true,
    });
  }
  assert.deepEqual(laptopObserved.problems, []);
  assert.deepEqual(laptopObserved.externalRequests, []);
  await laptop.close();

  const mobile = await browser.newContext({ viewport: viewports[2] });
  const mobileObserved = await createObservedPage(mobile, baseUrl);
  const mobilePage = mobileObserved.page;
  await openRoute(mobilePage, baseUrl, "activity");
  await mobilePage.locator("[data-history-event]").first().click();
  assert.equal(await mobilePage.locator(".history-detail").count(), 1);
  assert.equal(
    await mobilePage.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
    "mobile history must not introduce horizontal scroll",
  );
  if (evidenceDir) {
    await fs.mkdir(evidenceDir, { recursive: true });
    await mobilePage.screenshot({
      path: path.join(evidenceDir, "mobile-activity-detail.png"),
      fullPage: true,
    });
  }
  assert.deepEqual(mobileObserved.problems, []);
  assert.deepEqual(mobileObserved.externalRequests, []);
  await mobile.close();
});

console.log(
  "Activity E2E OK: canonical signals, filters, detail focus, project handoff and mobile reflow verified.",
);
