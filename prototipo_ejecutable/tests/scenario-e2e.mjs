import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createObservedPage, openPath, routes, viewports, withDemoBrowser } from "./helpers/demo-browser.mjs";
import { resolveAppPath } from "./helpers/app-url.mjs";

const descriptor = JSON.parse(
  await fs.readFile(new URL("./e2e-scenarios/ct-c-public.json", import.meta.url), "utf8"),
);
const emptyRadiusPath =
  "/?sv=1&scope=radius&lat=-12.000000&lon=-77.000000&radius=500#dashboard";
const interactionTimeout = 5_000;

function pathForRoute(pathname, routeId) {
  const url = new URL(pathname, "http://scenario.test");
  url.hash = routeId;
  return `${url.pathname}${url.search}${url.hash}`;
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

async function uniqueAttributeValues(locator, attribute) {
  return sorted(
    new Set(
      (await locator.evaluateAll(
        (elements, name) => elements.map((element) => element.getAttribute(name)).filter(Boolean),
        attribute,
      )),
    ),
  );
}

async function assertCanonicalIds(page, consumer, expected) {
  const root = page.locator(`[data-scenario-consumer="${consumer}"]`);
  assert.equal(await root.count(), 1, `Debe existir un consumidor ${consumer}`);
  assert.deepEqual(
    await uniqueAttributeValues(root.locator("[data-canonical-project-id]"), "data-canonical-project-id"),
    sorted(expected),
    `${consumer} debe consumir únicamente IDs canónicos del escenario`,
  );
}

async function assertCurrentPath(page, baseUrl, expectedPath, message) {
  const deployedPath = resolveAppPath(baseUrl, expectedPath);
  await page.waitForFunction(
    (path) => `${window.location.pathname}${window.location.search}${window.location.hash}` === path,
    deployedPath,
    { timeout: interactionTimeout },
  );
  const current = new URL(page.url());
  assert.equal(
    `${current.pathname}${current.search}${current.hash}`,
    deployedPath,
    message,
  );
}

async function waitForActiveRoute(
  page,
  routeId,
  { baseUrl = null, expectedPath = null, navClosed = false } = {},
) {
  const deployedPath = expectedPath && baseUrl
    ? resolveAppPath(baseUrl, expectedPath)
    : expectedPath;
  await page.waitForFunction(
    ({ id, path, requireClosedNav }) => {
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const routeIsActive = Boolean(document.querySelector(`[data-view="${id}"][aria-current="page"]`));
      const shell = document.querySelector(".app-shell");
      return (
        routeIsActive &&
        (!path || currentPath === path) &&
        (!requireClosedNav || (shell && !shell.classList.contains("nav-is-open")))
      );
    },
    { id: routeId, path: deployedPath, requireClosedNav: navClosed },
    { timeout: interactionTimeout },
  );
}

async function waitForFocus(page, id) {
  await page.waitForFunction(
    (expectedId) => document.activeElement?.id === expectedId,
    id,
    { timeout: interactionTimeout },
  );
}

async function waitForMobileNav(page, open) {
  await page.waitForFunction(
    (expectedOpen) => document.querySelector(".app-shell")?.classList.contains("nav-is-open") === expectedOpen,
    open,
    { timeout: interactionTimeout },
  );
}

function assertClean(problems, externalRequests, label) {
  assert.deepEqual(
    externalRequests,
    [],
    `Se intentó acceder fuera del origen durante ${label}:\n${externalRequests.join("\n")}`,
  );
  assert.deepEqual(
    problems,
    [],
    `Errores de consola, página, red o HTTP durante ${label}:\n${problems.join("\n")}`,
  );
}

async function assertRoute(page, route) {
  assert.equal(await page.locator("h1").first().textContent(), route.title, `Título incorrecto en #${route.id}`);
  assert.equal(
    await page.locator(`[data-view="${route.id}"][aria-current="page"]`).count(),
    1,
    `La navegación no marca #${route.id} como activa`,
  );
}

async function assertSelectedObservedProject(page, observedProjectId) {
  const selected = page.locator(
    `[data-visualization-active="true"] [data-selected-project="${observedProjectId}"]`,
  );
  await selected.waitFor({ state: "visible" });
  assert.equal(await selected.count(), 1, `El detalle activo debe corresponder a ${observedProjectId}`);
}

async function expandProjectCatalog(page) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const more = page.locator("#load-more-projects");
    if (!(await more.count())) return;
    await more.click();
  }
  assert.fail("El catálogo siguió paginado después de diez expansiones");
}

