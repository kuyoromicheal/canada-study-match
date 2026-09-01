-- Ingestion pipeline: institution types, source types, program requests

CREATE TYPE institution_type AS ENUM ('university', 'college', 'polytechnic');

CREATE TYPE source_type AS ENUM (
  'university_official',
  'ai_extracted_unverified',
  'manual',
  'directory_listing'
);

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS institution_type institution_type,
  ADD COLUMN IF NOT EXISTS external_id TEXT;

ALTER TABLE schools DROP CONSTRAINT IF EXISTS schools_external_id_key;
ALTER TABLE schools ADD CONSTRAINT schools_external_id_key UNIQUE (external_id);

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS source_type source_type DEFAULT 'manual';

ALTER TABLE program_requirements ADD COLUMN IF NOT EXISTS source_type source_type DEFAULT 'manual';
ALTER TABLE application_deadlines ADD COLUMN IF NOT EXISTS source_type source_type DEFAULT 'manual';
ALTER TABLE tuition ADD COLUMN IF NOT EXISTS source_type source_type DEFAULT 'manual';
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS source_type source_type DEFAULT 'manual';

-- Program requests from students
CREATE TABLE program_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  school_name TEXT NOT NULL,
  program_name TEXT NOT NULL,
  field TEXT,
  province TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'fulfilled', 'declined')),
  request_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_program_requests_status ON program_requests(status);
CREATE INDEX idx_program_requests_province ON program_requests(province);

-- Ingestion audit log
CREATE TABLE ingestion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT NOT NULL,
  institution_type institution_type,
  status TEXT NOT NULL CHECK (status IN ('upserted', 'skipped', 'failed')),
  institution_name TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE program_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert program requests" ON program_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users read own requests" ON program_requests
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admin manage program requests" ON program_requests
  FOR ALL USING (is_admin());

CREATE POLICY "Admin read ingestion logs" ON ingestion_logs
  FOR SELECT USING (is_admin());

CREATE POLICY "Admin write ingestion logs" ON ingestion_logs
  FOR INSERT WITH CHECK (is_admin());

-- Allow service role / admin to upsert schools with verified directory data
CREATE OR REPLACE FUNCTION upsert_directory_school(
  p_external_id TEXT,
  p_name TEXT,
  p_slug TEXT,
  p_province TEXT,
  p_city TEXT,
  p_website_url TEXT,
  p_institution_type institution_type,
  p_source_url TEXT
) RETURNS UUID AS $$
DECLARE
  result_id UUID;
BEGIN
  INSERT INTO schools (
    external_id, name, slug, province, city, website_url,
    institution_type, is_demo_record, verification_status,
    source_url, last_verified_at
  ) VALUES (
    p_external_id, p_name, p_slug, p_province, p_city, p_website_url,
    p_institution_type, false, 'verified',
    p_source_url, NOW()
  )
  ON CONFLICT (external_id) DO UPDATE SET
    name = EXCLUDED.name,
    province = EXCLUDED.province,
    city = EXCLUDED.city,
    website_url = EXCLUDED.website_url,
    institution_type = EXCLUDED.institution_type,
    verification_status = 'verified',
    source_url = EXCLUDED.source_url,
    last_verified_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO result_id;
  RETURN result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
