CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  semester SMALLINT NOT NULL,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(30) NOT NULL,
  max_internal SMALLINT NOT NULL CHECK (max_internal > 0),
  max_semester SMALLINT NOT NULL CHECK (max_semester > 0),
  UNIQUE (semester, name)
);

ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_semester_check;
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_semester_range_check;
ALTER TABLE subjects ADD CONSTRAINT subjects_semester_range_check CHECK (semester BETWEEN 1 AND 8);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS code VARCHAR(30);
UPDATE subjects SET code = 'LEGACY-' || id::text WHERE code IS NULL;
ALTER TABLE subjects ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_subjects_code ON subjects(code);

CREATE TABLE IF NOT EXISTS student_marks (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  internal_mark SMALLINT NOT NULL CHECK (internal_mark >= 0),
  semester_mark SMALLINT NOT NULL CHECK (semester_mark >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_student_marks_student_id ON student_marks(student_id);
