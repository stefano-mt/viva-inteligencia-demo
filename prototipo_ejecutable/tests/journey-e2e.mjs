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
} from "./helpers/demo-browser.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const evidenceDirectory = path.resolve(
  testDirectory,
  "..",
  "..",
  ".planning",
  "phases",
  "06-commercial-narrative-qa",
  "evidence",
  "functional",
);

const stages = [
  {
    id: "scale",
    question: "¿Qué mercado observable sostiene la lectura?",
    next: "geography",
  },
  {
    id: "geography",
    question: "¿Dónde compite el proyecto?",
    next: "quality",
  },
  {
    id: "quality",
    question: "¿Qué dato puede utilizarse?",
    next: "depth",
  },
  {
    id: "depth",
    question: "¿Cómo se diferencia la oferta?",
    next: "movement",
  },
  {
    id: "movement",
    question: "¿Qué cambió en el mercado?",
    next: "decision",
  },
  {
    id: "decision",
    question: "¿Qué hacemos y qué no podemos afirmar?",
    next: "scale",
  },
];

const evidence = [];

function assertClean(observed, label) {
  assert.deepEqual(
    observed.problems,
    [],
    `${label}: errores de navegador\n${observed.problems.join("\n")}`,
  );
  assert.deepEqual(
    observed.externalRequests,
    [],
    `${label}: red externa\n${observed.externalRequests.join("\n")}`,
  );
}

async function visibleText(locator) {
  return (await locator.innerText()).replace(/\s+/gu, " ").trim();
}

async function assertNoNonFinite(page, label) {
  const text = await visibleText(page.locator("body"));
  assert.doesNotMatch(text, /(?:NaN|Infinity|∞)/u, `${label}: valor no finito visible`);
}

async function assertJourneyStage(page, stageId) {
  const stage = stages.find(({ id }) => id === stageId);
  assert.ok(stage, `Etapa desconocida: ${stageId}`);
  const root = page.locator(`[data-journey-stage="${stageId}"]`);
  await root.waitFor({ state: "visible" });
  assert.equal(await page.locator("h1").count(), 1, `${stageId}: un solo h1`);
  assert.equal(await page.locator("h1").innerText(), stage.question);
  assert.equal(
    await page
      .locator(`[data-journey-step="${stageId}"][aria-current="step"]`)
      .count(),
    1,
    `${stageId}: etapa actual inequívoca`,
  );
  assert.equal(
    await root.locator(".journey-primary-action").count(),
    1,
    `${stageId}: una sola acción primaria`,
  );
  assert.match(await visibleText(root), /Qué sabemos/iu);
  assert.match(await visibleText(root), /Qué falta o no puede afirmarse/iu);
  await assertNoNonFinite(page, `journey ${stageId}`);
  return root;
}

