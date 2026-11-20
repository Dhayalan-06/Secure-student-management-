import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Department } from '../departments/department.entity';
import { FeeTransaction } from '../fees/fee-transaction.entity';
@Entity('students')
export class Student {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column({ unique: true }) email: string;
  @Column({ type: 'int' }) age: number;
  @Column({ type: 'float', default: 0 }) cgpa: number;
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
