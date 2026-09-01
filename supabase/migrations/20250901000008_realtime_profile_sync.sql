-- Enable Supabase Realtime for profile / document / application sync

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'student_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE student_profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'documents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE documents;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'application_checklist_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE application_checklist_items;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'application_tracker'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE application_tracker;
  END IF;
END $$;
