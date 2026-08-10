import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  observePage,
  openPath,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";
import { initializeScenarioData, state } from "../public/js/state.js";

const publicData = JSON.parse(
  await fs.readFile(
    new URL("../public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const ctC = JSON.parse(
  await fs.readFile(new URL("./e2e-scenarios/ct-c-public.json", import.meta.url), "utf8"),
);
const ctG = JSON.parse(
  await fs.readFile(new URL("./e2e-scenarios/ct-g-benchmark.json", import.meta.url), "utf8"),
);
const ctI = JSON.parse(
  await fs.readFile(new URL("./e2e-scenarios/ct-i-benchmark.json", import.meta.url), "utf8"),
);
const ctP = JSON.parse(
  await fs.readFile(new URL("./e2e-scenarios/ct-p-benchmark.json", import.meta.url), "utf8"),
);

const emptyRadiusMarketPath =
  "/?sv=1&scope=radius&lat=-12.000000&lon=-77.000000&radius=500#market";

function pathForRoute(pathname, routeId) {
  const url = new URL(pathname, "http://benchmark.test");
  url.hash = routeId;
  return `${url.pathname}${url.search}${url.hash}`;
}

function benchmarkContext(data) {
  initializeScenarioData(structuredClone(data), {
    boundaryArtifactStatus: "valid",
  });
  return structuredClone(state.benchmarkContext);
}

const baselineContext = benchmarkContext(publicData);
const eligibleCandidateIds = baselineContext.quantitative.pricePerM2Total.coverage.excludedProjects
  .filter(
    ({ projectId, detailCode }) =>
      detailCode === "price_area_link_unresolved" &&
      projectId !== ctG.input.project_id,
  )
  .map(({ projectId }) => projectId)
  .slice(0, 5);
const qualitativeCandidateIds = baselineContext.qualitative.coverage.usedProjectIds.slice(0, 5);

assert.equal(eligibleCandidateIds.length, 5, "CT-P E2E requiere cinco candidatos controlados");
assert.equal(
  qualitativeCandidateIds.length,
  5,
  "CT-P E2E requiere cinco candidatos cualitativos controlados",
);
assert.equal(baselineContext.scope.projectCount, ctI.input.comparable_project_count);
assert.equal(baselineContext.quantitative.pricePerM2Total.n, 0);
assert.equal(
  baselineContext.quantitative.pricePerM2Total.orientative.n,
  ctI.input.project_minima_pair_unresolved_count - 1,
  "CT-G debe restar una orientación sin alterar los 85 comparables",
);

function addPairingEvidence(data, entry, index, permission = "authorized") {
  const observation = data.model.observations.find(
    ({ observation_id: observationId }) => observationId === entry.observation_id,
  );
  assert.ok(observation, `Falta observación ${entry.observation_id}`);
  const evidenceId = `evidence:p4-e2e-pairing-${index}`;
  observation.evidence_ids = [...new Set([...(observation.evidence_ids ?? []), evidenceId])];
  observation.evidence_status = permission === "authorized" ? "available" : "restricted";
  data.model.evidence.push({
    evidence_id: evidenceId,
    observation_id: observation.observation_id,
    document_id: null,
    kind: "metadata",
    fragment: permission === "authorized" ? "Pareja controlada para E2E." : null,
    page: null,
    region: null,
    captured_at: data.benchmark.methodology.cutoff_at,
    sha256: String(index + 1).padStart(64, "0"),
    publish_permission: permission,
    availability: permission === "authorized" ? "available" : "restricted",
  });
  return evidenceId;
}

function sampleVariant(sampleSize) {
  const data = structuredClone(publicData);
  for (const [index, projectId] of eligibleCandidateIds.slice(0, sampleSize).entries()) {
    const entry = data.benchmark.fact_index.find(
      ({ project_id: candidateId }) => candidateId === projectId,
    );
    assert.ok(entry, `Falta entrada benchmark para ${projectId}`);
    const priceFact = data.model.facts.find(
      ({ fact_id: factId }) => factId === entry.price_per_m2_fact_id,
    );
    assert.ok(priceFact, `Falta precio por m² para ${projectId}`);
    const evidenceId = addPairingEvidence(data, entry, index);
    entry.pairing_status = "source_paired";
    entry.pairing_basis = "offer_id";
    entry.pairing_evidence_ids = [evidenceId];
    priceFact.quality_status = "certified";
    priceFact.benchmark_eligible = true;
    priceFact.exclusion_reason = null;
  }
  const qualitativeSample = new Set(qualitativeCandidateIds.slice(0, sampleSize));
  const scopedProjects = new Set(baselineContext.scope.projectIds);
  for (const entry of data.benchmark.fact_index) {
    if (scopedProjects.has(entry.project_id) && !qualitativeSample.has(entry.project_id)) {
      entry.attribute_fact_ids = [];
    }
  }
  return data;
}

function restrictedVariant() {
  const data = structuredClone(publicData);
  const projectId = eligibleCandidateIds[0];
  const entry = data.benchmark.fact_index.find(
    ({ project_id: candidateId }) => candidateId === projectId,
  );
  addPairingEvidence(data, entry, 99, "restricted");
  return { data, projectId };
}

function assertClean(problems, externalRequests, label) {
  assert.deepEqual(
    problems,
    [],
    `Errores de consola, página, red o HTTP durante ${label}:\n${problems.join("\n")}`,
  );
  assert.deepEqual(
    externalRequests,
    [],
    `Solicitudes externas durante ${label}:\n${externalRequests.join("\n")}`,
  );
}

async function reloadCurrentRoute(page) {
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#main-content").waitFor({ state: "visible" });
  await page.evaluate(() => document.fonts?.ready);
}

async function createFixturePage(context, baseUrl, fixture) {
  const page = await context.newPage();
  const problems = observePage(page);
  const externalRequests = [];
  const allowed = new URL(baseUrl);
  await page.route("**/*", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    if (
      ["http:", "https:"].includes(requestUrl.protocol) &&
      requestUrl.origin !== allowed.origin
    ) {
      externalRequests.push(`${request.method()} ${request.url()}`);
      await route.abort("blockedbyclient");
      return;
    }
    if (requestUrl.pathname.endsWith("/demo-data/viva-platform-demo.json")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify(fixture()),
      });
      return;
    }
    await route.continue();
  });
  return { page, problems, externalRequests };
}

