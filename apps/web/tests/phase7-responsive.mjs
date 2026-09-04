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
  "..",
  ".planning",
  "phases",
  "07-commercial-workspace",
  "evidence",
  "responsive",
);
const claimsUrl = new URL("./fixtures/commercial-claims.json", import.meta.url);
const claimsBefore = await fs.readFile(claimsUrl);
const claimsFixture = JSON.parse(claimsBefore.toString("utf8"));

const journeyStages = ["scale", "geography", "quality", "depth", "movement", "decision"];
const surfaces = [
  ...journeyStages.map((stage) => ({
    id: `journey-${stage}`,
    kind: "journey",
    path: `/#journey/${stage}`,
    root: `.journey-view[data-journey-stage="${stage}"]`,
    focus: ".journey-primary-action",
    reading: ".journey-reading",
    work: ".journey-reading",
    stage,
  })),
  {
    id: "expert-dashboard",
    kind: "expert",
    path: "/?sv=1&area=80&price=650000#dashboard",
    root: ".dashboard-grid",
    focus: "#geo-project-select",
    reading: "[data-radar-summary]",
    work: ".radar-primary",
  },
  {
    id: "expert-projects",
    kind: "expert",
    path: "/#projects",
    root: '[data-scenario-consumer="catalog"]',
    focus: "#project-query",
    reading: "[data-projects-conclusion]",
    work: ".workspace-toolbar",
  },
  {
    id: "expert-inspector",
    kind: "expert",
    path: "/#inspector/case/f3-ct-g-pardo",
    root: '.inspector-view[data-inspector-state="ready"]',
    focus: "#inspector-primary-action",
    reading: "[data-inspector-quality-moment]",
    work: "[data-commercial-inspector-summary]",
  },
  {
    id: "expert-market",
    kind: "expert",
    path: "/#market",
    root: '[data-scenario-consumer="benchmark"]',
    focus: ".benchmark-primary-action",
    reading: "[data-commercial-benchmark-summary]",
    work: ".benchmark-decision-ledger",
  },
  {
    id: "expert-compare",
    kind: "expert",
    path: "/#compare",
    root: ".comparison-shell",
    focus: "details.comparison-selector > summary",
    reading: "[data-commercial-comparison-summary]",
    work: "details.comparison-selector",
  },
  {
    id: "expert-trust",
    kind: "expert",
    path: "/#trust",
    root: ".checklist-evidence",
    focus: ".checklist-return",
    reading: "[data-commercial-checklist-rows]",
    work: ".checklist-summary",
  },
  {
    id: "expert-assistant",
    kind: "expert",
    path: "/#assistant",
    root: ".assistant-workbench",
    focus: "[data-assistant-question]",
    reading: "[data-commercial-assistant-context]",
    work: "[data-commercial-assistant-query]",
  },
  {
    id: "expert-activity",
    kind: "expert",
    path: "/#activity",
    root: '.history-view[data-history-status="ready"]',
    focus: "[data-history-event]",
    reading: ".history-signal-brief",
    work: ".history-agenda",
  },
];

assert.deepEqual(
  surfaces.map(({ path: routePath }) =>
    new URL(routePath, "https://phase7.invalid").hash.replace(/\/case\/.*$/u, "")),
  claimsFixture.all_surfaces,
  "La matriz responsive debe cubrir exactamente las 14 superficies del fixture C01–C23",
);

const manifest = [];

function assertClean(observed, label) {
  assert.deepEqual(observed.problems, [], `${label}: ${observed.problems.join("\n")}`);
  assert.deepEqual(
    observed.externalRequests,
    [],
    `${label}: red externa ${observed.externalRequests.join("\n")}`,
  );
}

