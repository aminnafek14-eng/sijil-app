-- ============================================================
-- Sistem Janaan Sijil — Supabase Schema
-- Jalankan dalam Supabase SQL Editor
-- ============================================================

-- 1. JADUAL: programs (senarai program/majlis)
CREATE TABLE programs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  date        DATE NOT NULL,
  template_url TEXT,          -- URL gambar sijil (dari Storage)
  -- Kedudukan teks nama pada template (dalam %)
  name_x      FLOAT DEFAULT 50,   -- % dari kiri
  name_y      FLOAT DEFAULT 55,   -- % dari atas
  name_size   INT   DEFAULT 36,   -- saiz fon (px)
  name_color  TEXT  DEFAULT '#1e3a5f',
  name_font   TEXT  DEFAULT 'Georgia',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. JADUAL: recipients (senarai peserta layak)
CREATE TABLE recipients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  UUID REFERENCES programs(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  ic_number   TEXT NOT NULL,           -- format: 900215-01-1234
  cert_generated BOOLEAN DEFAULT FALSE,
  generated_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, ic_number)
);

-- 3. JADUAL: admins (log masuk admin)
CREATE TABLE admins (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email    TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE programs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins     ENABLE ROW LEVEL SECURITY;

-- Programs: sesiapa boleh baca, hanya admin tulis
CREATE POLICY "programs_read_all"
  ON programs FOR SELECT USING (TRUE);

CREATE POLICY "programs_admin_write"
  ON programs FOR ALL
  USING (auth.role() = 'authenticated');

-- Recipients: sesiapa boleh semak IC (via function), admin boleh semua
CREATE POLICY "recipients_admin_all"
  ON recipients FOR ALL
  USING (auth.role() = 'authenticated');

-- Public boleh baca untuk semakan (dihadkan via function)
CREATE POLICY "recipients_read_all"
  ON recipients FOR SELECT USING (TRUE);

-- ============================================================
-- FUNCTION: Semak kelayakan & rekod janaan sijil
-- ============================================================
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

  -- Kalau tiada rekod
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, FALSE;
  END IF;
END;
$$;

-- Function: tandakan sijil sudah dijana
CREATE OR REPLACE FUNCTION mark_cert_generated(
  p_program_id UUID,
  p_ic         TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE recipients
  SET cert_generated = TRUE,
      generated_at   = NOW()
  WHERE program_id = p_program_id
    AND ic_number  = p_ic;
END;
$$;

-- ============================================================
-- STORAGE BUCKET: sijil-templates
-- ============================================================
-- Jalankan dalam Supabase Dashboard > Storage > New Bucket
-- Nama bucket: sijil-templates
-- Public: YES (supaya URL template boleh diakses)

-- Policy untuk storage (jalankan selepas buat bucket):
INSERT INTO storage.buckets (id, name, public)
VALUES ('sijil-templates', 'sijil-templates', TRUE)
ON CONFLICT DO NOTHING;

CREATE POLICY "template_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sijil-templates');

CREATE POLICY "template_admin_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'sijil-templates'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "template_admin_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'sijil-templates'
    AND auth.role() = 'authenticated'
  );

-- ============================================================
-- DATA CONTOH (pilihan)
-- ============================================================
INSERT INTO programs (name, date, template_url, name_x, name_y, name_size, name_color)
VALUES (
  'Hari Anugerah Cemerlang 2026',
  '2026-07-13',
  NULL,   -- isi selepas upload template
  50, 58, 42, '#1e3a5f'
);

-- Dapatkan ID program yang baru dibuat
DO $$
DECLARE v_pid UUID;
BEGIN
  SELECT id INTO v_pid FROM programs WHERE name = 'Hari Anugerah Cemerlang 2026';
  INSERT INTO recipients (program_id, full_name, ic_number) VALUES
    (v_pid, 'Ahmad Faris bin Ramli',  '900215-01-1234'),
    (v_pid, 'Nurul Ain binti Johari', '950322-02-5678'),
    (v_pid, 'Mohd Hafiz bin Azmi',    '881103-07-9012'),
    (v_pid, 'Siti Hajar binti Mahmud','991231-10-4444'),
    (v_pid, 'Zainudin bin Othman',    '870808-05-3333');
END $$;
