import { describe, expect, it } from "vitest";
import { buildProjectSourceComparison, type ProjectSourceObservation } from "./source-comparison.js";
import { buildSourceDecisionSummary } from "./source-decision.js";

function read(nexoData: Record<string, unknown>, webData: Record<string, unknown>, scope: "project" | "unit" = "project") {
  const sources: ProjectSourceObservation[] = [
    { id: "source:nexo", observedData: nexoData },
    { id: "source:web:example.com", type: "agency_website", scope, observedData: webData },
  ];
  return buildSourceDecisionSummary(buildProjectSourceComparison(sources));
}

describe("buildSourceDecisionSummary", () => {
  it("identifies only terrace and bicycle parking as MONTEROSSO additions", () => {
    const result = read({ amenities: ["Areas verdes", "Jardin interior", "Lobby", "Zona de Parrillas"] },
      { amenities: ["Estacionamientos para bicicletas", "Lobby", "Terraza", "Área de parrilla"] });
    const amenity = result.opportunities.find((item) => item.field === "amenities")!.message;
    expect(amenity).toContain("estacionamientos para bicicletas");
    expect(amenity).toContain("terraza");
    expect(amenity).not.toContain("parrilla");
  });
  it("shows concrete additional amenities without calling missing Nexo mentions absent", () => {
    const result = read({ projectName: "Proyecto", amenities: ["SUM", "Lobby"], listPrice: 600000, currency: "PEN" },
      { projectName: "Proyecto", amenities: ["Sala de usos múltiples", "Lobby", "Parrillas"] });
    expect(result.opportunities).toEqual([{
      field: "amenities",
      message: "La web añade a la descripción: zona de parrillas. Son detalles no mencionados en la captura de Nexo que puedes revisar al comparar servicios.",
    }]);
    expect(result.priceMessage).toContain("aún no hay un precio web capturado");
    expect(result.checks).toEqual([]);
    expect(result.scopeNote).toContain("no significa que el proyecto no lo tenga");
  });

  it("explains ranges and delivery precision with the actual observed values", () => {
    const result = read({ totalArea: "60 a 98 m²", bedrooms: "2 dormitorios", deliveryDate: "2028-03-01T00:00:00.000Z" },
      { totalArea: "60 m²", bedrooms: "Hasta 2 dormitorios", deliveryDate: "Entrega 2028" });
    expect(result.opportunities.find((item) => item.field === "totalArea")?.message).toContain("60–98 m²");
    expect(result.opportunities.find((item) => item.field === "bedrooms")?.message).toContain("hasta 2 dormitorios; Nexo indica 2");
    expect(result.opportunities.find((item) => item.field === "deliveryDate")?.message).toContain("1 de marzo de 2028");
    expect(result.checks).toEqual([]);
    expect(result.priceMessage).toContain("No hay precios capturados");
  });

  it("explains rooms without renaming them bedrooms and preserves month precision", () => {
    const result = read({ bedrooms: "2 a 3", deliveryDate: "2027-03-01" },
      { roomDescription: "2 y 3 ambs", deliveryDate: "MARZO 2027" });
    expect(result.opportunities.find((item) => item.field === "roomDescription")?.message).toContain("ambientes no equivale por sí solo a dormitorios");
    expect(result.opportunities.find((item) => item.field === "deliveryDate")?.message).toContain("entrega marzo de 2027; Nexo detalla 1 de marzo de 2027");
  });

  it("explains disagreements without claiming which source is correct or inferring discounts", () => {
    const result = read({ totalArea: "60 m²", listPrice: 600000, currency: "PEN" },
      { totalArea: "80 m²", listPrice: 500000, currency: "PEN" });
    expect(result.checks[0]?.message).toContain("Nexo indica 60 m² y la web 80 m²");
    expect(result.priceMessage).toContain("antes de atribuir la diferencia a un descuento");
    expect(result.headline).toContain("conviene aclarar");
  });

  it("does not market unit detail as a discrepancy with a project minimum", () => {
    const result = read({ totalArea: "126 m²", listPrice: 1169000, currency: "PEN" },
      { totalArea: "245.47 m²", listPrice: 1500000, currency: "PEN" }, "unit");
    expect(result.checks).toEqual([]);
    expect(result.opportunities[0]?.message).toContain("no un cambio de todo el proyecto");
    expect(result.scopeNote).toContain("unidades concretas");
    expect(result.priceMessage).toContain("no con el precio mínimo del proyecto");
  });

  it("does not treat a linked website as captured evidence", () => {
    const result = buildSourceDecisionSummary(buildProjectSourceComparison([
      { id: "source:nexo", observedData: { projectName: "Proyecto" } },
      { id: "source:web:example.com", sourceUrl: "https://example.com", type: "agency_website" },
    ]));
    expect(result.headline).toContain("Aún no hay una captura web");
    expect(result.opportunities).toEqual([]);
    expect(result.checks).toEqual([]);
  });
});
