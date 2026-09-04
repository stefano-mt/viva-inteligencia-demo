import type { ProjectSummary } from "@viva/contracts";
import type { JsonObject, SnapshotData } from "@viva/domain";
import type {
  DataRepository,
  LoadedSnapshot,
  Page,
  ProjectQuery,
  SnapshotMetadata,
} from "./types.js";

const NAVIGATION = Object.freeze([
  { id: "journey", label: "Recorrido", kind: "primary" },
  { id: "dashboard", label: "Panorama", kind: "primary" },
  { id: "projects", label: "Proyectos", kind: "primary" },
  { id: "assistant", label: "Decidir", kind: "primary" },
  { id: "activity", label: "Seguimiento", kind: "primary" },
  { id: "inspector", label: "Inspector", kind: "expert" },
  { id: "market", label: "Benchmark", kind: "expert" },
  { id: "compare", label: "Comparador", kind: "expert" },
  { id: "trust", label: "Checklist", kind: "expert" },
]);

export class InMemorySnapshotRepository implements DataRepository {
  readonly #data: SnapshotData;
  readonly #checksum: string;
  readonly #legacyById = new Map<string, JsonObject>();
  readonly #modelById = new Map<string, JsonObject>();
  readonly #agencyById = new Map<string, JsonObject>();
  readonly #observationsByEntity = new Map<string, JsonObject[]>();
  readonly #factsByEntity = new Map<string, JsonObject[]>();

