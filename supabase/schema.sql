-- CANADA STUDY MATCH — Database Schema
-- Run this in Supabase SQL Editor after creating your project.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE verification_status AS ENUM (
  'verified',
  'partially_verified',
  'needs_verification'
);

CREATE TYPE supervisor_status AS ENUM (
  'required',
  'recommended',
  'not_required',
  'unknown_verify'
);

CREATE TYPE program_type AS ENUM (
  'thesis',
  'course_based',
  'coop',
  'mixed'
);

CREATE TYPE degree_level AS ENUM (
  'certificate',
  'diploma',
  'bachelor',
  'master',
  'phd',
  'postdoc'
);

CREATE TYPE application_status AS ENUM (
  'researching',
  'preparing',
  'submitted',
  'interview',
  'offer_received',
  'rejected',
  'withdrawn'
);

CREATE TYPE requirement_status AS ENUM (
  'green',
  'yellow',
  'red'
);

CREATE TYPE match_tier AS ENUM (
  'excellent',
  'strong',
  'possible',
  'needs_review',
  'poor'
);

-- Users (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Student profiles
CREATE TABLE student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  -- Personal
  full_name TEXT,
  citizenship_country TEXT,
  current_country TEXT,
  age INTEGER,
  email TEXT,
  -- Academic
  highest_qualification TEXT,
  degree_name TEXT,
  university TEXT,
  graduation_year INTEGER,
  gpa NUMERIC(4, 2),
  gpa_scale NUMERIC(4, 2) DEFAULT 4.0,
  degree_classification TEXT,
  major TEXT,
  relevant_courses TEXT[],
  final_year_project TEXT,
  research_interests TEXT[],
  work_experience TEXT,
  years_of_experience NUMERIC(4, 1),
  -- Language
  language_test_type TEXT,
  language_test_score NUMERIC(5, 2),
  english_instruction_language BOOLEAN DEFAULT FALSE,
  -- Study preferences
  desired_qualification TEXT,
  desired_field TEXT,
  desired_program_type program_type,
  preferred_intake TEXT,
  preferred_provinces TEXT[],
  excluded_provinces TEXT[],
  max_tuition NUMERIC(12, 2),
  max_application_fee NUMERIC(8, 2),
  prioritize_fee_free BOOLEAN DEFAULT FALSE,
  exclude_supervisor_required BOOLEAN DEFAULT FALSE,
  prefer_thesis BOOLEAN,
  -- Immigration
  is_international_student BOOLEAN DEFAULT TRUE,
  study_permit_required BOOLEAN DEFAULT TRUE,
  prefer_international_friendly BOOLEAN DEFAULT TRUE,
  prefer_pgwp_eligible BOOLEAN DEFAULT TRUE,
  -- Meta
  onboarding_completed BOOLEAN DEFAULT FALSE,
  profile_completeness INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Schools (catalog — public read)
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  website_url TEXT,
  description TEXT,
  is_demo_record BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status verification_status NOT NULL DEFAULT 'needs_verification',
  source_url TEXT,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Programs (catalog — public read)
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  field TEXT NOT NULL,
  degree_level degree_level NOT NULL,
  program_type program_type NOT NULL DEFAULT 'course_based',
  description TEXT,
  duration_months INTEGER,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  international_eligible BOOLEAN DEFAULT TRUE,
  pgwp_eligible BOOLEAN DEFAULT TRUE,
  supervisor_status supervisor_status NOT NULL DEFAULT 'unknown_verify',
  supervisor_requirement_text TEXT,
  application_fee NUMERIC(8, 2),
  min_gpa NUMERIC(4, 2),
  gpa_scale NUMERIC(4, 2) DEFAULT 4.0,
  english_requirement TEXT,
  prerequisites TEXT[],
  intakes TEXT[],
  is_demo_record BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status verification_status NOT NULL DEFAULT 'needs_verification',
  source_url TEXT,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, slug)
);

-- Program requirements
CREATE TABLE program_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_mandatory BOOLEAN DEFAULT TRUE,
  is_demo_record BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status verification_status NOT NULL DEFAULT 'needs_verification',
  source_url TEXT,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Application deadlines
CREATE TABLE application_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  intake TEXT NOT NULL,
  deadline_date DATE NOT NULL,
  deadline_type TEXT DEFAULT 'application',
  notes TEXT,
  is_demo_record BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status verification_status NOT NULL DEFAULT 'needs_verification',
  source_url TEXT,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tuition
CREATE TABLE tuition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  period TEXT NOT NULL DEFAULT 'year',
  student_type TEXT DEFAULT 'international',
  is_demo_record BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status verification_status NOT NULL DEFAULT 'needs_verification',
  source_url TEXT,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supervisors
