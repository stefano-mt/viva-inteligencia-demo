export const refreshChannels = [
  "nexo_authorized_feed",
  "official_websites",
  "social_official_apis",
] as const;

export const demoDistrictIds = [
  "150101",
  "150113",
  "150120",
  "150122",
  "150131",
  "150136",
  "150140",
] as const;

export type RefreshChannel = (typeof refreshChannels)[number];
export type RunState = "idle" | "queued" | "running" | "succeeded" | "blocked" | "failed";
export type ChannelState = "succeeded" | "policy_blocked" | "unsupported" | "failed";

export interface RunRequest {
  runId: string;
  scope: "active_district" | "demo_districts";
  districtIds: string[];
  channels: RefreshChannel[];
}

export interface ChannelResult {
  channel: RefreshChannel;
  state: ChannelState;
  code: string;
  message: string;
  artifact?: {
    staging: string;
    manifest: string;
  };
  counts?: {
    selectedSources: number;
    selectedTargets: number;
    eligibleTargets: number;
    policyBlockedTargets: number;
    plannedTargets: number;
    collectedTargets: number;
    robotsBlockedTargets: number;
    failedTargets: number;
    networkRequests: number;
    observations: number;
    observationFields: number;
  };
}

export interface RefreshRun {
  runId: string | null;
  state: RunState;
  requestedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  scope: RunRequest["scope"] | null;
  districtIds: string[];
  channels: RefreshChannel[];
  channelResults: ChannelResult[];
  message: string;
  published: false;
  execute: boolean;
}

export interface OfficialWebBatchResult {
  staging: unknown;
  manifest: {
    mode: "dry-run" | "controlled-collection";
    counts: NonNullable<ChannelResult["counts"]>;
  };
}

export interface OfficialWebRefreshApi {
  readSourceRegistry(path: string): Promise<unknown>;
  runOfficialWebBatch(options: {
    registry: unknown;
    registryReference: string;
    dryRun: boolean;
    filters: { districts: string[] };
    runId: string;
  }): Promise<OfficialWebBatchResult>;
  writeBatchArtifacts(
    result: OfficialWebBatchResult,
    outputPath: string,
    manifestPath: string,
  ): Promise<void>;
}
