import { describe, expect, it, jest } from '@jest/globals';
import { FeeStatus } from './fee-transaction.entity';
import { FeesService } from './fees.service';

describe('FeesService', () => {
  it('creates new fee records as pending', async () => {
    const student = { id: 3, name: 'Arun', email: 'arun@example.com' };
    const students = {
      findOneBy: jest.fn(async () => student as any),
    };
    const fees = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value: any) => ({
        id: 8,
        ...value,
        createdAt: new Date('2026-10-01T00:00:00Z'),
      })),
    };
    const service = new FeesService(fees as any, students as any);

    const result = await service.create({
      studentId: 3,
      description: 'Semester fee',
      amount: 12500,
      dueDate: '2026-12-01',
    });

    expect(fees.save).toHaveBeenCalledWith(
      expect.objectContaining({
        student,
        description: 'Semester fee',
        amount: '12500.00',
        status: FeeStatus.PENDING,
        paidAt: null,
      }),
    );
    expect(result.status).toBe(FeeStatus.PENDING);
    expect(result.amount).toBe(12500);
  });

  it('sets paidAt when an admin marks a fee paid', async () => {
    const fee = {
      id: 8,
      student: { id: 3, name: 'Arun', email: 'arun@example.com' },
      description: 'Semester fee',
      amount: '12500.00',
      dueDate: '2026-12-01',
      status: FeeStatus.PAID,
      paidAt: new Date('2026-10-23T00:00:00Z'),
    };
    const fees = {
      update: jest.fn(async (_id: number, _values: any) => ({ affected: 1 })),
      findOne: jest.fn(async () => fee as any),
    };
    const service = new FeesService(fees as any, {} as any);

    const result = await service.updateStatus(8, FeeStatus.PAID);

    expect(fees.update).toHaveBeenCalledWith(
      8,
      expect.objectContaining({ status: FeeStatus.PAID, paidAt: expect.any(Date) }),
    );
    expect(result.status).toBe(FeeStatus.PAID);
  });
});
