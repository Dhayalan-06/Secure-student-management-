# Semester results database setup

The results feature stores subjects and marks in two PostgreSQL tables. Run this once against the same database configured in `backend/.env`:

```sh
psql -U YOUR_DB_USERNAME -d YOUR_DB_NAME -f sql/semester-results.sql
```

For example, if the database name is `student_management`, use:

```sh
psql -U postgres -d student_management -f sql/semester-results.sql
```

Then restart the backend. The app supports semesters 1 through 8. Admin and staff accounts can create subjects with a name, code, internal maximum, and semester exam maximum, then enter each student's marks. Subject codes must be unique. Student accounts can view their own saved results.

Grades are calculated from the combined marks as a percentage: O (90%+), A+ (80%+), A (70%+), B+ (60%+), B (50%+), C (40%+), and Fail (below 40%).
