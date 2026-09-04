import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  createObservedPage,
  openPath,
  openRoute,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";

const evidenceDir = process.env.EVIDENCE_DIR
  ? path.resolve(process.env.EVIDENCE_DIR)
  : null;
const publicData = JSON.parse(
  await fs.readFile(
    new URL("../../../data/generated/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const routes = [
  { id: "activity", root: ".history-view" },
  { id: "assistant", root: ".assistant-workbench" },
];
const emptyRadiusPath =
  "/?sv=1&scope=radius&lat=-12.000000&lon=-77.000000&radius=500";

function assertClean(observed, label) {
  assert.deepEqual(observed.problems, [], `${label}: errores de navegador`);
  assert.deepEqual(
    observed.externalRequests,
    [],
    `${label}: solicitudes externas no autorizadas`,
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

async function restoreAuthoredMotionStyles(page) {
  await page.evaluate(() => {
    for (const style of document.head.querySelectorAll("style")) {
      if (style.textContent?.includes("caret-color: transparent")) style.remove();
    }
  });
}

async function capture(page, filename) {
  if (!evidenceDir) return;
  await fs.mkdir(evidenceDir, { recursive: true });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await settleUi(page);
  await page.screenshot({
    path: path.join(evidenceDir, filename),
    fullPage: true,
  });
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    offenders: [...document.querySelectorAll("body *")]
      .map((element) => {
        const box = element.getBoundingClientRect();
        return {
          name: element.id ||
            (typeof element.className === "string" ? element.className : element.tagName),
          right: Math.round(box.right),
        };
      })
      .filter(({ right }) => right > window.innerWidth + 1)
      .sort((a, b) => b.right - a.right)
      .slice(0, 5),
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(
    dimensions.scrollWidth <= dimensions.clientWidth + 1,
    `${label}: overflow ${dimensions.scrollWidth}/${dimensions.clientWidth}; ${JSON.stringify(dimensions.offenders)}`,
  );
}

async function contrastRatio(page, selector) {
  return page.locator(selector).first().evaluate((element) => {
    const parse = (value) => {
      const match = String(value).match(
        /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/u,
      );
      return match
        ? [
            Number(match[1]),
            Number(match[2]),
            Number(match[3]),
            match[4] === undefined ? 1 : Number(match[4]),
          ]
        : [0, 0, 0, 1];
    };
    const over = (foreground, background) => {
      const alpha = foreground[3] + background[3] * (1 - foreground[3]);
      return [
        (foreground[0] * foreground[3] +
          background[0] * background[3] * (1 - foreground[3])) /
          alpha,
        (foreground[1] * foreground[3] +
          background[1] * background[3] * (1 - foreground[3])) /
          alpha,
        (foreground[2] * foreground[3] +
          background[2] * background[3] * (1 - foreground[3])) /
          alpha,
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
        const linear =
          normalized <= 0.04045
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

async function assertTextContrast(page, selector, label, minimum = 4.5) {
  const ratio = await contrastRatio(page, selector);
  assert.ok(
    ratio >= minimum,
    `${label}: contraste ${ratio.toFixed(2)}:1, mínimo ${minimum}:1`,
  );
}

async function assertFocusRing(page, selector, label) {
  const control = page.locator(selector).first();
  await control.focus();
  const style = await control.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      active: document.activeElement === element,
      boxShadow: computed.boxShadow,
      outlineColor: computed.outlineColor,
      outlineStyle: computed.outlineStyle,
      outlineWidth: Number.parseFloat(computed.outlineWidth),
    };
  });
  assert.equal(style.active, true, `${label}: no recibe foco`);
  assert.ok(
    style.outlineWidth >= 3 && style.outlineStyle !== "none",
    `${label}: foco visible insuficiente`,
  );
  assert.match(style.outlineColor, /rgb\(255,\s*255,\s*255\)/u);
  assert.match(style.boxShadow, /rgb\(32,\s*32,\s*34\)/u);
}

async function assertTargets(page, root, label) {
  const undersized = await page
    .locator(`${root} :is(button, select, summary, textarea, a)`)
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            box.width > 0 &&
            box.height > 0
          );
        })
        .map((element) => {
          const box = element.getBoundingClientRect();
          return {
            height: Math.round(box.height),
            name: element.id || element.className || element.tagName,
            width: Math.round(box.width),
          };
        })
        .filter(({ height, width }) => height < 44 || width < 44),
    );
  assert.deepEqual(undersized, [], `${label}: objetivos táctiles menores a 44×44`);
}

async function assertTypography(page, route, label) {
  const selector = route === "activity"
    ? ".history-hero p, .history-state p, .history-signal__reason"
    : ".assistant-intro__copy > p, .assistant-copy, .assistant-empty p";
  const undersizedBody = await page.locator(selector).evaluateAll((elements) =>
    elements
      .filter((element) => element.getBoundingClientRect().height > 0)
      .map((element) => ({
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
        text: element.textContent?.trim(),
      }))
      .filter(({ fontSize }) => fontSize < 16),
  );
  assert.deepEqual(undersizedBody, [], `${label}: cuerpo por debajo de 16 px`);

  const metadataSelector = route === "activity"
    ? ".history-eyebrow, .history-quality-item summary > span:first-child, .history-signal__date span, .history-signal__agency, .history-agenda__provenance"
    : ".assistant-mode, .assistant-step, .assistant-scenario dt, .assistant-question span, .assistant-reference-list :is(span, small)";
  const undersizedMetadata = await page
    .locator(metadataSelector)
    .evaluateAll((elements) =>
      elements
        .filter((element) => element.getBoundingClientRect().height > 0)
        .map((element) => ({
          fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
          text: element.textContent?.trim(),
        }))
        .filter(({ fontSize }) => fontSize < 14),
    );
  assert.deepEqual(undersizedMetadata, [], `${label}: metadata por debajo de 14 px`);
}

async function assertNoTruncation(page, route, label) {
  const selector = route === "activity"
    ? ".history-signal__heading h4, .history-signal__reason, .history-evidence strong"
    : ".assistant-question, .assistant-reference-list strong, .assistant-copy, .assistant-change-row strong";
  const clipped = await page.locator(selector).evaluateAll((elements) =>
    elements
      .filter((element) => element.getBoundingClientRect().height > 0)
      .map((element) => {
        const style = getComputedStyle(element);
        const dimensionsOverflow =
          element.scrollWidth > element.clientWidth + 2 ||
          element.scrollHeight > element.clientHeight + 2;
        return {
          clipped:
            dimensionsOverflow &&
            [style.overflow, style.overflowX, style.overflowY].some((value) =>
              ["hidden", "clip"].includes(value),
            ),
          text: element.textContent?.trim(),
          textOverflow: style.textOverflow,
          whiteSpace: style.whiteSpace,
        };
      })
      .filter(
        ({ clipped: isClipped, textOverflow }) =>
          isClipped || textOverflow === "ellipsis",
      ),
  );
  assert.deepEqual(clipped, [], `${label}: texto truncado`);
}

async function assertReducedMotion(page, selector, label) {
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

async function assertFocusedControlVisible(page, selector, label) {
  const control = page.locator(selector).first();
  await control.scrollIntoViewIfNeeded();
  await settleUi(page);
  const geometry = await control.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const overlaps = [...document.querySelectorAll("body *")]
      .filter((candidate) => {
        if (
          candidate === element ||
          candidate.contains(element) ||
          element.contains(candidate)
        ) {
          return false;
        }
        const style = getComputedStyle(candidate);
        if (!["fixed", "sticky"].includes(style.position)) return false;
        const box = candidate.getBoundingClientRect();
        return !(
          box.right <= rect.left ||
          box.left >= rect.right ||
          box.bottom <= rect.top ||
          box.top >= rect.bottom
        );
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
    geometry.top >= 0 && geometry.bottom <= geometry.viewportHeight + 1,
    `${label}: control fuera del alto visible ${JSON.stringify(geometry)}`,
  );
  assert.ok(
    geometry.left >= 0 && geometry.right <= geometry.viewportWidth + 1,
    `${label}: control fuera del ancho visible ${JSON.stringify(geometry)}`,
  );
  assert.deepEqual(geometry.overlaps, [], `${label}: control cubierto por UI fija`);
}

async function assertRouteDensity(page, route, viewport) {
  const metrics = await page.evaluate((routeId) => {
    const root = document.querySelector(
      routeId === "activity" ? ".history-view" : ".assistant-workbench",
    );
    const lead = document.querySelector(
      routeId === "activity" ? ".history-hero" : ".assistant-intro",
    );
    const columns = (selector) => {
      const element = document.querySelector(selector);
      return element
        ? getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length
        : 0;
    };
    return {
      leadTop: lead?.getBoundingClientRect().top,
      queryColumns: columns(".assistant-query"),
      qualityColumns: columns(".history-quality-band"),
      rootWidth: root?.getBoundingClientRect().width,
      viewportWidth: window.innerWidth,
    };
  }, route);
  assert.ok(Number.isFinite(metrics.leadTop), `${route}: contenido principal no renderizado`);
  assert.ok(metrics.rootWidth <= metrics.viewportWidth + 1, `${route}: raíz más ancha que viewport`);
  if (route === "activity") {
    assert.equal(
      metrics.qualityColumns,
      viewport.width <= 620 ? 1 : viewport.width <= 900 ? 2 : 4,
      `${route}: densidad inesperada en la banda de calidad`,
    );
  } else {
    assert.equal(
      metrics.queryColumns,
      viewport.width <= 900 ? 1 : 2,
      `${route}: densidad inesperada en consulta`,
    );
  }
}

async function assertScenarioLegibility(page, viewport, label) {
  const result = await page.evaluate(() => {
    const metadata = [...document.querySelectorAll(
      ".scenario-summary__metrics dt, .scenario-technical:open .scenario-status strong, .scenario-technical:open .scenario-status small, .scenario-technical:open .scenario-share span",
    )]
      .filter((element) => element.getBoundingClientRect().height > 0)
      .map((element) => ({
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
        text: element.textContent?.trim(),
      }))
      .filter(({ fontSize }) => fontSize < 14);
    const metrics = document.querySelector(".scenario-summary__metrics");
    const technical = document.querySelector(".scenario-technical");
    return {
      columns: getComputedStyle(metrics).gridTemplateColumns.split(" ").filter(Boolean).length,
      metadata,
      technicalClosed: technical ? !technical.open : null,
    };
  });
  const expectedColumns = viewport.width <= 620 ? 1 : 3;
  assert.equal(result.columns, expectedColumns, `${label}: densidad de la lente territorial`);
  assert.deepEqual(result.metadata, [], `${label}: metadata territorial por debajo de 14 px`);
  assert.equal(result.technicalClosed, true, `${label}: detalle técnico cerrado al cargar`);
}

async function openReadyRoute(page, baseUrl, route) {
  await openRoute(page, baseUrl, route);
  if (route === "activity") {
    await page.locator('[data-history-status="ready"]').waitFor();
    return;
  }
  await page.locator(".assistant-question").first().click();
  await page.locator("#assistant-input").press("Control+Enter");
  await page.locator('[data-assistant-response="ready"]').waitFor();
}

await withDemoBrowser(
  async ({ browser, baseUrl }) => {
    for (const viewport of viewports) {
      for (const route of routes) {
        const context = await browser.newContext({ viewport });
        const observed = await createObservedPage(context, baseUrl);
        const { page } = observed;
        await page.emulateMedia({ reducedMotion: "reduce" });
        await openReadyRoute(page, baseUrl, route.id);
        await restoreAuthoredMotionStyles(page);
        await settleUi(page);
        await assertNoHorizontalOverflow(page, `${viewport.name} ${route.id}`);
        await assertTypography(page, route.id, `${viewport.name} ${route.id}`);
        await assertNoTruncation(page, route.id, `${viewport.name} ${route.id}`);
        await assertRouteDensity(page, route.id, viewport);
        await assertScenarioLegibility(page, viewport, `${viewport.name} ${route.id}`);
        if (viewport.width <= 900) {
          await assertTargets(page, route.root, `${viewport.name} ${route.id}`);
        }
        if (route.id === "activity") {
          await assertTextContrast(page, ".history-hero h2", `${viewport.name} historial título`);
          await assertTextContrast(page, ".history-status", `${viewport.name} historial estado`);
          await assertTextContrast(page, ".history-action--primary", `${viewport.name} historial CTA`);
          await assertFocusRing(page, "[data-history-event]", `${viewport.name} historial evidencia`);
          await assertReducedMotion(page, "#history-status-filter", `${viewport.name} historial`);
        } else {
          await assertTextContrast(page, ".assistant-intro h2", `${viewport.name} asistente título`);
          await assertTextContrast(page, ".assistant-response__status", `${viewport.name} asistente estado`);
          await assertTextContrast(page, ".assistant-next-action span", `${viewport.name} asistente CTA`);
          await assertFocusRing(page, "#assistant-input", `${viewport.name} asistente consulta`);
          await assertReducedMotion(page, "#assistant-input", `${viewport.name} asistente`);
        }
        await capture(page, `${route.id}-${viewport.width}x${viewport.height}.png`);
        assertClean(observed, `${viewport.name} ${route.id}`);
        await context.close();
      }
    }
  },
  { port: 4185 },
);

await withDemoBrowser(
  async ({ browser, baseUrl }) => {
    for (const route of routes) {
      const context = await browser.newContext({
        deviceScaleFactor: 2,
        viewport: { width: 1440, height: 900 },
      });
      const observed = await createObservedPage(context, baseUrl);
      const { page } = observed;
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openReadyRoute(page, baseUrl, route.id);
      await restoreAuthoredMotionStyles(page);
      const focusSelector = route.id === "activity"
        ? "[data-history-event]"
        : "#assistant-input";
      await page.locator(focusSelector).first().focus();
      await page.setViewportSize({ width: 720, height: 450 });
      await settleUi(page);
      assert.deepEqual(
        await page.evaluate(() => ({
          devicePixelRatio: window.devicePixelRatio,
          innerHeight: window.innerHeight,
          innerWidth: window.innerWidth,
        })),
        { devicePixelRatio: 2, innerHeight: 450, innerWidth: 720 },
        `${route.id}: simulación 200%`,
      );
      assert.equal(
        await page.locator(focusSelector).first().evaluate(
          (element) => document.activeElement === element,
        ),
        true,
        `${route.id}: el foco no sobrevivió al reflow`,
      );
      await assertFocusedControlVisible(page, focusSelector, `${route.id} zoom 200%`);
      await assertNoHorizontalOverflow(page, `${route.id} zoom 200%`);
      await assertTargets(page, route.root, `${route.id} zoom 200%`);
      await assertNoTruncation(page, route.id, `${route.id} zoom 200%`);
      await assertRouteDensity(page, route.id, { width: 720, height: 450 });
      await assertScenarioLegibility(
        page,
        { width: 720, height: 450 },
        `${route.id} zoom 200%`,
      );
      await capture(page, `${route.id}-zoom-200.png`);
      assertClean(observed, `${route.id} zoom 200%`);
      await context.close();
    }
  },
  { port: 4187 },
);

await withDemoBrowser(
  async ({ browser, baseUrl }) => {
    const keyboardContext = await browser.newContext({ viewport: viewports[0] });
    const keyboardObserved = await createObservedPage(keyboardContext, baseUrl);
    const page = keyboardObserved.page;
    await openRoute(page, baseUrl, "activity");
    const signal = page.locator("[data-history-event]").first();
    const signalId = await signal.getAttribute("id");
    await signal.focus();
    await page.keyboard.press("Enter");
    await page.locator(".history-detail").waitFor();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(".history-detail").count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement?.id), signalId);

    await page.locator('[data-view="assistant"]').first().click();
    const suggestion = page.locator(".assistant-question").nth(1);
    await suggestion.focus();
    await page.keyboard.press("Enter");
    assert.equal(
      await page.locator("#assistant-input").evaluate(
        (element) => document.activeElement === element,
      ),
      true,
    );
    await page.keyboard.press("Control+Enter");
    await page.locator('[data-assistant-response="ready"]').waitFor();
    assert.equal(
      await page.locator("#assistant-response-title").evaluate(
        (element) => document.activeElement === element,
      ),
      true,
    );
    const historyReference = page
      .locator('[data-assistant-reference-route="activity"]')
      .first();
    await historyReference.focus();
    await page.keyboard.press("Enter");
    await page.locator(".history-detail").waitFor();
    assert.equal(new URL(page.url()).hash, "#activity");
    await page.goBack({ waitUntil: "networkidle" });
    await page.locator('[data-assistant-response="ready"]').waitFor();
    assert.equal(new URL(page.url()).hash, "#assistant");
    assertClean(keyboardObserved, "recorrido completo por teclado");
    await keyboardContext.close();

    const emptyContext = await browser.newContext({ viewport: viewports[2] });
    const emptyObserved = await createObservedPage(emptyContext, baseUrl);
    await openPath(emptyObserved.page, baseUrl, `${emptyRadiusPath}#activity`);
    await emptyObserved.page.locator(".history-state--empty").waitFor();
    await capture(emptyObserved.page, "activity-empty-390x844.png");
    await assertNoHorizontalOverflow(emptyObserved.page, "historial vacío móvil");
    assertClean(emptyObserved, "historial vacío móvil");
    await emptyContext.close();

    const reviewableContext = await browser.newContext({ viewport: viewports[1] });
    const reviewableObserved = await createObservedPage(reviewableContext, baseUrl);
    await openRoute(reviewableObserved.page, baseUrl, "activity");
    await reviewableObserved.page.locator('[data-history-status="ready"]').waitFor();
    const reviewableDistricts = new Set(
      publicData.history.events
        .filter(({ status }) => status === "reviewable")
        .map(({ district_id: districtId }) => districtId),
    );
    const districtOptions = await reviewableObserved.page
      .locator("#top-district option")
      .evaluateAll((options) => options.map(({ value }) => value));
    const reviewableDistrict = districtOptions.find((value) =>
      reviewableDistricts.has(value),
    );
    assert.ok(reviewableDistrict, "debe existir un distrito visible con señal por revisar");
    await reviewableObserved.page
      .locator("#top-district")
      .selectOption(reviewableDistrict);
    await reviewableObserved.page.waitForFunction(
      (districtId) => document.querySelector("#top-district")?.value === districtId,
      reviewableDistrict,
    );
    await reviewableObserved.page.locator('[data-history-status="ready"]').waitFor();
    await reviewableObserved.page.locator("#history-status-filter").selectOption("reviewable");
    assert.ok(
      (await reviewableObserved.page.locator("[data-history-row]").count()) > 0,
      "el estado solo por revisar debe tener una señal observable",
    );
    await capture(reviewableObserved.page, "activity-reviewable-1280x720.png");
    await assertNoHorizontalOverflow(reviewableObserved.page, "historial por revisar");
    assertClean(reviewableObserved, "historial por revisar");
    await reviewableContext.close();

    const refusalContext = await browser.newContext({ viewport: viewports[2] });
    const refusalObserved = await createObservedPage(refusalContext, baseUrl);
    await openRoute(refusalObserved.page, baseUrl, "assistant");
    await refusalObserved.page
      .locator("#assistant-input")
      .fill("¿Cuál es el precio real de cierre del competidor?");
    await refusalObserved.page.locator("#assistant-input").press("Control+Enter");
    await refusalObserved.page.locator('[data-assistant-response="refused"]').waitFor();
    await assertTextContrast(
      refusalObserved.page,
      ".assistant-response__status",
      "CT-F estado de cautela",
    );
    await capture(refusalObserved.page, "assistant-ct-f-390x844.png");
    await assertNoHorizontalOverflow(refusalObserved.page, "asistente CT-F móvil");
    assertClean(refusalObserved, "asistente CT-F móvil");
    await refusalContext.close();

    const legacyData = structuredClone(publicData);
    legacyData.metadata.contract_version = "2.3.0";
    delete legacyData.history;
    delete legacyData.assistant;
    for (const route of routes) {
      const legacyContext = await browser.newContext({ viewport: viewports[1] });
      const legacyObserved = await createObservedPage(legacyContext, baseUrl);
      await legacyObserved.page.route("**/demo-data/viva-platform-demo.json", async (request) => {
        await request.fulfill({
          status: 200,
          contentType: "application/json; charset=utf-8",
          body: JSON.stringify(legacyData),
        });
      });
      await openRoute(legacyObserved.page, baseUrl, route.id);
      if (route.id === "activity") {
        await legacyObserved.page
          .locator('[data-history-status="contract_unavailable"]')
          .waitFor();
      } else {
        await legacyObserved.page.locator(".assistant-question").first().click();
        await legacyObserved.page.locator("#assistant-input").press("Control+Enter");
        await legacyObserved.page
          .locator('[data-assistant-response="contract_unavailable"]')
          .waitFor();
      }
      await capture(legacyObserved.page, `${route.id}-legacy-1280x720.png`);
      await assertNoHorizontalOverflow(legacyObserved.page, `${route.id} legacy`);
      assertClean(legacyObserved, `${route.id} legacy`);
      await legacyContext.close();
    }
  },
  { port: 4188 },
);

console.log(
  "Phase 5 responsive OK: 1440×900, 1280×720, 390×844, teclado, contraste AA, densidad y reflow 200% verificados.",
);
