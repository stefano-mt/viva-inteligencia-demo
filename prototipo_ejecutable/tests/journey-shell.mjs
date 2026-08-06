import assert from "node:assert/strict";
import {
  createObservedPage,
  openPath,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";

const stageQuestions = Object.freeze({
  scale: "¿Qué mercado observable sostiene la lectura?",
  geography: "¿Dónde compite el proyecto?",
  quality: "¿Qué dato puede utilizarse?",
  depth: "¿Cómo se diferencia la oferta?",
  movement: "¿Qué cambió en el mercado?",
  decision: "¿Qué hacemos y qué no podemos afirmar?",
});

await withDemoBrowser(async ({ browser, baseUrl }) => {
  const context = await browser.newContext({ viewport: viewports[1] });
  const { page, problems, externalRequests } = await createObservedPage(
    context,
    baseUrl,
  );

  await openPath(page, baseUrl, "/");
  assert.equal(new URL(page.url()).hash, "#journey/scale");
  assert.equal(await page.locator("h1").count(), 1);
  assert.equal(await page.locator("h1").textContent(), stageQuestions.scale);
  assert.equal(await page.locator('[data-journey-entry][aria-current="page"]').count(), 1);
  assert.equal(await page.locator('[data-journey-step]').count(), 6);
  assert.equal(await page.locator('[data-journey-step="scale"][aria-current="step"]').count(), 1);
  assert.equal(await page.locator('[data-expert-navigation] [data-view]').count(), 8);
  assert.match(await page.locator(".nav-section--journey").innerText(), /Recorrido/u);
  assert.match(await page.locator("[data-expert-navigation]").innerText(), /Explorar análisis/iu);

  await openPath(
    page,
    baseUrl,
    "/?sv=1&scope=district&district=150122#journey/scale",
  );
  const scenarioSearch = new URL(page.url()).search;
  await page.locator(".journey-primary-action").click();
  await page.waitForFunction(
    () => window.location.hash === "#journey/geography",
  );
  await page
    .locator('[data-journey-stage="geography"]')
    .waitFor({ state: "visible" });
  assert.equal(new URL(page.url()).search, scenarioSearch);
  assert.equal(await page.locator("h1").textContent(), stageQuestions.geography);
  assert.equal(await page.locator('[data-journey-step="geography"][aria-current="step"]').count(), 1);

  for (const [stageId, question] of Object.entries(stageQuestions)) {
    await openPath(page, baseUrl, `/#journey/${stageId}`);
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator("h1").textContent(), question);
    assert.equal(await page.locator(`[data-journey-step="${stageId}"][aria-current="step"]`).count(), 1);
    const ctaBox = await page.locator(".journey-primary-action").boundingBox();
    const limitBox = await page.locator(".journey-reading__limit").boundingBox();
    assert.ok(ctaBox && ctaBox.y + ctaBox.height <= viewports[1].height, `El CTA de ${stageId} debe quedar en la primera pantalla laptop`);
    assert.ok(limitBox && limitBox.y + limitBox.height <= viewports[1].height, `El límite de ${stageId} debe quedar en la primera pantalla laptop`);
  }

  await openPath(page, baseUrl, "/#journey/not-real");
  assert.equal(new URL(page.url()).hash, "#journey/scale");
  assert.equal(await page.locator("h1").textContent(), stageQuestions.scale);
  assert.match(await page.locator("#journey-live").textContent(), /no estaba disponible/i);

  await openPath(page, baseUrl, "/#journey/quality");
  await page.locator('[data-journey-expert="inspector"]').click();
  await page.waitForFunction(
    () => window.location.hash === "#inspector/case/f3-ct-g-pardo",
  );
  await page.waitForFunction(
    () => document.querySelector("h1")?.textContent === "Inspector de evidencia",
  );
  assert.equal(await page.locator("h1").first().textContent(), "Inspector de evidencia");

  await openPath(page, baseUrl, "/#dashboard");
  assert.equal(await page.locator("h1").first().textContent(), "Radar comercial");
  assert.equal(await page.locator('[data-view="dashboard"][aria-current="page"]').count(), 1);
  assert.equal(await page.locator('[data-journey-entry]').count(), 1);

  assert.deepEqual(problems, [], `Errores del shell del recorrido:\n${problems.join("\n")}`);
  assert.deepEqual(externalRequests, [], `Red externa del shell:\n${externalRequests.join("\n")}`);
  await context.close();
});

console.log(
  "Journey shell OK: root, six stages, active rail, expert access, canonical correction and legacy shell verified.",
);