  constructor(loaded: LoadedSnapshot) {
    this.#data = loaded.data;
    this.#checksum = loaded.checksum;
    for (const project of this.#data.projects) {
      const id = String(project.id ?? "");
      this.#legacyById.set(id, project);
      this.#legacyById.set(`project:nexo-${id}`, project);
    }
    for (const project of this.#data.model.projects) {
      this.#modelById.set(String(project.project_id), project);
    }
    for (const agency of (this.#data.model.agencies as JsonObject[] | undefined) ?? []) {
      this.#agencyById.set(String(agency.agency_id), agency);
    }
    for (const observation of (this.#data.model.observations as JsonObject[] | undefined) ?? []) {
      append(this.#observationsByEntity, String(observation.entity_id ?? ""), observation);
    }
    for (const fact of (this.#data.model.facts as JsonObject[] | undefined) ?? []) {
      append(this.#factsByEntity, String(fact.entity_id ?? ""), fact);
    }
  }

  metadata(): SnapshotMetadata {
    const counts = (this.#data.metadata.counts ?? {}) as JsonObject;
    return {
      datasetVersion: this.#data.metadata.dataset_id,
      contractVersion: "2.4.0",
      cutoffAt: this.#data.metadata.cutoff_at,
      generatedAt: this.#data.metadata.generated_at,
      checksum: this.#checksum,
      coverage: {
        projects: Number(counts.projects ?? this.#data.projects.length),
        districts: Number(counts.districts ?? 0),
        selectedAgencies: Number(counts.selected_agencies ?? 0),
      },
    };
  }

  bootstrap(): JsonObject {
    return {
      scenarioCatalogs: structuredClone(this.#data.scenario_catalogs),
      initialScenario: structuredClone(this.#data.scenario_defaults),
      navigation: structuredClone(NAVIGATION),
      districts: (this.#data.geography.districts as JsonObject[]).map((district) => ({
        id: String(district.district_id),
        name: String(district.district_name ?? district.source_name ?? ""),
        projectCount: Number(district.observed_project_count ?? 0),
        quadrants: ((district.quadrants as JsonObject[] | undefined) ?? []).map((quadrant) => ({
          id: String(quadrant.quadrant_id),
          label: String(quadrant.label),
        })),
      })),
    };
  }

  projects(query: ProjectQuery = {}): Page<ProjectSummary> {
    const normalizedQuery = normalize(query.query);
    const district = normalize(query.district);
    const typology = normalize(query.typology);
    const phase = normalize(query.phase);
    const selectedIds = query.projectIds?.length
      ? new Set(query.projectIds.flatMap((id) => idVariants(id)))
      : null;
    let projects = this.#data.projects.filter((project) => {
      const projectId = String(project.id ?? "");
      if (selectedIds && !idVariants(projectId).some((id) => selectedIds.has(id))) return false;
      if (district && ![project.district, districtIdForName(this.#data, String(project.district ?? ""))]
        .some((value) => normalize(value) === district)) return false;
      if (typology && typology !== "all" && typology !== "todos" && normalize(project.typology) !== typology) return false;
      if (phase && phase !== "all" && phase !== "todos" && normalize(project.project_phase) !== phase) return false;
      if (query.bedrooms !== undefined && normalize(query.bedrooms) !== "all" && normalize(query.bedrooms) !== "todos") {
        const bedroom = normalize(query.bedrooms);
        if (!normalize(project.bedrooms).split(/\D+/u).includes(bedroom)) return false;
      }
      if (normalizedQuery) {
        const haystack = normalize([
          project.project_name,
          project.agency_name,
          project.district,
          project.address,
        ].join(" "));
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
    projects = [...projects].sort(projectComparator(query.sort));
    const pageSize = clampInteger(query.pageSize, 1, 100, 18);
    const page = clampInteger(query.page, 1, Number.MAX_SAFE_INTEGER, 1);
    const total = projects.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      items: projects.slice(start, start + pageSize).map(toSummary),
      page: safePage,
      pageSize,
      total,
      totalPages,
    };
  }

  project(projectId: string): { project: JsonObject; traceability: JsonObject } | null {
    const legacy = this.#legacyById.get(projectId) ?? this.#legacyById.get(stripProjectPrefix(projectId));
    const canonicalId = projectId.startsWith("project:")
      ? projectId
      : `project:nexo-${stripProjectPrefix(projectId)}`;
    const model = this.#modelById.get(canonicalId);
    if (!legacy && !model) return null;
    const agency = model ? this.#agencyById.get(String(model.agency_id ?? "")) : null;
    const observations = this.#observationsByEntity.get(canonicalId) ?? [];
    const facts = this.#factsByEntity.get(canonicalId) ?? [];
    return {
      project: {
        ...(legacy ? toSummary(legacy) : {}),
        canonicalId,
        canonicalName: model?.canonical_name ?? legacy?.project_name ?? null,
        qualityStatus: model?.quality_status ?? null,
        agency: agency ? {
          id: agency.agency_id,
          name: agency.canonical_name,
        } : null,
      },
      traceability: {
        observationIds: observations.map((item) => item.observation_id),
        factIds: facts.map((item) => item.fact_id),
        sourceCount: new Set(observations.map((item) => item.source_id)).size,
        lastSeenAt: model?.last_seen_at ?? legacy?.captured_at ?? null,
      },
    };
  }

  history(query: ProjectQuery = {}): Page<JsonObject> {
    const district = normalize(query.district);
    const selectedIds = query.projectIds?.length ? new Set(query.projectIds.flatMap(idVariants)) : null;
    const events = (((this.#data.history as JsonObject).events as JsonObject[] | undefined) ?? [])
      .filter((event) => {
        if (district && normalize(event.district_id) !== district) return false;
        if (selectedIds && !idVariants(String(event.project_id ?? "")).some((id) => selectedIds.has(id))) return false;
        return true;
      })
      .sort((left, right) => String(right.detected_at ?? "").localeCompare(String(left.detected_at ?? "")));
    const pageSize = clampInteger(query.pageSize, 1, 100, 20);
    const page = clampInteger(query.page, 1, Number.MAX_SAFE_INTEGER, 1);
    const totalPages = events.length === 0 ? 0 : Math.ceil(events.length / pageSize);
    const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      items: structuredClone(events.slice(start, start + pageSize)),
      page: safePage,
      pageSize,
      total: events.length,
      totalPages,
    };
  }

  snapshot(): SnapshotData {
    return this.#data;
  }
}

function append(map: Map<string, JsonObject[]>, key: string, value: JsonObject): void {
  if (!key) return;
  const items = map.get(key) ?? [];
  items.push(value);
  map.set(key, items);
}

function normalize(value: unknown): string {
  return String(value ?? "").normalize("NFKD").replace(/\p{M}/gu, "").trim().toLowerCase();
}

function stripProjectPrefix(value: string): string {
  return String(value).replace(/^project:nexo-/u, "").replace(/^observed:nexo-/u, "");
}

function idVariants(value: string): string[] {
  const id = stripProjectPrefix(value);
  return [id, `project:nexo-${id}`, `observed:nexo-${id}`];
}

function districtIdForName(data: SnapshotData, name: string): string {
  return String((data.geography.districts as JsonObject[]).find(
    (district) => normalize(district.district_name) === normalize(name),
  )?.district_id ?? "");
}

function clampInteger(value: number | undefined, min: number, max: number, fallback: number): number {
  const candidate = Number(value);
  return Number.isInteger(candidate) ? Math.min(max, Math.max(min, candidate)) : fallback;
}

function nullableNumber(value: unknown): number | null {
  const number = Number(value);
  return value !== null && value !== "" && Number.isFinite(number) ? number : null;
}

function toSummary(project: JsonObject): ProjectSummary {
  return {
    id: String(project.id ?? ""),
    name: String(project.project_name ?? "Proyecto sin nombre"),
    agency: String(project.agency_name ?? "Sin inmobiliaria"),
    district: String(project.district ?? "Sin distrito"),
    address: project.address == null ? null : String(project.address),
    typology: project.typology == null ? null : String(project.typology),
    bedrooms: project.bedrooms == null ? null : String(project.bedrooms),
    areaM2: nullableNumber(project.total_area),
    pricePen: nullableNumber(project.list_price_avg ?? project.price_min),
    pricePerM2: nullableNumber(project.price_per_m2_list),
    phase: project.project_phase == null ? null : String(project.project_phase),
    sourceUrl: project.source_url == null ? null : String(project.source_url),
    latitude: nullableNumber(project.latitude),
    longitude: nullableNumber(project.longitude),
  };
}

function projectComparator(sort: ProjectQuery["sort"] = "name") {
  const byName = (left: JsonObject, right: JsonObject) =>
    String(left.project_name ?? "").localeCompare(String(right.project_name ?? ""), "es");
  if (sort === "price-asc") return (a: JsonObject, b: JsonObject) => (nullableNumber(a.list_price_avg) ?? Infinity) - (nullableNumber(b.list_price_avg) ?? Infinity) || byName(a, b);
  if (sort === "price-desc") return (a: JsonObject, b: JsonObject) => (nullableNumber(b.list_price_avg) ?? -Infinity) - (nullableNumber(a.list_price_avg) ?? -Infinity) || byName(a, b);
  if (sort === "area-asc") return (a: JsonObject, b: JsonObject) => (nullableNumber(a.total_area) ?? Infinity) - (nullableNumber(b.total_area) ?? Infinity) || byName(a, b);
  if (sort === "area-desc") return (a: JsonObject, b: JsonObject) => (nullableNumber(b.total_area) ?? -Infinity) - (nullableNumber(a.total_area) ?? -Infinity) || byName(a, b);
  return byName;
}
