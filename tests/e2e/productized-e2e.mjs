import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

let baseUrl = process.env.E2E_BASE_URL ?? "";
const outputDirectory = path.resolve("test-results", "productized");
await fs.mkdir(outputDirectory, { recursive: true });

let apiApp = null;
let viteServer = null;
if (!baseUrl) {
  const apiPort = 4310;
  const webPort = 4311;
  const root = path.resolve(import.meta.dirname, "../..");
  const [{ buildApp }, { readConfig }, { InMemorySnapshotRepository, loadAndValidateSnapshot }, { createServer }] = await Promise.all([
    import("../../apps/api/dist/app.js"),
    import("../../apps/api/dist/config.js"),
    import("@viva/snapshot"),
    import("vite"),
  ]);
  const config = readConfig({
    API_PORT: String(apiPort),
    SNAPSHOT_PATH: path.join(root, "data/generated/viva-platform-demo.json"),
    SNAPSHOT_SCHEMA_PATH: path.join(root, "packages/contracts/schemas/demo-v2.schema.json"),
  });
  const loaded = await loadAndValidateSnapshot({ snapshotPath: config.snapshotPath, schemaPath: config.schemaPath });
  apiApp = await buildApp({ repository: new InMemorySnapshotRepository(loaded), config, logger: false });
  await apiApp.listen({ host: "127.0.0.1", port: apiPort });
  viteServer = await createServer({
    configFile: path.join(root, "apps/web/vite.config.mjs"),
    configLoader: "native",
    server: {
      host: "127.0.0.1",
      port: webPort,
      strictPort: true,
      proxy: { "/api": `http://127.0.0.1:${apiPort}`, "/health": `http://127.0.0.1:${apiPort}` },
    },
  });
  await viteServer.listen();
  baseUrl = `http://127.0.0.1:${webPort}`;
}

const executablePath = [
  process.env.PLAYWRIGHT_CHROME_PATH,
  chromium.executablePath(),
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => candidate && existsSync(candidate));
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
const observedRequests = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("request", (request) => observedRequests.push(request.url()));

