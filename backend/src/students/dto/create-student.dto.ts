import { IsEmail, IsInt, IsNumber, IsString, Max, Min, MinLength, MaxLength, Matches } from 'class-validator';
export class CreateStudentDto {
  @IsString() @MinLength(2) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(2) @MaxLength(100) @Matches(/\S/) department: string;
  @IsInt() @Min(16) @Max(100) age: number;
  @IsNumber() @Min(0) @Max(10) cgpa: number;
}
