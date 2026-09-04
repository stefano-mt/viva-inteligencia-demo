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
  "responsive",
);

const journeyStages = ["scale", "geography", "quality", "depth", "movement", "decision"];
const surfaces = [
  ...journeyStages.map((stage) => ({
    id: `journey-${stage}`,
    kind: "journey",
    path: `/#journey/${stage}`,
    root: `.journey-view[data-journey-stage="${stage}"]`,
    focus: ".journey-primary-action",
    primary: ".journey-primary-action",
    stage,
  })),
  {
    id: "expert-dashboard",
    kind: "expert",
    path: "/#dashboard",
    root: ".dashboard-grid",
    focus: "#scenario-product-submit",
    primary: "#scenario-product-submit",
  },
  {
    id: "expert-projects",
    kind: "expert",
    path: "/#projects",
    root: '[data-scenario-consumer="catalog"]',
    focus: "#project-query",
    primary: ".primary-button",
  },
  {
    id: "expert-inspector",
    kind: "expert",
    path: "/#inspector/case/f3-ct-g-pardo",
    root: '.inspector-view[data-inspector-state="ready"]',
    focus: "#inspector-primary-action",
    primary: "#inspector-primary-action",
  },
  {
    id: "expert-market",
    kind: "expert",
    path: "/#market",
    root: '[data-scenario-consumer="benchmark"]',
    focus: ".benchmark-primary-action",
    primary: ".benchmark-primary-action",
  },
  {
    id: "expert-compare",
    kind: "expert",
    path: "/#compare",
    root: '.comparison-shell[data-comparison-status="ready"]',
    focus: ".comparison-next-action",
    primary: ".comparison-next-action",
  },
  {
    id: "expert-trust",
    kind: "expert",
    path: "/#trust",
    root: ".checklist-evidence",
    focus: ".checklist-return",
    primary: ".checklist-return",
  },
  {
    id: "expert-assistant",
    kind: "expert",
    path: "/#assistant",
    root: ".assistant-workbench",
    focus: "[data-assistant-question]",
    primary: ".assistant-submit",
  },
  {
    id: "expert-activity",
    kind: "expert",
    path: "/#activity",
    root: '.history-view[data-history-status="ready"]',
    focus: "[data-history-event]",
    primary: ".history-decision-action",
  },
];

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

async function restoreAuthoredMotionStyles(page) {
  await page.evaluate(() => {
    for (const style of document.head.querySelectorAll("style")) {
      if (style.textContent?.includes("caret-color: transparent")) style.remove();
    }
  });
}

async function openSurface(page, baseUrl, surface) {
  await openPath(page, baseUrl, surface.path);
  await page.locator(surface.root).waitFor({ state: "visible" });
  await restoreAuthoredMotionStyles(page);
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
      .sort((a, b) => Math.max(Math.abs(b.left), b.right) - Math.max(Math.abs(a.left), a.right))
      .slice(0, 6),
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
    const luminance = (color) =>
      color.slice(0, 3).reduce((total, channel, index) => {
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

async function assertTargets(page, root, label) {
  const undersized = await page
    .locator(`${root} :is(button, input, select, textarea, summary, a[href])`)
    .evaluateAll((elements) =>
      elements
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
            text: element.textContent?.trim().slice(0, 70),
            width: Math.round(box.width),
          };
        })
        .filter(({ height, width }) => height < 44 || width < 44),
    );
  assert.deepEqual(undersized, [], `${label}: objetivos menores a 44×44`);
}

async function assertNoTruncation(page, root, label) {
  const clipped = await page
    .locator(`${root} :is(h1, h2, h3, h4, p, li, dt, dd, label, button, a, summary, strong)`)
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const hiddenForLayout = element.matches(
            '.sr-only, .visually-hidden, [class*="sr-only"], [class*="visually-hidden"]',
          );
          return !hiddenForLayout && element.getBoundingClientRect().height > 0 && element.textContent?.trim();
        })
        .map((element) => {
          const style = getComputedStyle(element);
          const dimensionsOverflow =
            element.scrollWidth > element.clientWidth + 2 ||
            element.scrollHeight > element.clientHeight + 2;
          return {
            clipped:
              dimensionsOverflow &&
              [style.overflow, style.overflowX, style.overflowY].some((value) => ["hidden", "clip"].includes(value)),
            text: element.textContent.trim().slice(0, 90),
            textOverflow: style.textOverflow,
          };
        })
        .filter(({ clipped: isClipped, textOverflow }) => isClipped || textOverflow === "ellipsis"),
    );
  assert.deepEqual(clipped, [], `${label}: texto truncado`);
}

