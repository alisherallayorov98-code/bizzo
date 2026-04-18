import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsEnum, IsArray, IsObject, IsNumber,
  IsDateString, IsBoolean, MinLength,
} from 'class-validator';
import { ContractStatus, ContractType } from '@prisma/client';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Oldi-sotdi shartnomasi' })
  @IsString() @MinLength(3) name!: string;

  @ApiProperty({ enum: ContractType, example: 'SALE' })
  @IsEnum(ContractType) type!: ContractType;

  @ApiProperty({ description: 'Shablon matn bloklari (JSON)' })
  @IsObject() content!: any;

  @ApiPropertyOptional({ description: 'Dinamik maydonlar sxemasi' })
  @IsOptional() @IsArray() fields?: any[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional({ enum: ContractType }) @IsOptional() @IsEnum(ContractType) type?: ContractType;
  @ApiPropertyOptional() @IsOptional() @IsObject() content?: any;
  @ApiPropertyOptional() @IsOptional() @IsArray() fields?: any[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateContractDto {
  @ApiProperty() @IsString() contactId!: string;
  @ApiProperty({ example: 'Tovar yetkazib berish shartnomasi' })
  @IsString() @MinLength(3) title!: string;
  @ApiProperty({ enum: ContractType }) @IsEnum(ContractType) type!: ContractType;
  @ApiPropertyOptional() @IsOptional() @IsString() templateId?: string;
  @ApiPropertyOptional({ description: 'Shablon maydonlarga to\'ldirilgan qiymatlar' })
  @IsOptional() @IsObject() data?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalAmount?: number;
  @ApiPropertyOptional({ default: 'UZS' }) @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateContractDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional({ enum: ContractStatus }) @IsOptional() @IsEnum(ContractStatus) status?: ContractStatus;
  @ApiPropertyOptional() @IsOptional() @IsObject() data?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ContractFiltersDto {
  @ApiPropertyOptional({ enum: ContractStatus }) @IsOptional() @IsEnum(ContractStatus) status?: ContractStatus;
  @ApiPropertyOptional({ enum: ContractType }) @IsOptional() @IsEnum(ContractType) type?: ContractType;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsNumber() page?: number;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @IsNumber() limit?: number;
}
