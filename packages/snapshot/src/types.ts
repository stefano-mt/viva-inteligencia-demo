import type { ProjectSummary } from "@viva/contracts";
import type { JsonObject, SnapshotData } from "@viva/domain";

export interface SnapshotMetadata {
  datasetVersion: string;
  contractVersion: "2.4.0";
  cutoffAt: string;
  generatedAt: string;
  checksum: string;
  coverage: {
    projects: number;
    districts: number;
    selectedAgencies: number;
  };
}

export interface ProjectQuery {
  page?: number;
  pageSize?: number;
  district?: string;
  typology?: string;
  bedrooms?: string | number;
  phase?: string;
  query?: string;
  projectIds?: string[];
  sort?: "name" | "price-asc" | "price-desc" | "area-asc" | "area-desc";
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DataRepository {
  metadata(): SnapshotMetadata;
  bootstrap(): JsonObject;
  projects(query?: ProjectQuery): Page<ProjectSummary>;
  project(projectId: string): { project: JsonObject; traceability: JsonObject } | null;
  history(query?: ProjectQuery): Page<JsonObject>;
  snapshot(): SnapshotData;
}

export interface LoadedSnapshot {
  data: SnapshotData;
  checksum: string;
  byteLength: number;
  sourcePath: string;
}
