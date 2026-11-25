import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Department } from '../departments/department.entity';
import { FeeTransaction } from '../fees/fee-transaction.entity';
@Entity('students')
export class Student {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column({ unique: true }) email: string;
  @Index('uq_students_registration_number', { unique: true })
  @Column({ name: 'registration_number', type: 'varchar', length: 64, nullable: true })
  registrationNumber: string | null;
  @Column({ type: 'int' }) age: number;
  @OneToOne(() => User, user => user.studentProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' }) user: User;

  @ManyToOne(() => Department, (department) => department.students, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @OneToMany(() => FeeTransaction, (fee) => fee.student)
  feeTransactions: FeeTransaction[];
}
