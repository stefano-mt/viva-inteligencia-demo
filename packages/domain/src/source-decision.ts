import type {
  JsonValue,
  NormalizedNumericRange,
  ProjectSourceComparison,
  ProjectSourceComparisonRow,
  ProjectSourceFieldValue,
  ProjectSourcePairComparison,
} from "./source-comparison.js";

export interface SourceDecisionItem {
  field: string;
  message: string;
}

export interface SourceDecisionSummary {
  headline: string;
  opportunities: SourceDecisionItem[];
  checks: SourceDecisionItem[];
  priceMessage: string;
  scopeNote: string;
}

/** Commercial reading of observed values only; never recommends a selling price. */
export function buildSourceDecisionSummary(comparison: ProjectSourceComparison): SourceDecisionSummary {
  const pairs = comparison.comparisons?.length ? comparison.comparisons : [comparison];
  const compared = pairs.filter((pair) => pair.status === "compared");
  const opportunities: SourceDecisionItem[] = [];
  const checks: SourceDecisionItem[] = [];
  for (const pair of compared) {
    const unit = pair.sources.official?.scope === "unit";
    const sourceLabel = unit ? "La ficha de unidad" : "La web";
    for (const row of pair.rows) {
      if (row.field === "listPrice") continue;
      if (row.status === "review") {
        checks.push({
          field: row.field,
          message: `${row.label}: Nexo indica ${displayValue(row.nexo)} y la web ${displayValue(row.official)}. Comprueba a qué oferta y fecha corresponde cada dato.`,
        });
      } else if (row.official && (row.status === "additional" || row.status === "official_only")) {
        const message = opportunityMessage(row, sourceLabel, unit);
        if (message) opportunities.push({ field: row.field, message });
      }
    }
  }
  const uniqueOpportunities = deduplicate(opportunities);
  const uniqueChecks = deduplicate(checks);
  const hasUnitPages = compared.some((pair) => pair.sources.official?.scope === "unit");
  return {
    headline: compared.length === 0
      ? "Aún no hay una captura web para contrastar con Nexo."
      : uniqueOpportunities.length > 0
        ? "La web aporta detalles para preparar la comparación comercial."
        : uniqueChecks.length > 0
          ? "Hay diferencias entre Nexo y la web que conviene aclarar."
          : "Los datos compartidos por Nexo y la web coinciden.",
    opportunities: uniqueOpportunities,
    checks: uniqueChecks,
    priceMessage: priceMessage(pairs),
    scopeNote: hasUnitPages
      ? "La web incluye fichas de unidades concretas: sus áreas, dormitorios y precios no describen toda la oferta del proyecto."
      : "Cada fuente conserva su fecha de captura. Un dato que no aparece en una captura no significa que el proyecto no lo tenga.",
  };
}

function opportunityMessage(row: ProjectSourceComparisonRow, sourceLabel: string, unit: boolean): string | null {
  if (row.field === "amenities" || row.field === "financingBanks") {
    const original = row.official!.normalized;
    const nexo = Array.isArray(row.nexo?.normalized) ? row.nexo.normalized : [];
    const additions = (Array.isArray(original) ? original : [])
      .filter((value) => !nexo.includes(value));
    if (!additions.length) return null;
    const values = additions.map(listLabel).join(", ");
    return row.field === "amenities"
      ? `${sourceLabel} añade a la descripción: ${values}. Son detalles no mencionados en la captura de Nexo que puedes revisar al comparar servicios.`
      : `${sourceLabel} menciona ${values} como financiamiento; confirma las condiciones para la oferta que evaluarás.`;
  }
  const value = displayValue(row.official);
  if (unit && ["totalArea", "bedrooms", "unitCount", "unitStatus"].includes(row.field)) {
    return `${sourceLabel} informa ${row.label.toLocaleLowerCase("es-PE")}: ${value}. Es el detalle de esa unidad, no un cambio de todo el proyecto.`;
  }
  if (row.field === "totalArea") {
    return `${sourceLabel} informa un área de ${value}${row.nexo ? `; Nexo muestra ${displayValue(row.nexo)}` : ""}. Revisa qué modelos cubre cada fuente antes de comparar tamaños.`;
  }
  if (row.field === "bedrooms") {
    return `${sourceLabel} anuncia ${value} dormitorios${row.nexo ? `; Nexo indica ${displayValue(row.nexo)}` : ""}. El detalle disponible no es idéntico; elige el mismo modelo para comparar.`;
  }
  if (row.field === "roomDescription") {
    return `${sourceLabel} publica «${value}». Confirma qué comprende esa distribución; ambientes no equivale por sí solo a dormitorios.`;
  }
  if (row.field === "deliveryDate") {
    return `${sourceLabel} anuncia entrega ${value}${row.nexo ? `; Nexo detalla ${displayValue(row.nexo)}` : ""}. Confirma el plazo del modelo que interesa al cliente.`;
  }
  if (row.status === "official_only") {
    return `${sourceLabel} añade ${row.label.toLocaleLowerCase("es-PE")}: ${value}, no informado en la captura de Nexo.`;
  }
  return null;
}

