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

  async lookup(user: { id: number; role: UserRole }, registrationNumber: string) {
    const isStudent = user.role === UserRole.STUDENT;
    const ownership = isStudent ? ' AND user_id = $2' : '';
    const studentParams = isStudent ? [registrationNumber, user.id] : [registrationNumber];
    const [student] = await this.dataSource.query(
      'SELECT id, name, registration_number AS "registrationNumber" FROM students WHERE UPPER(TRIM(registration_number)) = UPPER($1)' + ownership,
      studentParams,
    );
    if (!student) throw new NotFoundException('No matching student record was found.');

    const rows = await this.dataSource.query(
      'SELECT sm.id AS "subjectId", sm.course_name AS "subjectName", sm.course_code AS "subjectCode", sm.sem_no AS semester, 0::int AS "maxInternal", 100::int AS "maxSemester", 0::int AS "internalMark", COALESCE(sm.marks, 0)::float AS "semesterMark" FROM student_marks sm WHERE UPPER(TRIM(sm.reg_no)) = UPPER($1) ORDER BY sm.sem_no, sm.course_name',
      [student.registrationNumber],
    );
    const marks = rows.map((row) => this.withGrade(row));
    return {
      student: { id: student.id, name: student.name, registrationNumber: student.registrationNumber },
      marks,
    };
  }
  async listSubjects(semester?: number) {
    if (semester !== undefined && (semester < 1 || semester > 8)) {
      throw new BadRequestException('Semester must be between 1 and 8');
    }
    return this.dataSource.query(
      'SELECT MIN(id) AS id, sem_no AS semester, course_name AS name, course_code AS code, 0::int AS "maxInternal", 100::int AS "maxSemester" FROM student_marks WHERE ($1::int IS NULL OR sem_no = $1) GROUP BY sem_no, course_name, course_code ORDER BY sem_no, course_name',
      [semester ?? null],
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
    const values: any[] = [];
    const where: string[] = [];
    if (semester !== undefined) {
      values.push(semester);
      where.push('sm.sem_no = $' + values.length);
    }
    if (user.role === UserRole.STUDENT) {
      values.push(user.id);
      where.push('st.user_id = $' + values.length);
    } else if (studentId !== undefined) {
      values.push(studentId);
      where.push('st.id = $' + values.length);
    }
    const rows = await this.dataSource.query(
      'SELECT st.id AS "studentId", st.name AS "studentName", sm.id AS "subjectId", sm.course_name AS "subjectName", sm.course_code AS "subjectCode", sm.sem_no AS semester, 0::int AS "maxInternal", 100::int AS "maxSemester", 0::int AS "internalMark", COALESCE(sm.marks, 0)::float AS "semesterMark" FROM student_marks sm JOIN students st ON UPPER(TRIM(st.registration_number)) = UPPER(TRIM(sm.reg_no)) ' + (where.length ? 'WHERE ' + where.join(' AND ') : '') + ' ORDER BY sm.sem_no, sm.course_name',
      values,
    );
    return rows.map((row) => this.withGrade(row));
  }

  async saveMark(user: any, dto: SaveMarkDto) {
    if (user.role === UserRole.STUDENT) {
      throw new ForbiddenException('Only staff can enter marks');
    }
    if (dto.marks > 100) {
      throw new BadRequestException('Mark cannot exceed 100');
    }
    const [student] = await this.dataSource.query(
      'SELECT id, registration_number AS "registrationNumber" FROM students WHERE id = $1',
      [dto.studentId],
    );
    if (!student) throw new NotFoundException('Student not found');
    const [row] = await this.dataSource.query(
      'UPDATE student_marks SET marks = $1 WHERE id = $2 AND UPPER(TRIM(reg_no)) = UPPER(TRIM($3)) RETURNING id AS "subjectId", course_name AS "subjectName", course_code AS "subjectCode", sem_no AS semester, 0::int AS "maxInternal", 100::int AS "maxSemester", 0::int AS "internalMark", COALESCE(marks, 0)::float AS "semesterMark"',
      [dto.marks, dto.markId, student.registrationNumber],
    );
    if (!row) throw new NotFoundException('Mark record not found for this student');
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
