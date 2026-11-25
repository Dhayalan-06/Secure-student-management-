import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

export class RegistrationNumberDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @IsString()
  @Matches(/^[A-Z0-9][A-Z0-9/-]{0,63}$/, {
    message: 'Enter a registration number of up to 64 letters, digits, hyphens or slashes, starting with a letter or digit.',
  })
  registrationNumber: string;
}
