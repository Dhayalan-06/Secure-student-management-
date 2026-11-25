import {
  ForbiddenException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Student } from './student.entity';
import { User } from '../users/user.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UserRole } from '../users/user.entity';
import { Department } from '../departments/department.entity';
import { FeeTransaction } from '../fees/fee-transaction.entity';
@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly repo: Repository<Student>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}
  async list(user: any, query: any) {
      if (user.role === UserRole.STUDENT) {
      const profile = await this.repo
        .createQueryBuilder('student')
        .where('LOWER(student.email) = LOWER(:email)', { email: user.email })
        .andWhere('student.user_id IS NULL')
        .getOne();
      if (profile) {
        profile.user = await this.users.findOneBy({ id: user.id });
        await this.repo.save(profile);
      }
    }
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(query.limit) || 8),
    );
    const qb = this.repo
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('student.department', 'department');
    // Students can view only their own linked profile.
    if (user.role === UserRole.STUDENT) {
      qb.andWhere('user.id = :userId', {
        userId: user.id,
      });
    }
        if (query.search) {
      qb.andWhere(
        `(
          LOWER(student.name) LIKE LOWER(:search)
          OR LOWER(student.email) LIKE LOWER(:search)
          OR LOWER(student.registrationNumber) LIKE LOWER(:search)
          OR LOWER(department.name) LIKE LOWER(:search)
        )`,
        {
          search: `%${String(query.search).trim()}%`,
        },
      );
    }
    qb.orderBy('student.id', 'ASC');
    // Pagination.
    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      data: rows.map((s) => this.publicStudent(s)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
  async getOne(id: number, user: any) {
    const student = await this.repo.findOne({
      where: { id },
      relations: { user: true, department: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (
      user.role === UserRole.STUDENT &&
      student.user?.id !== user.id
    ) {
      throw new ForbiddenException(
        'You can only view your own profile',
      );
    }
    return this.publicStudent(student);
  }
  async create(dto: CreateStudentDto) {
    return this.dataSource.transaction(async (manager) => {
      const students = manager.getRepository(Student);
      const users = manager.getRepository(User);
      const account = await users
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.studentProfile', 'studentProfile')
        .where('LOWER(user.email) = LOWER(:email)', { email: dto.email })
        .getOne();
      const department = await this.findOrCreateDepartment(manager, dto.department);
      const student = students.create({
        ...dto,
        department,
        ...(account && !account.studentProfile ? { user: account } : {}),
      });
      const savedStudent = await this.saveProfile(students, student);
      return this.publicStudent(savedStudent);
    });
  }
  async update(
    id: number,
    dto: UpdateStudentDto,
    user: any,
  ) {
    if (dto.registrationNumber !== undefined && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can change registration numbers.');
    }
    return this.dataSource.transaction(async (manager) => {
      const students = manager.getRepository(Student);
      const student = await students.findOne({
        where: { id },
        relations: { user: true, department: true },
      });
      if (!student) {
        throw new NotFoundException('Student not found');
      }

      if (user.role === UserRole.STAFF && 'email' in dto) {
        delete (dto as any).email;
      }
      const { department: departmentName, ...studentFields } = dto;
      if (departmentName) {
        student.department = await this.findOrCreateDepartment(
          manager,
          departmentName,
        );
      }
      Object.assign(student, studentFields);
      const updatedStudent = await this.saveProfile(students, student);
      return this.publicStudent(updatedStudent);
    });
  }
  async remove(id: number) {
    const student = await this.repo.findOneBy({ id });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    const feeCount = await this.dataSource.getRepository(FeeTransaction).count({
      where: { student: { id } },
    });
    if (feeCount > 0) {
      throw new ConflictException('Cannot delete a student with fee records');
    }
    await this.repo.remove(student);
    return {
      message: 'Student deleted successfully',
    };
  }
  private publicStudent(s: Student) {
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      registrationNumber: s.registrationNumber ?? null,
      department: s.department?.name,
      age: s.age,

    };
  }

  private async saveProfile(students: Repository<Student>, student: Student) {
    try {
      return await students.save(student);
    } catch (error) {
      if (error?.driverError?.code === '23505' &&
          error.driverError.constraint === 'uq_students_registration_number') {
        throw new ConflictException('This registration number is already assigned.');
      }
      throw error;
    }
  }

  private async findOrCreateDepartment(manager: EntityManager, rawName: string) {
    const name = rawName.trim().replace(/\s+/g, ' ');
    const departments = manager.getRepository(Department);
    const existing = await departments
      .createQueryBuilder('department')
      .where('LOWER(department.name) = LOWER(:name)', { name })
      .getOne();
    if (existing) return existing;

    return departments.save(departments.create({ name }));
  }
}
