import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './student.entity';
import { User } from '../users/user.entity';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { RolesGuard } from '../common/guards/roles.guard';
import { Department } from '../departments/department.entity';
import { FeeTransaction } from '../fees/fee-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Student, User, Department, FeeTransaction])],
  controllers: [StudentsController],
  providers: [StudentsService, RolesGuard],
})
export class StudentsModule {}
