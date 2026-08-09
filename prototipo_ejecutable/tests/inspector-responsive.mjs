import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  createObservedPage,
  openPath,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";

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

const ledgerOrder = [
  "area",
  "floor_unit",
  "model",
  "bedrooms",
  "bathrooms",
];

function withHash(pathname, hash) {
  const url = new URL(pathname, "http://inspector.test");
  url.hash = hash;
  return `${url.pathname}${url.search}${url.hash}`;
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

async function assertNoHorizontalOverflow(page, label, selector = null) {
  const dimensions = await page.evaluate((targetSelector) => {
    const target = targetSelector
      ? document.querySelector(targetSelector)
      : document.documentElement;
    return target
      ? {
          clientWidth: target.clientWidth,
          offenders:
            targetSelector === null
              ? [...document.querySelectorAll("body *")]
                  .map((element) => {
                    const box = element.getBoundingClientRect();
                    return {
                      className:
                        typeof element.className === "string"
                          ? element.className
                          : "",
                      id: element.id,
                      right: Math.round(box.right),
                      tag: element.tagName,
                    };
                  })
                  .filter((item) => item.right > window.innerWidth + 1)
                  .sort((a, b) => b.right - a.right)
                  .slice(0, 5)
              : [],
          scrollWidth: target.scrollWidth,
        }
      : null;
  }, selector);
  assert.ok(dimensions, `${label}: no se encontró ${selector}`);
  assert.ok(
    dimensions.scrollWidth <= dimensions.clientWidth + 1,
    `${label}: overflow horizontal ${dimensions.scrollWidth}/${dimensions.clientWidth}; ${JSON.stringify(dimensions.offenders)}`,
  );
}

async function assertInsideViewport(page, selector, label) {
  const result = await page.locator(selector).first().evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      height: box.height,
      left: box.left,
      right: box.right,
      viewportWidth: window.innerWidth,
      width: box.width,
    };
  });
  assert.ok(result.width > 0 && result.height > 0, `${label}: tamaño nulo`);
  assert.ok(result.left >= -1, `${label}: recorte por la izquierda`);
  assert.ok(
    result.right <= result.viewportWidth + 1,
    `${label}: recorte por la derecha`,
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
    const luminance = (color) => {
      const channels = color.slice(0, 3).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return (
        0.2126 * channels[0] +
        0.7152 * channels[1] +
        0.0722 * channels[2]
      );
    };
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
    style.outlineWidth >= 2 && style.outlineStyle !== "none",
    `${label}: outline insuficiente`,
  );
  assert.match(style.outlineColor, /rgb\(255,\s*255,\s*255\)/u);
  assert.match(style.boxShadow, /rgb\(32,\s*32,\s*34\)/u);
}

async function assertMetadataClosed(page, label) {
  const metadata = page.locator("details[data-inspector-metadata]");
  assert.equal(await metadata.count(), 1, `${label}: metadata única`);
  assert.equal(
    await metadata.evaluate((element) => element.open),
    false,
    `${label}: metadata cerrada al cargar`,
  );
}

async function assertInspectorSemantics(page, provenance, label) {
  const rows = page.locator("[data-inspector-ledger-row]");
  assert.deepEqual(
    await rows.evaluateAll((elements) =>
      elements.map((element) => element.dataset.inspectorLedgerRow),
    ),
    ledgerOrder,
    `${label}: orden de ledger`,
  );
  assert.equal(
    await page.locator("[data-inspector-primary]").count(),
    1,
    `${label}: debe existir una sola siguiente acción`,
  );
  assert.equal(
    await page.locator(".inspector-primary-action").count(),
    1,
    `${label}: debe existir una sola CTA primaria`,
  );
  assert.equal(
    await page.locator("[data-inspector-primary]:visible").count(),
    1,
    `${label}: la siguiente acción debe ser visible`,
  );
  assert.equal(
    await page
      .locator(".inspector-view")
      .getAttribute("data-inspector-provenance"),
    provenance,
    `${label}: procedencia del expediente`,
  );
  const ledgerProvenance = page.locator(".inspector-ledger-provenance");
  assert.equal(await ledgerProvenance.isVisible(), true);
  assert.match(await ledgerProvenance.innerText(), new RegExp(provenance, "u"));
  await assertMetadataClosed(page, label);
}