try {
  await page.goto(`${baseUrl}/#dashboard`, { waitUntil: "networkidle" });
  await page.locator("h1").waitFor();
  assert.equal(await page.locator(".brand img").evaluate((image) => image.complete && image.naturalWidth > 0), true, "El logo debe cargar");
  assert.match(await page.locator("h1").innerText(), /lectura comercial/i);
  await page.getByRole("heading", { name: "Precios y oferta de la zona" }).waitFor();
  assert.deepEqual(
    await page.locator(".product-nav .nav-link strong").allTextContents(),
    ["Panorama", "Proyectos", "Comparar", "Seguimiento", "Decidir", "Recorrido"],
    "La navegación debe priorizar cinco tareas comerciales y dejar el recorrido como guía opcional",
  );
  assert.equal(await page.locator(".expert-nav").count(), 0, "No debe existir un menú paralelo de herramientas técnicas");
  assert.equal(await hasHorizontalOverflow(page), false, "Dashboard 1440×900 no debe desbordar");
  await page.screenshot({ path: path.join(outputDirectory, "dashboard-1440x900.png"), fullPage: true });

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${baseUrl}/#journey/scale`, { waitUntil: "networkidle" });
  const firstDecision = await page.locator(".decision-strip").boundingBox();
  assert.ok(firstDecision && firstDecision.y < 720, "La lectura principal debe comenzar en el primer viewport");
  assert.equal(await hasHorizontalOverflow(page), false, "Recorrido 1280×720 no debe desbordar");
  await page.keyboard.press("Control+k");
  await page.locator("#command-dialog[open]").waitFor();
  assert.equal(
    await page.locator("#command-input").evaluate((input) => input === document.activeElement),
    true,
    "Ctrl+K debe enfocar la búsqueda",
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#command-dialog").evaluate((dialog) => dialog.hasAttribute("open")), false);

  const routes = [
    "dashboard", "projects", "compare", "assistant", "activity",
    "journey/scale", "journey/geography", "journey/quality", "journey/depth", "journey/movement", "journey/decision",
  ];
  for (const route of routes) {
    await page.goto(`${baseUrl}/#${route}`, { waitUntil: "networkidle" });
    await page.locator("h1").waitFor();
    assert.ok((await page.locator("h1").innerText()).trim(), `${route} debe tener h1 visible`);
    await assertNoUnboundButtons(page, route);
    await assertInteractiveFeedback(page, route);
  }

  const legacyRoutes = [
    ["market", "dashboard"],
    ["inspector", "journey/quality"],
    ["trust", "assistant"],
  ];
  for (const [legacyRoute, canonicalRoute] of legacyRoutes) {
    await page.goto(`${baseUrl}/#${legacyRoute}`, { waitUntil: "networkidle" });
    await page.waitForURL(new RegExp(`#${canonicalRoute}$`, "u"));
    await page.locator("h1").waitFor();
  }

  await page.goto(`${baseUrl}/#journey/quality`, { waitUntil: "networkidle" });
  const qualityVerificationCase = page.locator("#quality-verification-case");
  await qualityVerificationCase.waitFor();
  const qualityCases = await qualityVerificationCase.locator("option").evaluateAll((options) =>
    options.map((option) => ({ value: option.value, label: option.textContent?.trim() ?? "" })).filter(({ value }) => value),
  );
  assert.ok(qualityCases.length >= 2, "La guía de Calidad debe permitir revisar múltiples ejemplos");
  await page.locator(".quality-verification-result").waitFor();
  const firstQualityResult = await page.locator(".quality-verification-result").innerText();
  const currentQualityCase = await qualityVerificationCase.inputValue();
  const alternateQualityCase = qualityCases.find(({ value }) => value !== currentQualityCase);
  assert.ok(alternateQualityCase, "La guía debe ofrecer un ejemplo alternativo de verificación");
  await qualityVerificationCase.selectOption(alternateQualityCase.value);
  await page.locator(".busy").waitFor({ state: "detached" });
  await page.waitForFunction(
    (previousText) => document.querySelector(".quality-verification-result")?.textContent?.trim() !== previousText.trim(),
    firstQualityResult,
  );
  assert.match(
    await page.locator(".quality-verification-result").innerText(),
    /Listo para usar|Puede utilizarse|Revisar antes de usar/i,
    "Cambiar el ejemplo debe actualizar la revisión dentro de la etapa Calidad",
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/#projects`, { waitUntil: "networkidle" });
  await page.locator(".busy").waitFor({ state: "detached" });
  await page.locator(".project-select-checkbox:not(:disabled)").first().waitFor();
  assert.ok(await page.locator("tbody tr").count() > 0, "Proyectos debe presentar filas");
  const desktopCheckbox = await page.locator(".project-select-checkbox:not(:disabled)").first().boundingBox();
  assert.ok(desktopCheckbox && desktopCheckbox.width <= 20 && desktopCheckbox.height <= 20, "El selector de comparación debe ser compacto");
  assert.match(await page.locator("#comparison-selection-title").innerText(), /0\/3/, "La selección debe iniciar vacía y explícita");
  assert.equal(await page.getByRole("button", { name: /Comparar proyectos/ }).isDisabled(), true, "Comparar requiere al menos dos proyectos");
  for (let count = 1; count <= 3; count += 1) {
    await page.locator(".project-select-checkbox:not(:disabled):not(:checked)").first().click();
    await page.waitForFunction((expected) => document.querySelectorAll(".selection-chip").length === expected, count);
  }
  assert.match(await page.locator("#comparison-selection-title").innerText(), /3\/3/, "La bandeja debe confirmar tres proyectos");
  assert.equal(await page.locator(".project-select-checkbox:not(:checked):not(:disabled)").count(), 0, "El cuarto proyecto debe quedar bloqueado al alcanzar el máximo");
  await page.getByRole("button", { name: "Comparar 3 proyectos" }).click();
  await page.waitForURL(/#compare/u);
  await page.locator(".comparison-project-card").first().waitFor();
  assert.equal(await page.locator(".comparison-project-card").count(), 3, "El comparador debe conservar los tres proyectos elegidos");
  assert.equal(await page.locator(".comparison-guidance").count(), 1, "La limitación de precio por m² debe aparecer separada de las diferencias");
  assert.match(await page.locator("#comparison-guidance-title").innerText(), /todavía no es comparable/i);
  assert.ok(await page.locator(".comparison-difference-card").count() >= 1, "El comparador debe priorizar diferencias entre proyectos");
  assert.equal(
    await page.locator(".comparison-difference-card").first().locator(".comparison-finding-values > div").count(),
    3,
    "Cada diferencia debe mostrar un valor por proyecto seleccionado",
  );
  assert.match(await page.locator("#comparison-findings-title").innerText(), /Qué cambia entre los proyectos/i);
  assert.ok(await page.locator(".comparison-data-row").count() >= 9, "La matriz debe mostrar todos los grupos de datos disponibles");
  assert.doesNotMatch(await page.locator("#main-content").innerText(), /\b(observed|announced|excluded|unknown)\b/u, "La comparación no debe exponer estados técnicos");
  assert.doesNotMatch(await page.locator("#main-content").innerText(), /mínimos de proyecto|vínculo de oferta|pairing|benchmark|exclusion_reason/iu, "La comparación no debe repetir explicaciones internas en cada celda");
  await page.screenshot({ path: path.join(outputDirectory, "comparison-1440x900.png"), fullPage: true });
  await page.locator(".comparison-project-card").first().getByRole("button", { name: "Abrir ficha" }).click();
  await page.locator("#project-detail-title").waitFor();
  await page.getByRole("button", { name: "Cerrar ficha" }).click();
  await page.locator(".comparison-project-card").first().getByRole("button", { name: /Quitar .* de la comparación/ }).click();
  await page.waitForFunction(() => document.querySelectorAll(".comparison-project-card").length === 2);
  assert.equal(await hasHorizontalOverflow(page), false, "La comparación dividida no debe desbordar en escritorio");
  await page.getByRole("link", { name: "Cambiar selección" }).click();
  await page.locator("#comparison-selection-title").waitFor();
  assert.match(await page.locator("#comparison-selection-title").innerText(), /2\/3/, "La selección debe conservarse al volver a Proyectos");
  await page.getByRole("button", { name: "Limpiar selección" }).click();
  assert.match(await page.locator("#comparison-selection-title").innerText(), /0\/3/, "Limpiar debe retirar todos los proyectos");
  await page.locator('select[name="project_scope"]').selectOption("all");
  await page.waitForFunction(() => document.querySelector('select[name="project_scope"]')?.value === "all");
  assert.match(await page.locator(".catalog-note").innerText(), /catálogo completo/i);
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByText(/Página 2 de/).waitFor();
  await page.getByRole("button", { name: "Anterior" }).click();
  await page.getByText(/Página 1 de/).waitFor();
  await page.locator("[data-project-detail]").first().click();
  await page.locator("#project-detail-title").waitFor();
  assert.equal(await page.locator("#project-detail-title").evaluate((heading) => heading === document.activeElement), true, "Abrir ficha debe llevar el foco al detalle");
  assert.match(await page.locator(".source-warning").innerText(), /precios publicados/i);
  assert.deepEqual(
    await page.locator("#project-summary-title, #project-product-title, #project-features-title, #project-sources-title").allTextContents(),
    ["Resumen comercial", "Producto y ubicación", "Información anunciada", "Verificación de datos"],
    "La ficha debe seguir una jerarquía comercial predecible",
  );
  assert.match(await page.locator("#project-sources-title").innerText(), /Verificación de datos/i);
  assert.ok(await page.locator(".detail-symbol").count() >= 10, "La ficha debe identificar visualmente sus categorías");
  assert.ok(await page.locator(".source-list article").count() > 0, "La ficha debe declarar al menos una fuente");
  assert.equal(await page.locator(".source-matrix tr").count(), 9, "La ficha debe separar ocho campos entre Nexo, web y red oficial");
  assert.equal(await page.locator("#project-verification-case").count(), 0, "La ficha no debe mezclar ejemplos de otros proyectos");
  assert.equal(await hasHorizontalOverflow(page), false, "La ficha 1440×900 no debe desbordar");
  const closeButton = page.getByRole("button", { name: "Cerrar ficha" });
  assert.equal(await closeButton.evaluate((button) => {
    const icon = button.querySelector(".control-icon-frame");
    if (!icon) return false;
    const buttonBox = button.getBoundingClientRect();
    const iconBox = icon.getBoundingClientRect();
    return Math.abs(buttonBox.x + buttonBox.width / 2 - (iconBox.x + iconBox.width / 2)) <= 2
      && Math.abs(buttonBox.y + buttonBox.height / 2 - (iconBox.y + iconBox.height / 2)) <= 2;
  }), true, "El icono de cierre debe estar centrado");
  await closeButton.hover();
  await page.waitForTimeout(220);
  assert.deepEqual(
    await closeButton.evaluate((button) => {
      const style = getComputedStyle(button);
      return { backgroundColor: style.backgroundColor, color: style.color };
    }),
    { backgroundColor: "rgb(0, 98, 84)", color: "rgb(255, 255, 255)" },
    "El cierre debe responder al hover con el color Viva",
  );
  await page.screenshot({ path: path.join(outputDirectory, "projects-detail-1440x900.png"), fullPage: true });
  await page.getByRole("button", { name: "Cerrar ficha" }).click();
  await page.locator('input[name="query"]').fill("Los Tucanes");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await page.locator("[data-project-detail]").first().click();
  await page.locator("#project-detail-title").waitFor();
  assert.equal(await page.locator(".source-type--agency_website").count(), 1, "La ficha debe identificar visualmente la web propia");
  const sourceDetails = page.locator(".source-detail-disclosure").filter({ has: page.getByText("Ver fuentes y fechas") });
  await sourceDetails.getByText("Ver fuentes y fechas").click();
  assert.match(await page.locator(".source-type--agency_website").innerText(), /Web propia/i);
  assert.match(await page.locator(".source-type--agency_website").locator("xpath=ancestor::article").locator(".source-observed").innerText(), /Los Tucanes.*70 m².*Preventa.*parrilla/is, "La fuente propia debe mostrar los campos realmente recopilados de su web");
  assert.match(await sourceDetails.locator(".source-list").innerText(), /Página del proyecto revisada/i, "La cobertura web debe declarar el alcance real de la vinculación");
  assert.match(await page.locator(".source-matrix").innerText(), /Nexo Inmobiliario.*Web oficial.*Red oficial.*Resultado/is, "La matriz debe diferenciar cada canal de datos");
  await page.screenshot({ path: path.join(outputDirectory, "multisource-detail-1440x900.png"), fullPage: true });
  await page.getByRole("button", { name: "Cerrar ficha" }).click();

  await page.goto(`${baseUrl}/#activity`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: "Seguimiento comercial" }).waitFor();
  assert.equal(await page.locator(".history-coverage__item").count(), 3, "Seguimiento debe declarar los tres tipos de alerta");
  assert.equal(await page.locator(".history-signal").count(), 5, "Las cinco señales observadas deben aparecer en lenguaje comercial");
  assert.doesNotMatch(await page.locator("#main-content").innerText(), /project:nexo-|published_price_from|certified/u, "Seguimiento no debe exponer vocabulario técnico");
  assert.match(await page.locator(".history-priority").innerText(), /precio publicado/i, "La revisión sugerida debe explicar el cambio observado");
  await page.locator("#history-direction-filter").selectOption("increase");
  assert.equal(await page.locator(".history-signal").count(), 1, "El filtro de movimiento debe actualizar la lista");
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  assert.equal(await page.locator(".history-signal").count(), 5, "Limpiar filtros debe recuperar todas las señales");
  await page.locator(".history-priority").getByRole("button", { name: "Abrir proyecto" }).click();
  await page.locator("#project-detail-title").waitFor();
  assert.equal(await hasHorizontalOverflow(page), false, "Seguimiento y ficha no deben desbordar en escritorio");
  await page.getByRole("button", { name: "Cerrar ficha" }).click();
  await page.screenshot({ path: path.join(outputDirectory, "activity-1440x900.png"), fullPage: true });

  await page.goto(`${baseUrl}/#dashboard`, { waitUntil: "networkidle" });
  assert.match(await page.locator(".source-channel-chart").innerText(), /Nexo Inmobiliario.*Web oficial con datos.*Redes oficiales/is, "El tablero debe mostrar cobertura por canal");
  assert.equal(await page.locator(".price-band__median").count(), 1, "El tablero debe mostrar la mediana de precios publicados");
  await page.getByRole("button", { name: "Actualizar datos" }).click();
  await page.locator("#data-refresh-dialog[open]").waitFor();
  assert.match(await page.locator("#data-refresh-dialog").innerText(), /no está disponible.*accesos y permisos/is, "Sin configuración operativa la actualización debe fallar cerrada");
  await page.getByRole("button", { name: "Entendido" }).click();
  assert.ok(await page.locator("path.district-boundary").count() === 1, "El mapa debe representar el contorno distrital");
  assert.equal(await page.locator(".map-zone").count(), 4, "El mapa debe dividir el distrito en cuatro zonas de comparación");
  assert.equal(await page.locator(".zone-divider").count(), 2, "Las medianas geográficas deben dividir las cuatro zonas");
  assert.equal(await page.locator(".zone-legend li").count(), 4, "La leyenda debe explicar las cuatro zonas");
  assert.match(await page.locator(".map-provenance").innerText(), /no representan límites urbanos oficiales/i);
  assert.match(await page.locator(".map-provenance").innerText(), /contorno distrital es referencial/i);
  await page.locator("[data-map-project]").first().click();
  await page.locator(".map-project-panel--selected").waitFor();
  assert.match(await page.locator(".map-project-panel--selected").innerText(), /Precio publicado.*Área total.*Dirección/is, "El punto debe abrir un resumen comercial al lado del mapa");
  await page.getByRole("button", { name: "Abrir ficha completa" }).click();
  await page.locator("#project-detail-title").waitFor();
  await page.getByRole("button", { name: "Cerrar ficha" }).click();
  await page.getByRole("button", { name: "Área y precio publicado" }).click();
  assert.equal(await page.locator(".price-median-line").count(), 1, "El gráfico debe marcar la mediana horizontal de precios visibles");
  assert.match(await page.locator(".price-median-label").textContent(), /Mediana publicada/i);
  assert.match(await page.locator(".map-provenance").innerText(), /precio real de cierre/i);
  await page.screenshot({ path: path.join(outputDirectory, "positioning-1440x900.png"), fullPage: true });
  await page.getByRole("button", { name: "Mapa del distrito" }).click();

  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  assert.equal(await hasHorizontalOverflow(page), false, "El dashboard debe conservar reflow a zoom 200%");
  await page.screenshot({ path: path.join(outputDirectory, "dashboard-zoom-200.png"), fullPage: true });
  await page.evaluate(() => { document.documentElement.style.zoom = ""; });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/#assistant`, { waitUntil: "networkidle" });
  await page.locator("h1").waitFor();
  assert.equal(await page.locator("[data-assistant-category]").count(), 4, "Decidir debe organizar las preguntas por cuatro decisiones comerciales");
  assert.deepEqual(
    await page.locator("[data-assistant-category]").allTextContents(),
    ["↗Mercado y precio", "◇Competencia", "↕Movimientos", "✓Preparar argumento"],
    "Las categorías deben usar lenguaje del equipo comercial",
  );
  assert.equal(await page.locator("[data-assistant-intent]").count(), 3, "Cada tema debe mostrar una selección breve de preguntas");
  await page.getByRole("heading", { name: "Antes de compartir" }).waitFor();
  const questionPanelBox = await page.locator(".assistant-question-panel").boundingBox();
  const readinessBox = await page.locator(".decision-readiness").boundingBox();
  assert.ok(questionPanelBox && readinessBox && questionPanelBox.y < readinessBox.y, "La pregunta debe aparecer antes que las reglas de uso");
  const safeguards = page.locator(".decision-safeguards");
  await safeguards.waitFor();
  await safeguards.locator("summary").click();
  const safeguardsText = await safeguards.innerText();
  assert.match(
    safeguardsText,
    /anunciad[oa]s?.*(?:confirmar|confirmad[oa]s?)/is,
    "Antes de compartir debe distinguir lo anunciado de lo confirmado",
  );
  assert.match(
    safeguardsText,
    /datos personales|privacidad/is,
    "Antes de compartir debe recordar la protección de datos personales",
  );
  assert.match(
    safeguardsText,
    /(?:no (?:permite|podemos) afirmar|no afirmar)/i,
    "Antes de compartir debe impedir inferir demanda, causa o intención",
  );
  assert.match(safeguardsText, /demanda/i, "La salvaguarda debe cubrir inferencias sobre demanda");
  assert.match(safeguardsText, /causa/i, "La salvaguarda debe cubrir inferencias sobre causas");
  assert.match(safeguardsText, /intención/i, "La salvaguarda debe cubrir inferencias sobre intención");
  assert.doesNotMatch(
    await page.locator("#main-content").innerText(),
    /señal certificada|evidencia autorizada|atributos documentados|checklist/i,
    "Decidir debe hablar en lenguaje comercial",
  );
  assert.equal(await hasHorizontalOverflow(page), false, "Asistente 390×844 no debe desbordar");
  assert.equal(await page.locator(".nav-scrim").isVisible(), false, "La capa del menú debe iniciar oculta");
  await page.getByRole("button", { name: /Competencia/ }).click();
  assert.equal(await page.locator("[data-assistant-intent]:disabled").count(), 2, "La comparación debe pedir una selección previa");
  assert.match(await page.locator(".assistant-selection-note").innerText(), /selecciona entre dos y tres proyectos/i);
  await page.getByRole("button", { name: /Mercado y precio/ }).click();
  await page.locator("[data-assistant-intent]").first().click();
  assert.ok((await page.locator("#assistant-input").inputValue()).length > 0, "El atajo debe completar la pregunta");
  assert.match(await page.locator("#assistant-character-count").innerText(), /\d+ \/ 500/u, "El campo debe declarar el límite real del contrato");
  await page.locator("#assistant-input").pressSequentially(" adicional");
  assert.equal(await page.locator("#assistant-intent").inputValue(), "", "Editar una pregunta sugerida debe limpiar su clasificación previa");
  await page.locator("[data-assistant-intent]").first().click();
  await page.getByRole("button", { name: "Preparar respuesta" }).click();
  await page.locator(".answer").waitFor();
  assert.equal(await page.locator(".answer-facts article").count(), 3, "La respuesta debe mostrar hasta tres datos clave del contrato");
  assert.equal(await page.locator(".answer__action").count(), 1, "El próximo paso debe ser una acción navegable");
  assert.match(await page.locator(".answer__sources summary").innerText(), /fuentes y fecha/i, "Las fuentes deben quedar disponibles bajo demanda");
  assert.doesNotMatch(
    await page.locator(".answer").innerText(),
    /benchmark|pairing|dataset|trazabilidad|cocientes orientativos|expediente activo|evidencia autorizada|señal elegible/iu,
    "La respuesta generada debe conservar lenguaje comercial",
  );
  await page.getByRole("button", { name: /Movimientos/ }).click();
  await page.locator("[data-assistant-intent]").nth(1).click();
  await page.getByRole("button", { name: "Preparar respuesta" }).click();
  await page.locator(".answer").waitFor();
  assert.equal(await page.locator(".answer-facts article").count(), 1, "La prioridad debe mostrar el competidor que conviene revisar");
  assert.equal(await page.locator('.answer__action[href="#activity"]').count(), 1, "La respuesta de movimientos debe llevar a Seguimiento");
  assert.doesNotMatch(await page.locator(".answer").innerText(), /señal elegible|calidad-primero|motor histórico/iu, "La prioridad no debe exponer criterios internos");
  await page.getByRole("button", { name: /Preparar argumento/ }).click();
  await page.locator("[data-assistant-intent]").first().click();
  await page.getByRole("button", { name: "Preparar respuesta" }).click();
  await page.locator(".answer").waitFor();
  assert.match(await page.locator(".answer").innerText(), /zonas.*cambios publicados.*comparaciones/is, "El asistente debe explicar su alcance en lenguaje comercial");
  assert.doesNotMatch(await page.locator(".answer").innerText(), /dataset|trazabilidad|evidencia autorizada/iu, "El alcance no debe exponer arquitectura técnica");
  await page.getByRole("button", { name: "Editar escenario" }).click();
  await page.locator("#scenario-dialog[open]").waitFor();
  await page.getByRole("button", { name: "Aplicar escenario" }).click();
  await page.waitForFunction(() => !document.querySelector("#scenario-dialog")?.hasAttribute("open"));
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.locator(".product-shell.nav-open").waitFor();
  assert.equal(await page.locator(".nav-scrim").isVisible(), true, "La capa solo debe mostrarse con el menú abierto");
  await page.locator(".nav-scrim").click({ position: { x: 380, y: 20 } });
  assert.equal(await page.locator(".nav-scrim").isVisible(), false, "La capa debe cerrar el menú");
  await page.screenshot({ path: path.join(outputDirectory, "assistant-390x844.png"), fullPage: true });

  await page.goto(`${baseUrl}/#projects`, { waitUntil: "networkidle" });
  await page.locator(".busy").waitFor({ state: "detached" });
  await page.locator(".project-select-checkbox:not(:disabled)").first().waitFor();
  const mobileCheckbox = await page.locator(".project-select-checkbox:not(:disabled)").first().boundingBox();
  assert.ok(mobileCheckbox && mobileCheckbox.width <= 20 && mobileCheckbox.height <= 20, "El selector debe conservar tamaño compacto en móvil");
  await page.locator(".project-select-checkbox:not(:disabled):not(:checked)").first().click();
  await page.locator(".project-select-checkbox:not(:disabled):not(:checked)").first().click();
  await page.getByRole("button", { name: "Comparar 2 proyectos" }).click();
  await page.locator(".comparison-project-card").first().waitFor();
  assert.equal(await page.locator(".comparison-project-card").count(), 2, "La selección móvil debe llegar al comparador");
  assert.equal(await hasHorizontalOverflow(page), false, "La comparación 390×844 no debe desbordar");
  await page.screenshot({ path: path.join(outputDirectory, "comparison-390x844.png"), fullPage: true });
  await page.getByRole("link", { name: "Cambiar selección" }).click();
  await page.locator(".project-select-checkbox").first().waitFor();
  await page.locator("[data-project-detail]").first().click();
  await page.locator("#project-detail-title").waitFor();
  assert.equal(await hasHorizontalOverflow(page), false, "La ficha 390×844 no debe desbordar");
  await page.screenshot({ path: path.join(outputDirectory, "projects-detail-390x844.png"), fullPage: true });

  await page.goto(`${baseUrl}/#activity`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: "Seguimiento comercial" }).waitFor();
  assert.equal(await hasHorizontalOverflow(page), false, "Seguimiento 390×844 no debe desbordar");
  assert.equal(await page.locator(".history-signal").count(), 5, "Seguimiento móvil debe conservar las señales");
  await page.screenshot({ path: path.join(outputDirectory, "activity-390x844.png"), fullPage: true });

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(`${baseUrl}/#dashboard`, { waitUntil: "networkidle" });
  await page.locator("path.district-boundary").waitFor();
  assert.equal(await hasHorizontalOverflow(page), false, "Panorama 768×1024 no debe desbordar");
  await page.getByRole("button", { name: "Abrir menú" }).click();
  assert.equal(await page.locator(".nav-scrim").isVisible(), true, "El menú debe funcionar en tablet");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".nav-scrim").isVisible(), false, "Escape debe cerrar el menú en tablet");

  const unavailablePage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await unavailablePage.route("**/api/v1/meta", (route) => route.abort("failed"));
  await unavailablePage.goto(`${baseUrl}/#dashboard`, { waitUntil: "networkidle" });
  await unavailablePage.locator(".startup-state--error").waitFor();
  assert.match(await unavailablePage.locator("main").innerText(), /API no está disponible/i);
  assert.equal(await unavailablePage.getByRole("button", { name: "Reintentar" }).count(), 1);
  await unavailablePage.unroute("**/api/v1/meta");
  await unavailablePage.getByRole("button", { name: "Reintentar" }).click();
  await unavailablePage.locator("h1").waitFor();
  assert.equal(await unavailablePage.locator(".startup-state--error").count(), 0, "Reintentar debe recuperar el workspace");
  await unavailablePage.close();

  const incompatiblePage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await incompatiblePage.route("**/api/v1/meta", async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    await route.fulfill({ response, json: { ...payload, contractVersion: "9.9.0" } });
  });
  await incompatiblePage.goto(`${baseUrl}/#dashboard`, { waitUntil: "networkidle" });
  await incompatiblePage.locator(".startup-state--error").waitFor();
  assert.match(await incompatiblePage.locator("main").innerText(), /no son compatibles/i);
  await incompatiblePage.close();

  const emptyPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await emptyPage.route("**/api/v1/projects?*", async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    await route.fulfill({
      response,
      json: { ...payload, items: [], total: 0, page: 1, pageCount: 0 },
    });
  });
  await emptyPage.goto(`${baseUrl}/#projects`, { waitUntil: "networkidle" });
  await emptyPage.getByText("No hay proyectos para los filtros activos.").waitFor();
  await emptyPage.close();

  assert.equal(consoleErrors.length, 0, `Errores de consola: ${consoleErrors.join(" | ")}`);
  assert.equal(observedRequests.some((url) => url.includes("demo-data")), false, "El navegador no debe pedir el snapshot");
  assert.equal(
    observedRequests.some((url) => !url.startsWith(baseUrl)),
    false,
    "El recorrido no debe depender de hosts externos",
  );
  console.log(`Productized E2E OK: ${routes.length} superficies, sin snapshot ni hosts externos.`);
} finally {
  await browser.close();
  await viteServer?.close();
  await apiApp?.close();
}

