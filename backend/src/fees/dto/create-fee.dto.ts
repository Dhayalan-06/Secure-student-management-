import {
  IsDateString,
  IsInt,
  IsNumber,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateFeeDto {
  @IsInt()
  @Min(1)
  studentId: number;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsDateString()
  dueDate: string;
}
