import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  createObservedPage,
  openPath,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";

const appSource = await fs.readFile(new URL("../public/app.js", import.meta.url), "utf8");
const shellCss = await fs.readFile(new URL("../public/styles/20-shell.css", import.meta.url), "utf8");
const scenarioCss = await fs.readFile(new URL("../public/styles/25-scenario-context.css", import.meta.url), "utf8");
const evidenceDir = process.env.EVIDENCE_DIR ? path.resolve(process.env.EVIDENCE_DIR) : null;
if (evidenceDir) await fs.mkdir(evidenceDir, { recursive: true });

const primaryLabels = ["Recorrido", "Panorama", "Proyectos", "Decidir", "Seguimiento"];
const expertLabels = ["Inspector", "Benchmark", "Comparador", "Checklist"];
for (const label of [...primaryLabels, ...expertLabels]) {
  assert.match(appSource, new RegExp(`label: "${label}"`, "u"), `${label}: destino ausente`);
}
assert.match(shellCss, /grid-template-columns:\s*var\(--workspace-rail-width\) minmax\(0, 1fr\)/u);
assert.match(scenarioCss, /\.workspace > \.scenario-bar\s*\{[^}]*min-height:\s*var\(--workspace-topbar-height\)/su);
assert.doesNotMatch(appSource, /localStorage|sessionStorage/u, "El shell no puede persistir preferencias");

function assertClean(observed, label) {
  assert.deepEqual(observed.problems, [], `${label}: errores de navegador\n${observed.problems.join("\n")}`);
  assert.deepEqual(observed.externalRequests, [], `${label}: solicitudes externas\n${observed.externalRequests.join("\n")}`);
}

async function labels(locator) {
  return locator.evaluateAll((items) => items.map((item) => item.querySelector("strong")?.textContent?.trim()));
}

