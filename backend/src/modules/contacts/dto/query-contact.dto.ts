import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ContactType } from '@prisma/client';

export class QueryContactDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ContactType)
  type?: ContactType;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  hasDebt?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isOverdue?: boolean;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'name';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}
