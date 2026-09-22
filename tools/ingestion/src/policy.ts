export type SourceClass = "authorized_feed" | "official_project_website" | "public_aggregator";
export type ReviewStatus = "approved" | "pending" | "blocked";
export type RobotsStatus = "allow" | "deny" | "unknown" | "not_applicable";
export type ExecutionIntent = "discover" | "collect" | "pilot_collect";

export interface PilotAccessReview {
  technicalStatus: "pass" | "blocked";
  routeRobotsStatus: "allow" | "deny";
  reviewedPaths: string[];
}

export interface ProductOwnerPilotAuthorization {
  reference: string;
  approvedAt: string;
  approvedByRole: "product_owner";
  status: "approved" | "revoked";
  purpose: "technical_feasibility";
  allowedPaths: string[];
}

export interface SourceCandidate {
  sourceId: string;
  sourceClass: SourceClass;
  officialDomainConfirmed: boolean;
  reviewStatus: ReviewStatus;
  robotsStatus: RobotsStatus;
  authorizationReference?: string;
  accessReview?: PilotAccessReview;
  pilotAuthorization?: ProductOwnerPilotAuthorization;
}

export interface PolicyContext {
  productOwnerAuthorizationReference?: string;
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
    | "AUTHORIZATION_REQUIRED"
    | "PILOT_OFFICIAL_SOURCE_REQUIRED"
    | "PILOT_TECHNICAL_REVIEW_REQUIRED"
    | "PILOT_AUTHORIZATION_REQUIRED"
    | "PILOT_AUTHORIZATION_MISMATCH"
    | "PILOT_COLLECTION_ALLOWED";
  reason: string;
}

export function evaluateSource(
  candidate: SourceCandidate,
  intent: ExecutionIntent,
  context: PolicyContext = {},
): PolicyDecision {
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

  if (intent === "pilot_collect") {
    if (candidate.sourceClass !== "official_project_website") {
      return {
        allowed: false,
        code: "PILOT_OFFICIAL_SOURCE_REQUIRED",
        reason: "El piloto técnico solo admite una web oficial de una inmobiliaria."
      };
    }
    if (!candidate.officialDomainConfirmed) {
      return {
        allowed: false,
        code: "OFFICIAL_DOMAIN_REQUIRED",
        reason: "El piloto exige confirmar que el dominio pertenece a la inmobiliaria."
      };
    }
    if (candidate.accessReview?.technicalStatus !== "pass"
      || candidate.accessReview.routeRobotsStatus !== "allow"
      || candidate.accessReview.reviewedPaths.length === 0) {
      return {
        allowed: false,
        code: candidate.accessReview?.routeRobotsStatus === "deny"
          ? "ROBOTS_DENIED"
          : "PILOT_TECHNICAL_REVIEW_REQUIRED",
        reason: "El piloto exige revisión técnica y robots permitido para rutas exactas."
      };
    }
    const pilot = candidate.pilotAuthorization;
    if (!pilot || pilot.status !== "approved" || pilot.approvedByRole !== "product_owner"
      || pilot.purpose !== "technical_feasibility" || !pilot.reference.trim()
      || pilot.allowedPaths.length === 0) {
      return {
        allowed: false,
        code: "PILOT_AUTHORIZATION_REQUIRED",
        reason: "Falta una autorización explícita del Product Owner limitada al piloto técnico."
      };
    }
    if (!context.productOwnerAuthorizationReference?.trim()
      || context.productOwnerAuthorizationReference.trim() !== pilot.reference.trim()) {
      return {
        allowed: false,
        code: "PILOT_AUTHORIZATION_MISMATCH",
        reason: "La confirmación de ejecución no coincide con la autorización de piloto registrada."
      };
    }
    return {
      allowed: true,
      code: "PILOT_COLLECTION_ALLOWED",
      reason: "Piloto técnico puntual autorizado; su salida no es publicable."
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
