import assert from "node:assert/strict";
import { createObservedPage, openPath, openRoute, routes, viewports, withDemoBrowser } from "./helpers/demo-browser.mjs";

const journeyStages = ["scale", "geography", "quality", "depth", "movement", "decision"];

assert.equal(routes.length, 8, "A11y debe cubrir las siete vistas previas y el inspector");
assert.equal(journeyStages.length, 6, "A11y debe cubrir las seis etapas del recorrido");
assert.equal(viewports.length, 3, "A11y debe cubrir desktop, laptop y mobile");

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const { page, problems, externalRequests } = await createObservedPage(context, baseUrl);

    for (const route of routes) {
      await openRoute(page, baseUrl, route.id);
      assert.equal(await page.locator("main").count(), 1, `Debe existir un único main en #${route.id}`);
      assert.equal(await page.locator("h1:visible").count(), 1, `Debe existir un único h1 visible en #${route.id}`);
      assert.equal(
        await page.locator('.sidebar nav[aria-label="Módulos principales"]').count(),
        1,
        `Falta navegación principal etiquetada en #${route.id}`,
      );
      assert.equal(
        await page.locator('[data-journey-entry]').count(),
        1,
        `Falta la entrada accesible al recorrido en #${route.id}`,
      );
      assert.equal(
        await page.locator('[data-expert-navigation][aria-labelledby="nav-expert"]').count(),
        1,
        `Falta la agrupación accesible de análisis experto en #${route.id}`,
      );
      assert.equal(await page.locator(".sidebar .scenario-sidebar").count(), 1, `Debe existir una sola estación territorial en #${route.id}`);
      assert.equal(await page.locator("#top-district").count(), 1, `Distrito duplicado o ausente en #${route.id}`);
      assert.equal(await page.locator("#reset-scenario").count(), 1, `Reset duplicado o ausente en #${route.id}`);
      assert.equal(await page.locator(".scenario-bar .eyebrow").count(), 0, `La cabecera no debe repetir el eyebrow técnico en #${route.id}`);
      assert.equal(
        await page.locator(".scenario-summary").count(),
        ["dashboard", "projects", "market", "compare", "activity"].includes(route.id) ? 0 : 1,
        `Resumen global duplicado o ausente en #${route.id}`,
      );

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
        assert.equal(
          await page.locator(".radar-primary > :is(.geo-panel, .positioning-panel)").count(),
          1,
          "Radar debe montar una sola visualización completa",
        );
        assert.equal(
          await page.locator("[data-geography-brief]").count(),
          0,
          "Radar no debe repetir el resumen territorial global",
        );
        assert.equal(
          await page.locator("details.radar-deep-dive:not([open])").count(),
          1,
          "El score secundario debe iniciar bajo demanda",
        );
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
      if (route.id === "projects") {
        assert.equal(
          await page.locator(".project-catalog-orientation__status").count(),
          1,
          "Proyectos debe usar una orientación compacta",
        );
        assert.equal(
          await page.locator(".project-catalog-brief, .project-card-reading").count(),
          0,
          "Proyectos no debe repetir ledger ni explicación por fila",
        );
      }
      if (route.id === "market") {
        assert.match(
          await page.locator(".benchmark-sheet__header .status-badge").textContent(),
          /Orientación no comparable|Referencia elegible|Información insuficiente/u,
          "Benchmark debe nombrar el estado de muestra sin depender solo del color",
        );
        assert.equal(
          await page.locator(".benchmark-primary-action").getAttribute("data-view"),
          "compare",
          "El CTA principal del benchmark debe tener destino accesible estable",
        );
      }
      if (route.id === "compare") {
        assert.equal(
          await page.locator("details.comparison-selector > summary").count(),
          1,
          "El selector del comparador debe usar un disclosure operable por teclado",
        );
        assert.equal(
          await page.locator("#scenario-live[aria-live=polite][aria-atomic=true]").count(),
          1,
          "El comparador debe compartir la región live central del escenario",
        );
      }
    }

    for (const stage of journeyStages) {
      await openPath(page, baseUrl, `/#journey/${stage}`);
      const label = `#journey/${stage}`;
      assert.equal(await page.locator("main").count(), 1, `Debe existir un unico main en ${label}`);
      assert.equal(await page.locator("h1#journey-title").count(), 1, `Debe existir un unico h1 en ${label}`);
      assert.equal(
        await page.locator('.sidebar nav[aria-label="Módulos principales"]').count(),
        1,
        `Falta navegacion principal etiquetada en ${label}`,
      );
      assert.equal(await page.locator('[data-journey-entry][aria-current="page"]').count(), 1, `Recorrido no activo en ${label}`);
      assert.equal(
        await page.locator('[data-expert-navigation][aria-labelledby="nav-expert"]').count(),
        1,
        `Falta navegacion experta agrupada en ${label}`,
      );
      assert.equal(await page.locator(".sidebar .scenario-sidebar").count(), 1, `Debe existir una sola estación territorial en ${label}`);
      assert.equal(await page.locator("#top-district").count(), 1, `Distrito duplicado o ausente en ${label}`);
      assert.equal(await page.locator("#reset-scenario").count(), 1, `Reset duplicado o ausente en ${label}`);
      assert.equal(await page.locator(".journey-topbar .eyebrow").count(), 0, `La cabecera no debe repetir el eyebrow técnico en ${label}`);
      assert.equal(
        await page.locator('.journey-rail[aria-label="Etapas del recorrido ejecutivo"]').count(),
        1,
        `Falta rail etiquetado en ${label}`,
      );
      assert.equal(await page.locator("[data-journey-step]").count(), 6, `Rail incompleto en ${label}`);
      assert.equal(await page.locator("[data-journey-mobile-step]").count(), 6, `Resumen movil incompleto en ${label}`);
      assert.equal(
        await page.locator(`[data-journey-step="${stage}"][aria-current="step"]`).count(),
        1,
        `Etapa desktop no identificada en ${label}`,
      );
      assert.equal(
        await page.locator(`[data-journey-mobile-step="${stage}"][aria-current="step"]`).count(),
        1,
        `Etapa movil no identificada en ${label}`,
      );

      const unnamedControls = await page.locator("button, input, select, textarea, summary, a[href]").evaluateAll((controls) =>
        controls
          .filter((control) => {
            const text = control.textContent?.trim();
            const labelText = control.getAttribute("aria-label");
            const labelledBy = control.getAttribute("aria-labelledby");
            const title = control.getAttribute("title");
            const associated = control.id ? document.querySelector(`label[for="${CSS.escape(control.id)}"]`)?.textContent?.trim() : "";
            const wrappingLabel = control.closest("label")?.textContent?.trim();
            const imageAlt = control.querySelector("img[alt]")?.getAttribute("alt");
            return !text && !labelText && !labelledBy && !title && !associated && !wrappingLabel && !imageAlt;
          })
          .map((control) => `${control.tagName.toLowerCase()}#${control.id || "(sin-id)"}.${control.className || "(sin-clase)"}`),
      );
      assert.deepEqual(unnamedControls, [], `Controles sin nombre accesible en ${label}: ${unnamedControls.join(", ")}`);

      const duplicateIds = await page.locator("[id]").evaluateAll((elements) => {
        const counts = new Map();
        for (const element of elements) counts.set(element.id, (counts.get(element.id) ?? 0) + 1);
        return [...counts.entries()].filter(([, count]) => count > 1).map(([id, count]) => `${id} (${count})`);
      });
      assert.deepEqual(duplicateIds, [], `IDs duplicados en ${label}: ${duplicateIds.join(", ")}`);
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

console.log(
  `A11y smoke OK: landmarks, nombres accesibles y teclado en ${routes.length + journeyStages.length} superficies por ${viewports.length} viewports.`,
);
