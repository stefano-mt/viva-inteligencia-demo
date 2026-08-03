import assert from "node:assert/strict";
import {
  createObservedPage,
  openPath,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";

const routes = [
  { id: "market", root: ".benchmark-view" },
  { id: "compare", root: ".comparison-shell" },
];

function assertClean(observed, label) {
  assert.deepEqual(
    observed.externalRequests,
    [],
    `Solicitudes externas durante ${label}:\n${observed.externalRequests.join("\n")}`,
  );
  assert.deepEqual(
    observed.problems,
    [],
    `Errores de navegador durante ${label}:\n${observed.problems.join("\n")}`,
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

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    offenders: [...document.querySelectorAll("body *")]
      .map((element) => {
        const box = element.getBoundingClientRect();
        return {
          className:
            typeof element.className === "string" ? element.className : "",
          right: Math.round(box.right),
          tag: element.tagName,
        };
      })
      .filter((item) => item.right > window.innerWidth + 1)
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
    `${label}: outline insuficiente`,
  );
  assert.match(style.outlineColor, /rgb\(255,\s*255,\s*255\)/u);
  assert.match(style.boxShadow, /rgb\(32,\s*32,\s*34\)/u);
}

async function assertTargets(page, root, label) {
  const undersized = await page
    .locator(
      `${root} :is(button, summary, a.comparison-row-link, a.benchmark-primary-action), .scenario-bar :is(button, select, summary), .scenario-summary summary`,
    )
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
  assert.deepEqual(undersized, [], `${label}: objetivos táctiles 44×44`);
}

async function assertNoComparisonTruncation(page, label) {
  const clipped = await page.locator(".comparison-chip strong").evaluateAll(
    (elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        return {
          clipped:
            element.scrollWidth > element.clientWidth + 1 ||
            element.scrollHeight > element.clientHeight + 1,
          overflow: style.overflow,
          text: element.textContent?.trim(),
          textOverflow: style.textOverflow,
          whiteSpace: style.whiteSpace,
        };
      }),
  );
  assert.equal(
    clipped.every(
      ({ clipped: isClipped, textOverflow, whiteSpace }) =>
        !isClipped && textOverflow !== "ellipsis" && whiteSpace !== "nowrap",
    ),
    true,
    `${label}: nombres comparables completos ${JSON.stringify(clipped)}`,
  );
}

async function assertReducedMotion(page, selector, label) {
  const style = await page.locator(selector).first().evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      animationName: computed.animationName,
      transitionDuration: computed.transitionDuration,
    };
  });
  assert.equal(style.animationName, "none", `${label}: animación activa`);
  assert.match(style.transitionDuration, /^(0s)(, 0s)*$/u, `${label}: transición activa`);
}

async function assertTerritorialTypography(page, label) {
  const undersized = await page
    .locator(
      ".scenario-bar__heading :is(.eyebrow, .view-context), .scenario-bar__meta, .scenario-summary__eligibility, .scenario-summary__metrics :is(dt, dd small), .scenario-status :is(.scenario-status__mark, strong), .scenario-share summary",
    )
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            box.width > 10 &&
            box.height > 10
          );
        })
        .map((element) => ({
          fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
          text: element.textContent?.trim(),
        }))
        .filter(({ fontSize }) => fontSize < 13),
    );
  assert.deepEqual(
    undersized,
    [],
    `${label}: metadata o control territorial por debajo de 13 px`,
  );
  const order = await page.evaluate(() => {
    const eyebrow = document
      .querySelector(".scenario-bar__heading .eyebrow")
      ?.getBoundingClientRect();
    const title = document
      .querySelector(".scenario-bar__heading .title-row")
      ?.getBoundingClientRect();
    const metadata = document.querySelector(".scenario-bar__meta")?.getBoundingClientRect();
    return {
      eyebrowBottom: eyebrow?.bottom,
      metadataTop: metadata?.top,
      titleBottom: title?.bottom,
      titleTop: title?.top,
      viewportWidth: window.innerWidth,
    };
  });
  assert.ok(
    order.eyebrowBottom <= order.titleTop + 1,
    `${label}: eyebrow superpuesto al título ${JSON.stringify(order)}`,
  );
  if (order.viewportWidth >= 901) {
    assert.ok(
      order.titleBottom <= order.metadataTop - 1,
      `${label}: metadata superpuesta al título ${JSON.stringify(order)}`,
    );
  }
}