async function assertFocusedControlVisible(page, selector, label) {
  const control = page.locator(selector).first();
  await control.scrollIntoViewIfNeeded();
  await settleUi(page);
  const geometry = await control.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const overlaps = [...document.querySelectorAll("body *")]
      .filter((candidate) => {
        if (candidate === element || candidate.contains(element) || element.contains(candidate)) return false;
        const style = getComputedStyle(candidate);
        if (!['fixed', 'sticky'].includes(style.position)) return false;
        const box = candidate.getBoundingClientRect();
        return !(box.right <= rect.left || box.left >= rect.right || box.bottom <= rect.top || box.top >= rect.bottom);
      })
      .map((candidate) => candidate.id || candidate.className || candidate.tagName);
    return {
      bottom: rect.bottom,
      left: rect.left,
      overlaps,
      right: rect.right,
      top: rect.top,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };
  });
  assert.ok(
    geometry.top >= 0 && geometry.bottom <= geometry.viewportHeight + 1 &&
      geometry.left >= 0 && geometry.right <= geometry.viewportWidth + 1,
    `${label}: foco fuera del viewport ${JSON.stringify(geometry)}`,
  );
  assert.deepEqual(geometry.overlaps, [], `${label}: foco cubierto por UI fija`);
}

async function assertReducedMotion(page, surface, label) {
  const selector = surface.kind === "journey" ? ".journey-rail__item" : surface.root;
  const style = await page.locator(selector).first().evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      animationDuration: computed.animationDuration,
      transitionDuration: computed.transitionDuration,
    };
  });
  assert.match(style.animationDuration, /^(0s)(, 0s)*$/u, `${label}: animación activa`);
  assert.match(style.transitionDuration, /^(0s)(, 0s)*$/u, `${label}: transición activa`);
}

async function assertJourneyDensity(page, surface, viewport, label) {
  assert.equal(await page.locator("h1").count(), 1, `${label}: un solo h1`);
  assert.equal(await page.locator("[data-journey-step]").count(), 6, `${label}: seis etapas`);
  assert.equal(
    await page.locator(`[data-journey-step="${surface.stage}"][aria-current="step"]`).count(),
    1,
    `${label}: etapa actual`,
  );
  const layout = await page.evaluate(() => {
    const ledger = document.querySelector(".journey-reading__ledger");
    const desktopRail = document.querySelector(".journey-rail ol");
    const mobileRail = document.querySelector(".journey-rail__mobile");
    return {
      desktopRail: getComputedStyle(desktopRail).display,
      ledgerColumns: getComputedStyle(ledger).gridTemplateColumns.split(" ").filter(Boolean).length,
      mobileRail: getComputedStyle(mobileRail).display,
    };
  });
  if (viewport.width <= 620) {
    assert.equal(layout.desktopRail, "none", `${label}: rail desktop oculto`);
    assert.notEqual(layout.mobileRail, "none", `${label}: resumen móvil visible`);
    assert.equal(layout.ledgerColumns, 1, `${label}: ledger móvil en una columna`);
  } else {
    assert.notEqual(layout.desktopRail, "none", `${label}: rail desktop visible`);
    assert.equal(layout.mobileRail, "none", `${label}: resumen móvil oculto`);
    assert.equal(layout.ledgerColumns, 2, `${label}: ledger en dos columnas`);
  }
  if (viewport.width === 1280 && viewport.height === 720) {
    const boxes = await page.evaluate(() => {
      const selectors = ["#journey-title", ".journey-reading__lead", ".journey-reading__limit", ".journey-primary-action"];
      return selectors.map((selector) => {
        const box = document.querySelector(selector)?.getBoundingClientRect();
        return { selector, bottom: box?.bottom ?? Infinity, top: box?.top ?? Infinity };
      });
    });
    assert.ok(
      boxes.every(({ bottom, top }) => top >= 0 && bottom <= viewport.height + 1),
      `${label}: tesis, límite o CTA fuera de la primera pantalla ${JSON.stringify(boxes)}`,
    );
  }
}

async function assertJourneyTypography(page, label) {
  const sizes = await page.evaluate(() => ({
    body: [...document.querySelectorAll(
      ".journey-reading__lead, .journey-reading__ledger p:last-child, .journey-state p",
    )]
      .filter((element) => element.getBoundingClientRect().height > 0)
      .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
    metadata: [...document.querySelectorAll(
      ".journey-stage__eyebrow, .journey-section-label, .journey-expert-link span",
    )]
      .filter((element) => element.getBoundingClientRect().height > 0)
      .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
  }));
  assert.ok(sizes.body.every((size) => size >= 16), `${label}: texto normal menor a 16 px ${sizes.body}`);
  assert.ok(sizes.metadata.every((size) => size >= 14), `${label}: metadata menor a 14 px ${sizes.metadata}`);
}

await fs.mkdir(evidenceDirectory, { recursive: true });

