import assert from "node:assert/strict";
import test from "node:test";
import { extractProjectObservations } from "./extractors/index.js";

test("VERSIA extracts only page-scoped visible facts and preserves ambientes", () => {
  const html = `<!doctype html><html><head><title>Una nueva forma de vivir</title></head><body>
    <h1>Vive como siempre quisiste</h1>
    <section><p>Ca. Enrique Palacios 830, Miraflores</p><p>60m2 a 98m2</p>
      <p>2 y 3 ambs</p><p>Entrega 2028</p></section>
    <section><h2>Preguntas frecuentes sobre Versia</h2></section>
    <aside>Campaña vencida: precio regular S/ 615 000; promocional S/ 580 000.</aside>
    <form><label>Contacto</label><input value="persona@example.test"><p>+51 999 888 777</p></form>
  </body></html>`;
  const result = extractProjectObservations(html, {
    sourceId: "cantabria-official-website",
    sourceUrl: "https://cantabriainmobiliaria.pe/proyecto/versia-miraflores/",
    projectExternalId: "3981",
  });

  assert.equal(value(result, "project_name"), "VERSIA");
  assert.equal(value(result, "address"), "Ca. Enrique Palacios 830, Miraflores");
  assert.equal(value(result, "area"), "60m2 a 98m2");
  assert.equal(field(result, "area")?.unit, "m2");
  assert.equal(value(result, "typologies"), "2 y 3 ambs");
  assert.equal(value(result, "delivery_date"), 2028);
  assert.equal(value(result, "bedrooms"), undefined);
  assert.equal(value(result, "published_price"), undefined);
  assert.doesNotMatch(JSON.stringify(result.fields), /example\.test|999\s*888\s*777/u);
  assert.equal(profileAttempt(result)?.applicable, true);
  assert.equal(profileAttempt(result)?.acceptedFields, 5);
});

test("VERSIA profile also recognizes the reviewed redirect destination", () => {
  const result = extractProjectObservations(
    `<main><h2>Versia</h2><p>Enrique Palacios 830, Miraflores</p><p>60 m² a 98 m²</p><p>2 y 3 ambientes</p><p>Entrega en 2028</p></main>`,
    {
      sourceId: "cantabria-official-website",
      sourceUrl: "https://cantabriainmobiliaria.pe/landing-versia/",
      projectExternalId: "3981",
    },
  );

  assert.equal(value(result, "project_name"), "VERSIA");
  assert.equal(value(result, "area"), "60 m² a 98 m²");
  assert.equal(value(result, "typologies"), "2 y 3 ambientes");
  assert.equal(value(result, "delivery_date"), 2028);
});

test("MONTEROSSO excludes forms and every unrelated project after the explicit boundary", () => {
  const html = `<!doctype html><html><head>
    <meta name="generator" content="WordPress 6.8"><meta property="og:title" content="Monterosso">
  </head><body><main>
    <h1 class="entry-title">Monterosso</h1>
    <p>Jr. Coronel Zegarra 1045 - 1057</p>
    <p>Hasta 2 dormitorios</p><p>Desde 69.56 hasta 69.88 m²</p>
    <h3>Estacionamientos para bicicletas</h3><h3>Lobby</h3><h3>Excelente Ubicación</h3>
    <h3>Terraza</h3><h3>Área de parrilla</h3>
    <form><p>Contacto +51 940 576 016</p><input value="ventas@example.test"></form>
    <h2>Últimos departamentos</h2>
    <article><h3>Vernazza</h3><p>Jr. Inca Rípac 338</p><p>Hasta 3 dormitorios</p>
      <p>Desde 38 m² hasta 166 m²</p><h4>Piscina</h4><p>Desde S/ 400,000</p></article>
  </main></body></html>`;
  const result = extractProjectObservations(html, {
    sourceId: "toratto-official-website",
    sourceUrl: "https://www.grupotoratto.com/departamento/monterosso/",
    projectExternalId: "1940",
  });

  assert.equal(value(result, "project_name"), "MONTEROSSO");
  assert.equal(value(result, "address"), "Jr. Coronel Zegarra 1045 - 1057");
  assert.equal(value(result, "area"), "Desde 69.56 hasta 69.88 m²");
  assert.equal(field(result, "area")?.unit, "m2");
  assert.equal(value(result, "bedrooms"), "Hasta 2 dormitorios");
  assert.deepEqual(value(result, "amenities"), [
    "Estacionamientos para bicicletas",
    "Lobby",
    "Terraza",
    "Área de parrilla",
  ]);
  assert.equal(value(result, "published_price"), undefined);
  assert.doesNotMatch(JSON.stringify(result.fields), /Vernazza|Piscina|example\.test|940\s*576\s*016/u);
  assert.equal(profileAttempt(result)?.applicable, true);
  assert.equal(profileAttempt(result)?.acceptedFields, 5);
});

test("official profiles fail closed for a different route, source or project identity", () => {
  const html = `<h1>Monterosso</h1><p>Jr. Coronel Zegarra 1045 - 1057</p>
    <p>Hasta 2 dormitorios</p><p>Desde 69.56 hasta 69.88 m²</p>`;
  const contexts = [
    {
      sourceId: "toratto-official-website",
      sourceUrl: "https://www.grupotoratto.com/proteccion-al-consumidor/",
      projectExternalId: "1940",
    },
    {
      sourceId: "another-source",
      sourceUrl: "https://www.grupotoratto.com/departamento/monterosso/",
      projectExternalId: "1940",
    },
    {
      sourceId: "toratto-official-website",
      sourceUrl: "https://www.grupotoratto.com/departamento/monterosso/",
      projectExternalId: "3328",
    },
  ];

  for (const context of contexts) {
    const result = extractProjectObservations(html, context);
    assert.equal(profileAttempt(result)?.applicable, false);
    assert.equal(value(result, "area"), undefined);
    assert.equal(value(result, "bedrooms"), undefined);
  }
});

function profileAttempt(result: ReturnType<typeof extractProjectObservations>) {
  return result.attempts.find(({ extractorId }) => extractorId === "official-project-profile-v1");
}

function field(result: ReturnType<typeof extractProjectObservations>, fieldName: string) {
  return result.fields.find(({ field: candidateField }) => candidateField === fieldName);
}

function value(result: ReturnType<typeof extractProjectObservations>, fieldName: string): string | number | string[] | undefined {
  return field(result, fieldName)?.normalizedValue;
}
