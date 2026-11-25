import { IsEmail, IsInt, IsString, Max, Min, MinLength, MaxLength, Matches } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { RegistrationNumberDto } from './registration-number.dto';
export class CreateStudentDto extends PartialType(RegistrationNumberDto) {
  @IsString() @MinLength(2) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(2) @MaxLength(100) @Matches(/\S/) department: string;
  @IsInt() @Min(16) @Max(100) age: number;
}