await withDemoBrowser(
  async ({ browser, baseUrl }) => {
    for (const viewport of viewports) {
      for (const surface of surfaces) {
        const context = await browser.newContext({ viewport });
        const observed = await createObservedPage(context, baseUrl);
        const { page } = observed;
        await page.emulateMedia({ reducedMotion: "reduce" });
        await openSurface(page, baseUrl, surface);
        const label = `${viewport.name} ${surface.id}`;
        await assertNoHorizontalOverflow(page, label);
        await assertNoTruncation(page, surface.root, label);
        await assertContrast(page, "h1", `${label} título`);
        await assertContrast(page, surface.primary, `${label} CTA`);
        await assertFocusRing(page, surface.focus, label);
        await assertFocusedControlVisible(page, surface.focus, label);
        await assertReducedMotion(page, surface, label);
        if (viewport.width <= 620) await assertTargets(page, surface.root, label);
        if (surface.kind === "journey") {
          await assertJourneyDensity(page, surface, viewport, label);
          await assertJourneyTypography(page, label);
          await assertContrast(page, ".journey-stage__eyebrow", `${label} metadata`);
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await settleUi(page);
        await capture(
          page,
          `${surface.id}-${viewport.width}x${viewport.height}.png`,
          surface,
          `${viewport.width}x${viewport.height}`,
        );
        assertClean(observed, label);
        await context.close();
      }
    }
  },
  { port: 4365 },
);

await withDemoBrowser(
  async ({ browser, baseUrl }) => {
    for (const surface of surfaces) {
      const context = await browser.newContext({
        deviceScaleFactor: 2,
        viewport: { width: 1440, height: 900 },
      });
      const observed = await createObservedPage(context, baseUrl);
      const { page } = observed;
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openSurface(page, baseUrl, surface);
      const control = page.locator(surface.focus).first();
      await control.focus();
      await page.setViewportSize({ width: 720, height: 450 });
      await settleUi(page);
      const label = `zoom-200 ${surface.id}`;
      assert.deepEqual(
        await page.evaluate(() => ({
          devicePixelRatio: window.devicePixelRatio,
          innerHeight: window.innerHeight,
          innerWidth: window.innerWidth,
        })),
        { devicePixelRatio: 2, innerHeight: 450, innerWidth: 720 },
        `${label}: densidad del viewport`,
      );
      assert.equal(
        await control.evaluate((element) => document.activeElement === element),
        true,
        `${label}: foco no preservado`,
      );
      await assertFocusedControlVisible(page, surface.focus, label);
      await assertNoHorizontalOverflow(page, label);
      await assertNoTruncation(page, surface.root, label);
      await assertTargets(page, surface.root, label);
      await assertContrast(page, "h1", `${label} título`);
      await assertContrast(page, surface.primary, `${label} CTA`);
      await assertReducedMotion(page, surface, label);
      if (surface.kind === "journey") {
        await assertJourneyDensity(page, surface, { width: 720, height: 450 }, label);
        await assertJourneyTypography(page, label);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await settleUi(page);
      await capture(page, `${surface.id}-zoom-200.png`, surface, "zoom-200");
      assertClean(observed, label);
      await context.close();
    }
  },
  { port: 4366 },
);

await withDemoBrowser(
  async ({ browser, baseUrl }) => {
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

    const primary = page.locator(".journey-primary-action");
    await primary.focus();
    await page.keyboard.press("Enter");
    await page.locator('[data-journey-stage="geography"]').waitFor({ state: "visible" });
    assert.equal(await page.locator("#journey-title").evaluate((element) => document.activeElement === element), true);

    const stageSelector = page.locator(".journey-rail__mobile");
    const summary = stageSelector.locator(":scope > summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    assert.notEqual(await stageSelector.getAttribute("open"), null);
    await page.keyboard.press("Enter");
    assert.equal(await stageSelector.getAttribute("open"), null);
    assert.equal(await summary.evaluate((element) => document.activeElement === element), true);
    assertClean(observed, "teclado móvil recorrido");
    await context.close();
  },
  { port: 4367 },
);

assert.equal(manifest.length, surfaces.length * 4, "Se esperan 14 superficies × 3 viewports + zoom 200%");
await fs.writeFile(
  path.join(evidenceDirectory, "manifest.json"),
  `${JSON.stringify(
    {
      step: "P6-13",
      surfaces: surfaces.map(({ id, kind, path: routePath }) => ({ id, kind, path: routePath })),
      viewports,
      zoom: { deviceScaleFactor: 2, viewport: { width: 720, height: 450 } },
      files: manifest,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  "Phase 6 responsive OK: 14 superficies × 3 viewports, zoom 200%, teclado, foco, 44×44, AA, reduced motion y cero overflow/truncamiento.",
);