async function assertLayout(page, viewport) {
  assert.equal(
    await page.evaluate(() => CSS.supports("selector(:has(*))")),
    true,
    `${viewport.name}: soporte de :has() requerido por la ruta`,
  );
  const technical = page.locator(".scenario-technical");
  assert.equal(
    await technical.evaluate((element) => element.open),
    false,
    `${viewport.name}: detalle técnico cerrado al cargar`,
  );
  const cutoff = page.locator(".scenario-technical__facts dd").first();
  assert.equal(
    await cutoff.isVisible(),
    false,
    `${viewport.name}: fecha de corte bajo demanda`,
  );
  assert.match(await cutoff.textContent(), /corte/iu);
  await assertNoHorizontalOverflow(page, viewport.name);
  await assertNoHorizontalOverflow(page, viewport.name, ".inspector-view");
  await assertNoHorizontalOverflow(page, viewport.name, ".inspector-ledger");
  for (const selector of [
    "#inspector-project-selector",
    "#inspector-typology-selector",
    "#inspector-case-selector",
    "#inspector-primary-action",
    "#inspector-row-area",
  ]) {
    await assertInsideViewport(page, selector, `${viewport.name} ${selector}`);
  }

  const receiptGeometry = await page.evaluate(() => {
    const rect = (selector) => {
      const box = document.querySelector(selector)?.getBoundingClientRect();
      return box
        ? {
            bottom: box.bottom,
            left: box.left,
            right: box.right,
            top: box.top,
            width: box.width,
          }
        : null;
    };
    const regions = [
      rect(".scenario-summary__heading"),
      rect(".scenario-summary__metrics"),
      rect(".scenario-summary__statuses"),
    ];
    const overlaps = [];
    for (let first = 0; first < regions.length; first += 1) {
      for (let second = first + 1; second < regions.length; second += 1) {
        const a = regions[first];
        const b = regions[second];
        if (
          a &&
          b &&
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
        ) {
          overlaps.push([first, second]);
        }
      }
    }
    const metricOverflow = [
      ...document.querySelectorAll(".scenario-summary__metrics > div"),
    ].map((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    return { metricOverflow, overlaps };
  });
  assert.deepEqual(
    receiptGeometry.overlaps,
    [],
    `${viewport.name}: regiones del recibo territorial no deben solaparse`,
  );
  assert.ok(
    receiptGeometry.metricOverflow.every(
      ({ clientWidth, scrollWidth }) => scrollWidth <= clientWidth + 1,
    ),
    `${viewport.name}: métricas territoriales sin recorte`,
  );

  if (viewport.width >= 901) {
    const ledgerGeometry = await page.evaluate(() => {
      const shell = document
        .querySelector(".inspector-ledger-shell")
        ?.getBoundingClientRect();
      const ledger = document
        .querySelector(".inspector-ledger")
        ?.getBoundingClientRect();
      return shell && ledger
        ? {
            leftDelta: Math.abs(shell.left - ledger.left),
            widthDelta: Math.abs(shell.width - ledger.width),
          }
        : null;
    });
    assert.ok(ledgerGeometry, `${viewport.name}: geometría del ledger`);
    assert.ok(
      ledgerGeometry.leftDelta <= 1 && ledgerGeometry.widthDelta <= 1,
      `${viewport.name}: ledger debe ocupar todo el ancho del módulo`,
    );
  }

  const selectorBoxes = await page
    .locator(".inspector-selectors select")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { height: box.height, left: box.left, top: box.top };
      }),
    );
  if (viewport.width <= 760) {
    assert.ok(
      selectorBoxes.every(
        (box, index) =>
          index === 0 ||
          (Math.abs(box.left - selectorBoxes[0].left) <= 1 &&
            box.top > selectorBoxes[index - 1].top),
      ),
      `${viewport.name}: selectores en una columna`,
    );
    const cellTops = await page
      .locator('[data-inspector-ledger-row="area"] .inspector-ledger-cell')
      .evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().top),
      );
    assert.ok(
      cellTops.every(
        (top, index) => index === 0 || top > cellTops[index - 1],
      ),
      `${viewport.name}: ledger apilado en orden de lectura`,
    );
    const undersizedTargets = await page
      .locator(
        ".scenario-bar :is(button, select, summary), .scenario-summary summary, .inspector-view :is(button, select, summary, a.inspector-primary-action)",
      )
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            const style = getComputedStyle(element);
            const box = element.getBoundingClientRect();
            return (
              style.visibility !== "hidden" &&
              style.display !== "none" &&
              box.width > 0 &&
              box.height > 0
            );
          })
          .map((element) => {
            const box = element.getBoundingClientRect();
            return {
              height: box.height,
              id: element.id || element.className,
              width: box.width,
            };
          })
          .filter((box) => box.width < 44 || box.height < 44),
      );
    assert.deepEqual(
      undersizedTargets,
      [],
      `${viewport.name}: objetivos táctiles de 44×44`,
    );
  } else {
    assert.ok(
      selectorBoxes.every(
        (box) => Math.abs(box.top - selectorBoxes[0].top) <= 1,
      ),
      `${viewport.name}: selectores en una fila`,
    );
  }

  if (viewport.name === "desktop" || viewport.name === "laptop") {
    const result = await page.evaluate(() => {
      const verdict = document.querySelector(".inspector-verdict");
      const action = document.querySelector("#inspector-primary-action");
      const positions = Object.fromEntries(
        [
          [".scenario-bar", "bar"],
          [".scenario-bar__heading", "barHeading"],
          [".scenario-bar__controls", "barControls"],
          [".scenario-bar__actions", "barActions"],
          [".scenario-summary", "summary"],
          [".scenario-summary__heading", "summaryHeading"],
          [".scenario-summary__metrics", "summaryMetrics"],
          [".scenario-summary__statuses", "summaryStatuses"],
          [".section-guide", "guide"],
          [".inspector-intro", "intro"],
          [".inspector-coverage", "coverage"],
          [".inspector-selection", "selection"],
          [".inspector-verdict", "verdict"],
        ].map(([selector, key]) => {
          const box = document.querySelector(selector)?.getBoundingClientRect();
          return [
            key,
            box
              ? {
                  bottom: Math.round(box.bottom),
                  height: Math.round(box.height),
                  top: Math.round(box.top),
                }
              : null,
          ];
        }),
      );
      return {
        actionBottom: action?.getBoundingClientRect().bottom,
        positions,
        scrollY: window.scrollY,
        verdictTop: verdict?.getBoundingClientRect().top,
        viewportHeight: window.innerHeight,
      };
    });
    assert.equal(result.scrollY, 0, `${viewport.name}: carga en el inicio`);
    assert.ok(
      result.actionBottom <= result.viewportHeight + 1,
      `${viewport.name}: veredicto/CTA fuera del primer viewport (${result.actionBottom}/${result.viewportHeight}); ${JSON.stringify(result.positions)}`,
    );
  }
}

