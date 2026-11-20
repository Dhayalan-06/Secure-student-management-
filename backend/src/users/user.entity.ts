import { Column, CreateDateColumn, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Student } from '../students/student.entity';

export enum UserRole { ADMIN = 'admin', STAFF = 'staff', STUDENT = 'student' }

@Entity('users')
export class User {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) email: string;
  @Column({ name: 'password_hash', select: false }) passwordHash: string;
  @Column({ type: 'varchar', length:20, default: UserRole.STUDENT }) role: UserRole;
  @OneToOne(() => Student, student => student.user, { nullable: true }) studentProfile: Student;
  @CreateDateColumn({name:'created_at'}) createdAt: Date;
}
