import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createObservedPage, openRoute, routes, viewports, withDemoBrowser } from "./helpers/demo-browser.mjs";

const evidenceDir = process.env.EVIDENCE_DIR ? path.resolve(process.env.EVIDENCE_DIR) : null;
const hashes = {};

assert.deepEqual(
  routes.map(({ id }) => id),
  ["dashboard", "projects", "inspector", "market", "compare", "trust", "assistant", "activity"],
  "El smoke debe congelar las siete vistas previas y el inspector",
);
assert.equal(viewports.length, 3, "El smoke debe cubrir desktop, laptop y mobile");

await withDemoBrowser(async ({ browser, baseUrl }) => {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const { page, problems, externalRequests } = await createObservedPage(context, baseUrl);

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
    assert.deepEqual(externalRequests, [], `Solicitudes externas en ${viewport.name}:\n${externalRequests.join("\n")}`);
    await context.close();
  }

  const context = await browser.newContext({ viewport: viewports[0] });
  const {
    page,
    problems: interactionProblems,
    externalRequests: interactionExternalRequests,
  } = await createObservedPage(context, baseUrl);
  await openRoute(page, baseUrl, "dashboard");

  const district = page.locator("#top-district");
  assert.equal(await district.locator('option[value="150140"]').count(), 1, "Debe existir el distrito estable 150140");
  await district.selectOption("150140");
  assert.equal(await district.inputValue(), "150140", "El cambio al distrito 150140 no se conserva");

  await page.locator('[data-view="projects"]').first().click();
  await page.locator("#project-query").fill("Miraflores");
  assert.equal(await page.locator("#project-query").inputValue(), "Miraflores", "La búsqueda de proyectos no responde");
  assert.deepEqual(interactionProblems, [], `Errores durante las interacciones:\n${interactionProblems.join("\n")}`);

  assert.deepEqual(
    interactionExternalRequests,
    [],
    `Solicitudes externas durante las interacciones:\n${interactionExternalRequests.join("\n")}`,
  );
  await context.close();

  const legacyContext = await browser.newContext({ viewport: viewports[0] });
  const legacyObserved = await createObservedPage(legacyContext, baseUrl);
  const legacyPage = legacyObserved.page;
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
  assert.deepEqual(legacyObserved.problems, [], `Errores en rutas heredadas:\n${legacyObserved.problems.join("\n")}`);
  assert.deepEqual(
    legacyObserved.externalRequests,
    [],
    `Solicitudes externas en rutas heredadas:\n${legacyObserved.externalRequests.join("\n")}`,
  );
  await legacyContext.close();

  const mobileContext = await browser.newContext({ viewport: viewports[2] });
  const mobileObserved = await createObservedPage(mobileContext, baseUrl);
  const mobilePage = mobileObserved.page;
  await openRoute(mobilePage, baseUrl, "dashboard");
  await mobilePage.locator("#menu-toggle").click();
  assert.equal(await mobilePage.locator(".app-shell").evaluate((element) => element.classList.contains("nav-is-open")), true, "El menú móvil no abre");
  await mobilePage.keyboard.press("Escape");
  assert.equal(await mobilePage.locator(".app-shell").evaluate((element) => element.classList.contains("nav-is-open")), false, "Escape no cierra el menú móvil");
  assert.equal(await mobilePage.evaluate(() => document.activeElement?.id), "menu-toggle", "El foco no vuelve al botón del menú");
  assert.deepEqual(mobileObserved.problems, [], `Errores en móvil:\n${mobileObserved.problems.join("\n")}`);
  assert.deepEqual(
    mobileObserved.externalRequests,
    [],
    `Solicitudes externas en móvil:\n${mobileObserved.externalRequests.join("\n")}`,
  );
  await mobileContext.close();
});

if (evidenceDir) {
  await fs.writeFile(path.join(evidenceDir, "sha256.json"), `${JSON.stringify(hashes, null, 2)}\n`, "utf8");
}

console.log(`Smoke browser OK: ${routes.length} rutas × ${viewports.length} viewports.`);
