import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '../students/student.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { FeeTransaction } from './fee-transaction.entity';
import { FeesController } from './fees.controller';
import { FeesService } from './fees.service';

@Module({
  imports: [TypeOrmModule.forFeature([FeeTransaction, Student])],
  controllers: [FeesController],
  providers: [FeesService, RolesGuard],
})
export class FeesModule {}
