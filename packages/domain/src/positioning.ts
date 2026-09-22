import type { PositioningStats } from "@viva/contracts";
import { quantileR7 } from "./legacy/comparability.js";

/** Describes visible price/area points, never certifies a paired price per m². */
export function summarizePositioning(
  projects: Array<{ areaM2: number | null; pricePen: number | null }>,
): PositioningStats {
  const prices = projects
    .filter(({ areaM2, pricePen }) =>
      areaM2 !== null && Number.isFinite(areaM2) && areaM2 > 0 &&
      pricePen !== null && Number.isFinite(pricePen) && pricePen > 0)
    .map(({ pricePen }) => pricePen!);
  return { count: prices.length, medianPublishedPricePen: quantileR7(prices, 0.5) ?? null };
}
