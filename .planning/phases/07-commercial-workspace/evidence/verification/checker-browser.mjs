import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createObservedPage,
  withDemoBrowser,
} from "../../../../../prototipo_ejecutable/tests/helpers/demo-browser.mjs";

const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicData = JSON.parse(
  await fs.readFile(
    new URL("../../../../../prototipo_ejecutable/public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);

const surfaces = [
  ...["scale", "geography", "quality", "depth", "movement", "decision"].map((stage) => ({
    id: `journey-${stage}`,
    kind: "journey",
    path: `/#journey/${stage}`,
    root: `.journey-view[data-journey-stage="${stage}"]`,
    reading: ".journey-reading",
    work: ".journey-reading",
    focus: ".journey-primary-action",
  })),
  {
    id: "expert-dashboard",
    kind: "expert",
    path: "/?sv=1&area=80&price=650000#dashboard",
    root: ".dashboard-grid",
    reading: "[data-radar-summary]",
    work: ".radar-primary",
    focus: "#geo-project-select",
  },
  {
    id: "expert-projects",
    kind: "expert",
    path: "/#projects",
    root: '[data-scenario-consumer="catalog"]',
    reading: "[data-projects-conclusion]",
    work: ".workspace-toolbar",
    focus: "#project-query",
  },
  {
    id: "expert-inspector",
    kind: "expert",
    path: "/#inspector/case/f3-ct-g-pardo",
    root: '.inspector-view[data-inspector-state="ready"]',
    reading: "[data-inspector-quality-moment]",
    work: "[data-commercial-inspector-summary]",
    focus: "#inspector-primary-action",
  },
  {
    id: "expert-market",
    kind: "expert",
    path: "/#market",
    root: '[data-scenario-consumer="benchmark"]',
    reading: "[data-commercial-benchmark-summary]",
    work: ".benchmark-decision-ledger",
    focus: ".benchmark-primary-action",
  },
  {
    id: "expert-compare",
    kind: "expert",
    path: "/#compare",
    root: ".comparison-shell",
    reading: ".comparison-command",
    work: "details.comparison-selector",
    focus: "details.comparison-selector > summary",
  },
  {
    id: "expert-trust",
    kind: "expert",
    path: "/#trust",
    root: ".checklist-evidence",
    reading: "[data-commercial-checklist-rows]",
    work: ".checklist-summary",
    focus: ".checklist-return",
  },
  {
    id: "expert-assistant",
    kind: "expert",
    path: "/#assistant",
    root: ".assistant-workbench",
    reading: "[data-commercial-assistant-context]",
    work: "[data-commercial-assistant-query]",
    focus: "[data-assistant-question]",
  },
  {
    id: "expert-activity",
    kind: "expert",
    path: "/#activity",
    root: '.history-view[data-history-status="ready"]',
    reading: ".history-signal-brief",
    work: ".history-agenda",
    focus: "[data-history-event]",
  },
];

const modes = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "390x844", width: 390, height: 844 },
  { name: "zoom-200", width: 720, height: 450 },
];

const screenshotKeys = new Set([
  "1440x900:journey-scale",
  "1280x720:expert-dashboard",
  "1280x720:expert-assistant",
  "390x844:expert-projects",
  "390x844:expert-activity",
  "zoom-200:expert-inspector",
]);
const result = {
  candidate: "6a6a60ca2e607dc4768c56b139c2549b5fae41d8",
  matrix: [],
  interactions: {},
  captures: [],
  gaps: [],
};

function url(baseUrl, relativePath) {
  return new URL(relativePath, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).href;
}

async function navigate(page, baseUrl, relativePath) {
  await page.goto(url(baseUrl, relativePath), { waitUntil: "networkidle" });
  await page.locator("#main-content").waitFor({ state: "visible" });
  await page.evaluate(() => document.fonts?.ready);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

function assertClean(observed, label, expectedFailedRequest = false) {
  const problems = expectedFailedRequest
    ? observed.problems.filter((problem) =>
      !problem.includes("demo-data/viva-platform-demo.json") && !problem.includes("net::ERR_FAILED"))
    : observed.problems;
  assert.deepEqual(problems, [], `${label}: errores de navegador: ${problems.join(" | ")}`);
  assert.deepEqual(observed.externalRequests, [], `${label}: solicitudes externas`);
}

async function contrastRatio(locator) {
  return locator.evaluate((element) => {
    const parse = (value) => {
      const match = String(value).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/u);
      return match
        ? [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? 1 : Number(match[4])]
        : [0, 0, 0, 1];
    };
    const composite = (front, back) => {
      const alpha = front[3] + back[3] * (1 - front[3]);
      return [
        (front[0] * front[3] + back[0] * back[3] * (1 - front[3])) / alpha,
        (front[1] * front[3] + back[1] * back[3] * (1 - front[3])) / alpha,
        (front[2] * front[3] + back[2] * back[3] * (1 - front[3])) / alpha,
        alpha,
      ];
    };
    const backgrounds = [];
    for (let node = element; node; node = node.parentElement) {
      const background = parse(getComputedStyle(node).backgroundColor);
      if (background[3] > 0) backgrounds.push(background);
      if (background[3] >= 1) break;
    }
    const background = backgrounds.reverse().reduce(
      (base, layer) => composite(layer, base),
      [255, 255, 255, 1],
    );
    const foreground = composite(parse(getComputedStyle(element).color), background);
    const luminance = (color) => color.slice(0, 3).reduce((sum, channel, index) => {
      const normalized = channel / 255;
      const linear = normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
      return sum + linear * [0.2126, 0.7152, 0.0722][index];
    }, 0);
    const a = luminance(foreground);
    const b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
}

async function auditSurface(page, surface, mode) {
  const label = `${mode.name}:${surface.id}`;
  await page.locator(surface.root).waitFor({ state: "visible" });
  const geometry = await page.evaluate(({ root, reading, work, kind }) => {
    const documentElement = document.documentElement;
    const boxes = (selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect ? { top: rect.top, width: rect.width, height: rect.height } : null;
    };
    const clipped = [...document.querySelectorAll(`${root} :is(h1,h2,h3,p,li,dt,dd,label,button,a,summary,strong)`)]
      .filter((element) => !element.matches('.sr-only,.visually-hidden,.history-sr-only,.inspector-sr-only,[class*="sr-only"],[class*="visually-hidden"]'))
      .filter((element) => element.getBoundingClientRect().height > 0 && element.textContent?.trim())
      .filter((element) => {
        const style = getComputedStyle(element);
        const over = element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2;
        return style.textOverflow === "ellipsis" || (over && [style.overflow, style.overflowX, style.overflowY].some((value) => ["hidden", "clip"].includes(value)));
      })
      .map((element) => element.textContent.trim().slice(0, 80));
    const smallTargets = [...document.querySelectorAll(`${root} :is(button,input,select,textarea,summary,a[href])`)]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      })
      .map((element) => {
        const target = element instanceof HTMLInputElement && ["checkbox", "radio"].includes(element.type) && element.labels?.[0]
          ? element.labels[0]
          : element;
        const rect = target.getBoundingClientRect();
        return { name: target.id || target.className || target.tagName, width: Math.round(rect.width), height: Math.round(rect.height) };
      })
      .filter(({ width, height }) => width < 44 || height < 44);
    const normalSelector = kind === "journey"
      ? ".journey-reading__lead,.journey-reading__ledger p:last-child,.journey-state p"
      : ".decision-line__reading,.decision-line__limit,.data-row__primary,.data-row__secondary";
    const normalSizes = [...document.querySelectorAll(`${root} ${normalSelector}`)]
      .filter((element) => element.getBoundingClientRect().height > 0 && element.textContent?.trim())
      .map((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    if (!normalSizes.length) {
      const fallback = document.querySelector(reading);
      if (fallback?.getBoundingClientRect().height > 0) normalSizes.push(Number.parseFloat(getComputedStyle(fallback).fontSize));
    }
    const metadataSelector = kind === "journey"
      ? ".journey-stage__eyebrow,.journey-section-label,.journey-expert-link span"
      : ".decision-line__label,.data-row small,.metric-pair dt";
    const metadataSizes = [...document.querySelectorAll(`${root} ${metadataSelector}`)]
      .filter((element) => element.getBoundingClientRect().height > 0)
      .map((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    const primary = [...document.querySelectorAll(".primary-button,.journey-primary-action")]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && style.visibility !== "hidden" && style.display !== "none";
      }).length;
    const moving = [...document.querySelectorAll("body *")]
      .filter((element) => element.getBoundingClientRect().height > 0)
      .filter((element) => {
        const style = getComputedStyle(element);
        return `${style.animationDuration},${style.transitionDuration}`.split(",").some((value) => (Number.parseFloat(value) || 0) > 0);
      })
      .slice(0, 5)
      .map((element) => element.id || element.className || element.tagName);
    return {
      clipped,
      clientWidth: documentElement.clientWidth,
      scrollWidth: documentElement.scrollWidth,
      smallTargets,
      normalSizes,
      metadataSizes,
      primary,
      moving,
      reading: boxes(reading),
      work: boxes(work),
      h1Count: document.querySelectorAll("h1").length,
    };
  }, surface);

  assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1, `${label}: overflow horizontal`);
  assert.deepEqual(geometry.clipped, [], `${label}: truncamiento crítico`);
  assert.deepEqual(geometry.smallTargets, [], `${label}: objetivos menores a 44×44`);
  if (geometry.h1Count !== 1) {
    result.gaps.push({ severity: "P2", check: label, finding: `Se esperaban 1 h1 y se encontraron ${geometry.h1Count}.` });
  }
  assert.ok(geometry.normalSizes.length > 0 && geometry.normalSizes.every((size) => size >= 16), `${label}: texto operativo <16 px`);
  assert.ok(geometry.metadataSizes.every((size) => size >= 13), `${label}: metadata <13 px`);
  assert.ok(geometry.primary <= 1, `${label}: ${geometry.primary} acciones primarias compiten`);
  assert.deepEqual(geometry.moving, [], `${label}: reduced motion no respetado`);
  assert.ok(geometry.reading?.height > 0 && geometry.work?.height > 0, `${label}: lectura/trabajo no alcanzable`);
  if (mode.width === 1280 && mode.height === 720) {
    if (!(geometry.reading.top < 720 && geometry.work.top < 720)) {
      result.gaps.push({
        severity: "P2",
        check: label,
        finding: `Lectura/trabajo fuera de la primera pantalla (reading=${Math.round(geometry.reading.top)}, work=${Math.round(geometry.work.top)}).`,
      });
    }
  }

  const focus = page.locator(surface.focus).first();
  await focus.scrollIntoViewIfNeeded();
  await focus.focus();
  const focusStyle = await focus.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      active: document.activeElement === element,
      outline: Number.parseFloat(style.outlineWidth) || 0,
      shadow: style.boxShadow,
    };
  });
  assert.equal(focusStyle.active, true, `${label}: control no enfocable`);
  assert.ok(focusStyle.outline >= 2 || focusStyle.shadow !== "none", `${label}: foco no perceptible`);
  assert.ok(await contrastRatio(page.locator("h1").first()) >= 4.5, `${label}: h1 no cumple AA`);
  for (const primary of await page.locator(".primary-button:visible,.journey-primary-action:visible").all()) {
    assert.ok(await contrastRatio(primary) >= 4.5, `${label}: acción primaria no cumple AA`);
  }
  return geometry;
}

