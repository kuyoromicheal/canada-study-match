-- Profile fields for structured form options (field category, institution preference)

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS field_category TEXT,
  ADD COLUMN IF NOT EXISTS preferred_institution_type TEXT;
