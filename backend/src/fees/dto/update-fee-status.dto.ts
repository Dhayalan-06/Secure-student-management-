import { IsEnum } from 'class-validator';
import { FeeStatus } from '../fee-transaction.entity';

export class UpdateFeeStatusDto {
  @IsEnum(FeeStatus)
  status: FeeStatus;
}
