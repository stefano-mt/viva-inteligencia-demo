import assert from "node:assert/strict";
import { observePage, openRoute, routes, viewports, withDemoBrowser } from "./helpers/demo-browser.mjs";

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of [viewports[0], viewports[2]]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const problems = observePage(page);

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
    }

    await openRoute(page, baseUrl, "dashboard");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("skip-link")), true, "El primer Tab debe enfocar el salto al contenido");
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => window.location.hash), "#main-content", "El salto debe llevar al contenido principal");
    assert.equal(await page.locator("#main-content").isVisible(), true, "El contenido principal debe permanecer visible");

    assert.deepEqual(problems, [], `Errores de navegador en accesibilidad ${viewport.name}:\n${problems.join("\n")}`);
    await context.close();
  }
});

console.log(`A11y smoke OK: landmarks, nombres accesibles y teclado en ${routes.length} rutas.`);
