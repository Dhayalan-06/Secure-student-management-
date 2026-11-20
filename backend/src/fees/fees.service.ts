import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../users/user.entity';
import { Student } from '../students/student.entity';
import { CreateFeeDto } from './dto/create-fee.dto';
import { FeeStatus, FeeTransaction } from './fee-transaction.entity';

@Injectable()
export class FeesService {
  constructor(
    @InjectRepository(FeeTransaction)
    private readonly fees: Repository<FeeTransaction>,
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
  ) {}

  async list(user: any) {
    const query = this.fees
      .createQueryBuilder('fee')
      .leftJoinAndSelect('fee.student', 'student')
      .leftJoinAndSelect('student.department', 'department')
      .orderBy('fee.dueDate', 'ASC')
      .addOrderBy('fee.id', 'DESC');

    if (user.role === UserRole.STUDENT) {
      query
        .innerJoin('student.user', 'user')
        .andWhere('user.id = :userId', { userId: user.id });
    }

    const records = await query.getMany();
    return records.map((fee) => this.toResponse(fee));
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
