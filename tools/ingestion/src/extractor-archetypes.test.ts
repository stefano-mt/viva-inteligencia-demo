import assert from "node:assert/strict";
import test from "node:test";
import { extractProjectObservations } from "./extractors/index.js";

test("JSON-LD accepts a published price only from an offer nested in one named project", () => {
  const result = extractProjectObservations(`<!doctype html><html><head>
    <script type="application/ld+json">${JSON.stringify({
      "@type": "ApartmentComplex",
      name: "Parque Central",
      brand: { "@type": "Organization", name: "Inmobiliaria Demo" },
      address: { streetAddress: "Av. Principal 123", addressLocality: "Miraflores" },
      offers: { "@type": "Offer", price: "520000", priceCurrency: "PEN", availability: "InStock" },
      floorSize: { value: 65.5, unitText: "m²" },
      numberOfBedrooms: 2,
    })}</script>
  </head></html>`);

  assert.equal(value(result, "project_name"), "Parque Central");
  assert.equal(value(result, "published_price"), 520000);
  assert.equal(value(result, "currency"), "PEN");
  assert.equal(value(result, "area"), 65.5);
  assert.equal(result.issues.length, 0);
  assert.equal(result.attempts.find((attempt) => attempt.archetype === "json_ld")?.applicable, true);
});

test("generic HTML never turns an unattached banner or product meta into a project price", () => {
  const result = extractProjectObservations(`<!doctype html><html><head>
    <meta property="og:title" content="Proyecto Seguro">
    <meta property="product:price:amount" content="399000">
    <meta property="product:price:currency" content="PEN">
  </head><body><aside>Promoción desde S/ 350,000</aside></body></html>`);

  assert.equal(value(result, "project_name"), "Proyecto Seguro");
  assert.equal(value(result, "published_price"), undefined);
  assert.equal(value(result, "currency"), undefined);
});

test("embedded project JSON supports the non-WordPress priority archetype", () => {
  const payload = {
    props: {
      project: {
        projectId: "NEXO-88",
        projectName: "Vista del Parque",
        direccion: "Calle Prueba 456, San Isidro",
        areaTotal: { value: "72.4", unit: "m2" },
        dormitorios: 3,
        tipologias: ["Flat", "Dúplex"],
        areasComunes: ["Terraza", "Sala de usos múltiples"],
        publishedPrice: "680000",
        currency: "PEN",
        fechaEntrega: "2027-03",
      },
    },
  };
  const result = extractProjectObservations(
    `<script>window.__INITIAL_STATE__ = ${JSON.stringify(payload)};</script>`,
    { projectExternalId: "NEXO-88", preferredArchetypes: ["embedded_json"] },
  );

  assert.equal(value(result, "project_name"), "Vista del Parque");
  assert.equal(value(result, "published_price"), 680000);
  assert.equal(value(result, "currency"), "PEN");
  assert.deepEqual(value(result, "typologies"), ["Flat", "Dúplex"]);
  assert.equal(result.attempts.find((attempt) => attempt.archetype === "embedded_json")?.acceptedFields, 9);
});

test("conflicting prices on one page fail closed instead of selecting a minimum", () => {
  const payload = {
    projects: [
      { type: "project", name: "Proyecto Uno", publishedPrice: 500000, currency: "PEN" },
      { type: "project", name: "Proyecto Dos", publishedPrice: 620000, currency: "PEN" },
    ],
  };
  const result = extractProjectObservations(`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(payload)}</script>`);

  assert.equal(value(result, "published_price"), undefined);
  assert.equal(value(result, "currency"), undefined);
  assert.ok(result.issues.some((issue) => issue.code === "AMBIGUOUS_FIELD" && issue.field === "published_price"));
});

test("equal prices belonging to two projects are still ambiguous", () => {
  const payload = {
    projects: [
      { type: "project", name: "Proyecto Uno", publishedPrice: "S/ 500,000", currency: "PEN" },
      { type: "project", name: "Proyecto Dos", publishedPrice: "S/ 500,000", currency: "PEN" },
    ],
  };
  const result = extractProjectObservations(`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(payload)}</script>`);
  assert.equal(value(result, "published_price"), undefined);
  assert.ok(result.issues.some((issue) => issue.code === "AMBIGUOUS_FIELD" && issue.field === "published_price"));
});

test("a project price without an explicit currency fails closed", () => {
  const result = extractProjectObservations(`<script type="application/ld+json">${JSON.stringify({
    "@type": "ApartmentComplex",
    name: "Proyecto Sin Moneda",
    offers: { price: 450000 },
  })}</script>`);

  assert.equal(value(result, "published_price"), undefined);
  assert.ok(result.issues.some((issue) => issue.code === "PRICE_WITHOUT_CURRENCY"));
});

test("WordPress extracts only labeled project facts and leaves price to structured extractors", () => {
  const result = extractProjectObservations(`<!doctype html><html><head>
    <meta name="generator" content="WordPress 6.8">
    <meta property="og:site_name" content="Inmobiliaria Demo">
  </head><body><article class="project">
    <h1 class="entry-title">Residencial Jardines</h1>
    <dl><dt>Dirección</dt><dd>Av. Los Jardines 100</dd><dt>Dormitorios</dt><dd>2</dd></dl>
    <div>Precio promocional S/ 420,000</div>
  </article><script src="/wp-content/theme.js"></script></body></html>`);

  assert.equal(value(result, "project_name"), "Residencial Jardines");
  assert.equal(value(result, "address"), "Av. Los Jardines 100");
  assert.equal(value(result, "bedrooms"), 2);
  assert.equal(value(result, "published_price"), undefined);
  assert.equal(result.attempts.find((attempt) => attempt.archetype === "wordpress")?.applicable, true);
});

test("invalid structured payload is recorded without leaking raw content or failing the batch", () => {
  const result = extractProjectObservations(`<script type="application/ld+json">{"name":"broken"</script><h1>Proyecto visible</h1>`);
  assert.equal(value(result, "project_name"), "Proyecto visible");
  assert.deepEqual(result.issues.map((issue) => issue.code), ["STRUCTURED_PAYLOAD_INVALID"]);
  assert.doesNotMatch(JSON.stringify(result), /\{"name":"broken"/u);
});

function value(result: ReturnType<typeof extractProjectObservations>, field: string): string | number | string[] | undefined {
  return result.fields.find((item) => item.field === field)?.normalizedValue;
}
