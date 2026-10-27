# Secure Student Management System

Starter project: React + Vite + Tailwind CSS frontend, NestJS + TypeORM + PostgreSQL backend, JWT authentication and role-based authorization.

## Prerequisites
- Node.js LTS (Node 20+ recommended)
- PostgreSQL
- npm

## 1. Database
Create a PostgreSQL database named `secure_student_db` and make sure the existing `users` and `students` tables are present. Before starting the updated backend, run the department migration once against that database:

```bash
psql -d secure_student_db -f backend/database/migrations/001_departments_one_to_many.sql
```

The migration preserves existing student department names, creates a `departments` table, and replaces `students.department` with the `students.department_id` foreign key. Back up the database before applying schema migrations.

Then add the fee tracking table:

```bash
psql -d secure_student_db -f backend/database/migrations/002_fee_transactions.sql
```

Fee rows are linked to a student and restricted from deletion so payment history is retained.

## 2. Backend setup
```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL username/password and a long random JWT secret.
npm install
npm run start:dev
```
Backend: http://localhost:3000

TypeORM schema synchronization is disabled; use the migration above to update an existing database.

## 3. Create the first admin
After backend dependencies are installed and `.env` is configured:
```bash
npm run seed:admin
```
Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before running. The script creates an admin if one does not already exist.

## 4. Frontend setup
In another terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend: http://localhost:5173

## Roles
- Admin: list/create/update/delete student records.
- Staff: list and update student records.
- Student: view their own profile only (a student profile must be linked to the account).

Public registration always creates a `student` role. Never accept a role from a public registration request.

## API
- `POST /auth/register` `{ "email": "...", "password": "...", "name": "...", "department": "...", "age": 20, "cgpa": 8.5 }` (creates the student login and profile in one transaction)
- `POST /auth/login` `{ "email": "...", "password": "..." }`
- `GET /auth/me` (Bearer token)
- `GET /students?page=1&limit=8&search=...&cgpa_min=...`
- `GET /students/:id`
- `POST /students` (admin)
- `PATCH /students/:id` (admin/staff; staff cannot change ownership)
- `DELETE /students/:id` (admin)
- `GET /fees` (admin sees all fees; students see only their own)
- `POST /fees` `{ "studentId": 1, "description": "Semester fee", "amount": 25000, "dueDate": "2026-12-01" }` (admin; creates `PENDING` fee)
- `PATCH /fees/:id/status` `{ "status": "PAID" }` (admin; set `PENDING` or `PAID`)

Pass JWT in `Authorization: Bearer <token>`. Do not use a client-supplied `x-role` header for authorization.

## Notes
This is a starter scaffold intended to be reviewed and adapted against your original repository. It does not overwrite or import the existing GitHub source. Keep backups and merge carefully.
