import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createObservedPage,
  openPath,
  withDemoBrowser,
} from "../../../../../prototipo_ejecutable/tests/helpers/demo-browser.mjs";
import { resolveAppUrl } from "../../../../../prototipo_ejecutable/tests/helpers/app-url.mjs";

const outputDirectory = fileURLToPath(new URL("./browser-repeat/", import.meta.url));
const publicData = JSON.parse(
  await fs.readFile(
    new URL("../../../../../prototipo_ejecutable/public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const stageIds = ["scale", "geography", "quality", "depth", "movement", "decision"];
const result = {
  head: null,
  stages: {},
  criticalFacts: {},
  decision: {},
  emptyGeography: {},
  insufficientScale: {},
  contract21: {},
  contract20: {},
  laptopFirstViewport: {},
  problems: [],
  externalRequests: [],
};

function normalize(value) {
  return String(value ?? "").replace(/\s+/gu, " ").trim();
}

function collectObserved(observed) {
  result.problems.push(...observed.problems);
  result.externalRequests.push(...observed.externalRequests);
}

function responseItemText(item) {
  if (!item || typeof item !== "object") return "";
  if (item.text) return String(item.text);
  if (item.label && item.value !== undefined) {
    return `${item.label}: ${item.value}${item.unit && item.unit !== "count" ? ` ${item.unit}` : ""}`;
  }
  return String(item.label ?? "");
}

async function stageSnapshot(page, stageId) {
  return page.evaluate(async (id) => {
    const { state } = await import(new URL("js/state.js", document.baseURI).href);
    const stage = state.journeyContext?.stages?.[id] ?? null;
    return stage
      ? {
          status: stage.status,
          data: stage.data,
          correctiveAction: stage.correctiveAction,
        }
      : null;
  }, stageId);
}

async function firstViewportGeometry(page) {
  return page.evaluate(() => {
    const measure = (selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect ? { top: rect.top, bottom: rect.bottom, visible: rect.top >= 0 && rect.bottom <= innerHeight + 1 } : null;
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      limit: measure(".journey-reading__limit"),
      primaryAction: measure(".journey-primary-action"),
    };
  });
}

await fs.mkdir(outputDirectory, { recursive: true });

await withDemoBrowser(async ({ browser, baseUrl }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const observed = await createObservedPage(context, baseUrl);
  const { page } = observed;

  result.head = await page.evaluate(() => document.documentElement.dataset.commit ?? null).catch(() => null);
  for (const stageId of stageIds) {
    await openPath(page, baseUrl, `/#journey/${stageId}`);
    const model = await stageSnapshot(page, stageId);
    const root = page.locator(`[data-journey-stage="${stageId}"]`);
    const domStatus = await root.getAttribute("data-journey-state");
    assert.equal(domStatus, model.status, `${stageId}: estado DOM distinto del modelo`);
    const primaryAction = root.locator(".journey-primary-action");
    const correctiveAction = root.locator("[data-journey-corrective-action]");
    result.stages[stageId] = {
      modelStatus: model.status,
      domStatus,
      modelCorrectiveAction: model.correctiveAction,
      primaryAction: {
        label: normalize(await primaryAction.innerText()),
        href: await primaryAction.getAttribute("href"),
      },
      visibleCorrectiveAction: await correctiveAction.count()
        ? {
            label: normalize(await correctiveAction.innerText()),
            href: await correctiveAction.getAttribute("href"),
          }
        : null,
    };
    const geometry = await firstViewportGeometry(page);
    assert.equal(geometry.limit?.visible, true, `${stageId}: límite fuera de 1280x720`);
    assert.equal(geometry.primaryAction?.visible, true, `${stageId}: CTA fuera de 1280x720`);
    result.laptopFirstViewport[stageId] = geometry;
  }

  await openPath(page, baseUrl, "/#journey/scale");
  const scaleText = normalize(await page.locator("[data-journey-stage-data]").innerText());
  for (const token of ["184", "30 / 22 / 5"]) assert.ok(scaleText.includes(token), `Escala omite ${token}`);
  result.criticalFacts.scale = scaleText;
  await page.screenshot({ path: path.join(outputDirectory, "scale-1280x720.png") });

  await openPath(page, baseUrl, "/#journey/quality");
  const qualityText = normalize(await page.locator("[data-journey-stage-data]").innerText());
  for (const token of ["104.15", "53.37", "50.78"]) assert.ok(qualityText.includes(token), `Calidad omite ${token}`);
  assert.match(qualityText, /excluido del benchmark/iu);
  result.criticalFacts.quality = qualityText;
  await page.screenshot({ path: path.join(outputDirectory, "quality-1280x720.png") });

  await openPath(page, baseUrl, "/#journey/decision");
  const checklistModel = await stageSnapshot(page, "decision");
  const checklistText = normalize(await page.locator("[data-journey-stage-data]").innerText());
  assert.equal(checklistModel.data.mode, "checklist");
  for (const value of [
    checklistModel.data.checklist.comparableCount,
    checklistModel.data.checklist.priceReferenceCount,
    checklistModel.data.checklist.evidenceCoverage,
  ]) assert.ok(checklistText.includes(String(value)), `Checklist visible omite ${value}`);
  result.decision.checklist = { model: checklistModel.data.checklist, text: checklistText };

  await openPath(page, baseUrl, "/#assistant");
  await page.locator(".assistant-question").first().click();
  await page.locator("#assistant-input").press("Control+Enter");
  await page.locator('[data-assistant-response="ready"]').waitFor();
  const expertResponseText = normalize(await page.locator('[data-assistant-response="ready"]').innerText());
  await openPath(page, baseUrl, "/#journey/decision");
  const responseModel = await stageSnapshot(page, "decision");
  assert.equal(responseModel.data.mode, "assistant_response");
  const responseText = normalize(await page.locator("[data-journey-stage-data]").innerText());
  const block = (type) => responseModel.data.response.blocks.find((candidate) => candidate.type === type);
  const expectedByBlock = Object.fromEntries(
    responseModel.data.response.blocks.map(({ type, items }) => [
      type,
      (items ?? []).map(responseItemText).filter(Boolean),
    ]),
  );
  for (const type of ["answer", "data", "interpretation", "limitations", "next_step"]) {
    for (const expected of expectedByBlock[type] ?? []) {
      assert.ok(
        responseText.includes(expected),
        `Respuesta Journey omite ${type}: ${expected}`,
      );
    }
  }
  const referenceLabels = (block("references")?.items ?? []).map(({ label }) => label).filter(Boolean);
  const disclosure = page.locator(".journey-decision-disclosure");
  assert.equal(await disclosure.count(), 1, "Decisión debe incluir una divulgación de referencias");
  assert.equal(await disclosure.getAttribute("open"), null, "Referencias deben iniciar colapsadas");
  const responseGeometry = await firstViewportGeometry(page);
  assert.equal(responseGeometry.limit?.visible, true, "Decisión con respuesta: límite fuera de 1280x720");
  assert.equal(responseGeometry.primaryAction?.visible, true, "Decisión con respuesta: CTA fuera de 1280x720");
  await disclosure.locator("summary").click();
  assert.notEqual(await disclosure.getAttribute("open"), null, "La divulgación debe abrir por interacción real");
  const disclosureText = normalize(await disclosure.innerText());
  const visibleReferenceLabels = referenceLabels.filter((label) => disclosureText.includes(label));
  assert.deepEqual(
    visibleReferenceLabels,
    referenceLabels,
    "La divulgación abierta debe representar todas las etiquetas de referencia",
  );
  const visibleBlockTypes = responseModel.data.response.blocks
    .filter(({ items }) => (items ?? []).some((item) => {
      const candidates = [item.text, item.label].filter(Boolean);
      return candidates.some((candidate) => responseText.includes(String(candidate)));
    }))
    .map(({ type }) => type);
  const responseTypography = await page.evaluate(() => {
    const fontSize = (selector) => {
      const element = document.querySelector(selector);
      return element ? Number.parseFloat(getComputedStyle(element).fontSize) : null;
    };
    return {
      limit: fontSize(".journey-reading__limit"),
      summary: fontSize(".journey-decision-disclosure summary"),
      reference: fontSize('.journey-decision-disclosure [data-journey-response-block="references"] li'),
    };
  });
  for (const [surface, fontSize] of Object.entries(responseTypography)) {
    assert.ok(fontSize >= 16, `${surface} debe usar al menos 16 px; obtuvo ${fontSize}`);
  }
  await page.screenshot({ path: path.join(outputDirectory, "decision-references-open-1280x720.png") });
  await disclosure.locator("summary").click();
  result.decision.response = {
    modelStatus: responseModel.status,
    blockTypes: responseModel.data.response.blocks.map(({ type }) => type),
    expectedByBlock,
    referenceLabels,
    visibleReferenceLabels,
    visibleBlockTypes,
    disclosureText,
    typography: responseTypography,
    geometry: responseGeometry,
    journeyText: responseText,
    expertResponseText,
  };
  await page.screenshot({ path: path.join(outputDirectory, "decision-response-1280x720.png") });
  collectObserved(observed);
  await context.close();

  const emptyContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const emptyObserved = await createObservedPage(emptyContext, baseUrl);
  await openPath(emptyObserved.page, baseUrl, "/?sv=1&scope=radius&lat=-12.000000&lon=-77.000000&radius=500#journey/geography");
  const emptyModel = await stageSnapshot(emptyObserved.page, "geography");
  const emptyRoot = emptyObserved.page.locator('[data-journey-stage="geography"]');
  const emptyStatus = await emptyRoot.getAttribute("data-journey-state");
  const emptyCta = {
    label: normalize(await emptyRoot.locator(".journey-primary-action").innerText()),
    href: await emptyRoot.locator(".journey-primary-action").getAttribute("href"),
  };
  assert.equal(emptyStatus, "empty");
  assert.deepEqual(emptyCta, emptyModel.correctiveAction);
  result.emptyGeography = { modelStatus: emptyModel.status, domStatus: emptyStatus, cta: emptyCta };
  await emptyObserved.page.screenshot({ path: path.join(outputDirectory, "geography-empty-1280x720.png") });
  collectObserved(emptyObserved);
  await emptyContext.close();

  const missingScale = structuredClone(publicData);
  delete missingScale.metadata.counts.canonical_agencies;
  delete missingScale.pilot.counts.base_count;
  const insufficientContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const insufficientObserved = await createObservedPage(insufficientContext, baseUrl);
  await insufficientObserved.page.route("**/demo-data/viva-platform-demo.json", (route) => route.fulfill({
    status: 200,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(missingScale),
  }));
  await openPath(insufficientObserved.page, baseUrl, "/#journey/scale");
  const insufficientModel = await stageSnapshot(insufficientObserved.page, "scale");
  const insufficientRoot = insufficientObserved.page.locator('[data-journey-stage="scale"]');
  result.insufficientScale = {
    modelStatus: insufficientModel.status,
    domStatus: await insufficientRoot.getAttribute("data-journey-state"),
    text: normalize(await insufficientRoot.innerText()),
  };
  assert.equal(result.insufficientScale.modelStatus, "insufficient");
  assert.equal(result.insufficientScale.domStatus, "insufficient");
  assert.match(result.insufficientScale.text, /No disponible\s*\/\s*22\s*\/\s*5/u);
  assert.doesNotMatch(
    normalize(await insufficientRoot.locator('[data-journey-fact="model-agencies"]').innerText()),
    /Inmobiliarias modeladas\s+0(?:\D|$)/u,
  );
  await insufficientObserved.page.screenshot({ path: path.join(outputDirectory, "scale-missing-counts-1280x720.png") });
  collectObserved(insufficientObserved);
  await insufficientContext.close();

  const legacy21 = structuredClone(publicData);
  legacy21.metadata.contract_version = "2.1.0";
  delete legacy21.inspector;
  delete legacy21.benchmark;
  delete legacy21.history;
  delete legacy21.assistant;
  const context21 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const observed21 = await createObservedPage(context21, baseUrl);
  await observed21.page.route("**/demo-data/viva-platform-demo.json", (route) => route.fulfill({
    status: 200,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(legacy21),
  }));
  await openPath(observed21.page, baseUrl, "/#journey/decision");
  const model21 = await stageSnapshot(observed21.page, "decision");
  const root21 = observed21.page.locator('[data-journey-stage="decision"]');
  const cta21 = {
    label: normalize(await root21.locator(".journey-primary-action").innerText()),
    href: await root21.locator(".journey-primary-action").getAttribute("href"),
  };
  assert.equal(await root21.getAttribute("data-journey-state"), "capability_unavailable");
  assert.deepEqual(cta21, model21.correctiveAction);
  result.contract21 = { modelStatus: model21.status, cta: cta21 };
  collectObserved(observed21);
  await context21.close();

  const legacy20 = structuredClone(publicData);
  legacy20.metadata.contract_version = "2.0.0";
  const context20 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const observed20 = await createObservedPage(context20, baseUrl);
  await observed20.page.route("**/demo-data/viva-platform-demo.json", (route) => route.fulfill({
    status: 200,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(legacy20),
  }));
  await observed20.page.goto(resolveAppUrl(baseUrl, "/#journey/decision"), { waitUntil: "networkidle" });
  result.contract20 = {
    errorText: normalize(await observed20.page.locator(".error-box").innerText()),
    journeyCount: await observed20.page.locator("[data-journey-stage]").count(),
  };
  assert.equal(result.contract20.journeyCount, 0);
  assert.match(result.contract20.errorText, /contrato|contract|2\.1\.0.*2\.4\.0/iu);
  collectObserved(observed20);
  await context20.close();
}, { port: 4379 });

result.problems = [...new Set(result.problems)];
result.externalRequests = [...new Set(result.externalRequests)];
assert.deepEqual(result.problems, []);
assert.deepEqual(result.externalRequests, []);
await fs.writeFile(path.join(outputDirectory, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  stages: result.stages,
  emptyGeography: result.emptyGeography,
  contract21: result.contract21,
  contract20: result.contract20,
  decisionResponseVisibleReferences: result.decision.response.visibleReferenceLabels.length,
  decisionResponseReferenceCount: result.decision.response.referenceLabels.length,
  problems: result.problems,
  externalRequests: result.externalRequests,
}, null, 2));
