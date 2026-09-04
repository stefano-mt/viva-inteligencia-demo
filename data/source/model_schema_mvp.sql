-- Modelo preliminar MVP para validar historico y trazabilidad.
-- Sintaxis compatible con PostgreSQL; ajustar tipos identity/datetime si se usa Azure SQL.

create table sources (
  source_id bigserial primary key,
  source_name text not null unique,
  source_type text not null,
  base_url text,
  legal_status text not null default 'pending_review',
  created_at timestamptz not null default now()
);

create table scraping_runs (
  run_id text primary key,
  source_id bigint references sources(source_id),
  started_at timestamptz not null,
  finished_at timestamptz,
  status text not null,
  extractor_version text,
  config_json jsonb not null default '{}'::jsonb,
  records_extracted integer not null default 0,
  error_count integer not null default 0
);

create table developers (
  developer_id bigserial primary key,
  canonical_name text not null,
  normalized_name text not null unique,
  created_at timestamptz not null default now()
);

create table locations (
  location_id bigserial primary key,
  district text,
  province text,
  department text,
  address text,
  latitude numeric(12,8),
  longitude numeric(12,8)
);

create table projects (
  project_id bigserial primary key,
  developer_id bigint references developers(developer_id),
  location_id bigint references locations(location_id),
  canonical_name text not null,
  normalized_name text not null,
  status text,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  confidence_score numeric(5,2)
);

create table source_observations (
  observation_id bigserial primary key,
  run_id text references scraping_runs(run_id),
  source_id bigint references sources(source_id),
  project_id bigint references projects(project_id),
  source_url text not null,
  captured_at timestamptz not null,
  raw_payload_uri text,
  observed_json jsonb not null,
  field_confidence text,
  unique (source_id, source_url, captured_at)
);

create table typologies (
  typology_id bigserial primary key,
  project_id bigint references projects(project_id),
  typology text,
  bedrooms_min integer,
  bedrooms_max integer,
  total_area_min numeric(12,2),
  total_area_max numeric(12,2),
  unit_status text
);

create table inventory (
  inventory_id bigserial primary key,
  typology_id bigint references typologies(typology_id),
  captured_at timestamptz not null,
  unit_count integer,
  stock_status text,
  source_observation_id bigint references source_observations(observation_id)
);

create table prices (
  price_id bigserial primary key,
  typology_id bigint references typologies(typology_id),
  captured_at timestamptz not null,
  currency text not null,
  list_price numeric(14,2),
  sale_price numeric(14,2),
  price_per_m2_list numeric(14,2),
  price_per_m2_sale numeric(14,2),
  source_observation_id bigint references source_observations(observation_id)
);

create table quality_issues (
  issue_id bigserial primary key,
  run_id text references scraping_runs(run_id),
  source_name text not null,
  severity text not null,
  entity_type text not null,
  entity_key text,
  field_name text,
  issue_code text not null,
  issue_detail text,
  created_at timestamptz not null default now()
);

create table marketing_campaigns (
  campaign_id text primary key,
  platform text not null,
  campaign_name text,
  project_id bigint references projects(project_id),
  start_date date,
  end_date date,
  metadata_json jsonb not null default '{}'::jsonb
);

create table dashboard_metrics (
  metric_date date not null,
  metric_name text not null,
  source_name text not null,
  district text,
  developer_name text,
  project_name text,
  metric_value numeric(18,4),
  primary key (metric_date, metric_name, source_name, district, developer_name, project_name)
);
