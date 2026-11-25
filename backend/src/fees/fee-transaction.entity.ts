import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Student } from '../students/student.entity';

export enum FeeStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

@Entity('fee_transactions')
export class FeeTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  description: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: string;

  @Column({ type: 'date', name: 'due_date' })
  dueDate: string;

  @Column({ type: 'varchar', length: 10, default: FeeStatus.PENDING })
  status: FeeStatus;

  @Column({ type: 'timestamptz', name: 'paid_at', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Student, (student) => student.feeTransactions, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'student_id' })
  student: Student;
}
