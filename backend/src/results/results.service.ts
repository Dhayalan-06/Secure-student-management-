import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserRole } from '../users/user.entity';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { SaveMarkDto } from './dto/save-mark.dto';

@Injectable()
export class ResultsService {
  constructor(private readonly dataSource: DataSource) {}

  async listSubjects(semester?: number) {
    if (semester !== undefined && (semester < 1 || semester > 8)) {
      throw new BadRequestException('Semester must be between 1 and 8');
    }
    const params: number[] = [];
    let where = '';
    if (semester) {
      params.push(semester);
      where = 'WHERE semester = $1';
    }
    return this.dataSource.query(
      `SELECT id, semester, name, code, max_internal AS "maxInternal", max_semester AS "maxSemester"
       FROM subjects ${where} ORDER BY semester, name`,
      params,
    );
  }

  async createSubject(dto: CreateSubjectDto) {
    const [subject] = await this.dataSource.query(
      `INSERT INTO subjects (semester, name, code, max_internal, max_semester)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code) DO UPDATE SET
         semester = EXCLUDED.semester,
         name = EXCLUDED.name,
         max_internal = EXCLUDED.max_internal,
         max_semester = EXCLUDED.max_semester
       RETURNING id, semester, name, code, max_internal AS "maxInternal", max_semester AS "maxSemester"`,
      [dto.semester, dto.name.trim(), dto.code.trim().toUpperCase(), dto.maxInternal, dto.maxSemester],
    );
    return subject;
  }

  async listMarks(user: any, semester?: number, studentId?: number) {
    if (semester !== undefined && (semester < 1 || semester > 8)) {
      throw new BadRequestException('Semester must be between 1 and 8');
    }
    const isStudent = user.role === UserRole.STUDENT;
    const values: any[] = [];
    const where: string[] = [];
    if (semester) {
      values.push(semester);
      where.push(`sub.semester = $${values.length}`);
    }
    if (isStudent) {
      values.push(user.id);
      where.push(`st.user_id = $${values.length}`);
    } else if (studentId) {
      values.push(studentId);
      where.push(`st.id = $${values.length}`);
    }
    const rows = await this.dataSource.query(
      `SELECT sm.student_id AS "studentId", st.name AS "studentName",
              sub.id AS "subjectId", sub.name AS "subjectName", sub.code AS "subjectCode", sub.semester,
              sub.max_internal AS "maxInternal", sub.max_semester AS "maxSemester",
              sm.internal_mark AS "internalMark", sm.semester_mark AS "semesterMark"
       FROM student_marks sm
       JOIN students st ON st.id = sm.student_id
       JOIN subjects sub ON sub.id = sm.subject_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY sub.semester, sub.name`,
      values,
    );
    return rows.map((row) => this.withGrade(row));
  }

  async saveMark(user: any, dto: SaveMarkDto) {
    if (user.role === UserRole.STUDENT) {
      throw new ForbiddenException('Only staff can enter marks');
    }
    const [subject] = await this.dataSource.query(
      'SELECT id, max_internal AS "maxInternal", max_semester AS "maxSemester" FROM subjects WHERE id = $1',
      [dto.subjectId],
    );
    if (!subject) throw new NotFoundException('Subject not found');
    const [student] = await this.dataSource.query('SELECT id FROM students WHERE id = $1', [dto.studentId]);
    if (!student) throw new NotFoundException('Student not found');
    if (dto.internalMark > Number(subject.maxInternal)) {
      throw new BadRequestException(`Internal mark cannot exceed ${subject.maxInternal}`);
    }
    if (dto.semesterMark > Number(subject.maxSemester)) {
      throw new BadRequestException(`Semester mark cannot exceed ${subject.maxSemester}`);
    }
    await this.dataSource.query(
      `INSERT INTO student_marks (student_id, subject_id, internal_mark, semester_mark)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (student_id, subject_id) DO UPDATE SET
         internal_mark = EXCLUDED.internal_mark,
         semester_mark = EXCLUDED.semester_mark,
         updated_at = NOW()`,
      [dto.studentId, dto.subjectId, dto.internalMark, dto.semesterMark],
    );
    const [row] = await this.dataSource.query(
      `SELECT sm.student_id AS "studentId", st.name AS "studentName",
              sub.id AS "subjectId", sub.name AS "subjectName", sub.code AS "subjectCode", sub.semester,
              sub.max_internal AS "maxInternal", sub.max_semester AS "maxSemester",
              sm.internal_mark AS "internalMark", sm.semester_mark AS "semesterMark"
       FROM student_marks sm
       JOIN students st ON st.id = sm.student_id
       JOIN subjects sub ON sub.id = sm.subject_id
       WHERE sm.student_id = $1 AND sm.subject_id = $2`,
      [dto.studentId, dto.subjectId],
    );
    return this.withGrade(row);
  }

  private withGrade(row: any) {
    const internalMark = Number(row.internalMark);
    const semesterMark = Number(row.semesterMark);
    const maxInternal = Number(row.maxInternal);
    const maxSemester = Number(row.maxSemester);
    const total = internalMark + semesterMark;
    const percentage = (total / (maxInternal + maxSemester)) * 100;
    const grade = percentage >= 90 ? 'O'
      : percentage >= 80 ? 'A+'
        : percentage >= 70 ? 'A'
          : percentage >= 60 ? 'B+'
            : percentage >= 50 ? 'B'
              : percentage >= 40 ? 'C'
                : 'Fail';
    return { ...row, internalMark, semesterMark, total, percentage: Number(percentage.toFixed(2)), grade };
  }
}
