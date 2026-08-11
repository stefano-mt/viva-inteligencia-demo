import assert from "node:assert/strict";
import {
  createObservedPage,
  openPath,
  openRoute,
  routes,
  viewports,
  withDemoBrowser,
} from "./helpers/demo-browser.mjs";

const journeyStages = [
  "scale",
  "geography",
  "quality",
  "depth",
  "movement",
  "decision",
];

const forbiddenVisibleLanguage = [
  { pattern: /\bdataset\b/iu, label: "dataset" },
  { pattern: /contrato p[úu]blico/iu, label: "contrato público" },
  { pattern: /cat[áa]logo can[óo]nico/iu, label: "catálogo canónico" },
  { pattern: /\bsnapshot\b/iu, label: "snapshot" },
  { pattern: /\bfallback\b/iu, label: "fallback" },
  { pattern: /\bscope_text\b/iu, label: "scope_text" },
  { pattern: /\bfingerprint\b/iu, label: "fingerprint" },
  { pattern: /\bledger\b/iu, label: "ledger" },
  {
    pattern: /criterios equivalentes y trazables/iu,
    label: "criterios equivalentes y trazables",
  },
  { pattern: /motor de benchmark/iu, label: "motor de benchmark" },
  { pattern: /tres universos/iu, label: "tres universos" },
  { pattern: /ver denominadores/iu, label: "ver denominadores" },
  {
    pattern: /abrir el respaldo completo/iu,
    label: "abrir el respaldo completo",
  },
  { pattern: /elige una intenci[óo]n/iu, label: "elige una intención" },
];

const routeAnchors = Object.freeze({
  dashboard: /mapa y lectura del distrito|lectura comercial inicial/iu,
  projects: /lista de competidores|proyectos del escenario/iu,
  inspector: /fuentes y calidad de datos|datos pueden usarse/iu,
  market: /muestra y referencias|referencia de mercado/iu,
  compare: /diferencias entre proyectos|misma zona/iu,
  trust: /validaci[óo]n antes de campa[ñn]a|argumento comercial prudente/iu,
  assistant: /recomendaci[óo]n y pr[óo]ximos pasos|pregunta compatible/iu,
  activity: /cambios publicados|seguimiento/iu,
});

function normalized(value) {
  return String(value ?? "").replace(/\s+/gu, " ").trim();
}

function assertPlainLanguage(text, surface) {
  for (const { pattern, label } of forbiddenVisibleLanguage) {
    assert.doesNotMatch(
      text,
      pattern,
      `${surface}: el contenido visible por defecto expone “${label}”`,
    );
  }
}

await withDemoBrowser(
  async ({ browser, baseUrl }) => {
    const context = await browser.newContext({ viewport: viewports[1] });
    const observed = await createObservedPage(context, baseUrl);
    const { page } = observed;

    for (const route of routes) {
      await openRoute(page, baseUrl, route.id);
      const visible = normalized(await page.locator("#main-content").innerText());
      assertPlainLanguage(visible, `#${route.id}`);
      assert.match(
        normalized(await page.locator("body").innerText()),
        routeAnchors[route.id],
        `#${route.id}: falta el ancla de lenguaje comercial esperada`,
      );
      const guide = page.locator("details.section-guide > summary");
      assert.equal(await guide.count(), 1, `#${route.id}: debe existir una ayuda`);
      assert.match(
        normalized(await guide.innerText()),
        /c[óo]mo usarla/iu,
        `#${route.id}: la ayuda debe invitar a “Cómo usarla”`,
      );
    }

    for (const stageId of journeyStages) {
      await openPath(page, baseUrl, `/#journey/${stageId}`);
      const root = page.locator(`[data-journey-stage="${stageId}"]`);
      await root.waitFor({ state: "visible" });
      assertPlainLanguage(
        normalized(await root.innerText()),
        `#journey/${stageId}`,
      );
      assert.match(
        normalized(await root.innerText()),
        /qu[ée] sabemos/iu,
        `#journey/${stageId}: conserva la lectura principal`,
      );
      assert.match(
        normalized(await root.innerText()),
        /qu[ée] falta o no puede afirmarse/iu,
        `#journey/${stageId}: conserva el límite visible`,
      );
    }

    assert.deepEqual(observed.problems, [], observed.problems.join("\n"));
    assert.deepEqual(
      observed.externalRequests,
      [],
      observed.externalRequests.join("\n"),
    );
    await context.close();
  },
  { port: 4373 },
);

console.log(
  "Copy comercial OK: ocho rutas y seis etapas sin vocabulario interno visible por defecto.",
);
