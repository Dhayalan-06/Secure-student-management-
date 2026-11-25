# Semester results database setup

From the `backend` directory, apply both scripts to the PostgreSQL database configured in `backend/.env`. The core `students` table must already exist.

```sh
psql -U YOUR_DB_USERNAME -d YOUR_DB_NAME -f sql/semester-results.sql
psql -U YOUR_DB_USERNAME -d YOUR_DB_NAME -f sql/student-registration-number.sql
```

Existing student records initially have an empty registration number. An administrator assigns the institution-issued hall ticket or registration number when creating or editing a student. Leading zeroes are preserved. The API trims surrounding whitespace and stores letters in uppercase. Each assigned number is unique. Clearing it in the admin editor disables lookup for that record.

After sign-in, the Results section sends `POST /api/results/lookup` with the bearer token and a JSON body such as `{"registrationNumber":"CS/24-019"}`. It returns `student` and the student's graded `marks` across semesters. A valid number with no marks yet returns an empty array. Student sessions can match only their own linked profile. Unmatched numbers and records belonging to another student produce the same 404 response. Admin and staff sessions can retrieve any assigned record. Direct mark listing and editing routes are restricted to staff and administrators.

Then restart the backend. The app supports semesters 1 through 8. Admin and staff accounts can create subjects with a name, code, internal maximum, and semester exam maximum, then enter each student's marks. Subject codes must be unique. Student accounts can view their own saved results.

Grades are calculated from the combined marks as a percentage: O (90%+), A+ (80%+), A (70%+), B+ (60%+), B (50%+), C (40%+), and Fail (below 40%).