async function assertMarket(page, viewport) {
  await page.locator('.benchmark-view[data-scenario-consumer="benchmark"]').waitFor();
  await assertTextContrast(page, ".benchmark-sheet__header h2", `${viewport.name} benchmark título`);
  await assertTextContrast(page, ".benchmark-evidence-line strong", `${viewport.name} benchmark evidencia`);
  await assertTextContrast(page, ".benchmark-primary-action", `${viewport.name} benchmark CTA`);
  await assertFocusRing(page, ".benchmark-primary-action", `${viewport.name} benchmark CTA`);
  await assertReducedMotion(page, ".benchmark-primary-action", `${viewport.name} benchmark`);
  if (viewport.name === "laptop") {
    const top = await page.locator(".benchmark-sheet__header").evaluate(
      (element) => element.getBoundingClientRect().top,
    );
    assert.ok(top < viewport.height, `laptop: benchmark inicia fuera del viewport (${top})`);
  }
  if (viewport.width <= 760) {
    await assertTargets(page, ".benchmark-view", `${viewport.name} benchmark`);
    assert.equal(
      await page.locator(".benchmark-quantile-strip").evaluate(
        (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length,
      ),
      1,
      `${viewport.name}: cuantiles apilados`,
    );
  }
}

async function assertCompare(page, viewport) {
  await page.locator('.comparison-shell[data-scenario-consumer="compare"]').waitFor();
  await assertNoComparisonTruncation(page, viewport.name);
  await assertTextContrast(page, ".comparison-hero h1", `${viewport.name} comparador título`);
  await assertTextContrast(page, ".comparison-finding__content > strong", `${viewport.name} conclusión`);
  await assertTextContrast(page, ".comparison-row-link", `${viewport.name} enlace de evidencia`);
  await assertFocusRing(page, ".comparison-selector > summary", `${viewport.name} selector`);
  await assertReducedMotion(page, ".comparison-selector > summary", `${viewport.name} comparador`);

  if (viewport.name === "desktop") {
    const head = page.locator(".comparison-project-head");
    await head.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 240));
    await settleUi(page);
    const geometry = await page.evaluate(() => {
      const bar = document.querySelector(".scenario-bar").getBoundingClientRect();
      const projectHead = document
        .querySelector(".comparison-project-head")
        .getBoundingClientRect();
      return {
        barBottom: bar.bottom,
        headTop: projectHead.top,
        position: getComputedStyle(
          document.querySelector(".comparison-project-head"),
        ).position,
      };
    });
    assert.equal(geometry.position, "sticky", "desktop: cabecera comparativa sticky");
    assert.ok(
      geometry.headTop >= geometry.barBottom - 1,
      `desktop: cabecera oculta ${JSON.stringify(geometry)}`,
    );
  }

  if (viewport.name === "laptop") {
    const layout = await page.evaluate(() => ({
      conclusionColumns: getComputedStyle(
        document.querySelector(".comparison-conclusion"),
      ).gridTemplateColumns.split(" ").length,
      findingWidths: [...document.querySelectorAll(".comparison-finding__content dd")].map(
        (element) => Math.round(element.getBoundingClientRect().width),
      ),
      heroTop: document.querySelector(".comparison-hero").getBoundingClientRect().top,
    }));
    assert.equal(layout.conclusionColumns, 1, "laptop: conclusión en una columna");
    assert.ok(layout.heroTop < viewport.height, `laptop: comparador inicia fuera del viewport (${layout.heroTop})`);
    assert.ok(
      layout.findingWidths.every((width) => width >= 140),
      `laptop: hallazgos comprimidos ${layout.findingWidths.join(", ")}`,
    );
  }

  if (viewport.width <= 760) {
    await assertTargets(page, ".comparison-shell", `${viewport.name} comparador`);
    assert.equal(
      await page.locator(".comparison-project-head").evaluate(
        (element) => getComputedStyle(element).display,
      ),
      "none",
      `${viewport.name}: cabecera ancha oculta`,
    );
    assert.equal(
      await page.locator(".comparison-cell__project").first().evaluate(
        (element) => getComputedStyle(element).display,
      ),
      "block",
      `${viewport.name}: cada valor identifica el proyecto`,
    );
    const selector = page.locator("details.comparison-selector");
    const summary = selector.locator(":scope > summary");
    await summary.click();
    const body = selector.locator(".comparison-selector__body");
    await body.waitFor({ state: "visible" });
    const box = await body.boundingBox();
    assert.ok(
      box.x >= 15 && box.x + box.width <= viewport.width - 15,
      `${viewport.name}: selector fuera del viewport ${JSON.stringify(box)}`,
    );
    await page.keyboard.press("Escape");
    assert.equal(await selector.getAttribute("open"), null);
    assert.equal(
      await summary.evaluate((element) => document.activeElement === element),
      true,
      `${viewport.name}: Escape devuelve foco`,
    );
  }
}

await withDemoBrowser(
  async ({ browser, baseUrl }) => {
    for (const viewport of viewports) {
      for (const route of routes) {
        const context = await browser.newContext({ viewport });
        const observed = await createObservedPage(context, baseUrl);
        const { page } = observed;
        await page.emulateMedia({ reducedMotion: "reduce" });
        await openPath(page, baseUrl, `/#${route.id}`);
        await assertNoHorizontalOverflow(page, `${viewport.name} ${route.id}`);
        await assertTerritorialTypography(page, `${viewport.name} ${route.id}`);
        if (route.id === "market") await assertMarket(page, viewport);
        else await assertCompare(page, viewport);
        assertClean(observed, `${viewport.name} ${route.id}`);
        await context.close();
      }
    }
  },
  { port: 4186 },
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
      await openPath(page, baseUrl, `/#${route.id}`);
      const focusSelector =
        route.id === "market"
          ? ".benchmark-primary-action"
          : "[data-comparison-row]";
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
        `${route.id} zoom 200%: densidad y viewport`,
      );
      assert.equal(
        await page.locator(focusSelector).first().evaluate(
          (element) => document.activeElement === element,
        ),
        true,
        `${route.id} zoom 200%: foco preservado`,
      );
      await assertNoHorizontalOverflow(page, `${route.id} zoom 200%`);
      await assertTargets(page, route.root, `${route.id} zoom 200%`);
      if (route.id === "compare") await assertNoComparisonTruncation(page, "zoom 200%");
      assertClean(observed, `${route.id} zoom 200%`);
      await context.close();
    }
  },
  { port: 4187 },
);

console.log(
  "Benchmark/Comparador responsive OK: 1440×900, 1280×720, 390×844, zoom 200%, contraste, foco y densidad.",
);