await withDemoBrowser(async ({ browser, baseUrl }) => {
  const context = await browser.newContext({ viewport: viewports[0] });
  let activeData = publicData;
  const observed = await createFixturePage(context, baseUrl, () => activeData);

  activeData = publicData;
  await openPath(observed.page, baseUrl, "/#market");
  assert.equal(
    await observed.page.locator("h1").first().textContent(),
    "Benchmark de microzona",
  );
  assert.equal(
    await observed.page.locator('[data-benchmark-status="orientative_noncomparable"]').count(),
    1,
    "CT-I debe separar el índice orientativo del benchmark elegible",
  );
  const territorialPriceText = await observed.page
    .locator(".scenario-summary")
    .textContent();
  assert.match(territorialPriceText, /Referencia de precio no demostrada/u);
  assert.match(
    territorialPriceText,
    /69 publicaciones declaran precio y área total; no prueban que ambos valores pertenezcan a la misma oferta/u,
  );
  assert.doesNotMatch(
    territorialPriceText,
    /Referencia de precio lista|precios publicados compatibles/iu,
    "El shell no debe promover los campos raw a referencia elegible",
  );
  const baselineText = await observed.page.locator("#main-content").innerText();
  assert.match(baselineText, /85 comparables/u);
  assert.match(baselineText, /68 orientativos/u);
  assert.match(baselineText, /85 de entrada = 0 usados \+ 16 faltantes \+ 69 excluidos/u);
  assert.doesNotMatch(baselineText, /precio de cierre|tasación|promedio transaccional/iu);

  const audit = observed.page.locator("details.benchmark-audit");
  await audit.locator("summary").click();
  const auditText = await audit.innerText();
  assert.match(auditText, /project:nexo-2951/u, "CT-G debe seguir visible en la auditoría");
  assert.match(auditText, /blocking_issue/u, "CT-G debe explicar su exclusión");
  assert.equal(
    await audit.locator(`a[href="${ctG.expected.inspector_path}"]`).count(),
    1,
    "CT-G debe enlazar al inspector autorizado",
  );

  activeData = publicData;
  const ctCMarketPath = pathForRoute(ctC.canonical_path, "market");
  await openPath(observed.page, baseUrl, ctCMarketPath);
  assert.match(await observed.page.locator("#main-content").innerText(), /1 comparable/u);
  assert.equal(
    await observed.page.locator('[data-benchmark-status="orientative_noncomparable"]').count(),
    1,
    "CT-C no debe convertir una pareja no resuelta en referencia elegible",
  );
  const beforeReload = new URL(observed.page.url());
  await observed.page.reload({ waitUntil: "networkidle" });
  await observed.page.locator("#main-content").waitFor({ state: "visible" });
  assert.equal(new URL(observed.page.url()).search, beforeReload.search, "Reload debe conservar CT-C");
  assert.equal(new URL(observed.page.url()).hash, "#market", "Reload debe conservar deep-link de benchmark");

  activeData = publicData;
  await openPath(observed.page, baseUrl, emptyRadiusMarketPath);
  assert.equal(
    await observed.page.locator('[data-benchmark-status="insufficient"]').count(),
    1,
    "Un radio sin comparables debe permanecer insuficiente sin fallback",
  );
  assert.match(
    await observed.page.locator(".benchmark-quantitative").innerText(),
    /No hay parejas precio–área probadas/u,
  );

  for (const sampleCase of ctP.input.sample_size_cases) {
    activeData = sampleVariant(sampleCase.n);
    const derivedContext = benchmarkContext(activeData);
    const derived = derivedContext.quantitative.pricePerM2Total;
    assert.equal(derived.n, sampleCase.n, `n=${sampleCase.n} debe conservar su numerador`);
    assert.equal(
      derived.status,
      sampleCase.quantitative_state,
      `Estado cuantitativo incorrecto para n=${sampleCase.n}`,
    );
    assert.equal(
      derivedContext.qualitative.coverage.usedProjectIds.length,
      sampleCase.n,
      `n=${sampleCase.n} debe conservar la muestra cualitativa controlada`,
    );
    assert.equal(
      derivedContext.qualitative.status,
      sampleCase.qualitative_state,
      `Estado cualitativo incorrecto para n=${sampleCase.n}`,
    );
    if (sampleCase.n === 0) {
      await openPath(observed.page, baseUrl, "/#market");
    } else {
      await reloadCurrentRoute(observed.page);
    }
    const quantitative = observed.page.locator(".benchmark-quantitative");
    const quantitativeText = await quantitative.innerText();
    const qualitativeBadge = observed.page.locator(
      ".benchmark-qualitative > .benchmark-section__heading .status-badge",
    );
    assert.match(
      await qualitativeBadge.innerText(),
      new RegExp(`${sampleCase.n}/85 informados`, "u"),
    );
    assert.equal(
      (await qualitativeBadge.getAttribute("class")).includes("success"),
      sampleCase.qualitative_state === "ready",
      `El navegador debe distinguir el umbral cualitativo para n=${sampleCase.n}`,
    );
    if (sampleCase.n === 0) {
      assert.match(quantitativeText, /68 orientativos/u);
    } else if (sampleCase.n < 3) {
      assert.equal(
        await quantitative.locator(".benchmark-short-sample").count(),
        1,
        `El navegador no representó la muestra corta n=${sampleCase.n}:\n${quantitativeText}`,
      );
      assert.match(quantitativeText, new RegExp(`n = ${sampleCase.n}`, "iu"));
      assert.equal(await quantitative.locator(".benchmark-quantile-strip").count(), 0);
    } else {
      assert.equal(await quantitative.locator(".benchmark-quantile-strip").count(), 1);
      assert.match(quantitativeText, new RegExp(`${sampleCase.n} elegibles`, "u"));
      assert.match(quantitativeText, /P25[\s\S]*MEDIANA[\s\S]*P75/u);
    }
  }

  const restricted = restrictedVariant();
  activeData = restricted.data;
  const restrictedContext = benchmarkContext(activeData);
  assert.ok(
    restrictedContext.quantitative.pricePerM2Total.coverage.excludedProjects.some(
      ({ projectId, reasons }) =>
        projectId === restricted.projectId && reasons.includes("restricted"),
    ),
    "La observación restringida debe quedar fuera antes del render",
  );
  await reloadCurrentRoute(observed.page);
  const restrictedAudit = observed.page.locator("details.benchmark-audit");
  await restrictedAudit.locator("summary").click();
  assert.match(await restrictedAudit.innerText(), /restricted/u);
  assert.doesNotMatch(await observed.page.locator("#main-content").innerText(), /p4-e2e-pairing-99/u);

  activeData = structuredClone(publicData);
  activeData.metadata.contract_version = "2.2.0";
  await reloadCurrentRoute(observed.page);
  assert.equal(
    await observed.page.locator('[data-benchmark-status="contract_unavailable"]').count(),
    1,
    "2.2 debe degradar solo F4 a contrato no disponible",
  );

  activeData = structuredClone(publicData);
  activeData.benchmark.version = 99;
  await reloadCurrentRoute(observed.page);
  assert.equal(
    await observed.page.locator('[data-benchmark-status="error"]').count(),
    1,
    "Un benchmark malformado debe fallar cerrado",
  );
  assert.match(await observed.page.locator("#main-content").innerText(), /INVALID_BENCHMARK_CONTRACT/u);

  assertClean(observed.problems, observed.externalRequests, "benchmark E2E");
  await context.close();
});

console.log(
  "Benchmark E2E OK: CT-C/G/I/P, n=0–5, no-price, unresolved, restricted, error, legacy, deep-link y red cerrada.",
);
