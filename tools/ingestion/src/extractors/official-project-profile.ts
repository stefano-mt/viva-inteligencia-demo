import { addCandidate, cleanText, decodeHtml, stripTags } from "./shared.js";
import type {
  ExtractionContext,
  FieldCandidate,
  ObservationFieldName,
  WebExtractor,
} from "./types.js";

interface ProfileField {
  field: ObservationFieldName;
  pattern: RegExp;
  group?: number;
  unit?: string;
}

interface OfficialProjectProfile {
  id: string;
  sourceId: string;
  hosts: ReadonlySet<string>;
  paths: ReadonlySet<string>;
  projectExternalId: string;
  projectName: string;
  identity: RegExp;
  scopeEndHeading?: RegExp;
  fields: readonly ProfileField[];
  amenities?: readonly { label: string; pattern: RegExp }[];
}

const VERSIA_PROFILE: OfficialProjectProfile = {
  id: "cantabria-versia",
  sourceId: "cantabria-official-website",
  hosts: new Set(["cantabriainmobiliaria.pe", "www.cantabriainmobiliaria.pe"]),
  paths: new Set(["/proyecto/versia-miraflores/", "/landing-versia/"]),
  projectExternalId: "3981",
  projectName: "VERSIA",
  identity: /\bVersia\b/iu,
  fields: [
    {
      field: "address",
      pattern: /((?:Ca\.?|Calle)?\s*Enrique\s+Palacios\s+830\s*,?\s*Miraflores)/iu,
    },
    {
      field: "area",
      pattern: /(60(?:[.,]0+)?\s*m(?:2|²)\s*a\s*98(?:[.,]0+)?\s*m(?:2|²))/iu,
      unit: "m2",
    },
    {
      field: "typologies",
      pattern: /(2\s+y\s+3\s+(?:ambientes|ambs?\.?))(?!\p{L})/iu,
    },
    {
      field: "delivery_date",
      pattern: /\bEntrega\s*(?:en\s*)?(2028)\b/iu,
      group: 1,
    },
  ],
};

const MONTEROSSO_PROFILE: OfficialProjectProfile = {
  id: "toratto-monterosso",
  sourceId: "toratto-official-website",
  hosts: new Set(["grupotoratto.com", "www.grupotoratto.com"]),
  paths: new Set(["/departamento/monterosso/"]),
  projectExternalId: "1940",
  projectName: "MONTEROSSO",
  identity: /\bMonterosso\b/iu,
  // The page lists unrelated project cards after this exact heading. Nothing below it belongs
  // to the MONTEROSSO observation.
  scopeEndHeading: /<h[1-6]\b[^>]*>\s*Últimos\s+departamentos\s*<\/h[1-6]>/iu,
  fields: [
    {
      field: "address",
      pattern: /(Jr\.?\s+Coronel\s+Zegarra\s+1045\s*[-–—]\s*1057)/iu,
    },
    {
      field: "area",
      pattern: /(Desde\s+69[.,]56\s*(?:m(?:2|²)\s*)?hasta\s+69[.,]88\s*m(?:2|²))/iu,
      unit: "m2",
    },
    {
      field: "bedrooms",
      pattern: /(Hasta\s+2\s+dormitorios)/iu,
    },
  ],
  amenities: [
    { label: "Estacionamientos para bicicletas", pattern: /\bEstacionamientos?\s+para\s+bicicletas\b/iu },
    { label: "Lobby", pattern: /\bLobby\b/iu },
    { label: "Terraza", pattern: /\bTerraza\b/iu },
    { label: "Área de parrilla", pattern: /(?:^|\s)Área\s+de\s+parrilla\b/iu },
  ],
};

const PROFILES = [VERSIA_PROFILE, MONTEROSSO_PROFILE] as const;

export const officialProjectProfileExtractor: WebExtractor = {
  id: "official-project-profile-v1",
  archetype: "html",
  priority: 900,
  applies(html, context) {
    const profile = profileFor(context);
    if (!profile) return false;
    return profile.identity.test(visibleText(scopedHtml(html, profile)));
  },
  extract(html, context) {
    const profile = profileFor(context);
    if (!profile) return { candidates: [] };
    const text = visibleText(scopedHtml(html, profile));
    if (!profile.identity.test(text)) return { candidates: [] };

    const candidates: FieldCandidate[] = [];
    add(candidates, profile, "project_name", profile.projectName, `profile:${profile.id}:identity`);
    for (const field of profile.fields) {
      const match = field.pattern.exec(text);
      const value = match?.[field.group ?? 1];
      if (value) {
        add(
          candidates,
          profile,
          field.field,
          cleanText(value),
          `profile:${profile.id}:${field.field}`,
          field.unit,
        );
      }
    }

    const amenities = profile.amenities
      ?.filter(({ pattern }) => pattern.test(text))
      .map(({ label }) => label);
    if (amenities && amenities.length > 0) {
      add(candidates, profile, "amenities", amenities, `profile:${profile.id}:amenities`);
    }
    return { candidates };
  },
};

function profileFor(context: ExtractionContext): OfficialProjectProfile | undefined {
  const sourceId = context.sourceId?.trim();
  const sourceUrl = context.sourceUrl?.trim();
  if (!sourceId || !sourceUrl) return undefined;
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    return undefined;
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    return undefined;
  }
  const path = canonicalPath(url.pathname);
  return PROFILES.find((profile) => profile.sourceId === sourceId
    && profile.hosts.has(url.hostname.toLocaleLowerCase("en-US"))
    && profile.paths.has(path)
    && (!context.projectExternalId || context.projectExternalId.trim() === profile.projectExternalId));
}

function canonicalPath(pathname: string): string {
  const compact = pathname.replace(/\/{2,}/gu, "/");
  return compact.endsWith("/") ? compact : `${compact}/`;
}

function scopedHtml(html: string, profile: OfficialProjectProfile): string {
  if (!profile.scopeEndHeading) return html;
  const boundary = profile.scopeEndHeading.exec(html);
  return boundary?.index === undefined ? html : html.slice(0, boundary.index);
}

function visibleText(html: string): string {
  const withoutExcludedRegions = html
    .replace(/<form\b[^>]*>[\s\S]*?<\/form>/giu, " ")
    .replace(/<(?:template|noscript|svg)\b[^>]*>[\s\S]*?<\/(?:template|noscript|svg)>/giu, " ");
  return cleanText(decodeHtml(stripTags(withoutExcludedRegions)), 150_000);
}

function add(
  candidates: FieldCandidate[],
  profile: OfficialProjectProfile,
  field: ObservationFieldName,
  value: string | string[],
  locator: string,
  unit?: string,
): void {
  addCandidate(candidates, {
    field,
    value,
    locator,
    confidence: "labeled_html",
    extractorId: officialProjectProfileExtractor.id,
    archetype: officialProjectProfileExtractor.archetype,
    priority: officialProjectProfileExtractor.priority,
    entityKey: `project:${profile.projectExternalId}`,
    projectAssociation: "explicit",
    ...(unit ? { unit } : {}),
  });
}
