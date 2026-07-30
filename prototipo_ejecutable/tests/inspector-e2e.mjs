import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  createObservedPage,
  openPath,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";
import { resolveAppPath } from "./helpers/app-url.mjs";

const [ctC, ctD, ctG] = await Promise.all(
  ["ct-c-public.json", "ct-d-public.json", "ct-g-public.json"].map(
    async (filename) =>
      JSON.parse(
        await fs.readFile(
          new URL(`./e2e-scenarios/${filename}`, import.meta.url),
          "utf8",
        ),
      ),
  ),
);
const pagesBasePath = "/viva-inteligencia-demo/";

function withHash(pathname, hash) {
  const url = new URL(pathname, "http://inspector.test");
  url.hash = hash;
  return `${url.pathname}${url.search}${url.hash}`;
}

async function currentTerritorialPath(page) {
  return page.evaluate(
    () => `${window.location.pathname}${window.location.search}`,
  );
}

async function waitForFocus(page, id) {
  await page.waitForFunction(
    (expectedId) => document.activeElement?.id === expectedId,
    id,
  );
}

async function settleUi(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

function assertClean(observed, label) {
  assert.deepEqual(
    observed.externalRequests,
    [],
    `Solicitudes externas durante ${label}:\n${observed.externalRequests.join("\n")}`,
  );
  assert.deepEqual(
    observed.problems,
    [],
    `Errores de consola, página, HTTP o red durante ${label}:\n${observed.problems.join("\n")}`,
  );
}

async function assertInspectorSelection(page, expected) {
  assert.equal(
    await page.locator("#inspector-project-selector").inputValue(),
    expected.projectId,
  );
  assert.equal(
    await page.locator("#inspector-typology-selector").inputValue(),
    expected.typologyId,
  );
  assert.equal(
    await page.locator("#inspector-case-selector").inputValue(),
    expected.caseId,
  );
  assert.equal(
    await page.locator('[data-view="inspector"][aria-current="page"]').count(),
    1,
  );
}

async function assertBlockedEvidence({
  page,
  requests,
  evidenceId,
  mode,
  closeWithEscape = false,
}) {
  const trigger = page.locator(
    `.inspector-evidence-option[data-inspector-evidence="${evidenceId}"]`,
  );
  await trigger.waitFor({ state: "visible" });
  const triggerId = await trigger.getAttribute("id");
  assert.ok(triggerId, `${evidenceId} debe tener un ID estable`);
  const requestCount = requests.length;

  await trigger.click();
  const dialog = page.locator("#inspector-evidence-dialog[open]");
  await dialog.waitFor({ state: "visible" });
  await waitForFocus(page, "inspector-dialog-close");
  await settleUi(page);

  assert.equal(
    await dialog.getAttribute("data-inspector-evidence-mode"),
    mode,
  );
  assert.equal(
    await dialog.locator(
      "[src], [href], [data-src], iframe, object, embed, source, video, audio",
    ).count(),
    0,
    `${mode} no debe crear recursos o enlaces`,
  );
  assert.equal(
    await dialog.locator('[data-inspector-hash="complete"]').count(),
    0,
    `${mode} no debe exponer una huella completa`,
  );
  assert.doesNotMatch(
    await dialog.innerHTML(),
    /https?:\/\/|assets\/evidence\/|data:image|base64/iu,
    `${mode} no debe contener hotlinks ni datos embebidos`,
  );
  assert.equal(
    requests.length,
    requestCount,
    `${mode} no debe iniciar fetch, navegación o carga de activo`,
  );

  if (closeWithEscape) {
    await page.keyboard.press("Escape");
  } else {
    await page.locator("#inspector-dialog-close").click();
  }
  await page.locator("#inspector-evidence-dialog").waitFor({
    state: "detached",
  });
  await waitForFocus(page, triggerId);
}

await withDemoBrowser(async ({ browser, baseUrl }) => {
  const context = await browser.newContext({ viewport: viewports[0] });
  const observed = await createObservedPage(context, baseUrl);
  const { page, requests } = observed;
  const ctGPath = withHash(ctC.canonical_path, ctG.canonical_path);
  const expectedTerritorialPath = resolveAppPath(
    baseUrl,
    withHash(ctC.canonical_path, ""),
  );

  await openPath(page, baseUrl, ctGPath);
  assert.equal(
    await currentTerritorialPath(page),
    expectedTerritorialPath,
    "El deep-link CT-G debe conservar pathname y query CT-C",
  );
  await assertInspectorSelection(page, {
    projectId: ctG.project_id,
    typologyId: ctG.typology_id,
    caseId: "case:f3-ct-g-pardo",
  });
  assert.equal(
    await page.locator(
      '.inspector-view[data-inspector-provenance="Observado"]',
    ).count(),
    1,
  );
  assert.equal(
    await page.locator(
      '.inspector-verdict[data-inspector-quality="inconsistent"]',
    ).count(),
    1,
  );

  const ledgerRows = page.locator("[data-inspector-ledger-row]");
  assert.deepEqual(
    await ledgerRows.evaluateAll((rows) =>
      rows.map((row) => row.dataset.inspectorLedgerRow),
    ),
    ["area", "floor_unit", "model", "bedrooms", "bathrooms"],
  );
  const areaText = await page
    .locator('[data-inspector-ledger-row="area"]')
    .innerText();
  for (const value of ["104.15", "53.37", "50.78", "48.76%"]) {
    assert.match(areaText, new RegExp(value.replace(".", "\\.")));
  }
  const floorText = await page
    .locator('[data-inspector-ledger-row="floor_unit"]')
    .innerText();
  for (const value of ["Piso 1", "807-1007", "8–10"]) {
    assert.ok(floorText.includes(value), `CT-G debe mostrar ${value}`);
  }
  const inspectorText = await page.locator(".inspector-view").innerText();
  assert.match(inspectorText, /No elegible según las reglas de la demo/u);
  assert.match(inspectorText, /0 hechos elegibles · 8 hechos excluidos/u);
  assert.doesNotMatch(inspectorText, /área techada/iu);

  await page.reload({ waitUntil: "networkidle" });
  await page
    .locator('.inspector-view[data-inspector-state="ready"]')
    .waitFor({ state: "visible" });
  await assertInspectorSelection(page, {
    projectId: ctG.project_id,
    typologyId: ctG.typology_id,
    caseId: "case:f3-ct-g-pardo",
  });
  assert.equal(
    await currentTerritorialPath(page),
    expectedTerritorialPath,
    "Reload CT-G no debe cambiar la query territorial",
  );

  await assertBlockedEvidence({
    page,
    requests,
    evidenceId: ctG.card.evidence_id,
    mode: "pending",
    closeWithEscape: true,
  });
  await assertBlockedEvidence({
    page,
    requests,
    evidenceId: ctG.plan.evidence_id,
    mode: "restricted",
  });
  assert.equal(
    await currentTerritorialPath(page),
    expectedTerritorialPath,
    "Abrir y cerrar evidencia CT-G no debe cambiar la query territorial",
  );

  const ctDPath = withHash(
    ctC.canonical_path,
    "#inspector/case/f3-ct-d-finishes",
  );
  await openPath(page, baseUrl, ctDPath);
  await assertInspectorSelection(page, {
    projectId: ctD.project_id,
    typologyId: ctD.typology_id,
    caseId: "case:f3-ct-d-finishes",
  });
  assert.equal(
    await page.locator(
      '.inspector-view[data-inspector-provenance="Controlado"]',
    ).count(),
    1,
  );
  assert.equal(
    await page.locator(
      '.inspector-verdict[data-inspector-quality="certified"]',
    ).count(),
    1,
  );
  assert.match(
    await page.locator(".inspector-decision-summary").innerText(),
    /1 hechos elegibles · 1 hechos excluidos/u,
  );

  const primary = page.locator(
    `#inspector-primary-action[data-inspector-evidence="${ctD.countertop.evidence_id}"]`,
  );
  const authorizedRequestCount = requests.length;
  await primary.click();
  const authorizedDialog = page.locator("#inspector-evidence-dialog[open]");
  await authorizedDialog.waitFor({ state: "visible" });
  await waitForFocus(page, "inspector-dialog-close");
  assert.equal(
    await authorizedDialog.getAttribute("data-inspector-evidence-mode"),
    "fragment",
  );
  assert.match(
    await authorizedDialog
      .locator(".inspector-evidence-fragment")
      .innerText(),
    /cuarzo/iu,
  );
  assert.equal(await authorizedDialog.locator("img").count(), 0);
  assert.equal(
    await authorizedDialog
      .locator('.inspector-full-hash:not([open])')
      .count(),
    1,
  );
  await settleUi(page);
  assert.equal(
    requests.length,
    authorizedRequestCount,
    "El fragmento CT-D no debe cargar recursos adicionales",
  );

  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement?.tagName),
    "SUMMARY",
    "Tab debe avanzar al disclosure de huella",
  );
  await page.keyboard.press("Tab");
  await waitForFocus(page, "inspector-dialog-close");
  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement?.tagName),
    "SUMMARY",
    "Shift+Tab debe permanecer dentro del diálogo",
  );
  await page.keyboard.press("Escape");
  await page.locator("#inspector-evidence-dialog").waitFor({
    state: "detached",
  });
  await waitForFocus(page, "inspector-primary-action");

  await assertBlockedEvidence({
    page,
    requests,
    evidenceId: ctD.restricted_evidence.evidence_id,
    mode: "restricted",
  });
  assert.equal(
    await currentTerritorialPath(page),
    expectedTerritorialPath,
    "CT-D tampoco debe cambiar la query territorial",
  );

  const invalidPath = withHash(
    ctC.canonical_path,
    "#inspector/case/no-existe",
  );
  await openPath(page, baseUrl, invalidPath);
  await page.waitForFunction(
    () => window.location.hash === "#inspector/case/f3-ct-g-pardo",
  );
  assert.equal(
    await currentTerritorialPath(page),
    expectedTerritorialPath,
    "Corregir una ruta inválida no debe perder la query territorial",
  );
  assert.match(
    await page.locator("#inspector-live").textContent(),
    /restauró|predeterminado|disponible/iu,
  );

  assertClean(observed, "E2E CT-D/CT-G");
  await context.close();
});

