import { ForbiddenException, NotFoundException, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StudentsService } from '../students/students.service';
import { RegistrationNumberDto } from '../students/dto/registration-number.dto';
import { CreateStudentDto } from '../students/dto/create-student.dto';
import { UpdateStudentDto } from '../students/dto/update-student.dto';
import { UserRole } from '../users/user.entity';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';

describe('Registration number results lookup', () => {
  const student = { id: 12, role: UserRole.STUDENT };
  const query = jest.fn();
  const results = new ResultsService({ query } as unknown as DataSource);
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

  beforeEach(() => { query.mockReset(); });

  it('normalizes issued numbers consistently on writes and lookup and preserves leading zeroes', async () => {
    const body = { registrationNumber: ' 001cs/24-1 ' };
    const profile = { name: 'Test Student', email: 'test@example.edu', department: 'CSE', age: 20 };
    for (const dto of [RegistrationNumberDto, CreateStudentDto, UpdateStudentDto]) {
      const input = dto === CreateStudentDto ? { ...profile, ...body } : body;
      const parsed = await pipe.transform(input, { type: 'body', metatype: dto });
      expect(parsed.registrationNumber).toBe('001CS/24-1');
    }
    for (const invalid of [null, '', '---', 'CS 12', 123, 'A'.repeat(65)]) {
      await expect(pipe.transform({ registrationNumber: invalid }, {
        type: 'body', metatype: RegistrationNumberDto,
      })).rejects.toThrow();
    }
  });

  it('requires an exact registration number and account owner in the same query', async () => {
    query.mockResolvedValue([]);
    await expect(results.lookup(student, 'CS/24-1')).rejects.toThrow(NotFoundException);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('st.registration_number = $1 AND st.user_id = $2'), ['CS/24-1', student.id],
    );
    expect(Reflect.getMetadata(ROLES_KEY, ResultsController.prototype.listMarks)).toEqual([UserRole.ADMIN, UserRole.STAFF]);
  });

  it('returns an empty report when the identified student has no marks', async () => {
    query.mockResolvedValue([{ studentId: 4, studentName: 'Example Student', subjectId: null }]);
    await expect(results.lookup(student, '001')).resolves.toEqual({
      student: { id: 4, name: 'Example Student', registrationNumber: '001' }, marks: [],
    });
  });

  it('grades a zero score and allows an editor to find a specific record', async () => {
    query.mockResolvedValue([{ studentId: 8, studentName: 'Example Student', subjectId: 7,
      internalMark: 0, semesterMark: 40, maxInternal: 25, maxSemester: 75 }]);
    const report = await results.lookup({ id: 1, role: UserRole.STAFF }, 'R-0008');
    expect(query).toHaveBeenCalledWith(expect.stringContaining('st.registration_number = $1'), ['R-0008']);
    expect(report.marks[0]).toMatchObject({ internalMark: 0, grade: 'C', total: 40 });
  });

  it('rejects attempts by staff to assign or clear a registration number before writing', async () => {
    const transaction = jest.fn();
    const service = new StudentsService(null, null, { transaction } as unknown as DataSource);
    for (const registrationNumber of ['NEW-ID', null]) {
      await expect(service.update(8, { registrationNumber }, { role: UserRole.STAFF }))
        .rejects.toThrow(ForbiddenException);
    }
    expect(transaction).not.toHaveBeenCalled();
  });
});
