import {
  IsEmail,
  IsInt,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
export class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) @MaxLength(72) password: string;
  @IsString() @MinLength(2) @MaxLength(100) name: string;
  @IsString() @MinLength(2) @MaxLength(100) @Matches(/\S/) department: string;
  @IsInt() @Min(16) @Max(100) age: number;
  @IsNumber() @Min(0) @Max(10) cgpa: number;
}
