import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class SaveMarkDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  markId: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  marks: number;
}