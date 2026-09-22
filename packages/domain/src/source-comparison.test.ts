import { describe, expect, it } from "vitest";
import {
  buildProjectSourceComparison,
  compareProjectSourceValues,
  normalizeNumericRange,
  normalizePeruvianAddress,
  type ProjectSourceComparisonRow,
  type ProjectSourceObservation,
} from "./source-comparison.js";

function rowByField(
  rows: ProjectSourceComparisonRow[],
  field: ProjectSourceComparisonRow["field"],
): ProjectSourceComparisonRow {
  return rows.find((row) => row.field === field)!;
}

describe("source comparison normalizers", () => {
  it("normalizes common Peruvian address abbreviations without inventing components", () => {
    expect(normalizePeruvianAddress("Av. José Pardo N° 1234, Miraflores"))
      .toBe("avenida jose pardo 1234 miraflores");
    expect(normalizePeruvianAddress("Avenida Jose Pardo nro. 1234 - Miraflores"))
      .toBe("avenida jose pardo 1234 miraflores");
    expect(normalizePeruvianAddress("Ca. Las Flores #456, Dpto. 301"))
      .toBe("calle las flores 456 departamento 301");
    expect(normalizePeruvianAddress("Jr. Cuzco Nº 12 Int. 4"))
      .toBe("jiron cuzco 12 interior 4");
    expect(normalizePeruvianAddress(null)).toBeNull();
  });

  it("normalizes scalar and textual ranges with local number formats", () => {
    expect(normalizeNumericRange("Desde 69,56 hasta 98.25 m²"))
      .toEqual({ min: 69.56, max: 98.25, unit: "m2" });
    expect(normalizeNumericRange("2 a 3 dormitorios"))
      .toEqual({ min: 2, max: 3, unit: "count" });
    expect(normalizeNumericRange("S/ 940,736.84 – S/ 1,020,000", { unit: "PEN" }))
      .toEqual({ min: 940736.84, max: 1020000, unit: "PEN" });
    expect(normalizeNumericRange(69.88, { min: 69.56, max: 69.88, unit: "m2" }))
      .toEqual({ min: 69.56, max: 69.88, unit: "m2" });
    expect(normalizeNumericRange("69.56 a 98 m²", { min: 69.56, unit: "m2" }))
      .toEqual({ min: 69.56, max: 98, unit: "m2" });
    expect(normalizeNumericRange("sin dato")).toBeNull();
  });

  it("exposes the same semantic comparison for ingestion reconciliation", () => {
    expect(compareProjectSourceValues("address", "Av. Pardo N° 123", "Avenida Pardo 123"))
      .toBe("match");
    expect(compareProjectSourceValues("range", "69.56 a 69.88 m²", "69.88 m²"))
      .toBe("match");
    expect(compareProjectSourceValues("range", "2 a 3 dormitorios", "1 dormitorio"))
      .toBe("review");
    expect(compareProjectSourceValues("text", null, "Disponible"))
      .toBe("official_only");
  });
});

