export type SourceClass = "authorized_feed" | "official_project_website" | "public_aggregator";
export type ReviewStatus = "approved" | "pending" | "blocked";
export type RobotsStatus = "allow" | "deny" | "unknown" | "not_applicable";
export type ExecutionIntent = "discover" | "collect";

export interface SourceCandidate {
  sourceId: string;
  sourceClass: SourceClass;
  officialDomainConfirmed: boolean;
  reviewStatus: ReviewStatus;
  robotsStatus: RobotsStatus;
  authorizationReference?: string;
}

export interface PolicyDecision {
  allowed: boolean;
  code:
    | "DISCOVERY_ONLY"
    | "COLLECTION_ALLOWED"
    | "SOURCE_BLOCKED"
    | "OFFICIAL_DOMAIN_REQUIRED"
    | "ROBOTS_DENIED"
    | "LEGAL_REVIEW_REQUIRED"
    | "AUTHORIZATION_REQUIRED";
  reason: string;
}

export function evaluateSource(candidate: SourceCandidate, intent: ExecutionIntent): PolicyDecision {
  if (candidate.reviewStatus === "blocked") {
    return {
      allowed: false,
      code: "SOURCE_BLOCKED",
      reason: "La fuente tiene una restricción contractual, técnica u operativa registrada."
    };
  }

  if (intent === "discover") {
    return {
      allowed: true,
      code: "DISCOVERY_ONLY",
      reason: "Se permite inventariar metadatos ya auditados; no se descargan páginas ni documentos."
    };
  }

  if (candidate.sourceClass === "official_project_website" && !candidate.officialDomainConfirmed) {
    return {
      allowed: false,
      code: "OFFICIAL_DOMAIN_REQUIRED",
      reason: "La recolección exige confirmar que el dominio pertenece a la inmobiliaria."
    };
  }

  if (candidate.robotsStatus === "deny") {
    return {
      allowed: false,
      code: "ROBOTS_DENIED",
      reason: "La política robots registrada impide recolectar las rutas relevantes."
    };
  }

  if (candidate.sourceClass !== "authorized_feed" && candidate.robotsStatus !== "allow") {
    return {
      allowed: false,
      code: "LEGAL_REVIEW_REQUIRED",
      reason: "La política de acceso no está confirmada para esta fuente web."
    };
  }

  if (candidate.reviewStatus !== "approved") {
    return {
      allowed: false,
      code: "LEGAL_REVIEW_REQUIRED",
      reason: "La revisión legal y operativa todavía no autoriza la recolección."
    };
  }

  if (!candidate.authorizationReference?.trim()) {
    return {
      allowed: false,
      code: "AUTHORIZATION_REQUIRED",
      reason: "Falta una referencia auditable de autorización, contrato o licencia."
    };
  }

  return {
    allowed: true,
    code: "COLLECTION_ALLOWED",
    reason: "La fuente cumple dominio, acceso, revisión y autorización auditables."
  };
}

export type PriceSemantic = "published" | "closing";
export type PriceAuthority = "listing" | "transaction";

export function priceUse(
  semantic: PriceSemantic,
  authority: PriceAuthority
): "published_metric" | "closing_metric" | "review_required" {
  if (semantic === "published") return "published_metric";
  return authority === "transaction" ? "closing_metric" : "review_required";
}