await fs.mkdir(evidenceDirectory, { recursive: true });

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const mode of modes) {
    for (const surface of surfaces) {
      const context = await browser.newContext({ viewport: { width: mode.width, height: mode.height } });
      const observed = await createObservedPage(context, baseUrl);
      await observed.page.emulateMedia({ reducedMotion: "reduce" });
      await navigate(observed.page, baseUrl, surface.path);
      const geometry = await auditSurface(observed.page, surface, mode);
      assertClean(observed, `${mode.name}:${surface.id}`);
      result.matrix.push({ mode: mode.name, surface: surface.id, primary: geometry.primary });
      const screenshotKey = `${mode.name}:${surface.id}`;
      if (screenshotKeys.has(screenshotKey)) {
        const file = `${surface.id}-${mode.name}.png`;
        const output = path.join(evidenceDirectory, file);
        await observed.page.evaluate(() => scrollTo(0, 0));
        await observed.page.screenshot({ path: output });
        const bytes = await fs.readFile(output);
        result.captures.push({ file, sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
      }
      await context.close();
    }
  }
}, { port: 4381 });

await withDemoBrowser(async ({ browser, baseUrl }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const observed = await createObservedPage(context, baseUrl);
  const { page } = observed;
  await navigate(page, baseUrl, "/#dashboard");
  assert.equal(await page.locator('[data-nav-tier="primary"]').count(), 5, "rail: cinco destinos primarios");
  assert.deepEqual(
    await page.locator('[data-nav-tier="primary"] strong').allTextContents(),
    ["Recorrido", "Panorama", "Proyectos", "Decidir", "Seguimiento"],
  );
  assert.equal(await page.locator('[data-nav-tier="expert"]').count(), 4, "rail: cuatro destinos expertos");
  const expertTargets = ["inspector", "market", "compare", "trust"];
  for (const target of expertTargets) {
    await navigate(page, baseUrl, "/#dashboard");
    const disclosure = page.locator(".nav-expert-disclosure");
    if ((await disclosure.getAttribute("open")) !== null) {
      await disclosure.locator(":scope > summary").click();
    }
    await disclosure.locator(":scope > summary").click();
    await page.locator(`[data-nav-tier="expert"][data-view="${target}"]`).click();
    await page.waitForFunction((expected) => location.hash.startsWith(`#${expected}`), target);
    await page.locator(`[data-nav-tier="expert"][data-view="${target}"][aria-current="page"]`).waitFor({ state: "visible" });
  }
  result.interactions.expertDesktop = "4/4 rutas en dos interacciones";

  await navigate(page, baseUrl, "/#projects");
  assert.equal(await page.locator("#scenario-editor").isHidden(), true, "editor cerrado por defecto");
  const scenarioTrigger = page.locator("#scenario-editor-trigger");
  await scenarioTrigger.focus();
  await scenarioTrigger.press("Enter");
  assert.equal(await page.locator("#scenario-editor").isVisible(), true);
  assert.equal(await page.locator("#scenario-editor").getAttribute("aria-modal"), "false");
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "scenario-editor-trigger");
  result.interactions.scenarioDesktop = "cerrado/Enter/Escape/foco PASS";

  const commandTrigger = page.locator("#command-menu-trigger");
  await commandTrigger.focus();
  await page.keyboard.press("Control+K");
  const command = page.locator("#command-menu-dialog");
  await command.waitFor({ state: "visible" });
  assert.match(await command.innerText(), /Navega por la demo/iu);
  assert.equal(await page.locator("[data-command-destination]").count(), 9);
  await page.locator("#command-menu-input").fill("Miraflores");
  assert.equal(await page.locator("[data-command-destination]").count(), 0, "Ir a no busca distritos/datos");
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "command-menu-trigger");
  assert.deepEqual(
    await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) })),
    { local: [], session: [] },
  );
  result.interactions.commandMenu = "Ctrl+K/copy local/9 destinos/Escape/foco/no persistencia PASS";

  await navigate(page, baseUrl, "/?sv=1&area=80&price=650000#dashboard");
  await page.locator("#scenario-editor-trigger").click();
  await page.locator("#reset-scenario").click();
  await page.waitForFunction(() => location.hash === "#journey/scale");
  assert.equal(new URL(page.url()).search, "", "reset elimina escenario serializado");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "journey-title");
  result.interactions.reset = "/#journey/scale, query vacía y foco h1 PASS";

  await navigate(page, baseUrl, "/#compare");
  assert.equal(await page.locator('[data-comparison-status="insufficient"]').count(), 1);
  assert.equal(await page.getByText("Seleccionar proyectos", { exact: true }).count(), 1);
  assert.equal(await page.locator("[data-commercial-comparison-summary]").count(), 0);
  result.interactions.empty = "comparación vacía y CTA correctiva PASS";

  await navigate(page, baseUrl, "/#inspector/case/f3-ct-g-pardo");
  const inspectorText = await page.locator("#main-content").innerText();
  for (const value of ["104.15", "53.37", "50.78"]) assert.match(inspectorText, new RegExp(value.replace(".", "\\."), "u"));
  assert.match(inspectorText, /excluid|no elegible/iu);
  const inspectorSummary = page.locator("[data-commercial-inspector-summary]");
  assert.match(await inspectorSummary.innerText(), /0 hechos elegibles[^]*8 hechos excluidos/iu);
  result.interactions.domParity = "Tipo 7 DOM↔estado visible PASS";
  assertClean(observed, "interacciones desktop");
  await context.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobileObserved = await createObservedPage(mobileContext, baseUrl);
  const mobile = mobileObserved.page;
  await navigate(mobile, baseUrl, "/#projects");
  await mobile.locator("#menu-toggle").click();
  const mobileScenario = mobile.locator("#scenario-editor-trigger");
  await mobileScenario.click();
  assert.equal(await mobile.locator("#scenario-editor").getAttribute("aria-modal"), "true");
  assert.equal(await mobile.evaluate(() => document.activeElement?.id), "scenario-editor-close");
  await mobile.keyboard.press("Escape");
  assert.equal(await mobile.evaluate(() => document.activeElement?.id), "scenario-editor-trigger");
  await mobile.locator("#command-menu-trigger").focus();
  await mobile.keyboard.press("Control+K");
  await mobile.locator("#command-menu-dialog").waitFor({ state: "visible" });
  await mobile.keyboard.press("Escape");
  assert.equal(await mobile.evaluate(() => document.activeElement?.id), "command-menu-trigger");
  result.interactions.mobile = "drawer/editor modal/Ctrl+K/Escape/retorno de foco PASS";
  assertClean(mobileObserved, "interacciones mobile");
  await mobileContext.close();

  const legacyContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const legacyObserved = await createObservedPage(legacyContext, baseUrl);
  const legacyPayload = structuredClone(publicData);
  legacyPayload.metadata.contract_version = "2.1.0";
  delete legacyPayload.inspector;
  delete legacyPayload.benchmark;
  delete legacyPayload.history;
  delete legacyPayload.assistant;
  await legacyObserved.page.route("**/demo-data/viva-platform-demo.json", (route) => route.fulfill({
    status: 200,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(legacyPayload),
  }));
  await navigate(legacyObserved.page, baseUrl, "/#journey/quality");
  const legacyStage = legacyObserved.page.locator('[data-journey-stage="quality"]');
  assert.equal(await legacyStage.getAttribute("data-journey-state"), "capability_unavailable");
  assert.match(await legacyStage.innerText(), /Volver a geografía/iu);
  assert.doesNotMatch(await legacyStage.innerText(), /vacío de negocio/iu);
  result.interactions.legacy = "2.1 capability_unavailable + CTA PASS";
  assertClean(legacyObserved, "contrato 2.1");
  await legacyContext.close();

  const errorContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const errorObserved = await createObservedPage(errorContext, baseUrl);
  await errorObserved.page.route("**/demo-data/viva-platform-demo.json", (route) => route.abort("failed"));
  await errorObserved.page.goto(url(baseUrl, "/#projects"), { waitUntil: "networkidle" });
  const errorBox = errorObserved.page.locator(".error-box");
  await errorBox.waitFor({ state: "visible" });
  assert.equal(await errorObserved.page.getByRole("button", { name: "Reintentar", exact: true }).count(), 1);
  assert.equal(await errorObserved.page.locator("[data-view-root],[data-journey-stage]").count(), 0);
  assert.doesNotMatch(await errorObserved.page.locator("body").innerText(), /85 comparables|104\.15|NaN|Infinity|∞/u);
  result.interactions.error = "fallo global uniforme, sin estado obsoleto/parcial, Reintentar PASS";
  assertClean(errorObserved, "fallo de carga", true);
  await errorContext.close();
}, { port: 4382 });

assert.equal(result.matrix.length, 56, "matriz independiente 14×4");
await fs.writeFile(
  path.join(evidenceDirectory, "browser-verification.json"),
  `${JSON.stringify(result, null, 2)}\n`,
  "utf8",
);

assert.deepEqual(result.gaps, [], `Hallazgos formales: ${JSON.stringify(result.gaps)}`);

console.log("P7-10 browser adversarial PASS: 14 superficies × 4 modos, navegación, estados, foco, reset, paridad y red.");