describe("buildProjectSourceComparison", () => {
  const nexo: ProjectSourceObservation = {
    id: "source:nexo",
    name: "Nexo Inmobiliario",
    type: "portal",
    observedData: {
      projectName: "Monterosso",
      address: "Av. Brasil Nro. 1415",
      typology: "Departamento",
      bedrooms: 2,
      bedroomsMin: 2,
      bedroomsMax: 2,
      totalArea: 69.56,
      totalAreaMin: 69.56,
      totalAreaMax: 69.88,
      unitStatus: "En construcción",
      unitCount: 40,
      listPrice: 500000,
      currency: "PEN",
      deliveryDate: "2026-10-31",
      amenities: ["Lobby", "Gimnasio"],
      financingBanks: ["BCP"],
    },
  };

  it("matches semantically compatible address and point-in-range values", () => {
    const result = buildProjectSourceComparison([
      nexo,
      {
        id: "source:web:grupotoratto.com",
        name: "Web propia de Toratto",
        type: "agency_website",
        observedData: {
          projectName: "MONTEROSSO",
          address: "Avenida Brasil #1415",
          typology: "Departamento",
          bedrooms: "2 dormitorios",
          totalArea: "69.88 m²",
          unitStatus: "En construccion",
          unitCount: "40 unidades",
          listPrice: "S/ 500,000",
          currency: "PEN",
          deliveryDate: "2026",
          amenities: ["Gimnasio", "Lobby", "Zona de parrillas"],
          financingBanks: ["BCP"],
        },
      },
    ]);

    expect(result.status).toBe("compared");
    expect(rowByField(result.rows, "address").status).toBe("match");
    expect(rowByField(result.rows, "bedrooms").status).toBe("match");
    expect(rowByField(result.rows, "totalArea").status).toBe("match");
    expect(rowByField(result.rows, "listPrice").status).toBe("match");
    expect(rowByField(result.rows, "amenities").status).toBe("additional");
    expect(rowByField(result.rows, "deliveryDate").status).toBe("additional");
    expect(result.summary.match).toBeGreaterThanOrEqual(7);
    expect(rowByField(result.rows, "totalArea").nexo?.original).toEqual({
      value: 69.56,
      min: 69.56,
      max: 69.88,
    });
  });

  it("marks incompatible observed values for review", () => {
    const result = buildProjectSourceComparison([
      nexo,
      {
        id: "source:web:example.com",
        type: "agency_website",
        observedData: {
          projectName: "Otro proyecto",
          address: "Jr. Lima 999",
          bedrooms: "4 dormitorios",
          totalArea: "120 a 150 m²",
          listPrice: "S/ 800,000",
          currency: "PEN",
        },
      },
    ]);

    expect(rowByField(result.rows, "projectName").status).toBe("review");
    expect(rowByField(result.rows, "address").status).toBe("review");
    expect(rowByField(result.rows, "bedrooms").status).toBe("review");
    expect(rowByField(result.rows, "totalArea").status).toBe("review");
    expect(rowByField(result.rows, "listPrice").status).toBe("review");
    expect(result.summary.review).toBe(5);
  });

  it("distinguishes source-only and unavailable fields", () => {
    const result = buildProjectSourceComparison([
      {
        id: "source:nexo",
        observedData: {
          projectName: "Versia",
          address: "Ca. Los Pinos 123",
        },
      },
      {
        id: "source:web:cantabriainmobiliaria.pe",
        type: "agency_website",
        observedData: {
          projectName: "VERSIA",
          amenities: ["Terraza"],
        },
      },
    ]);

    expect(rowByField(result.rows, "projectName").status).toBe("match");
    expect(rowByField(result.rows, "address").status).toBe("nexo_only");
    expect(rowByField(result.rows, "amenities").status).toBe("official_only");
    expect(rowByField(result.rows, "listPrice").status).toBe("unavailable");
  });

  it("keeps a verified website without published observations as linked only", () => {
    const result = buildProjectSourceComparison([
      nexo,
      {
        id: "source:web:cantabriainmobiliaria.pe",
        name: "Web propia de Cantabria",
        type: "agency_website",
        observedData: null,
      },
    ]);

    expect(result.status).toBe("linked_only");
    expect(result.sources.official).toEqual({
      id: "source:web:cantabriainmobiliaria.pe",
      name: "Web propia de Cantabria",
    });
    expect(result.rows).toEqual([]);
  });

  it("reports nexo-only and fully unavailable source sets deterministically", () => {
    expect(buildProjectSourceComparison([nexo]).status).toBe("nexo_only");
    expect(buildProjectSourceComparison([nexo]).rows).toEqual([]);
    const unavailable = buildProjectSourceComparison([]);
    expect(unavailable.status).toBe("unavailable");
    expect(unavailable.rows).toEqual([]);
  });

  it("does not accept concatenated address or date noise as a match", () => {
    const result = buildProjectSourceComparison([
      nexo,
      {
        id: "source:web:example.com",
        type: "agency_website",
        observedData: {
          projectName: "Monterosso",
          address: "Av. Brasil 1415 Hasta 2 dormitorios Desde 69",
          deliveryDate: "Jr. Brasil 1415 diciembre 2026",
        },
      },
    ]);

    expect(rowByField(result.rows, "address").status).toBe("review");
    expect(rowByField(result.rows, "deliveryDate").status).toBe("review");
    expect(compareProjectSourceValues("date", "2028", "Entrega 2028 Sobre el Proyecto"))
      .toBe("review");
    expect(compareProjectSourceValues("date", "2028", "Entrega 2028"))
      .toBe("match");
  });
});
