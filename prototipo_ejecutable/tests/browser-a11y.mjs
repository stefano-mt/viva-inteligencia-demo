import assert from "node:assert/strict";
import { createObservedPage, openRoute, routes, viewports, withDemoBrowser } from "./helpers/demo-browser.mjs";

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of [viewports[0], viewports[2]]) {
    const context = await browser.newContext({ viewport });
    const { page, problems, externalRequests } = await createObservedPage(context, baseUrl);

    for (const route of routes) {
      await openRoute(page, baseUrl, route.id);
      assert.equal(await page.locator("main").count(), 1, `Debe existir un único main en #${route.id}`);
      assert.equal(await page.locator("nav[aria-label]").count(), 1, `Falta navegación etiquetada en #${route.id}`);

      const unnamedControls = await page.locator("button, input, select, textarea, summary, a[href]").evaluateAll((controls) =>
        controls
          .filter((control) => {
            const text = control.textContent?.trim();
            const label = control.getAttribute("aria-label");
            const labelledBy = control.getAttribute("aria-labelledby");
            const title = control.getAttribute("title");
            const associated = control.id ? document.querySelector(`label[for="${CSS.escape(control.id)}"]`)?.textContent?.trim() : "";
            const wrappingLabel = control.closest("label")?.textContent?.trim();
            const imageAlt = control.querySelector("img[alt]")?.getAttribute("alt");
            return !text && !label && !labelledBy && !title && !associated && !wrappingLabel && !imageAlt;
          })
          .map((control) => `${control.tagName.toLowerCase()}#${control.id || "(sin-id)"}.${control.className || "(sin-clase)"}`),
      );
      assert.deepEqual(unnamedControls, [], `Controles sin nombre accesible en #${route.id}: ${unnamedControls.join(", ")}`);

      const duplicateIds = await page.locator("[id]").evaluateAll((elements) => {
        const counts = new Map();
        for (const element of elements) counts.set(element.id, (counts.get(element.id) ?? 0) + 1);
        return [...counts.entries()].filter(([, count]) => count > 1).map(([id, count]) => `${id} (${count})`);
      });
      assert.deepEqual(duplicateIds, [], `IDs duplicados en #${route.id}: ${duplicateIds.join(", ")}`);

      if (route.id === "dashboard") {
        const markers = page.locator("[data-geo-point-id]");
        const markerIds = (await markers.evaluateAll((elements) => elements.map((element) => element.dataset.geoPointId))).sort();
        const optionIds = (await page.locator("#geo-project-select option").evaluateAll((options) => options.map((option) => option.value))).sort();
        assert.deepEqual(markerIds, optionIds, "Mapa y select nativo deben exponer exactamente los mismos IDs");
        assert.equal(await page.locator("#geo-project-select").evaluate((element) => element.tagName), "SELECT", "El fallback debe ser un select nativo");
        assert.deepEqual(
          await markers.evaluateAll((elements) =>
            elements
              .filter(
                (element) =>
                  element.getAttribute("aria-hidden") !== "true" ||
                  element.hasAttribute("role") ||
                  element.hasAttribute("tabindex"),
              )
              .map((element) => element.dataset.geoPointId),
          ),
          [],
          "Los puntos pointer-only deben quedar fuera del árbol y del orden de teclado",
        );
        assert.equal(await page.locator("#scenario-view-geographic").count(), 1, "El control geográfico debe tener ID estable único");
        assert.equal(await page.locator("#scenario-view-positioning").count(), 1, "El control de posicionamiento debe tener ID estable único");
      }
    }

    await openRoute(page, baseUrl, "dashboard");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("skip-link")), true, "El primer Tab debe enfocar el salto al contenido");
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => window.location.hash), "#main-content", "El salto debe llevar al contenido principal");
    assert.equal(await page.locator("#main-content").isVisible(), true, "El contenido principal debe permanecer visible");

    assert.deepEqual(problems, [], `Errores de navegador en accesibilidad ${viewport.name}:\n${problems.join("\n")}`);
    assert.deepEqual(externalRequests, [], `Solicitudes externas en accesibilidad ${viewport.name}:\n${externalRequests.join("\n")}`);
    await context.close();
  }
});

console.log(`A11y smoke OK: landmarks, nombres accesibles y teclado en ${routes.length} rutas.`);
