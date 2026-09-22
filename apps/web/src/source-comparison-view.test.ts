import { describe, expect, it } from "vitest";
import {
  compactCommercialSourceValue,
  commercialSourceLabel,
  commercialSourceMessage,
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
});
