export type JsonObject = Record<string, any>;

export interface Scenario extends JsonObject {
  version: 1;
  district_id: string;
  scope_mode: "district" | "quadrant" | "radius";
  quadrant_id: string | null;
  center_latitude: number | null;
  center_longitude: number | null;
  radius_meters: number | null;
  typology: string;
  bedrooms: "all" | number;
  target_area_m2: number | null;
  target_price_pen: number | null;
  delivery_year: "all" | number;
  visualization: "geographic" | "positioning";
  source?: string;
}

export interface District {
  id: string;
  name: string;
  projectCount: number;
  centerLatitude: number | null;
  centerLongitude: number | null;
  quadrants: Array<{ id: string; label: string }>;
}

export interface Bootstrap extends JsonObject {
  datasetVersion: string;
  contractVersion: "2.4.0";
  scenarioCatalogs: JsonObject;
  initialScenario: Scenario;
  navigation: Array<{ id: string; label: string; kind: "primary" | "expert" }>;
  districts: District[];
  inspectorCases: Array<{ id: string; routeSlug: string; qualityStatus: string }>;
  assistantIntents: Array<{ id: string; label: string; question: string }>;
}

export interface Meta extends JsonObject {
  datasetVersion: string;
  contractVersion: "2.4.0";
  apiVersion: string;
  cutoffAt: string;
  generatedAt: string;
  checksum: string;
  coverage: { projects: number; districts: number; selectedAgencies: number };
}

export interface WorkspaceEvaluation extends JsonObject {
  scenario: Scenario;
  scenarioStatus: "valid" | "invalid";
  corrections: Array<{ code: string; field: string; recovery: string }>;
  scope: JsonObject;
  coverage: JsonObject;
  marketReading: JsonObject;
  priceDiagnosis: JsonObject;
  benchmark: JsonObject;
  comparableProjectIds: string[];
  priceReferenceProjectIds: string[];
}

export interface ProjectSummary extends JsonObject {
  id: string;
  name: string;
  agency: string;
  district: string;
  address: string | null;
  typology: string | null;
  bedrooms: string | number | null;
  areaM2: number | null;
  pricePen: number | null;
  pricePerM2: number | null;
  phase: string | null;
  sourceUrl: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Page<T> extends JsonObject {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Route {
  kind: "journey" | "module";
  id: string;
}
