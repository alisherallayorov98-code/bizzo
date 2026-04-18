import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@company.uz' })
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email: string;

  @ApiProperty({ example: 'Parol@123' })
  @IsString()
  @MinLength(6,  { message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" })
  @MaxLength(72, { message: 'Parol juda uzun' })
  password: string;
}
