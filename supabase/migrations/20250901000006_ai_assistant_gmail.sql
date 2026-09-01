-- Personal AI Application Assistant: Gmail, CV/SOP, outreach, application packs

-- Gmail OAuth connections (tokens encrypted at application layer)
CREATE TABLE gmail_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  google_email TEXT NOT NULL,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'not_connected', 'reauthorization_required')),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cached Gmail thread metadata (application-related only)
CREATE TABLE gmail_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gmail_thread_id TEXT NOT NULL,
  gmail_message_id TEXT,
  subject TEXT,
  from_email TEXT,
  from_name TEXT,
  snippet TEXT,
  category TEXT NOT NULL DEFAULT 'applications'
    CHECK (category IN ('supervisors', 'universities', 'applications', 'offers', 'scholarships', 'action_required')),
  classification TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_outbound BOOLEAN NOT NULL DEFAULT FALSE,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  supervisor_id UUID REFERENCES supervisors(id) ON DELETE SET NULL,
  outreach_id UUID,
  received_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, gmail_thread_id)
);

CREATE TABLE gmail_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES gmail_threads(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL,
  subject TEXT,
  from_email TEXT,
  to_email TEXT,
  body_text TEXT,
  body_html TEXT,
  is_outbound BOOLEAN NOT NULL DEFAULT FALSE,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, gmail_message_id)
);

-- Master CV profile (structured JSON — source of truth for AI generation)
CREATE TABLE cv_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  personal_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  professional_summary TEXT,
  education JSONB NOT NULL DEFAULT '[]'::jsonb,
  research_experience JSONB NOT NULL DEFAULT '[]'::jsonb,
  work_experience JSONB NOT NULL DEFAULT '[]'::jsonb,
  projects JSONB NOT NULL DEFAULT '[]'::jsonb,
  laboratory_experience JSONB NOT NULL DEFAULT '[]'::jsonb,
  technical_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  research_interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  publications JSONB NOT NULL DEFAULT '[]'::jsonb,
  certifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  awards JSONB NOT NULL DEFAULT '[]'::jsonb,
  leadership JSONB NOT NULL DEFAULT '[]'::jsonb,
  volunteer_experience JSONB NOT NULL DEFAULT '[]'::jsonb,
  cv_references JSONB NOT NULL DEFAULT '[]'::jsonb,
  section_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generated document versions (CV, SOP, proposals, emails)
CREATE TABLE generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL
    CHECK (document_type IN ('cv', 'resume', 'sop', 'personal_statement', 'research_proposal', 'cover_letter', 'supervisor_email', 'checklist')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_json JSONB,
  optimization_notes TEXT,
  word_count INTEGER,
  version_number INTEGER NOT NULL DEFAULT 1,
  parent_document_id UUID REFERENCES generated_documents(id) ON DELETE SET NULL,
  storage_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  is_ai_generated BOOLEAN NOT NULL DEFAULT TRUE,
  disclaimer TEXT DEFAULT 'AI-generated draft. Review before use. Never submit without verifying all facts.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Application packs (per program bundle)
CREATE TABLE application_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  application_id UUID REFERENCES application_tracker(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  readiness_score INTEGER,
  readiness_notes JSONB DEFAULT '[]'::jsonb,
  cv_document_id UUID REFERENCES generated_documents(id) ON DELETE SET NULL,
  sop_document_id UUID REFERENCES generated_documents(id) ON DELETE SET NULL,
  proposal_document_id UUID REFERENCES generated_documents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'generating', 'ready_for_review', 'submitted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, program_id)
);

-- AI generation audit log
CREATE TABLE ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  entity_id UUID,
  prompt_summary TEXT,
  model TEXT,
  tokens_used INTEGER,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Follow-up tasks for supervisor outreach
CREATE TABLE follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outreach_id UUID,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  supervisor_id UUID REFERENCES supervisors(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL DEFAULT 'supervisor_follow_up',
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'draft_ready', 'dismissed', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Extend supervisor_outreach (from migration 005) if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supervisor_outreach') THEN
    ALTER TABLE supervisor_outreach
      ADD COLUMN IF NOT EXISTS subject TEXT,
      ADD COLUMN IF NOT EXISTS gmail_thread_id TEXT,
      ADD COLUMN IF NOT EXISTS gmail_message_id TEXT,
      ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS response_classification TEXT,
      ADD COLUMN IF NOT EXISTS response_snippet TEXT,
      ADD COLUMN IF NOT EXISTS follow_up_due DATE,
      ADD COLUMN IF NOT EXISTS cv_document_id UUID REFERENCES generated_documents(id) ON DELETE SET NULL;
    ALTER TABLE supervisor_outreach DROP CONSTRAINT IF EXISTS supervisor_outreach_status_check;
    ALTER TABLE supervisor_outreach ADD CONSTRAINT supervisor_outreach_status_check
      CHECK (status IN (
        'not_contacted', 'draft_ready', 'awaiting_approval', 'sent', 'replied',
        'interested', 'not_available', 'no_response', 'follow_up_due',
        'not_prepared'
      ));
  END IF;
END $$;

-- Application timeline events
CREATE TABLE application_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  application_id UUID REFERENCES application_tracker(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gmail_threads_user ON gmail_threads(user_id);
CREATE INDEX idx_gmail_threads_category ON gmail_threads(user_id, category);
CREATE INDEX idx_generated_documents_user ON generated_documents(user_id);
CREATE INDEX idx_generated_documents_program ON generated_documents(user_id, program_id);
CREATE INDEX idx_application_packs_user ON application_packs(user_id);
CREATE INDEX idx_follow_up_tasks_user ON follow_up_tasks(user_id, status);
CREATE INDEX idx_timeline_user_program ON application_timeline_events(user_id, program_id);

ALTER TABLE gmail_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own gmail connection" ON gmail_connections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own gmail threads" ON gmail_threads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own gmail messages" ON gmail_messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own cv profile" ON cv_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own generated documents" ON generated_documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own application packs" ON application_packs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users read own ai logs" ON ai_generation_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own follow up tasks" ON follow_up_tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own timeline" ON application_timeline_events FOR ALL USING (auth.uid() = user_id);

-- Track Gmail connection preference on student profile
ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS gmail_connected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_gmail_skipped BOOLEAN DEFAULT FALSE;