async function hasHorizontalOverflow(targetPage) {
  return targetPage.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
}

async function assertNoUnboundButtons(targetPage, route) {
  const buttons = await targetPage.locator("button:visible:not(:disabled)").evaluateAll((elements) =>
    elements
      .filter((button) => {
        const type = button.getAttribute("type") ?? "submit";
        if (type === "submit") return false;
        if (button.getAttribute("value") === "cancel") return false;
        return ![
          "action",
          "projectDetail",
          "projectPage",
          "projectRemove",
          "assistantCategory",
          "assistantIntent",
        ].some((key) => key in button.dataset);
      })
      .map((button) => button.textContent?.trim() || button.getAttribute("aria-label") || "sin nombre")
  );
  assert.deepEqual(buttons, [], `${route} no debe mostrar botones sin contrato de interacción`);
}

async function assertInteractiveFeedback(targetPage, route) {
  await targetPage.waitForFunction(() => {
    const elements = [...document.querySelectorAll("button:not(:disabled), a.button")]
      .filter((element) => element instanceof HTMLElement && element.offsetParent !== null && !element.classList.contains("nav-scrim"));
    return elements.length > 0 && elements.every((element) => {
      const style = getComputedStyle(element);
      return style.cursor === "pointer" && style.transitionDuration.split(",").some((value) => Number.parseFloat(value) > 0);
    });
  });
  const violations = await targetPage.locator("button:visible:not(:disabled), a.button:visible").evaluateAll((elements) =>
    elements
      .filter((element) => !element.classList.contains("nav-scrim"))
      .map((element) => {
        const style = getComputedStyle(element);
        const durations = style.transitionDuration.split(",").map((value) => Number.parseFloat(value));
        return {
          label: element.textContent?.trim() || element.getAttribute("aria-label") || "sin nombre",
          cursor: style.cursor,
          animated: durations.some((duration) => duration > 0),
        };
      })
      .filter((item) => item.cursor !== "pointer" || !item.animated)
  );
  assert.deepEqual(violations, [], `${route} debe dar feedback visual en todos los botones interactivos`);
}