await withDemoBrowser(async ({ browser, baseUrl }) => {
  const desktop = await browser.newContext({ viewport: viewports[0] });
  const {
    page,
    problems,
    externalRequests,
  } = await createObservedPage(desktop, baseUrl);

  await openPath(page, baseUrl, descriptor.canonical_path);
  await assertCurrentPath(page, baseUrl, descriptor.canonical_path, "La URL CT-C debe ser canónica al cargar");
  assert.equal(
    await page.locator("#scenario-canonical-url").textContent(),
    page.url(),
    "La URL compartible debe reflejar exactamente la URL canónica",
  );

  const publicMetadata = await page.evaluate(async () => {
    const response = await fetch(
      new URL("demo-data/viva-platform-demo.json", window.location.href),
    );
    if (!response.ok) throw new Error(`No se pudo leer el dataset público: HTTP ${response.status}`);
    return (await response.json()).metadata;
  });
  assert.equal(publicMetadata.dataset_id, descriptor.dataset_id, "Dataset CT-C inesperado");
  assert.equal(publicMetadata.contract_version, descriptor.contract_version, "Contrato CT-C inesperado");

  const mapIds = await uniqueAttributeValues(page.locator("[data-geo-point-id]"), "data-geo-point-id");
  const selectIds = sorted(await page.locator("#geo-project-select option").evaluateAll((options) => options.map((option) => option.value)));
  assert.deepEqual(mapIds, sorted(descriptor.expected.display_project_ids), "El mapa debe mostrar el set observado CT-C");
  assert.deepEqual(selectIds, mapIds, "Mapa y select nativo deben exponer los mismos IDs observados");

  const ctCTerritorialPath = await page.evaluate(
    () => `${window.location.pathname}${window.location.search}`,
  );
  await page.locator('[data-view="inspector"]').first().click();
  await waitForActiveRoute(page, "inspector", {
    baseUrl,
    expectedPath: pathForRoute(descriptor.canonical_path, "inspector"),
  });
  assert.equal(
    await page.evaluate(() => `${window.location.pathname}${window.location.search}`),
    ctCTerritorialPath,
    "Abrir el inspector no debe cambiar la query territorial CT-C",
  );
  const pendingEvidence = page.locator(
    '.inspector-evidence-option[data-inspector-evidence="evidence:pardo-coast-card-metadata"]',
  );
  await pendingEvidence.click();
  await page.locator("#inspector-evidence-dialog[open]").waitFor({ state: "visible" });
  await page.locator("#inspector-dialog-close").click();
  await page.locator("#inspector-evidence-dialog").waitFor({ state: "detached" });
  assert.equal(
    await page.evaluate(() => `${window.location.pathname}${window.location.search}`),
    ctCTerritorialPath,
    "Abrir y cerrar evidencia no debe cambiar la query territorial CT-C",
  );
  await page.locator('[data-view="dashboard"]').first().click();
  await waitForActiveRoute(page, "dashboard", {
    baseUrl,
    expectedPath: descriptor.canonical_path,
  });
  assert.deepEqual(
    await uniqueAttributeValues(page.locator("[data-geo-point-id]"), "data-geo-point-id"),
    mapIds,
    "Entrar y salir del inspector no debe cambiar los IDs observados CT-C",
  );

  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#main-content").waitFor({ state: "visible" });
  await assertCurrentPath(page, baseUrl, descriptor.canonical_path, "Reload debe reproducir la URL CT-C");
  assert.deepEqual(
    await uniqueAttributeValues(page.locator("[data-geo-point-id]"), "data-geo-point-id"),
    mapIds,
    "Reload debe reproducir el set observado CT-C",
  );

  const targetObservedId = descriptor.expected.display_project_ids.at(-1);
  const alternateObservedId = descriptor.expected.display_project_ids[0];
  const geoSelect = page.locator("#geo-project-select");

  await geoSelect.selectOption(alternateObservedId);
  await page.locator(`[data-geo-point-id="${targetObservedId}"]`).click();
  await assertSelectedObservedProject(page, targetObservedId);
  assert.equal(await page.locator("#geo-project-select").inputValue(), targetObservedId, "Click de mapa y selector deben converger");

  await page.locator("#geo-project-select").selectOption(alternateObservedId);
  await page.locator("#geo-project-select").selectOption(targetObservedId);
  await assertSelectedObservedProject(page, targetObservedId);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "geo-project-select", "El select debe recuperar foco tras render");

  await page.locator("#geo-project-select").selectOption(alternateObservedId);
  await page.locator("#geo-project-select").focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await assertSelectedObservedProject(page, targetObservedId);
  assert.equal(await page.locator("#geo-project-select").inputValue(), targetObservedId, "Space/Enter debe seleccionar el mismo ID");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "geo-project-select", "El foco de teclado debe persistir");

  await page.locator("#scenario-view-positioning").click();
  assert.equal(await page.locator('.positioning-panel[data-visualization-active="true"]').count(), 1, "Debe activar posicionamiento");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "scenario-view-positioning", "Posicionamiento debe conservar foco");
  assert.equal(new URL(page.url()).searchParams.get("viz"), "positioning", "La URL debe persistir la visualización");
  await page.locator("#scenario-view-geographic").click();
  assert.equal(await page.locator('.geo-panel[data-visualization-active="true"]').count(), 1, "Debe reactivar geografía");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "scenario-view-geographic", "Geografía debe conservar foco");
  assert.equal(new URL(page.url()).searchParams.has("viz"), false, "La visualización por defecto no debe ensuciar la URL");

  await page.locator("#scenario-product-price").fill("660000");
  await page.locator("#scenario-product-submit").click();
  assert.equal(await page.evaluate(() => document.activeElement?.id), "scenario-product-submit", "Submit debe recuperar foco");
  assert.equal(new URL(page.url()).searchParams.get("price"), "660000", "El formulario debe persistir el precio");

  await openPath(page, baseUrl, descriptor.canonical_path);
  await page.locator("#scenario-view-comparables").click();
  await waitForActiveRoute(page, "projects", {
    baseUrl,
    expectedPath: pathForRoute(descriptor.canonical_path, "projects"),
  });
  await assertCurrentPath(
    page,
    baseUrl,
    pathForRoute(descriptor.canonical_path, "projects"),
    "La CTA debe preservar query y navegar a proyectos",
  );
  await waitForFocus(page, "main-content");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "main-content", "La CTA debe enfocar main-content");

  const help = page.locator("details.component-help").first();
  const helpSummary = help.locator("summary");
  await helpSummary.click();
  assert.equal(await help.getAttribute("open"), "", "La ayuda contextual debe abrir");
  await helpSummary.press("Escape");
  assert.equal(await help.getAttribute("open"), null, "Escape debe cerrar la ayuda contextual");
  assert.equal(await helpSummary.evaluate((element) => document.activeElement === element), true, "Escape debe devolver foco al summary");

  for (const route of routes) {
    await openPath(page, baseUrl, pathForRoute(descriptor.canonical_path, route.id));
    await assertRoute(page, route);
  }

  for (const [routeId, consumer] of [
    ["projects", "catalog"],
    ["compare", "compare"],
    ["trust", "checklist"],
    ["assistant", "assistant"],
  ]) {
    await openPath(page, baseUrl, pathForRoute(descriptor.canonical_path, routeId));
    await assertCanonicalIds(page, consumer, descriptor.expected.consumer_project_ids[consumer]);
  }

  await openPath(page, baseUrl, descriptor.canonical_path);
  await page.locator("#reset-scenario").click();
  await assertCurrentPath(page, baseUrl, "/#dashboard", "Reset debe restaurar el preset CT-I");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "reset-scenario", "Reset debe recuperar foco");
  assert.equal(await page.locator("[data-geo-point-id]").count(), 90, "CT-I debe mostrar 90 observaciones");
  assert.equal(await page.locator("#geo-project-select option").count(), 90, "CT-I debe ofrecer 90 observaciones por teclado");

  await openPath(page, baseUrl, "/#compare");
  const baselineCompareIds = await uniqueAttributeValues(
    page.locator('[data-scenario-consumer="compare"] [data-canonical-project-id]'),
    "data-canonical-project-id",
  );
  assert.equal(baselineCompareIds.length, 85, "CT-I debe contener 85 IDs canónicos comparables");
  assert.ok(
    baselineCompareIds.includes("project:nexo-2951"),
    "CT-I debe conservar project:nexo-2951 en el universo territorial",
  );

  await openPath(page, baseUrl, "/#projects");
  await expandProjectCatalog(page);
  const baselineCatalogIds = await uniqueAttributeValues(
    page.locator('[data-scenario-consumer="catalog"] [data-canonical-project-id]'),
    "data-canonical-project-id",
  );
  assert.deepEqual(baselineCatalogIds, baselineCompareIds, "Catálogo y comparador CT-I deben consumir los mismos 85 IDs");
  assert.match(await page.locator('[data-scenario-consumer="catalog"]').innerText(), /69\s+con precio/i, "CT-I debe declarar 69 referencias de precio");

  for (const [routeId, consumer] of [
    ["trust", "checklist"],
    ["assistant", "assistant"],
  ]) {
    await openPath(page, baseUrl, `/#${routeId}`);
    const referenceIds = await uniqueAttributeValues(
      page.locator(`[data-scenario-consumer="${consumer}"] [data-canonical-project-id]`),
      "data-canonical-project-id",
    );
    assert.ok(referenceIds.length > 0 && referenceIds.length <= 3, `${consumer} debe limitar referencias trazables`);
    assert.ok(referenceIds.every((id) => baselineCompareIds.includes(id)), `${consumer} no debe introducir IDs fuera de CT-I`);
  }

  await openPath(page, baseUrl, "/#dashboard");
  await page.locator("#scenario-scope-quadrant").click();
  assert.equal(new URL(page.url()).searchParams.get("scope"), "quadrant", "Debe activar alcance por cuadrante");
  assert.equal(new URL(page.url()).searchParams.get("quadrant"), "NW", "Debe elegir el primer cuadrante estable");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "scenario-scope-quadrant", "El control de cuadrante debe conservar foco");

  await page.locator('[data-view="compare"]').first().click();
  await waitForActiveRoute(page, "compare");
  const quadrantCompareIds = await uniqueAttributeValues(
    page.locator('[data-scenario-consumer="compare"] [data-canonical-project-id]'),
    "data-canonical-project-id",
  );
  assert.ok(quadrantCompareIds.length > 0, "El cuadrante NW debe tener comparables");
  assert.ok(quadrantCompareIds.every((id) => baselineCompareIds.includes(id)), "El cuadrante no debe ampliar el universo distrital");

  await page.locator('[data-view="projects"]').first().click();
  await waitForActiveRoute(page, "projects");
  await expandProjectCatalog(page);
  assert.deepEqual(
    await uniqueAttributeValues(
      page.locator('[data-scenario-consumer="catalog"] [data-canonical-project-id]'),
      "data-canonical-project-id",
    ),
    quadrantCompareIds,
    "El cuadrante debe propagarse igual a catálogo y comparador",
  );
  assert.match(await page.locator('[data-scenario-consumer="catalog"]').innerText(), /Noroeste/i, "El consumidor debe declarar el cuadrante");

  for (const [routeId, consumer] of [
    ["trust", "checklist"],
    ["assistant", "assistant"],
  ]) {
    await page.locator(`[data-view="${routeId}"]`).first().click();
    await waitForActiveRoute(page, routeId);
    const referenceIds = await uniqueAttributeValues(
      page.locator(`[data-scenario-consumer="${consumer}"] [data-canonical-project-id]`),
      "data-canonical-project-id",
    );
    assert.ok(referenceIds.every((id) => quadrantCompareIds.includes(id)), `${consumer} debe conservar el cuadrante NW`);
  }

  await page.locator("#reset-scenario").click();
  await waitForFocus(page, "reset-scenario");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "reset-scenario", "Reset debe recuperar foco fuera del dashboard");
  await page.locator('[data-view="dashboard"]').first().click();
  await waitForActiveRoute(page, "dashboard");
  assert.equal(await page.locator("[data-geo-point-id]").count(), 90, "Reset posterior al cuadrante debe volver a 90 observaciones");
  await page.locator('[data-view="compare"]').first().click();
  await waitForActiveRoute(page, "compare");
  assert.equal(
    (
      await uniqueAttributeValues(
        page.locator('[data-scenario-consumer="compare"] [data-canonical-project-id]'),
        "data-canonical-project-id",
      )
    ).length,
    85,
    "Reset posterior al cuadrante debe volver a 85 comparables",
  );

  await openPath(page, baseUrl, emptyRadiusPath);
  assert.equal(await page.locator('[data-geo-state="empty-radius"]').count(), 1, "El radio vacío debe ser un estado válido");
  assert.equal(await page.locator("[data-geo-point-id]").count(), 0, "El radio vacío no debe usar fallback");
  assert.match(await page.locator("#main-content").innerText(), /0 comparables dentro de 500 m/i, "Debe explicar el resultado cero");
  assert.match(await page.locator("#main-content").innerText(), /Comparables insuficientes/i, "Debe degradar comparabilidad con prudencia");
  assert.match(await page.locator("#main-content").innerText(), /Referencia de precio insuficiente/i, "Debe degradar precio con prudencia");

  for (const [routeId, consumer] of [
    ["projects", "catalog"],
    ["compare", "compare"],
    ["trust", "checklist"],
    ["assistant", "assistant"],
  ]) {
    await openPath(page, baseUrl, pathForRoute(emptyRadiusPath, routeId));
    await assertCanonicalIds(page, consumer, []);
    assert.match(await page.locator("#main-content").innerText(), /sin comparables|sin candidatos|no hay comparables|sin referencias/i, `#${routeId} debe explicar el estado cero`);
  }

  assertClean(problems, externalRequests, "E2E desktop CT-C/CT-I/zero");
  await desktop.close();

  const mobile = await browser.newContext({ viewport: viewports[2] });
  const mobileObserved = await createObservedPage(mobile, baseUrl);
  await openPath(mobileObserved.page, baseUrl, descriptor.canonical_path);
  await mobileObserved.page.locator("#menu-toggle").click();
  await waitForMobileNav(mobileObserved.page, true);
  assert.equal(
    await mobileObserved.page.locator(".app-shell").evaluate((element) => element.classList.contains("nav-is-open")),
    true,
    "El menú móvil debe abrir",
  );
  await mobileObserved.page.locator('.sidebar [data-view="projects"]').click();
  const mobileProjectsPath = pathForRoute(descriptor.canonical_path, "projects");
  await waitForActiveRoute(mobileObserved.page, "projects", {
    baseUrl,
    expectedPath: mobileProjectsPath,
    navClosed: true,
  });
  await assertCurrentPath(
    mobileObserved.page,
    baseUrl,
    mobileProjectsPath,
    "La navegación móvil debe conservar el escenario",
  );
  assert.equal(
    await mobileObserved.page.locator(".app-shell").evaluate((element) => element.classList.contains("nav-is-open")),
    false,
    "Navegar debe cerrar el menú móvil",
  );

  await mobileObserved.page.locator("#menu-toggle").click();
  await waitForMobileNav(mobileObserved.page, true);
  await mobileObserved.page.keyboard.press("Escape");
  await waitForMobileNav(mobileObserved.page, false);
  await waitForFocus(mobileObserved.page, "menu-toggle");
  assert.equal(
    await mobileObserved.page.locator(".app-shell").evaluate((element) => element.classList.contains("nav-is-open")),
    false,
    "Escape debe cerrar el menú móvil",
  );
  assert.equal(
    await mobileObserved.page.evaluate(() => document.activeElement?.id),
    "menu-toggle",
    "Escape debe devolver foco al botón móvil",
  );
  assertClean(mobileObserved.problems, mobileObserved.externalRequests, "E2E mobile");
  await mobile.close();
});

console.log("Scenario E2E OK: CT-C canónico, CT-I, teclado, móvil, propagación y cero resultados.");
