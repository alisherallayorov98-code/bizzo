import {
  IsString, IsEmail, IsOptional, IsEnum,
  IsNumber, Min, MaxLength, MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactType } from '@prisma/client';

export class CreateContactDto {
  @ApiProperty({ enum: ContactType, example: 'CUSTOMER' })
  @IsEnum(ContactType, { message: "Kontakt turi noto'g'ri" })
  type: ContactType;

  @ApiProperty({ example: 'Toshmatov Alisher' })
  @IsString()
  @MinLength(2,   { message: 'Ism kamida 2 ta belgi' })
  @MaxLength(100, { message: 'Ism juda uzun' })
  name: string;

  @ApiPropertyOptional({ example: 'Toshmatov va Sheriklar MChJ' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  stir?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone2?: string;

  @ApiPropertyOptional({ example: 'alisher@example.uz' })
  @IsOptional()
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ example: 'Toshkent' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ example: 5000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paymentDays?: number;
}
