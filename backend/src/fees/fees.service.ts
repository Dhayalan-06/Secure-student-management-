import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../users/user.entity';
import { Student } from '../students/student.entity';
import { CreateFeeDto } from './dto/create-fee.dto';
import { FeeStatus, FeeTransaction } from './fee-transaction.entity';

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class FeesService {
  constructor(
    @InjectRepository(FeeTransaction)
    private readonly fees: Repository<FeeTransaction>,
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
  ) {}

  async list(user: any, query: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(query.limit) || DEFAULT_PAGE_SIZE));

    const qb = this.fees
      .createQueryBuilder('fee')
      .leftJoinAndSelect('fee.student', 'student')
      .leftJoinAndSelect('student.department', 'department')
      .orderBy('fee.dueDate', 'ASC')
      .addOrderBy('fee.id', 'DESC');

    if (user.role === UserRole.STUDENT) {
      qb
        .innerJoin('student.user', 'user')
        .andWhere('user.id = :userId', { userId: user.id });
    }

    const [records, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: records.map((fee) => this.toResponse(fee)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async totals(user: any) {
    const qb = this.fees
      .createQueryBuilder('fee')
      .leftJoin('fee.student', 'student');

    if (user.role === UserRole.STUDENT) {
      qb
        .innerJoin('student.user', 'user')
        .andWhere('user.id = :userId', { userId: user.id });
    }

    const [total, pending, paid] = await Promise.all([
      qb.clone().getCount(),
      qb.clone().andWhere('fee.status = :status', { status: FeeStatus.PENDING }).getCount(),
      qb.clone().andWhere('fee.status = :status', { status: FeeStatus.PAID }).getCount(),
    ]);

    const pendingAmount = await qb
      .clone()
      .andWhere('fee.status = :status', { status: FeeStatus.PENDING })
      .select('SUM(CAST(fee.amount AS DECIMAL(10,2)))', 'sum')
      .getRawOne<{ sum: string | null }>();

    const paidAmount = await qb
      .clone()
      .andWhere('fee.status = :status', { status: FeeStatus.PAID })
      .select('SUM(CAST(fee.amount AS DECIMAL(10,2)))', 'sum')
      .getRawOne<{ sum: string | null }>();

    return {
      total,
      pending,
      paid,
      pendingAmount: pendingAmount?.sum ? Number(pendingAmount.sum) : 0,
      paidAmount: paidAmount?.sum ? Number(paidAmount.sum) : 0,
    };
  }

  async create(dto: CreateFeeDto) {
    const student = await this.students.findOne({
      where: { id: dto.studentId },
      relations: { department: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const fee = await this.fees.save(
      this.fees.create({
        student,
        description: dto.description.trim(),
        amount: dto.amount.toFixed(2),
        dueDate: dto.dueDate,
        status: FeeStatus.PENDING,
        paidAt: null,
      }),
    );

    return this.toResponse({ ...fee, student });
  }

  async updateStatus(id: number, status: FeeStatus) {
    const result = await this.fees.update(id, {
      status,
      paidAt: status === FeeStatus.PAID ? new Date() : null,
    });
    if (!result.affected) {
      throw new NotFoundException('Fee transaction not found');
    }

    const fee = await this.fees.findOne({
      where: { id },
      relations: { student: { department: true } },
    });
    if (!fee) {
      throw new NotFoundException('Fee transaction not found');
    }
    return this.toResponse(fee);
  }

  private toResponse(fee: FeeTransaction) {
    return {
      id: fee.id,
      studentId: fee.student.id,
      studentName: fee.student.name,
      studentEmail: fee.student.email,
      departmentId: fee.student.department?.id ?? null,
      departmentName: fee.student.department?.name ?? null,
      description: fee.description,
      amount: Number(fee.amount),
      dueDate: fee.dueDate,
      status: fee.status,
      paidAt: fee.paidAt,
      createdAt: fee.createdAt,
    };
  }
}
