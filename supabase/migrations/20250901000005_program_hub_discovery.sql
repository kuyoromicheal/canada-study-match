-- Extended program fields, field groups, application plans, saved searches, profile extensions

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS campus TEXT,
  ADD COLUMN IF NOT EXISTS delivery_mode TEXT,
  ADD COLUMN IF NOT EXISTS study_mode TEXT,
  ADD COLUMN IF NOT EXISTS application_opens DATE,
  ADD COLUMN IF NOT EXISTS funding_notes TEXT,
  ADD COLUMN IF NOT EXISTS dli_number TEXT,
  ADD COLUMN IF NOT EXISTS study_permit_info_url TEXT,
  ADD COLUMN IF NOT EXISTS pgwp_info_url TEXT,
  ADD COLUMN IF NOT EXISTS international_student_notes TEXT,
  ADD COLUMN IF NOT EXISTS program_structure_notes TEXT;

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS age_range TEXT,
  ADD COLUMN IF NOT EXISTS qualifications JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS secondary_interests JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS research_keywords JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_study_levels JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_program_types JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS max_first_year_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS show_next_available_intake BOOLEAN DEFAULT FALSE;

CREATE TABLE field_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE field_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES field_groups(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, field_name)
);

CREATE TABLE application_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_intake TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE application_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES application_plans(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  match_score INTEGER,
  fit_category TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, program_id)
);

CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  notify_on_new BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE supervisor_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES supervisors(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'not_prepared',
  email_draft TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, supervisor_id, program_id)
);

CREATE INDEX idx_application_plans_user ON application_plans(user_id);
CREATE INDEX idx_application_plan_items_plan ON application_plan_items(plan_id);
CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);

ALTER TABLE field_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_outreach ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read field groups" ON field_groups FOR SELECT USING (true);
CREATE POLICY "Public read field group members" ON field_group_members FOR SELECT USING (true);
CREATE POLICY "Admin manage field groups" ON field_groups FOR ALL USING (is_admin());
CREATE POLICY "Admin manage field group members" ON field_group_members FOR ALL USING (is_admin());

CREATE POLICY "Users manage own application plans" ON application_plans
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own plan items" ON application_plan_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM application_plans p WHERE p.id = plan_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Users manage own saved searches" ON saved_searches
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own supervisor outreach" ON supervisor_outreach
  FOR ALL USING (auth.uid() = user_id);

-- Seed biology-related field group
INSERT INTO field_groups (slug, name, description) VALUES
  ('biology-related', 'Biology Related', 'Biological and life sciences fields'),
  ('computer-science-related', 'Computer Science Related', 'Computing and software fields')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO field_group_members (group_id, field_name)
SELECT g.id, v.field_name
FROM field_groups g
CROSS JOIN (
  VALUES
    ('biology-related', 'Biology'),
    ('biology-related', 'Microbiology'),
    ('biology-related', 'Molecular Biology'),
    ('biology-related', 'Biotechnology'),
    ('biology-related', 'Biochemistry'),
    ('biology-related', 'Genetics'),
    ('biology-related', 'Immunology'),
    ('biology-related', 'Biomedical Science'),
    ('biology-related', 'Food Science'),
    ('biology-related', 'Environmental Biology'),
    ('biology-related', 'Life Sciences'),
    ('computer-science-related', 'Computer Science'),
    ('computer-science-related', 'Software Engineering'),
    ('computer-science-related', 'Information Technology'),
    ('computer-science-related', 'Cybersecurity'),
    ('computer-science-related', 'Data Science'),
    ('computer-science-related', 'Artificial Intelligence'),
    ('computer-science-related', 'Machine Learning')
) AS v(slug, field_name)
WHERE g.slug = v.slug
ON CONFLICT DO NOTHING;
