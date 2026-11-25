import { describe, expect, it, jest } from '@jest/globals';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { Student } from '../students/student.entity';
import { Department } from '../departments/department.entity';
import { AuthService } from './auth.service';

describe('AuthService.register transaction', () => {
  it('creates the student account and profile inside one transaction', async () => {
    const department = { id: 4, name: 'Computer Science' };
    const userRepository = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => null as any),
      })),
      create: jest.fn((value) => value),
      save: jest.fn(async (value: any) => ({ ...value, id: 12 })),
    };
    const departmentRepository = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => department as any),
      })),
    };
    const studentRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value: any) => value),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === User) return userRepository;
        if (entity === Department) return departmentRepository;
        if (entity === Student) return studentRepository;
        throw new Error('Unexpected repository');
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (callback: (value: any) => Promise<any>) =>
        callback(manager),
      ),
    } as unknown as DataSource;
    const service = new AuthService({} as any, {} as any, dataSource);

    const result = await service.register({
      email: 'student@example.com',
      password: 'password123',
      name: 'Arun',
      department: 'Computer Science',
      age: 20,
    });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'student@example.com',
        role: UserRole.STUDENT,
      }),
    );
    expect(studentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Arun',
        email: 'student@example.com',
        department,
        user: expect.objectContaining({ id: 12 }),
      }),
    );
    expect(result).toEqual({
      id: 12,
      email: 'student@example.com',
      role: UserRole.STUDENT,
    });
  });
});