async function settleUi(page) {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

async function openSurface(page, baseUrl, surface) {
  await openPath(page, baseUrl, surface.path);
  await page.locator(surface.root).waitFor({ state: "visible" });
  await settleUi(page);
}

async function capture(page, fileName, surface, mode) {
  const filePath = path.join(evidenceDirectory, fileName);
  await page.screenshot({ path: filePath });
  const bytes = await fs.readFile(filePath);
  manifest.push({
    file: fileName,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    surface: surface.id,
    mode,
    url: page.url(),
  });
}

async function assertNoHorizontalOverflow(page, label) {
  const result = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll("body *")]
      .map((element) => {
        const box = element.getBoundingClientRect();
        return {
          name: element.id || (typeof element.className === "string" ? element.className : element.tagName),
          left: Math.round(box.left),
          right: Math.round(box.right),
        };
      })
      .filter(({ left, right }) => left < -1 || right > window.innerWidth + 1)
      .slice(0, 8),
  }));
  assert.ok(
    result.scrollWidth <= result.clientWidth + 1,
    `${label}: overflow ${result.scrollWidth}/${result.clientWidth}; ${JSON.stringify(result.offenders)}`,
  );
}

async function contrastRatio(page, selector) {
  return page.locator(selector).first().evaluate((element) => {
    const parse = (value) => {
      const match = String(value).match(
        /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/u,
      );
      return match
        ? [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? 1 : Number(match[4])]
        : [0, 0, 0, 1];
    };
    const over = (foreground, background) => {
      const alpha = foreground[3] + background[3] * (1 - foreground[3]);
      return [
        (foreground[0] * foreground[3] + background[0] * background[3] * (1 - foreground[3])) / alpha,
        (foreground[1] * foreground[3] + background[1] * background[3] * (1 - foreground[3])) / alpha,
        (foreground[2] * foreground[3] + background[2] * background[3] * (1 - foreground[3])) / alpha,
        alpha,
      ];
    };
    const layers = [];
    for (let node = element; node; node = node.parentElement) {
      const background = parse(getComputedStyle(node).backgroundColor);
      if (background[3] > 0) layers.push(background);
      if (background[3] >= 1) break;
    }
    const background = layers
      .reverse()
      .reduce((base, layer) => over(layer, base), [255, 255, 255, 1]);
    const foreground = over(parse(getComputedStyle(element).color), background);
    const luminance = (color) => color.slice(0, 3).reduce((total, channel, index) => {
      const normalized = channel / 255;
      const linear = normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
      return total + linear * [0.2126, 0.7152, 0.0722][index];
    }, 0);
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background);
    return (
      (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
      (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
    );
  });
}

async function assertContrast(page, selector, label, minimum = 4.5) {
  const ratio = await contrastRatio(page, selector);
  assert.ok(ratio >= minimum, `${label}: contraste ${ratio.toFixed(2)}:1 < ${minimum}:1`);
}

async function assertFocusRing(page, selector, label) {
  const control = page.locator(selector).first();
  await control.scrollIntoViewIfNeeded();
  await control.focus();
  const style = await control.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      active: document.activeElement === element,
      outlineStyle: computed.outlineStyle,
      outlineWidth: Number.parseFloat(computed.outlineWidth),
      boxShadow: computed.boxShadow,
    };
  });
  assert.equal(style.active, true, `${label}: no recibe foco`);
  assert.ok(
    (style.outlineStyle !== "none" && style.outlineWidth >= 2) || style.boxShadow !== "none",
    `${label}: foco no visible`,
  );
}

async function assertFocusedControlVisible(page, selector, label) {
  const control = page.locator(selector).first();
  await control.scrollIntoViewIfNeeded();
  await control.focus();
  await settleUi(page);
  const geometry = await control.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };
  });
  assert.ok(
    geometry.top >= -1 && geometry.bottom <= geometry.viewportHeight + 1 &&
      geometry.left >= -1 && geometry.right <= geometry.viewportWidth + 1,
    `${label}: foco fuera del viewport ${JSON.stringify(geometry)}`,
  );
}

async function assertTargets(page, root, label) {
  const undersized = await page
    .locator(`${root} :is(button, input, select, textarea, summary, a[href])`)
    .evaluateAll((elements) => elements
      .filter((element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
      })
      .map((element) => {
        const target =
          element instanceof HTMLInputElement && ["checkbox", "radio"].includes(element.type) && element.labels?.[0]
            ? element.labels[0]
            : element;
        const box = target.getBoundingClientRect();
        return {
          height: Math.round(box.height),
          name: target.id || target.className || target.tagName,
          width: Math.round(box.width),
        };
      })
      .filter(({ height, width }) => height < 44 || width < 44));
  assert.deepEqual(undersized, [], `${label}: objetivos menores a 44×44`);
}