await withDemoBrowser(async ({ browser, baseUrl }) => {
  const desktop = await browser.newContext({ viewport: viewports[0] });
  const desktopObserved = await createObservedPage(desktop, baseUrl);
  const page = desktopObserved.page;
  await openPath(page, baseUrl, "/#dashboard");

  assert.deepEqual(await labels(page.locator('[data-nav-tier="primary"]')), primaryLabels);
  assert.deepEqual(await labels(page.locator('[data-nav-tier="expert"]')), expertLabels);
  assert.equal(await page.locator('[data-nav-tier="primary"]').count(), 5);
  assert.equal(await page.locator('[data-nav-tier="expert"]').count(), 4);
  assert.equal(await page.locator('[data-view="dashboard"][aria-current="page"]').count(), 1);
  assert.equal(await page.locator(".nav-expert-disclosure:not([open])").count(), 1);

  const sidebarWidth = await page.locator(".sidebar").evaluate((element) => element.getBoundingClientRect().width);
  const topbarHeight = await page.locator(".topbar").evaluate((element) => element.getBoundingClientRect().height);
  assert.ok(sidebarWidth <= 248, `Rail desktop excede 248 px: ${sidebarWidth}`);
  assert.ok(topbarHeight <= 72, `Topbar desktop excede 72 px: ${topbarHeight}`);
  assert.match(await page.locator(".scenario-sidebar").innerText(), /Miraflores.*Distrito completo/isu);
  assert.match(await page.locator(".scenario-sidebar").innerText(), /85 comparables/iu);
  assert.equal(await page.locator("#scenario-editor").isHidden(), true, "El editor debe iniciar cerrado");
  if (evidenceDir) await page.screenshot({ path: path.join(evidenceDir, "shell-desktop-closed.png") });

  await page.locator("#scenario-editor-trigger").click();
  assert.equal(await page.locator("#scenario-editor").isVisible(), true);
  assert.equal(await page.locator("#scenario-editor").getAttribute("aria-modal"), "false");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "scenario-editor-close");
  assert.equal(await page.locator("#scenario-editor-trigger").getAttribute("aria-expanded"), "true");
  if (evidenceDir) await page.screenshot({ path: path.join(evidenceDir, "shell-desktop-editor.png") });

  const revisionBefore = await page.evaluate(async () => {
    const { state } = await import(new URL("js/state.js", document.baseURI).href);
    return state.scenarioContextRevision;
  });
  await page.locator("#top-district").selectOption("150140");
  const revisionAfter = await page.evaluate(async () => {
    const { state } = await import(new URL("js/state.js", document.baseURI).href);
    return state.scenarioContextRevision;
  });
  assert.equal(revisionAfter, revisionBefore + 1, "Cambiar distrito debe recomponer el escenario una vez");
  assert.equal(await page.locator("#scenario-editor").isVisible(), true, "El editor permanece abierto al aplicar");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "top-district");
  assert.match(new URL(page.url()).search, /district=150140/u);

  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#scenario-editor").isHidden(), true);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "scenario-editor-trigger");

  await page.locator(".nav-expert-disclosure > summary").click();
  assert.equal(await page.locator(".nav-expert-disclosure[open]").count(), 1);
  await page.locator('[data-view="inspector"]').click();
  await page.waitForFunction(() => window.location.hash.startsWith("#inspector"));
  assert.equal(await page.locator(".nav-expert-disclosure[open]").count(), 1, "Una ruta experta abre Profundizar");
  await page.locator('[data-view="inspector"][aria-current="page"]').waitFor();
  assert.equal(await page.locator('[data-view="inspector"][aria-current="page"]').count(), 1);

  await openPath(page, baseUrl, "/#journey/scale");
  const journeyTopbarHeight = await page.locator(".journey-topbar").evaluate((element) => element.getBoundingClientRect().height);
  assert.ok(journeyTopbarHeight <= 72, `Topbar del recorrido excede 72 px: ${journeyTopbarHeight}`);
  assert.equal(await page.locator('[data-journey-entry][aria-current="page"]').count(), 1);
  assertClean(desktopObserved, "Shell desktop");
  await desktop.close();

  const mobile = await browser.newContext({ viewport: viewports[2] });
  const mobileObserved = await createObservedPage(mobile, baseUrl);
  const mobilePage = mobileObserved.page;
  await openPath(mobilePage, baseUrl, "/#dashboard");
  await mobilePage.locator("#scenario-topbar-editor-trigger").click();
  assert.equal(await mobilePage.locator("#scenario-editor").isVisible(), true);
  assert.equal(await mobilePage.locator("#scenario-editor").getAttribute("aria-modal"), "true");
  assert.equal(await mobilePage.locator(".app-shell.nav-is-open").count(), 1);
  assert.equal(await mobilePage.evaluate(() => document.activeElement?.id), "scenario-editor-close");
  if (evidenceDir) await mobilePage.screenshot({ path: path.join(evidenceDir, "shell-mobile-editor.png") });

  await mobilePage.locator("#reset-scenario").focus();
  await mobilePage.keyboard.press("Tab");
  assert.equal(await mobilePage.evaluate(() => document.activeElement?.id), "scenario-editor-close", "Tab debe permanecer dentro de la hoja");
  await mobilePage.keyboard.press("Escape");
  assert.equal(await mobilePage.locator("#scenario-editor").isHidden(), true);
  assert.equal(await mobilePage.locator(".app-shell.nav-is-open").count(), 0);
  assert.equal(await mobilePage.evaluate(() => document.activeElement?.id), "scenario-topbar-editor-trigger");

  const geometry = await mobilePage.evaluate(() => ({
    body: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    topbar: document.querySelector(".topbar")?.getBoundingClientRect().height,
  }));
  assert.ok(geometry.body <= geometry.viewport, `Overflow móvil: ${geometry.body}/${geometry.viewport}`);
  assert.ok(geometry.topbar <= 72, `Topbar móvil excede 72 px: ${geometry.topbar}`);
  assertClean(mobileObserved, "Shell mobile");
  await mobile.close();
});

console.log("Commercial shell OK: 5+4 destinos, escenario bajo demanda, foco, responsive y navegación preservados.");
