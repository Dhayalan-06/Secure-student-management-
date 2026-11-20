import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Matches, Max, Min, MinLength, MaxLength } from 'class-validator';

export class CreateSubjectDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  semester: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9._-]+$/)
  code: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxInternal: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxSemester: number;
}
