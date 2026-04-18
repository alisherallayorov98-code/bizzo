import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SuperAdminService, CreateCompanyDto, UpdateCompanyDto } from './super-admin.service';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';

@ApiTags('Super Admin')
@ApiBearerAuth('access-token')
@UseGuards(SuperAdminGuard)
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  // ---- STATISTIKA ----
  @Get('stats')
  @ApiOperation({ summary: 'Platform umumiy statistikasi' })
  getStats() {
    return this.service.getStats();
  }

  // ---- KORXONALAR ----
  @Get('companies')
  @ApiOperation({ summary: "Barcha korxonalar ro'yxati" })
  getCompanies(
    @Query('search')   search?: string,
    @Query('plan')     plan?: string,
    @Query('isActive') isActive?: string,
    @Query('page')     page?: number,
    @Query('limit')    limit?: number,
  ) {
    return this.service.getCompanies({ search, plan, isActive, page, limit });
  }

  @Get('companies/:id')
  @ApiOperation({ summary: 'Bitta korxona tafsilotlari' })
  getCompany(@Param('id') id: string) {
    return this.service.getCompany(id);
  }

  @Post('companies')
  @ApiOperation({ summary: 'Yangi korxona va admin yaratish' })
  createCompany(@Body() dto: CreateCompanyDto) {
    return this.service.createCompany(dto);
  }

  @Patch('companies/:id')
  @ApiOperation({ summary: 'Korxona ma\'lumotlarini yangilash' })
  updateCompany(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.service.updateCompany(id, dto);
  }

  @Patch('companies/:id/toggle-active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Korxonani bloklash / ochish' })
  toggleCompanyActive(@Param('id') id: string) {
    return this.service.toggleCompanyActive(id);
  }

  @Patch('companies/:id/plan')
  @ApiOperation({ summary: 'Korxona planini o\'zgartirish' })
  changePlan(@Param('id') id: string, @Body('plan') plan: 'STARTER' | 'BUSINESS' | 'PRO' | 'ENTERPRISE') {
    return this.service.changePlan(id, plan);
  }

  // ---- FOYDALANUVCHILAR ----
  @Get('users')
  @ApiOperation({ summary: "Barcha foydalanuvchilar ro'yxati" })
  getUsers(
    @Query('search')    search?: string,
    @Query('role')      role?: string,
    @Query('companyId') companyId?: string,
    @Query('page')      page?: number,
    @Query('limit')     limit?: number,
  ) {
    return this.service.getUsers({ search, role, companyId, page, limit });
  }

  @Patch('users/:id/toggle-active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Foydalanuvchini bloklash / ochish' })
  toggleUserActive(@Param('id') id: string) {
    return this.service.toggleUserActive(id);
  }

  @Patch('users/:id/reset-password')
  @ApiOperation({ summary: 'Foydalanuvchi parolini tiklash' })
  resetUserPassword(
    @Param('id')        id: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.service.resetUserPassword(id, newPassword);
  }
}