async function assertCoreContrastAndFocus(page, label) {
  for (const [selector, name] of [
    ["#inspector-primary-action", "CTA"],
    [".inspector-module-help", "ayuda"],
    [".inspector-provenance", "procedencia"],
    [".inspector-verdict-meta", "metadata del veredicto"],
    [".inspector-ledger-provenance", "procedencia del ledger"],
    [".inspector-ledger-normalized", "valor normalizado"],
    [".inspector-ledger-origin", "origen"],
    [".inspector-status", "estado del veredicto"],
    [".inspector-verdict-flags span", "elegibilidad"],
  ]) {
    await assertTextContrast(page, selector, `${label} ${name}`);
  }
  await page.locator("#inspector-primary-action").hover();
  await assertTextContrast(page, "#inspector-primary-action", `${label} CTA hover`);
  for (const [selector, name] of [
    ["#inspector-project-selector", "selector"],
    ["#inspector-primary-action", "CTA"],
    ["details[data-inspector-metadata] summary", "metadata"],
    [".inspector-ledger-evidence", "evidencia"],
  ]) {
    await assertFocusRing(page, selector, `${label} ${name}`);
  }
}

await withDemoBrowser(
  async ({ browser, baseUrl }) => {
    const path = withHash(ctC.canonical_path, ctG.canonical_path);
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const observed = await createObservedPage(context, baseUrl);
      const { page } = observed;
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openPath(page, baseUrl, path);
      await page
        .locator('.inspector-view[data-inspector-state="ready"]')
        .waitFor({ state: "visible" });
      await assertInspectorSemantics(page, "Observado", viewport.name);
      await assertLayout(page, viewport);
      await assertCoreContrastAndFocus(page, viewport.name);
      assertClean(observed, viewport.name);
      await context.close();
    }
  },
  { port: 4183 },
);