async function capture(page, fileName, claim) {
  const filePath = path.join(evidenceDirectory, fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  const bytes = await fs.readFile(filePath);
  evidence.push({
    file: fileName,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    claim,
    url: page.url(),
  });
}

async function clickAndWaitForHash(page, locator, expectedHash) {
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
  await page.waitForFunction(
    (hash) => window.location.hash === hash,
    expectedHash,
  );
  await page.locator("#main-content").waitFor({ state: "visible" });
}

async function openExpert(page, routeId) {
  const disclosure = page.locator("details.journey-expert");
  if ((await disclosure.getAttribute("open")) === null) {
    await disclosure.locator(":scope > summary").click();
  }
  await clickAndWaitForHash(
    page,
    page.locator(`[data-journey-expert="${routeId}"]`),
    routeId === "inspector"
      ? "#inspector/case/f3-ct-g-pardo"
      : `#${routeId}`,
  );
}

async function returnFromExpert(page, stageId) {
  const candidates = page.locator(`[data-journey-return="${stageId}"]`);
  for (let index = 0; index < (await candidates.count()); index += 1) {
    const candidate = candidates.nth(index);
    if (await candidate.isVisible()) {
      await clickAndWaitForHash(page, candidate, `#journey/${stageId}`);
      await assertJourneyStage(page, stageId);
      return;
    }
  }

  const guide = page.locator("details.section-guide");
  assert.equal(await guide.count(), 1, `${stageId}: ayuda experta disponible`);
  if ((await guide.getAttribute("open")) === null) {
    await guide.locator(":scope > summary").click();
  }
  const returnLink = guide.locator(`[data-journey-return="${stageId}"]`);
  await returnLink.waitFor({ state: "visible" });
  await clickAndWaitForHash(page, returnLink, `#journey/${stageId}`);
  await assertJourneyStage(page, stageId);
}

async function continueJourney(page, currentStageId) {
  const stage = stages.find(({ id }) => id === currentStageId);
  await clickAndWaitForHash(
    page,
    page.locator(".journey-primary-action"),
    `#journey/${stage.next}`,
  );
  await assertJourneyStage(page, stage.next);
}

await fs.mkdir(evidenceDirectory, { recursive: true });

await withDemoBrowser(
  async ({ browser, baseUrl }) => {
    const context = await browser.newContext({ viewport: viewports[0] });
    const observed = await createObservedPage(context, baseUrl);
    const { page } = observed;

    await openPath(page, baseUrl, "/#journey/scale");
    await assertJourneyStage(page, "scale");
    const scenarioLabel = await visibleText(
      page.locator(".journey-topbar__scenario strong"),
    );
    assert.match(scenarioLabel, /Miraflores.*Distrito/iu);
    assert.match(
      await visibleText(page.locator('[data-journey-stage="scale"]')),
      /cobertura|muestra observable/iu,
    );
    await capture(
      page,
      "01-scale.png",
      "Entrada canónica al recorrido, etapa Escala y escenario visible.",
    );

    await openExpert(page, "market");
    const benchmark = page.locator('[data-scenario-consumer="benchmark"]');
    await benchmark.waitFor({ state: "visible" });
    const benchmarkText = await visibleText(benchmark);
    for (const value of ["184", "30", "22", "5"]) {
      assert.match(benchmarkText, new RegExp(`(?:^|\\D)${value}(?:\\D|$)`, "u"));
    }
    assert.match(benchmarkText, /no deben sumarse|grupos distintos/iu);
    assert.equal(
      await visibleText(page.locator("#scenario-summary-title")),
      scenarioLabel,
      "Escala y benchmark conservan el mismo escenario visible",
    );
    await returnFromExpert(page, "scale");

    await continueJourney(page, "scale");
    await openExpert(page, "dashboard");
    const map = page.locator("svg.geo-map[role=img]");
    await map.waitFor({ state: "visible" });
    assert.match(await map.locator("#geo-map-title").textContent(), /Miraflores/iu);
    assert.match(
      await map.locator("#geo-map-description").textContent(),
      /proyecto|alcance|distrito/iu,
    );
    assert.equal(
      await page.locator("#scenario-summary-title").count(),
      0,
      "Radar no repite el resumen global del escenario",
    );
    assert.equal(
      await visibleText(page.locator("#scenario-sidebar-title")),
      scenarioLabel,
      "Geografía conserva el mismo escenario en la barra lateral",
    );
    await capture(
      page,
      "02-geography-map.png",
      "Mapa territorial del mismo escenario usado por el recorrido.",
    );
    await returnFromExpert(page, "geography");

    await continueJourney(page, "geography");
    assert.match(
      await visibleText(page.locator('[data-journey-stage="quality"]')),
      /Tipo 7.*Miraflores/iu,
    );
    await openExpert(page, "inspector");
    const inspector = page.locator('.inspector-view[data-inspector-state="ready"]');
    await inspector.waitFor({ state: "visible" });
    const inspectorText = await visibleText(inspector);
    for (const value of ["104.15", "53.37", "50.78"]) {
      assert.match(inspectorText, new RegExp(value.replace(".", "\\."), "u"));
    }
    assert.match(inspectorText, /excluid|no elegible/iu);
    const evidenceButton = page.locator("[data-inspector-evidence]").first();
    await evidenceButton.click();
    const dialog = page.locator("#inspector-evidence-dialog");
    await dialog.waitFor({ state: "visible" });
    assert.equal(await dialog.getAttribute("aria-modal"), "true");
    await capture(
      page,
      "03-quality-type7.png",
      "Caso Tipo 7 con discrepancia, exclusión y evidencia autorizada.",
    );
    await page.locator("[data-inspector-close]").first().click();
    await dialog.waitFor({ state: "hidden" });
    await returnFromExpert(page, "quality");

    await continueJourney(page, "quality");
    await openExpert(page, "compare");
    const comparison = page.locator(
      '.comparison-shell[data-comparison-status="ready"]',
    );
    await comparison.waitFor({ state: "visible" });
    assert.equal(await comparison.locator(".comparison-conclusion").count(), 1);
    assert.equal(await comparison.locator("[data-comparison-denominators]").count(), 1);
    assert.ok(
      (await comparison.locator("[data-comparison-row]").count()) > 0,
      "El comparador muestra filas respaldadas",
    );
    const comparisonText = await visibleText(comparison);
    assert.match(comparisonText, /Fuente/iu);
    assert.match(comparisonText, /evidencia|denominador/iu);
    await capture(
      page,
      "04-depth-comparator.png",
      "Comparador con conclusión, denominadores y filas de evidencia.",
    );
    await returnFromExpert(page, "depth");

    await continueJourney(page, "depth");
    await openExpert(page, "activity");
    const signal = page.locator('[data-history-signal-brief="ready"]');
    await signal.waitFor({ state: "visible" });
    assert.equal(await signal.getAttribute("data-history-current-cause"), "not_observed");
    const signalText = await visibleText(signal);
    assert.match(signalText, /Anterior.*nuevo/iu);
    assert.match(signalText, /causa no observada|causa.*no se presume/iu);
    const signalEvidence = page.locator("[data-history-event]").first();
    await signalEvidence.click();
    await page.locator(".history-detail").waitFor({ state: "visible" });
    assert.match(
      await visibleText(page.locator(".history-detail")),
      /Causa no observada/iu,
    );
    await capture(
      page,
      "05-movement-signal.png",
      "Señal publicada con anterior/nuevo, vigencia y causa no observada.",
    );
    await returnFromExpert(page, "movement");

    await continueJourney(page, "movement");
    assert.match(
      await visibleText(page.locator('[data-journey-stage="decision"]')),
      /no infiere precios de cierre, causalidad ni exhaustividad/iu,
    );
    await openExpert(page, "assistant");
    const assistantInput = page.locator("#assistant-input");
    await assistantInput.waitFor({ state: "visible" });
    const suggestedQuestion = page.locator("[data-assistant-question]").first();
    await suggestedQuestion.click();
    assert.ok((await assistantInput.inputValue()).length > 10);
    await page.locator("#assistant-form").locator('button[type="submit"]').click();
    const response = page.locator(
      '[data-assistant-response="ready"], [data-assistant-response="insufficient"]',
    );
    await response.waitFor({ state: "visible" });
    assert.equal(await response.locator("[data-assistant-block=limitations]").count(), 1);
    assert.equal(await response.locator("[data-assistant-block=references]").count(), 1);
    assert.match(await visibleText(response), /verificable/iu);
    await capture(
      page,
      "06-decision-assistant.png",
      "Asistente determinista con lectura, límites y referencias visibles.",
    );

    await clickAndWaitForHash(
      page,
      response.locator('a[href="#trust"]'),
      "#trust",
    );
    const checklist = page.locator(".checklist-evidence");
    await checklist.waitFor({ state: "visible" });
    assert.equal(await checklist.locator(".checklist-summary__item").count(), 3);
    assert.equal(
      await checklist
        .locator(".checklist-assistant-handoff")
        .getAttribute("data-assistant-handoff"),
      "ready",
    );
    assert.match(await visibleText(checklist), /Evidencia del escenario/iu);
    assert.match(await visibleText(checklist), /Límites que debes comunicar/iu);
    assert.match(await visibleText(checklist), /Próximo paso/iu);
    await capture(
      page,
      "07-decision-checklist.png",
      "Checklist final con handoff del asistente y cierre prudente.",
    );
    await returnFromExpert(page, "decision");

    assert.equal(new URL(page.url()).hash, "#journey/decision");
    assert.equal(new URL(page.url()).search, "", "El escenario canónico no cambió");
    assert.equal(
      await page.locator(".journey-primary-action").innerText(),
      "Reiniciar recorrido",
    );
    await capture(
      page,
      "08-decision-return.png",
      "Retorno canónico a Decisión después del asistente y checklist.",
    );

    for (const stage of stages) {
      assert.equal(
        await page.locator(`[data-journey-step="${stage.id}"]`).count(),
        1,
        `${stage.id}: el rail conserva las seis etapas`,
      );
    }
    await assertNoNonFinite(page, "recorrido completo");
    assertClean(observed, "recorrido narrativo UI-only");
    await context.close();
  },
  { port: 4364 },
);

assert.equal(evidence.length, 8, "Se esperan ocho capturas funcionales");
await fs.writeFile(
  path.join(evidenceDirectory, "manifest.json"),
  `${JSON.stringify(
    {
      step: "P6-12",
      mode: "UI-only",
      viewport: viewports[0],
      files: evidence,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  "Journey UI-only E2E OK: seis etapas, mapa, Tipo 7, comparador, señal, asistente, checklist, retorno y paridad visible.",
);