await withDemoBrowser(
  async ({ browser, baseUrl }) => {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const observed = await createObservedPage(context, baseUrl);
      const { page } = observed;
      const path = withHash(ctC.canonical_path, ctG.canonical_path);

      await openPath(page, baseUrl, path);
      assert.equal(
        `${new URL(page.url()).pathname}${new URL(page.url()).search}${new URL(page.url()).hash}`,
        resolveAppPath(baseUrl, path),
        `Deep-link CT-G incorrecto bajo base path en ${viewport.name}`,
      );
      await assertInspectorSelection(page, {
        projectId: ctG.project_id,
        typologyId: ctG.typology_id,
        caseId: "case:f3-ct-g-pardo",
      });

      await page.reload({ waitUntil: "networkidle" });
      await page
        .locator('.inspector-view[data-inspector-state="ready"]')
        .waitFor({ state: "visible" });
      assert.equal(
        `${new URL(page.url()).pathname}${new URL(page.url()).search}${new URL(page.url()).hash}`,
        resolveAppPath(baseUrl, path),
        `Reload CT-G incorrecto bajo base path en ${viewport.name}`,
      );
      await assertInspectorSelection(page, {
        projectId: ctG.project_id,
        typologyId: ctG.typology_id,
        caseId: "case:f3-ct-g-pardo",
      });
      assertClean(observed, `base path ${viewport.name}`);
      await context.close();
    }
  },
  { port: 4178, basePath: pagesBasePath },
);

console.log(
  "Inspector E2E OK: CT-D/CT-G, permisos, foco, query, red y base path en 3 viewports.",
);
