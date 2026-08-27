import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { commandDestinations } from "../public/js/config.js";
import {
  filterCommandDestinations,
  renderCommandMenu,
} from "../public/js/views/command-menu.js";
import {
  createObservedPage,
  openPath,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";

const expectedCatalog = [
  ["journey", "Recorrido", "#journey/scale", "primary", ["recorrido", "guía", "demo", "etapas"]],
  ["dashboard", "Panorama", "#dashboard", "primary", ["panorama", "radar", "mapa", "geografía"]],
  ["projects", "Proyectos", "#projects", "primary", ["proyectos", "comparables", "competidores", "inventario"]],
  ["assistant", "Decidir", "#assistant", "primary", ["decidir", "asistente", "recomendación", "estrategia"]],
  ["activity", "Seguimiento", "#activity", "primary", ["seguimiento", "señales", "cambios", "histórico"]],
  ["inspector", "Inspector", "#inspector", "expert", ["inspector", "evidencia", "fuentes", "calidad"]],
  ["market", "Benchmark", "#market", "expert", ["benchmark", "microzona", "referencias", "atributos"]],
  ["compare", "Comparador", "#compare", "expert", ["comparador", "comparar", "diferencias"]],
  ["trust", "Checklist", "#trust", "expert", ["checklist", "preparación", "campaña", "validación"]],
];

assert.deepEqual(
  commandDestinations.map(({ id, label, href, tier, terms }) => [id, label, href, tier, [...terms]]),
  expectedCatalog,
  "El catálogo debe materializar exactamente los nueve destinos y términos aprobados",
);
assert.ok(Object.isFrozen(commandDestinations));
assert.ok(commandDestinations.every((destination) => Object.isFrozen(destination) && Object.isFrozen(destination.terms)));
assert.equal(filterCommandDestinations(commandDestinations, "").length, 9);
assert.deepEqual(filterCommandDestinations(commandDestinations, "geografia").map(({ id }) => id), ["dashboard"]);
assert.deepEqual(filterCommandDestinations(commandDestinations, "RECOMENDACIÓN").map(({ id }) => id), ["assistant"]);
assert.deepEqual(filterCommandDestinations(commandDestinations, "microzona").map(({ id }) => id), ["market"]);
for (const forbiddenQuery of ["Miraflores", "Pardo Coast", "case:f3-ct-g-pardo", "S/ 8,992", "150122"]) {
  assert.deepEqual(
    filterCommandDestinations(commandDestinations, forbiddenQuery),
    [],
    `${forbiddenQuery}: valores de datos no pueden comportarse como sinónimos`,
  );
}

const rendered = renderCommandMenu({
  open: true,
  destinations: commandDestinations,
  query: "mapa",
  activeIndex: 0,
});
assert.match(rendered, /Navega por la demo/);
assert.doesNotMatch(rendered, /Buscar en todos los datos/);
assert.match(rendered, /role="combobox"/);
assert.match(rendered, /role="listbox"/);
assert.equal((rendered.match(/data-command-destination=/gu) ?? []).length, 1);

const appSource = await fs.readFile(new URL("../public/app.js", import.meta.url), "utf8");
assert.doesNotMatch(appSource, /localStorage|sessionStorage/u, "La paleta no puede persistir consultas");
const evidenceDir = process.env.EVIDENCE_DIR ? path.resolve(process.env.EVIDENCE_DIR) : null;
if (evidenceDir) await fs.mkdir(evidenceDir, { recursive: true });

function assertClean(observed, label) {
  assert.deepEqual(observed.problems, [], `${label}: errores de navegador\n${observed.problems.join("\n")}`);
  assert.deepEqual(observed.externalRequests, [], `${label}: solicitudes externas\n${observed.externalRequests.join("\n")}`);
}

await withDemoBrowser(async ({ browser, baseUrl }) => {
  const desktop = await browser.newContext({ viewport: viewports[0] });
  const observed = await createObservedPage(desktop, baseUrl);
  const page = observed.page;
  await openPath(page, baseUrl, "/#dashboard");

  const trigger = page.locator("#command-menu-trigger");
  assert.equal(await trigger.isVisible(), true, "Ir a… debe estar visible en el rail");
  assert.ok(
    (await trigger.evaluate((element) => element.getBoundingClientRect().height)) >= 44,
    "El disparador debe medir al menos 44 px",
  );

  await page.locator("#scenario-editor-trigger").click();
  await page.locator("#top-district").focus();
  await page.keyboard.press("Control+K");
  assert.equal(await page.locator("#command-menu-dialog").count(), 0, "Ctrl+K no interfiere con campos editables");
  await page.keyboard.press("Escape");

  await page.locator("#scenario-view-title").focus();
  const returnFocusId = await page.evaluate(() => document.activeElement?.id);
  const initialUrl = page.url();
  await page.keyboard.press("Control+K");
  const dialog = page.locator("#command-menu-dialog");
  await dialog.waitFor({ state: "visible" });
  assert.equal(await page.evaluate(() => document.activeElement?.id), "command-menu-input");
  assert.equal(await page.locator("[data-command-destination]").count(), 9);
  assert.match(await dialog.innerText(), /Solo navega secciones; no busca datos\./u);

  await page.locator("#command-menu-input").fill("Miraflores");
  assert.equal(await page.locator("[data-command-destination]").count(), 0);
  assert.match(await dialog.innerText(), /No hay una sección con ese término\./u);
  assert.equal(page.url(), initialUrl, "Filtrar no debe modificar la URL");
  assert.deepEqual(
    await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) })),
    { local: [], session: [] },
    "La consulta no debe persistirse",
  );

  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#command-menu-dialog").count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement?.id), returnFocusId, "Escape devuelve foco al invocador");

  await trigger.click();
  await page.locator("#command-menu-input").fill("microzona");
  assert.deepEqual(
    await page.locator("[data-command-destination]").evaluateAll((options) => options.map((option) => option.dataset.commandDestination)),
    ["market"],
  );
  assert.equal(page.url(), initialUrl, "La URL permanece estable hasta navegar");
  if (evidenceDir) await page.screenshot({ path: path.join(evidenceDir, "command-menu-desktop.png") });
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.location.hash === "#market");
  await page.waitForFunction(() => !document.getElementById("command-menu-dialog"));
  assert.equal(await page.locator("#command-menu-dialog").count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "main-content");

  await page.locator("#main-content").focus();
  await page.keyboard.press("Meta+K");
  await page.locator("#command-menu-dialog").waitFor({ state: "visible" });
  const input = page.locator("#command-menu-input");
  await input.press("ArrowDown");
  assert.equal(
    await page.locator('[data-command-destination][aria-selected="true"] strong').innerText(),
    "Panorama",
  );
  await input.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "command-menu-close", "Tab queda atrapado en el diálogo");
  await page.keyboard.press("Shift+Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "command-menu-input");
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "main-content");
  assertClean(observed, "Ir a… desktop");
  await desktop.close();

  const laptop = await browser.newContext({ viewport: viewports[1] });
  const laptopObserved = await createObservedPage(laptop, baseUrl);
  const laptopPage = laptopObserved.page;
  await openPath(laptopPage, baseUrl, "/#dashboard");
  await laptopPage.locator("#scenario-view-title").focus();
  await laptopPage.keyboard.press("Control+K");
  const laptopDialog = laptopPage.locator("#command-menu-dialog");
  await laptopDialog.waitFor({ state: "visible" });
  const laptopGeometry = await laptopDialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      documentWidth: document.documentElement.scrollWidth,
    };
  });
  assert.ok(laptopGeometry.left >= 0 && laptopGeometry.right <= laptopGeometry.viewportWidth);
  assert.ok(laptopGeometry.top >= 0 && laptopGeometry.bottom <= laptopGeometry.viewportHeight);
  assert.ok(laptopGeometry.documentWidth <= laptopGeometry.viewportWidth);
  if (evidenceDir) await laptopPage.screenshot({ path: path.join(evidenceDir, "command-menu-laptop.png") });
  assertClean(laptopObserved, "Ir a… laptop");
  await laptop.close();

  const mobile = await browser.newContext({ viewport: viewports[2] });
  const mobileObserved = await createObservedPage(mobile, baseUrl);
  const mobilePage = mobileObserved.page;
  await openPath(mobilePage, baseUrl, "/#dashboard");
  await mobilePage.locator("#menu-toggle").click();
  await mobilePage.locator("#command-menu-trigger").click();
  const mobileDialog = mobilePage.locator("#command-menu-dialog");
  await mobileDialog.waitFor({ state: "visible" });
  const geometry = await mobileDialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      documentWidth: document.documentElement.scrollWidth,
    };
  });
  assert.ok(geometry.left >= 0 && geometry.right <= geometry.viewportWidth);
  assert.ok(geometry.top >= 0 && geometry.bottom <= geometry.viewportHeight);
  assert.ok(geometry.documentWidth <= geometry.viewportWidth, "La paleta móvil no crea overflow horizontal");
  assert.ok(
    (await mobilePage.locator("#command-menu-close").evaluate((element) => element.getBoundingClientRect().height)) >= 44,
  );
  await mobilePage.locator("#command-menu-input").fill("comparar");
  if (evidenceDir) await mobilePage.screenshot({ path: path.join(evidenceDir, "command-menu-mobile.png") });
  await mobilePage.locator('[data-command-destination="compare"]').click();
  await mobilePage.waitForFunction(() => window.location.hash === "#compare");
  await mobilePage.waitForFunction(() => !document.querySelector(".app-shell.nav-is-open"));
  assert.equal(await mobilePage.locator(".app-shell.nav-is-open").count(), 0);
  assertClean(mobileObserved, "Ir a… mobile");
  await mobile.close();
});

console.log("Command menu OK: 9 destinos, términos cerrados, teclado, foco, privacidad y navegación local verificados.");
