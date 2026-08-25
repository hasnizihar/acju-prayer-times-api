-- Create Dataset Versions Table
CREATE TABLE dataset_versions (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  year INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  record_count INTEGER NOT NULL,
  status TEXT NOT NULL,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, year, version)
);
