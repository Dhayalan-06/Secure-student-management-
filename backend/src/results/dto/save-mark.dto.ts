import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class SaveMarkDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  subjectId: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  internalMark: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  semesterMark: number;
}