async function assertNoTruncation(page, root, label) {
  const clipped = await page
    .locator(`${root} :is(h1, h2, h3, h4, p, li, dt, dd, label, button, a, summary, strong)`)
    .evaluateAll((elements) => elements
      .filter((element) => {
        const hidden = element.matches('.sr-only, .visually-hidden, [class*="sr-only"], [class*="visually-hidden"]');
        return !hidden && element.getBoundingClientRect().height > 0 && element.textContent?.trim();
      })
      .map((element) => {
        const style = getComputedStyle(element);
        const dimensionsOverflow =
          element.scrollWidth > element.clientWidth + 2 ||
          element.scrollHeight > element.clientHeight + 2;
        return {
          clipped: dimensionsOverflow &&
            [style.overflow, style.overflowX, style.overflowY].some((value) => ["hidden", "clip"].includes(value)),
          text: element.textContent.trim().slice(0, 90),
          textOverflow: style.textOverflow,
        };
      })
      .filter(({ clipped: isClipped, textOverflow }) => isClipped || textOverflow === "ellipsis"));
  assert.deepEqual(clipped, [], `${label}: texto truncado`);
}

async function assertTypography(page, surface, label) {
  const sizes = await page.evaluate(({ root, kind, reading }) => {
    const visibleSizes = (selectors) => [...document.querySelectorAll(`${root} ${selectors}`)]
      .filter((element) => element.getBoundingClientRect().height > 0)
      .map((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    const normal = visibleSizes(kind === "journey"
        ? ".journey-reading__lead, .journey-reading__ledger p:last-child, .journey-state p"
        : ".decision-line__reading, .decision-line__limit, .data-row__primary, .data-row__secondary");
    if (!normal.length) {
      const fallback = document.querySelector(reading);
      if (fallback?.getBoundingClientRect().height > 0) {
        normal.push(Number.parseFloat(getComputedStyle(fallback).fontSize));
      }
    }
    return {
      normal,
      metadata: visibleSizes(kind === "journey"
        ? ".journey-stage__eyebrow, .journey-section-label, .journey-expert-link span"
        : ".decision-line__label, .data-row small, .metric-pair dt"),
    };
  }, { root: surface.root, kind: surface.kind, reading: surface.reading });
  assert.ok(sizes.normal.length > 0, `${label}: faltan muestras de texto operativo`);
  assert.ok(sizes.normal.every((size) => size >= 16), `${label}: texto operativo menor a 16 px ${sizes.normal}`);
  assert.ok(sizes.metadata.every((size) => size >= 13), `${label}: metadata menor a 13 px ${sizes.metadata}`);
}

async function assertReducedMotion(page, label) {
  const offenders = await page.locator("body *").evaluateAll((elements) => elements
    .filter((element) => {
      const box = element.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) return false;
      const style = getComputedStyle(element);
      const durations = `${style.animationDuration},${style.transitionDuration}`
        .split(",")
        .map((value) => Number.parseFloat(value) || 0);
      return durations.some((duration) => duration > 0);
    })
    .map((element) => element.id || element.className || element.tagName)
    .slice(0, 8));
  assert.deepEqual(offenders, [], `${label}: movimiento activo con reduced-motion`);
}

async function assertShell(page, viewport, label) {
  const shell = await page.evaluate(() => {
    const sidebar = document.querySelector(".sidebar");
    const topbar = document.querySelector(".topbar, .journey-topbar");
    return {
      sidebarWidth: sidebar.getBoundingClientRect().width,
      sidebarVisible: getComputedStyle(sidebar).visibility !== "hidden",
      topbarHeight: topbar.getBoundingClientRect().height,
    };
  });
  if (viewport.width >= 1121) {
    assert.ok(shell.sidebarWidth <= 248, `${label}: rail mayor a 248 px (${shell.sidebarWidth})`);
    assert.ok(shell.topbarHeight <= 72, `${label}: topbar mayor a 72 px (${shell.topbarHeight})`);
  } else {
    assert.equal(shell.sidebarVisible, false, `${label}: drawer debe iniciar cerrado`);
  }
}

async function assertReadingAndWork(page, surface, viewport, label) {
  assert.equal(
    await page.evaluate(() => window.scrollY),
    0,
    `${label}: la primera pantalla debe medirse antes de cualquier scroll`,
  );
  for (const selector of [surface.reading, surface.work]) {
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: "visible" });
    const box = await locator.boundingBox();
    assert.ok(box && box.width > 0 && box.height > 0, `${label}: ${selector} no es alcanzable`);
    if (viewport.width === 1280 && viewport.height === 720) {
      assert.ok(box.y < viewport.height, `${label}: ${selector} empieza fuera de la primera pantalla`);
    }
  }
  const visiblePrimaryActions = await page.locator(".primary-button, .journey-primary-action").evaluateAll((elements) => elements
    .filter((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" &&
        box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight;
    }).length);
  assert.ok(visiblePrimaryActions <= 1, `${label}: ${visiblePrimaryActions} acciones primarias compiten en el viewport`);
}

