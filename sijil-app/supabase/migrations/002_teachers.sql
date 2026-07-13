-- ============================================================
-- Tambahan: Jadual guru (bank data guru)
-- Jalankan dalam Supabase SQL Editor
-- ============================================================

CREATE TABLE teachers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  TEXT NOT NULL,
  ic_number  TEXT NOT NULL UNIQUE,
  email      TEXT,
  school     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Sesiapa boleh baca (untuk semakan sijil)
CREATE POLICY "teachers_read_all"
  ON teachers FOR SELECT USING (TRUE);

-- Hanya admin boleh tambah/edit/padam
CREATE POLICY "teachers_admin_write"
  ON teachers FOR ALL
  USING (auth.role() = 'authenticated');

-- Kemaskini jadual recipients — tambah kolum ic_number
-- (supaya boleh semak IC masa jana sijil)
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS ic_number TEXT;

-- Function kemaskini: check_recipient kini juga semak jadual teachers
CREATE OR REPLACE FUNCTION check_recipient(
  p_program_id UUID,
  p_ic         TEXT
)
RETURNS TABLE(
  found       BOOLEAN,
  full_name   TEXT,
  already_gen BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE,
    r.full_name,
    r.cert_generated
  FROM recipients r
  WHERE r.program_id = p_program_id
    AND r.ic_number  = p_ic
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, FALSE;
  END IF;
END;
$$;

-- Data contoh guru
INSERT INTO teachers (full_name, ic_number, email, school) VALUES
  ('Ahmad Faris bin Ramli',   '900215-01-1234', 'faris@sekolah.edu.my',  'SK Taman Maju'),
  ('Nurul Ain binti Johari',  '950322-02-5678', 'ain@sekolah.edu.my',    'SK Taman Maju'),
  ('Mohd Hafiz bin Azmi',     '881103-07-9012', 'hafiz@sekolah.edu.my',  'SMK Indah'),
  ('Siti Hajar binti Mahmud', '991231-10-4444', 'hajar@sekolah.edu.my',  'SMK Indah'),
  ('Zainudin bin Othman',     '870808-05-3333', 'zain@sekolah.edu.my',   'SK Perdana')
ON CONFLICT (ic_number) DO NOTHING;
