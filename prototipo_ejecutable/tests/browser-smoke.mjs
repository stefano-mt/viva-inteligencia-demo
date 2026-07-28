import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { observePage, openRoute, routes, viewports, withDemoBrowser } from "./helpers/demo-browser.mjs";

const evidenceDir = process.env.EVIDENCE_DIR ? path.resolve(process.env.EVIDENCE_DIR) : null;
const hashes = {};

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const problems = observePage(page);

    for (const route of routes) {
      await openRoute(page, baseUrl, route.id);

      assert.equal(await page.locator("h1").first().textContent(), route.title, `Título incorrecto en #${route.id}`);
      assert.equal(
        await page.locator(`[data-view="${route.id}"][aria-current="page"]`).count(),
        1,
        `La navegación no marca #${route.id} como activa`,
      );
      assert.ok((await page.locator("#main-content").innerText()).trim().length > 80, `Contenido vacío en #${route.id}`);

      if (evidenceDir) {
        await fs.mkdir(evidenceDir, { recursive: true });
        const filename = `${viewport.name}-${route.id}.png`;
        const screenshot = await page.screenshot({
          path: path.join(evidenceDir, filename),
          fullPage: true,
        });
        hashes[filename] = createHash("sha256").update(screenshot).digest("hex");
      }
    }

    assert.deepEqual(problems, [], `Errores de navegador en ${viewport.name}:\n${problems.join("\n")}`);
    await context.close();
  }

  const context = await browser.newContext({ viewport: viewports[0] });
  const page = await context.newPage();
  const interactionProblems = observePage(page);
  await openRoute(page, baseUrl, "dashboard");

  const district = page.locator("#top-district");
  const districtOptions = await district.locator("option").allTextContents();
  assert.ok(districtOptions.length > 1, "El selector de distrito debe ofrecer alternativas");
  await district.selectOption({ label: districtOptions[1] });
  assert.equal(await district.inputValue(), districtOptions[1], "El cambio de distrito no se conserva");

  await page.locator('[data-view="projects"]').first().click();
  await page.locator("#project-query").fill("Miraflores");
  assert.equal(await page.locator("#project-query").inputValue(), "Miraflores", "La búsqueda de proyectos no responde");
  assert.deepEqual(interactionProblems, [], `Errores durante las interacciones:\n${interactionProblems.join("\n")}`);

  await context.close();

  const legacyContext = await browser.newContext({ viewport: viewports[0] });
  const legacyPage = await legacyContext.newPage();
  for (const [legacy, canonical] of Object.entries({
    sources: "market",
    matching: "compare",
    quality: "trust",
    pipeline: "activity",
  })) {
    await openRoute(legacyPage, baseUrl, legacy);
    assert.equal(
      await legacyPage.locator(`[data-view="${canonical}"][aria-current="page"]`).count(),
      1,
      `La ruta heredada #${legacy} no resuelve a #${canonical}`,
    );
  }
  await legacyContext.close();

  const mobileContext = await browser.newContext({ viewport: viewports[2] });
  const mobilePage = await mobileContext.newPage();
  await openRoute(mobilePage, baseUrl, "dashboard");
  await mobilePage.locator("#menu-toggle").click();
  assert.equal(await mobilePage.locator(".app-shell").evaluate((element) => element.classList.contains("nav-is-open")), true, "El menú móvil no abre");
  await mobilePage.keyboard.press("Escape");
  assert.equal(await mobilePage.locator(".app-shell").evaluate((element) => element.classList.contains("nav-is-open")), false, "Escape no cierra el menú móvil");
  assert.equal(await mobilePage.evaluate(() => document.activeElement?.id), "menu-toggle", "El foco no vuelve al botón del menú");
  await mobileContext.close();
});

if (evidenceDir) {
  await fs.writeFile(path.join(evidenceDir, "sha256.json"), `${JSON.stringify(hashes, null, 2)}\n`, "utf8");
}

console.log(`Smoke browser OK: ${routes.length} rutas × ${viewports.length} viewports.`);
