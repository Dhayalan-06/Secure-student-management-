# Secure Student Management System

Starter project: React + Vite + Tailwind CSS frontend, NestJS + TypeORM + PostgreSQL backend, JWT authentication and role-based authorization.

## Prerequisites
- Node.js LTS (Node 20+ recommended)
- PostgreSQL
- npm

## 1. Database
Create a PostgreSQL database named `secure_student_db`.

## 2. Backend setup
```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL username/password and a long random JWT secret.
npm install
npm run start:dev
```
Backend: http://localhost:3000

` synchronize: true` is enabled only for local development. Use migrations in production.

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
- `POST /auth/register` `{ "email": "...", "password": "..." }`
- `POST /auth/login` `{ "email": "...", "password": "..." }`
- `GET /auth/me` (Bearer token)
- `GET /students?page=1&limit=8&search=...&cgpa_min=...`
- `GET /students/:id`
- `POST /students` (admin)
- `PATCH /students/:id` (admin/staff; staff cannot change ownership)
- `DELETE /students/:id` (admin)

Pass JWT in `Authorization: Bearer <token>`. Do not use a client-supplied `x-role` header for authorization.

## Notes
This is a starter scaffold intended to be reviewed and adapted against your original repository. It does not overwrite or import the existing GitHub source. Keep backups and merge carefully.