CREATE TABLE supervisors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  department TEXT,
  email TEXT,
  profile_url TEXT,
  research_areas TEXT[],
  accepting_students BOOLEAN DEFAULT TRUE,
  bio TEXT,
  is_demo_record BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status verification_status NOT NULL DEFAULT 'needs_verification',
  source_url TEXT,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Program-supervisor links
CREATE TABLE program_supervisors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES supervisors(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  is_demo_record BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status verification_status NOT NULL DEFAULT 'needs_verification',
  source_url TEXT,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(program_id, supervisor_id)
);

-- Saved programs (user-owned)
CREATE TABLE saved_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  match_score NUMERIC(5, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, program_id)
);

-- Application tracker (user-owned)
CREATE TABLE application_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'researching',
  target_intake TEXT,
  deadline_date DATE,
  notes TEXT,
  match_score NUMERIC(5, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, program_id)
);

-- Application checklist items (user-owned)
CREATE TABLE application_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES application_tracker(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  is_required BOOLEAN DEFAULT TRUE,
  due_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verification records (admin)
CREATE TABLE verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  verified_by UUID REFERENCES users(id),
  previous_status verification_status,
  new_status verification_status NOT NULL,
  notes TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications (user-owned)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI generated content
CREATE TABLE ai_generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  prompt_summary TEXT,
  generated_content TEXT NOT NULL,
  disclaimer TEXT DEFAULT 'AI-generated draft. Not verified. Does not imply agreement from any supervisor.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_programs_school ON programs(school_id);
CREATE INDEX idx_programs_province ON programs(province);
CREATE INDEX idx_programs_field ON programs(field);
CREATE INDEX idx_program_requirements_program ON program_requirements(program_id);
CREATE INDEX idx_application_deadlines_program ON application_deadlines(program_id);
CREATE INDEX idx_tuition_program ON tuition(program_id);
CREATE INDEX idx_supervisors_school ON supervisors(school_id);
CREATE INDEX idx_program_supervisors_program ON program_supervisors(program_id);
CREATE INDEX idx_saved_programs_user ON saved_programs(user_id);
CREATE INDEX idx_application_tracker_user ON application_tracker(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuition ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generated_content ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Users policies
CREATE POLICY "Users can read own record" ON users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own record" ON users
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own record" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Student profiles policies
CREATE POLICY "Students read own profile" ON student_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Students insert own profile" ON student_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students update own profile" ON student_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Catalog tables: public read, admin write
CREATE POLICY "Public read schools" ON schools FOR SELECT USING (true);
CREATE POLICY "Admin write schools" ON schools FOR ALL USING (is_admin());

CREATE POLICY "Public read programs" ON programs FOR SELECT USING (true);
CREATE POLICY "Admin write programs" ON programs FOR ALL USING (is_admin());

CREATE POLICY "Public read program_requirements" ON program_requirements FOR SELECT USING (true);
CREATE POLICY "Admin write program_requirements" ON program_requirements FOR ALL USING (is_admin());

CREATE POLICY "Public read application_deadlines" ON application_deadlines FOR SELECT USING (true);
CREATE POLICY "Admin write application_deadlines" ON application_deadlines FOR ALL USING (is_admin());

CREATE POLICY "Public read tuition" ON tuition FOR SELECT USING (true);
CREATE POLICY "Admin write tuition" ON tuition FOR ALL USING (is_admin());

CREATE POLICY "Public read supervisors" ON supervisors FOR SELECT USING (true);
CREATE POLICY "Admin write supervisors" ON supervisors FOR ALL USING (is_admin());

CREATE POLICY "Public read program_supervisors" ON program_supervisors FOR SELECT USING (true);
CREATE POLICY "Admin write program_supervisors" ON program_supervisors FOR ALL USING (is_admin());

-- User-owned tables
CREATE POLICY "Users read own saved programs" ON saved_programs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own saved programs" ON saved_programs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users read own applications" ON application_tracker
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own applications" ON application_tracker
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users read own checklist" ON application_checklist_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own checklist" ON application_checklist_items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users read own ai content" ON ai_generated_content
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own ai content" ON ai_generated_content
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admin read verification records" ON verification_records
  FOR SELECT USING (is_admin());
CREATE POLICY "Admin write verification records" ON verification_records
  FOR ALL USING (is_admin());

-- Trigger: auto-create user row on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER student_profiles_updated_at BEFORE UPDATE ON student_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER schools_updated_at BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER programs_updated_at BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER supervisors_updated_at BEFORE UPDATE ON supervisors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER application_tracker_updated_at BEFORE UPDATE ON application_tracker
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