await withDemoBrowser(
  async ({ browser, baseUrl }) => {
    const context = await browser.newContext({
      deviceScaleFactor: 2,
      viewport: { width: 1440, height: 900 },
    });
    const observed = await createObservedPage(context, baseUrl);
    const { page } = observed;
    await openPath(
      page,
      baseUrl,
      withHash(ctC.canonical_path, ctG.canonical_path),
    );
    const areaRow = page.locator("#inspector-row-area");
    await areaRow.scrollIntoViewIfNeeded();
    await areaRow.focus();
    await page.setViewportSize({ width: 720, height: 450 });
    await settleUi(page);
    assert.deepEqual(
      await page.evaluate(() => ({
        devicePixelRatio: window.devicePixelRatio,
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth,
      })),
      { devicePixelRatio: 2, innerHeight: 450, innerWidth: 720 },
      "zoom 200%: viewport CSS y densidad equivalentes al navegador",
    );
    assert.equal(
      await page.evaluate(() => document.activeElement?.id),
      "inspector-row-area",
      "zoom 200%: el foco debe sobrevivir al reflow",
    );
    await assertInspectorSemantics(page, "Observado", "zoom 200%");
    await assertLayout(page, {
      name: "zoom 200%",
      width: 720,
      height: 450,
    });
    const areaText = await areaRow.innerText();
    for (const value of ["104.15", "53.37", "50.78", "48.76%"]) {
      assert.match(areaText, new RegExp(value.replace(".", "\\."), "u"));
    }
    assertClean(observed, "zoom 200%");
    await context.close();
  },
  { port: 4184 },
);

await withDemoBrowser(
  async ({ browser, baseUrl }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const observed = await createObservedPage(context, baseUrl);
    const { page } = observed;
    await openPath(
      page,
      baseUrl,
      withHash(ctC.canonical_path, "#inspector/case/f3-ct-d-finishes"),
    );
    await assertInspectorSemantics(page, "Controlado", "CT-D");
    const trigger = page.locator(
      `#inspector-primary-action[data-inspector-evidence="${ctD.countertop.evidence_id}"]`,
    );
    await trigger.click();
    const dialog = page.locator("#inspector-evidence-dialog[open]");
    await dialog.waitFor({ state: "visible" });
    assert.equal(await dialog.getAttribute("aria-modal"), "true");
    assert.match(
      await dialog.locator(".inspector-section-label").innerText(),
      /controlado/iu,
    );
    assert.equal(
      await page.evaluate(() => document.activeElement?.id),
      "inspector-dialog-close",
    );
    await assertFocusRing(page, "#inspector-dialog-close", "cerrar diálogo");
    await assertTextContrast(
      page,
      ".inspector-evidence-mode",
      "modo de evidencia",
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await settleUi(page);
    assert.equal(
      await page.evaluate(() => document.activeElement?.id),
      "inspector-dialog-close",
      "el foco del diálogo sobrevive al reflow",
    );
    const dialogBox = await dialog.boundingBox();
    assert.ok(dialogBox);
    assert.ok(Math.abs(dialogBox.width - 390) <= 1);
    assert.ok(Math.abs(dialogBox.height - 844) <= 1);
    await assertNoHorizontalOverflow(
      page,
      "diálogo móvil",
      ".inspector-dialog-shell",
    );
    const closeBox = await page.locator("#inspector-dialog-close").boundingBox();
    assert.ok(closeBox.width >= 44 && closeBox.height >= 44);
    await page.keyboard.press("Escape");
    await page
      .locator("#inspector-evidence-dialog")
      .waitFor({ state: "detached" });
    assert.equal(
      await page.evaluate(() => document.activeElement?.id),
      "inspector-primary-action",
      "Escape devuelve el foco al activador",
    );
    assertClean(observed, "CT-D diálogo responsive");
    await context.close();
  },
  { port: 4185 },
);

console.log(
  "Inspector responsive OK: 3 viewports, reflow 200%, contraste, foco, densidad y diálogo.",
);