function priceMessage(pairs: ProjectSourcePairComparison[]): string {
  const prices = pairs.flatMap((pair) => pair.rows
    .filter((row) => row.field === "listPrice")
    .map((row) => ({ row, unit: pair.sources.official?.scope === "unit" })));
  if (!prices.some(({ row }) => row.official)) {
    if (!prices.some(({ row }) => row.nexo)) {
      return "No hay precios capturados de ambas fuentes para contrastar una misma oferta. No se demuestra un descuento ni un precio de cierre.";
    }
    return "El precio disponible procede de Nexo; aún no hay un precio web capturado para contrastarlo. No se demuestra un descuento ni un precio de cierre.";
  }
  if (prices.some(({ row, unit }) => unit && row.official)) {
    return "Hay un precio web de una unidad concreta. Compáralo solo con el precio de esa misma unidad en Nexo; no con el precio mínimo del proyecto.";
  }
  if (prices.some(({ row }) => row.status === "review")) {
    return "Los importes publicados difieren. Revisa moneda, modelo y fecha antes de atribuir la diferencia a un descuento.";
  }
  if (prices.some(({ row }) => row.status === "match")) {
    return "Las fuentes muestran el mismo importe publicado. Confirma que corresponde al mismo modelo y fecha antes de usarlo para negociar.";
  }
  return "La web aporta un precio publicado, pero no una oferta equivalente confirmada en Nexo. No se usa para calcular un descuento.";
}

function displayValue(value: ProjectSourceFieldValue | null): string {
  if (!value) return "no informado";
  const normalized = value.normalized;
  if (normalized && typeof normalized === "object" && !Array.isArray(normalized)) {
    if (typeof normalized.min === "number" && typeof normalized.max === "number") {
      const range = normalized as unknown as NormalizedNumericRange;
      const bounds = range.min === range.max ? number(range.min) : `${number(range.min)}–${number(range.max)}`;
      const qualifier = range.qualifier === "at_most" ? "hasta " : range.qualifier === "at_least" ? "desde " : "";
      return `${qualifier}${range.unit === "PEN" ? "S/ " : range.unit === "USD" ? "US$ " : ""}${bounds}${range.unit === "m2" ? " m²" : ""}`;
    }
    if (typeof normalized.precision === "string" && normalized.precision !== "unparsed") {
      const date = String(normalized.value);
      const parts = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/u.exec(date);
      if (!parts || !parts[2]) return date;
      const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
      const month = months[Number(parts[2]) - 1];
      if (!month) return date;
      return `${parts[3] ? `${Number(parts[3])} de ` : ""}${month} de ${parts[1]}`;
    }
  }
  return originalText(value.original);
}

function originalText(value: JsonValue): string {
  if (value == null) return "no informado";
  if (Array.isArray(value)) return value.map(originalText).join(", ");
  if (typeof value === "object") return originalText(value.value ?? value.min ?? null);
  return String(value);
}

function number(value: number): string {
  return value.toLocaleString("es-PE", { maximumFractionDigits: 2 });
}

function listLabel(value: JsonValue): string {
  const labels: Record<string, string> = {
    "sala de usos multiples": "sala de usos múltiples",
    "zona de parrillas": "zona de parrillas",
    gimnasio: "gimnasio",
    bcp: "BCP",
  };
  return labels[String(value)] ?? String(value);
}

function deduplicate(items: SourceDecisionItem[]): SourceDecisionItem[] {
  return items.filter((item, index) => items.findIndex((candidate) => candidate.field === item.field
    && candidate.message === item.message) === index);
}
