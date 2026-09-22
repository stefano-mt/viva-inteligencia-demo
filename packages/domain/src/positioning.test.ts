import { describe, expect, it } from "vitest";
import { matchesBedroomCount } from "./legacy/comparability.js";
import { summarizePositioning } from "./positioning.js";

describe("shared commercial query semantics", () => {
  it("uses inclusive bedroom ranges and preserves the missing-evidence policy", () => {
    const project = { bedrooms: "1 a 3", bedrooms_min: 1, bedrooms_max: 3 };
    expect(matchesBedroomCount(project, 1)).toBe(true);
    expect(matchesBedroomCount(project, 2)).toBe(true);
    expect(matchesBedroomCount(project, "3")).toBe(true);
    expect(matchesBedroomCount(project, 4)).toBe(false);
    expect(matchesBedroomCount(project, "all")).toBe(true);
    expect(matchesBedroomCount({}, 2)).toBe(true);
  });

  it("describes only finite positive plotted points without certifying a quotient", () => {
    expect(summarizePositioning([
      { areaM2: 50, pricePen: 400 }, { areaM2: 60, pricePen: 200 },
      { areaM2: null, pricePen: 999 }, { areaM2: 0, pricePen: 999 },
      { areaM2: 60, pricePen: 0 }, { areaM2: 60, pricePen: null },
      { areaM2: Number.NaN, pricePen: 999 }, { areaM2: 60, pricePen: Number.POSITIVE_INFINITY },
    ])).toEqual({ count: 2, medianPublishedPricePen: 300 });
    expect(summarizePositioning([])).toEqual({ count: 0, medianPublishedPricePen: null });
  });
});
