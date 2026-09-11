CREATE TABLE IF NOT EXISTS facility_sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Property',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT facility_sites_id_shape CHECK (id ~ '^s_[a-f0-9]{32}$'),
  CONSTRAINT facility_sites_name_len CHECK (char_length(name) BETWEEN 1 AND 120)
);

CREATE TABLE IF NOT EXISTS facility_snapshots (
  site_id TEXT PRIMARY KEY REFERENCES facility_sites(id),
  payload JSONB NOT NULL,
  revision BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS facility_ledger (
  id BIGSERIAL PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES facility_sites(id),
  kind TEXT NOT NULL,
  body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT facility_ledger_kind_len CHECK (char_length(kind) BETWEEN 1 AND 40)
);

CREATE INDEX IF NOT EXISTS facility_ledger_site_idx
  ON facility_ledger (site_id, created_at DESC);