async function assertSingleVisibleHeading(page, label) {
  assert.equal(
    await page.locator("h1:visible").count(),
    1,
    `${label}: debe existir un único h1 visible`,
  );
}

async function assertJourneyLayout(page, surface, viewport, label) {
  assert.equal(await page.locator("h1#journey-title").count(), 1, `${label}: un solo h1`);
  assert.equal(await page.locator("[data-journey-step]").count(), 6, `${label}: seis etapas`);
  assert.equal(
    await page.locator(`[data-journey-step="${surface.stage}"][aria-current="step"]`).count(),
    1,
    `${label}: etapa actual`,
  );
  const layout = await page.evaluate(() => ({
    desktop: getComputedStyle(document.querySelector(".journey-rail ol")).display,
    mobile: getComputedStyle(document.querySelector(".journey-rail__mobile")).display,
    columns: getComputedStyle(document.querySelector(".journey-reading__ledger")).gridTemplateColumns
      .split(" ")
      .filter(Boolean).length,
  }));
  if (viewport.width <= 620) {
    assert.equal(layout.desktop, "none", `${label}: rail desktop oculto`);
    assert.notEqual(layout.mobile, "none", `${label}: selector móvil visible`);
  } else {
    assert.notEqual(layout.desktop, "none", `${label}: rail desktop visible`);
    assert.equal(layout.mobile, "none", `${label}: selector móvil oculto`);
  }
  assert.equal(layout.columns, 1, `${label}: lectura comercial en una columna`);
}

await fs.mkdir(evidenceDirectory, { recursive: true });

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of viewports) {
    for (const surface of surfaces) {
      const context = await browser.newContext({ viewport });
      const observed = await createObservedPage(context, baseUrl);
      const { page } = observed;
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openSurface(page, baseUrl, surface);
      await page.evaluate(() => window.scrollTo(0, 0));
      await settleUi(page);
      const label = `${viewport.name} ${surface.id}`;
      await assertNoHorizontalOverflow(page, label);
      await assertNoTruncation(page, surface.root, label);
      await assertContrast(page, "h1", `${label} título`);
      await assertSingleVisibleHeading(page, label);
      await assertShell(page, viewport, label);
      await assertReadingAndWork(page, surface, viewport, label);
      await assertFocusRing(page, surface.focus, label);
      await assertFocusedControlVisible(page, surface.focus, label);
      await assertTargets(page, surface.root, label);
      await assertTypography(page, surface, label);
      await assertReducedMotion(page, label);
      if (surface.kind === "journey") await assertJourneyLayout(page, surface, viewport, label);
      await page.evaluate(() => window.scrollTo(0, 0));
      await settleUi(page);
      await capture(page, `${surface.id}-${viewport.width}x${viewport.height}.png`, surface, `${viewport.width}x${viewport.height}`);
      assertClean(observed, label);
      await context.close();
    }
  }
}, { port: 4375 });

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const surface of surfaces) {
    const context = await browser.newContext({ viewport: { width: 720, height: 450 } });
    const observed = await createObservedPage(context, baseUrl);
    const { page } = observed;
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openSurface(page, baseUrl, surface);
    await page.evaluate(() => window.scrollTo(0, 0));
    await settleUi(page);
    const label = `zoom-200 ${surface.id}`;
    await assertNoHorizontalOverflow(page, label);
    await assertNoTruncation(page, surface.root, label);
    await assertTargets(page, surface.root, label);
    await assertContrast(page, "h1", `${label} título`);
    await assertSingleVisibleHeading(page, label);
    await assertReadingAndWork(page, surface, { width: 720, height: 450 }, label);
    await assertFocusRing(page, surface.focus, label);
    await assertFocusedControlVisible(page, surface.focus, label);
    await assertTypography(page, surface, label);
    await assertReducedMotion(page, label);
    if (surface.kind === "journey") {
      await assertJourneyLayout(page, surface, { width: 720, height: 450 }, label);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await settleUi(page);
    await capture(page, `${surface.id}-zoom-200.png`, surface, "zoom-200");
    assertClean(observed, label);
    await context.close();
  }
}, { port: 4376 });

