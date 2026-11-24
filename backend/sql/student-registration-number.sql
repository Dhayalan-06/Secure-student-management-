BEGIN;

ALTER TABLE students ADD COLUMN IF NOT EXISTS registration_number VARCHAR(64)
  CONSTRAINT ck_students_registration_number CHECK (registration_number ~ '^[A-Z0-9][A-Z0-9/-]{0,63}$');

CREATE UNIQUE INDEX IF NOT EXISTS uq_students_registration_number ON students (registration_number);

COMMIT;
