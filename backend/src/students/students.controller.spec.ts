import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Mocked } from 'jest-mock';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

describe('StudentsController', () => {
  let controller: StudentsController;
  let service: Mocked<
    Pick<StudentsService, 'list' | 'getOne' | 'create' | 'update' | 'remove'>
  >;

  beforeEach(() => {
    service = {
      list: jest.fn(),
      getOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    controller = new StudentsController(service as unknown as StudentsService);
  });

  it('returns the student list on success', async () => {
    const user = { id: 1 };
    const query = { page: 1 };
    const students = [{ id: 1, name: 'Arun' }];
    service.list.mockResolvedValue(students as never);

    await expect(controller.list({ user }, query)).resolves.toEqual(students);
    expect(service.list).toHaveBeenCalledWith(user, query);
  });

  it('propagates an error when listing students fails', async () => {
    service.list.mockRejectedValue(new Error('Database error'));

    await expect(controller.list({ user: { id: 1 } }, {})).rejects.toThrow(
      'Database error',
    );
  });

  it('returns one student on success', async () => {
    const user = { id: 1 };
    const student = { id: 7, name: 'Arun' };
    service.getOne.mockResolvedValue(student as never);

    await expect(controller.getOne(7, { user })).resolves.toEqual(student);
    expect(service.getOne).toHaveBeenCalledWith(7, user);
  });

  it('creates a student successfully', async () => {
    const dto = {
      name: 'Arun',
      email: 'arun@example.com',
      department: 'CSE',
      age: 20,
    };
    const student = { id: 7, ...dto };
    service.create.mockResolvedValue(student as never);

    await expect(controller.create(dto as never)).resolves.toEqual(student);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('updates a student successfully', async () => {
    const user = { id: 1 };
    const dto = { name: 'Arun Kumar' };
    const student = { id: 7, ...dto };
    service.update.mockResolvedValue(student as never);

    await expect(controller.update(7, dto as never, { user })).resolves.toEqual(
      student,
    );
    expect(service.update).toHaveBeenCalledWith(7, dto, user);
  });

  it('removes a student successfully', async () => {
    const result = { message: 'Student deleted successfully' };
    service.remove.mockResolvedValue(result as never);

    await expect(controller.remove(7)).resolves.toEqual(result);
    expect(service.remove).toHaveBeenCalledWith(7);
  });
});