await withDemoBrowser(async ({ browser, baseUrl }) => {
  const context = await browser.newContext({ viewport: viewports[2] });
  const observed = await createObservedPage(context, baseUrl);
  const { page } = observed;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openSurface(page, baseUrl, surfaces[0]);

  const menu = page.locator("#menu-toggle");
  await menu.focus();
  await page.keyboard.press("Enter");
  assert.equal(await menu.getAttribute("aria-expanded"), "true");
  await page.keyboard.press("Escape");
  assert.equal(await menu.getAttribute("aria-expanded"), "false");
  assert.equal(await menu.evaluate((element) => document.activeElement === element), true);

  const scenarioTrigger = page.locator("#scenario-journey-editor-trigger");
  await scenarioTrigger.focus();
  await page.keyboard.press("Enter");
  await page.locator("#scenario-editor").waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  assert.equal(await scenarioTrigger.evaluate((element) => document.activeElement === element), true);

  await menu.focus();
  await page.keyboard.press("Enter");
  const commandTrigger = page.locator("#command-menu-trigger");
  await commandTrigger.focus();
  await page.keyboard.press("Control+K");
  await page.locator("#command-menu-dialog").waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  assert.equal(await commandTrigger.evaluate((element) => document.activeElement === element), true);
  await page.keyboard.press("Escape");
  assert.equal(await menu.getAttribute("aria-expanded"), "false");

  const journeySelector = page.locator(".journey-rail__mobile");
  const summary = journeySelector.locator(":scope > summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  assert.notEqual(await journeySelector.getAttribute("open"), null);
  await page.keyboard.press("Enter");
  assert.equal(await journeySelector.getAttribute("open"), null);
  assertClean(observed, "teclado móvil Fase 7");
  await context.close();
}, { port: 4377 });

const claimsAfter = await fs.readFile(claimsUrl);
assert.deepEqual(claimsAfter, claimsBefore, "P7-09 no puede modificar el fixture C01–C23");
assert.equal(manifest.length, surfaces.length * 4, "Se esperan 14 superficies × 3 viewports + zoom 200%");

await fs.writeFile(
  path.join(evidenceDirectory, "manifest.json"),
  `${JSON.stringify({
    step: "P7-09",
    surfaces: surfaces.map(({ id, kind, path: routePath }) => ({ id, kind, path: routePath })),
    viewports,
    zoom: { equivalentViewport: { width: 720, height: 450 }, browserZoom: "200% equivalent reflow" },
    claimsFixture: "tests/fixtures/commercial-claims.json",
    files: manifest,
  }, null, 2)}\n`,
  "utf8",
);

console.log(
  "Phase 7 responsive OK: 14 superficies × 3 viewports, reflow 200%, C01–C23 alcanzables, teclado, foco, 44×44, AA, reduced motion y cero overflow/truncamiento.",
);
