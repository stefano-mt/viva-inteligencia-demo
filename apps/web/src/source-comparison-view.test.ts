import { describe, expect, it } from "vitest";
import {
  compactCommercialSourceValue,
  commercialSourceLabel,
  commercialSourceMessage,
  formatPublishedSourceDate,
  qualifiedSourceText,
  readSourceComparisonPairs,
  readSourceComparisonRows,
  summarizeCommercialSources,
} from "./source-comparison-view.js";

describe("project source comparison presentation", () => {
  it("turns the API read model into the three commercial states", () => {
    const rows = readSourceComparisonRows({
      status: "compared",
      rows: [
        { field: "address", status: "same", nexoValue: "Av. Central 120", officialValue: "Av. Central 120" },
        { field: "amenities", status: "official_only", nexoValue: null, officialValue: ["Piscina"] },
        { field: "listPrice", status: "different", nexoValue: 500000, officialValue: 520000 },
      ],
    });

    expect(rows.map((row) => commercialSourceLabel(row.status))).toEqual([
      "Coincide",
      "Aporta información",
      "Revisar",
    ]);
    expect(summarizeCommercialSources(rows)).toEqual({ same: 1, additional: 1, review: 1 });
    expect(commercialSourceMessage(rows[1]!)).toBe("La web oficial añade este dato.");
  });

  it("accepts snake-case values while the API contract is rolled out", () => {
    expect(readSourceComparisonRows({
      rows: [{ field: "bedrooms", status: "match", nexo_value: "2", official_value: "2" }],
    })).toEqual([{ field: "bedrooms", status: "same", nexoValue: "2", officialValue: "2" }]);
  });

  it("uses the original value from the normalized source-comparison contract", () => {
    expect(readSourceComparisonRows({
      status: "compared",
      summary: { same: 1, additional: 0, review: 0 },
      rows: [{
        field: "totalArea",
        label: "Área total",
        status: "same",
        nexo: { original: { value: 69.88, min: 69.56, max: 69.88 }, normalized: { min: 69.56, max: 69.88 } },
        official: { original: { value: 69.88 }, normalized: { min: 69.88, max: 69.88 } },
      }],
    })).toEqual([{
      field: "totalArea",
      label: "Área total",
      status: "same",
      nexoValue: { value: 69.88, min: 69.56, max: 69.88 },
      officialValue: { value: 69.88 },
    }]);
  });

  it("keeps an unknown difference visible instead of declaring a match", () => {
    const [row] = readSourceComparisonRows({
      rows: [{ field: "deliveryDate", nexoValue: "2026-01", officialValue: "2026-04" }],
    });
    expect(row?.status).toBe("review");
    expect(commercialSourceMessage(row!)).toContain("Confirma cuál está vigente");
  });

  it("ignores malformed rows", () => {
    expect(readSourceComparisonRows({ rows: [null, {}, { field: "" }] })).toEqual([]);
  });

  it("does not present empty unavailable rows as useful additions", () => {
    expect(readSourceComparisonRows({
      rows: [{ field: "financingBanks", status: "unavailable", nexo: null, official: null }],
    })).toEqual([]);
  });

  it("keeps long collected text compact in the comparison", () => {
    const source = "Dirección publicada ".repeat(12);
    const compact = compactCommercialSourceValue(source, 60);
    expect(Array.from(compact)).toHaveLength(60);
    expect(compact.endsWith("…")).toBe(true);
  });

  it("keeps an upper limit instead of displaying a normalized exact bedroom count", () => {
    expect(qualifiedSourceText({ value: "Hasta 2 dormitorios", min: 2, max: 2 })).toBe("Hasta 2 dormitorios");
    expect(qualifiedSourceText({ value: "Desde 69.56 m²", min: 69.56, max: 69.88 })).toBe("Desde 69.56 m²");
    expect(qualifiedSourceText({ value: 2, min: 2, max: 3 })).toBeNull();
  });

  it("preserves published ambs without calling them bedrooms", () => {
    expect(qualifiedSourceText("2 y 3 ambs")).toBe("2 y 3 ambs");
    expect(readSourceComparisonRows({ rows: [{ field: "roomDescription", status: "official_only", official: { original: "2 y 3 ambs" } }] })[0])
      .toMatchObject({ field: "roomDescription", officialValue: "2 y 3 ambs" });
  });

  it("preserves year or month delivery precision and does not shift published days", () => {
    expect(formatPublishedSourceDate("2028")).toBe("2028");
    expect(formatPublishedSourceDate("2028-03")).toBe("marzo de 2028");
    expect(formatPublishedSourceDate("2028-03-01T00:00:00.000Z")).toMatch(/^01 mar/);
    expect(formatPublishedSourceDate("Entrega 2028")).toBe("Entrega 2028");
    expect(formatPublishedSourceDate(null)).toBeNull();
  });

  it("retains individual unit comparisons in API order instead of flattening values", () => {
    const duplex = { sources: { official: { sourceUrl: "https://example.com/duplex", scope: "unit" } }, rows: [{ field: "totalArea", official: { original: 245.47 } }] };
    const flat = { sources: { official: { sourceUrl: "https://example.com/flat", scope: "unit" } }, rows: [{ field: "totalArea", official: { original: 130.83 } }] };
    expect(readSourceComparisonPairs({ comparisons: [duplex, flat], rows: duplex.rows })).toEqual([duplex, flat]);
    expect(readSourceComparisonPairs(duplex)).toEqual([duplex]);
    expect(readSourceComparisonPairs(null)).toEqual([]);
  });

  it("uses the server explanation for differences in capture scope", () => {
    const [row] = readSourceComparisonRows({ rows: [{
      field: "totalArea", status: "additional", nexoValue: 126.09, officialValue: 245.47,
      message: "La web describe un departamento específico, no el rango completo del proyecto.",
    }] });
    expect(commercialSourceMessage(row!)).toBe("La web describe un departamento específico, no el rango completo del proyecto.");
  });
});
