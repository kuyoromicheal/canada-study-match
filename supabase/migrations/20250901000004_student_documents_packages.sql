-- Student contact profile, document vault, program required documents, application packages

ALTER TYPE degree_level ADD VALUE IF NOT EXISTS 'graduate_certificate';

CREATE TYPE document_type AS ENUM (
  'transcript',
  'certificate',
  'resume',
  'reference_letter',
  'english_test_report',
  'statement_of_purpose',
  'passport_copy',
  'other'
);

-- Contact info on student profile
ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS mailing_street TEXT,
  ADD COLUMN IF NOT EXISTS mailing_city TEXT,
  ADD COLUMN IF NOT EXISTS mailing_province_state TEXT,
  ADD COLUMN IF NOT EXISTS mailing_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS mailing_country TEXT;

-- Program admissions + fee waiver
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS official_admissions_url TEXT,
  ADD COLUMN IF NOT EXISTS fee_waiver_available BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fee_waiver_notes TEXT;

-- Required documents per program (catalog)
CREATE TABLE program_required_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  doc_type document_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_demo_record BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status verification_status NOT NULL DEFAULT 'needs_verification',
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_program_required_documents_program ON program_required_documents(program_id);

-- Student document vault (metadata; files in storage)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type document_type NOT NULL,
  display_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_user ON documents(user_id);
CREATE UNIQUE INDEX idx_documents_user_storage_path ON documents(user_id, storage_path);

-- Link checklist items to vault documents
ALTER TABLE application_checklist_items
  ADD COLUMN IF NOT EXISTS linked_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS required_document_id UUID REFERENCES program_required_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS doc_type document_type;

ALTER TABLE application_checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS: program_required_documents (public read)
ALTER TABLE program_required_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read program required documents" ON program_required_documents
  FOR SELECT USING (true);

CREATE POLICY "Admin manage program required documents" ON program_required_documents
  FOR ALL USING (is_admin());

-- RLS: documents (owner only)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents',
  'student-documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- Storage RLS: path must be {user_id}/{filename}
CREATE POLICY "Users read own storage objects" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users insert own storage objects" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users update own storage objects" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own storage objects" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Seed default required documents for real programs (generic grad application set)
INSERT INTO program_required_documents (program_id, doc_type, title, description, is_required, sort_order, verification_status)
SELECT p.id, v.doc_type::document_type, v.title, v.description, true, v.sort_order, 'needs_verification'
FROM programs p
CROSS JOIN (
  VALUES
    ('transcript', 'Official transcripts', 'Transcripts from all post-secondary institutions', 1),
    ('english_test_report', 'English proficiency test', 'IELTS, TOEFL, or equivalent if required', 2),
    ('statement_of_purpose', 'Statement of purpose', 'Personal statement or letter of intent', 3),
    ('resume', 'CV / Resume', 'Current curriculum vitae or resume', 4),
    ('reference_letter', 'Reference letters', 'Academic or professional references as required', 5)
) AS v(doc_type, title, description, sort_order)
WHERE p.is_demo_record = false
  AND NOT EXISTS (
    SELECT 1 FROM program_required_documents prd WHERE prd.program_id = p.id
  );
