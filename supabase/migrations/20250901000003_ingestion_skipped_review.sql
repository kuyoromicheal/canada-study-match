-- Richer skipped-institution review data for admin Catalog tab

ALTER TABLE ingestion_logs
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS raw_name TEXT,
  ADD COLUMN IF NOT EXISTS raw_city TEXT,
  ADD COLUMN IF NOT EXISTS raw_url TEXT,
  ADD COLUMN IF NOT EXISTS suggested_institution_type institution_type,
  ADD COLUMN IF NOT EXISTS quebec_category TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT;

CREATE INDEX IF NOT EXISTS idx_ingestion_logs_skipped
  ON ingestion_logs (created_at DESC)
  WHERE status = 'skipped';
