import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';

import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/user.entity';
import { Student } from '../students/student.entity';
import { Department } from '../departments/department.entity';
import { DataSource, EntityManager } from 'typeorm';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly googleClient = new OAuth2Client();

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  // Create or update the initial admin account
  async onModuleInit(): Promise<void> {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error(
        'ADMIN_EMAIL or ADMIN_PASSWORD is missing in .env',
      );
    }

    const existingAdmin = await this.users.findByEmail(email);
    const passwordHash = await bcrypt.hash(password, 12);

    if (existingAdmin) {
      await this.users.update(existingAdmin.id, {
        email,
        passwordHash,
        role: UserRole.ADMIN,
      });

      console.log('Admin account credentials refreshed');
      return;
    }

    await this.users.create({
      email,
      passwordHash,
      role: UserRole.ADMIN,
    });

    console.log('Admin account created successfully');
  }

  // Register a new student account
  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(dto.password, 12);
    let user: User;

    try {
      user = await this.dataSource.transaction(async (manager) => {
        const users = manager.getRepository(User);
        const existingUser = await users
          .createQueryBuilder('user')
          .where('LOWER(user.email) = LOWER(:email)', { email })
          .getOne();
        if (existingUser) {
          throw new ConflictException('Email already registered');
        }

        const department = await this.findOrCreateDepartment(
          manager,
          dto.department,
        );
        const newUser = await users.save(
          users.create({ email, passwordHash, role: UserRole.STUDENT }),
        );
        const students = manager.getRepository(Student);
        await students.save(
          students.create({
            name: dto.name.trim(),
            email,
            department,
            age: dto.age,
            cgpa: dto.cgpa,
            user: newUser,
          }),
        );
        return newUser;
      });
    } catch (error) {
      const driverError = (error as { driverError?: { code?: string } } | null)
        ?.driverError;
      if (driverError?.code === '23505') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  // Login and generate JWT
  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);

    if (
      !user ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async googleLogin(credential: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new InternalServerErrorException('Google sign-in is not configured.');
    }
    if (!credential) {
      throw new UnauthorizedException('Google sign-in credential is missing.');
    }

    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Google sign-in token is invalid or expired.');
    }

    if (!payload?.email || payload.email_verified !== true) {
      throw new UnauthorizedException('Google account must have a verified email.');
    }

    const email = payload.email.trim().toLowerCase();
    let user = await this.users.findByEmail(email);
    if (!user) {
      user = await this.users.create({
        email,
        passwordHash: await bcrypt.hash(randomUUID(), 12),
        role: UserRole.STUDENT,
      });
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
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
