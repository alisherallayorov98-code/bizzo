import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  EmployeesService,
  CreateEmployeeDto,
  CreateSalaryRecordDto,
  CreateDailyWorkDto,
  QueryEmployeeDto,
} from './employees.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Employees')
@ApiBearerAuth('access-token')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  // ============================================
  // XODIMLAR CRUD
  // ============================================
  @Post()
  @ApiOperation({ summary: 'Yangi xodim qo\'shish' })
  create(@CurrentUser() user: any, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(user.companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Xodimlar ro'yxati" })
  findAll(@CurrentUser() user: any, @Query() query: QueryEmployeeDto) {
    return this.employeesService.findAll(user.companyId, query);
  }

  // ===== Static routes before :id =====

  @Get('stats')
  @ApiOperation({ summary: 'Xodimlar statistikasi' })
  getStats(@CurrentUser() user: any) {
    return this.employeesService.getStats(user.companyId);
  }

  @Get('departments')
  @ApiOperation({ summary: "Bo'limlar ro'yxati" })
  getDepartments(@CurrentUser() user: any) {
    return this.employeesService.getDepartments(user.companyId);
  }

  // ===== Salary static routes =====

  @Post('salary')
  @ApiOperation({ summary: 'Ish haqi yozuvi yaratish' })
  createSalaryRecord(
    @CurrentUser() user: any,
    @Body() dto: CreateSalaryRecordDto,
  ) {
    return this.employeesService.createSalaryRecord(user.companyId, dto);
  }

  @Get('salary/history')
  @ApiOperation({ summary: 'Oylik ish haqi tarixi' })
  getSalaryHistory(
    @CurrentUser() user: any,
    @Query('month') month: string,
    @Query('year')  year:  string,
  ) {
    return this.employeesService.getSalaryHistory(
      user.companyId,
      Number(month),
      Number(year),
    );
  }

  @Put('salary/:recordId/pay')
  @ApiOperation({ summary: "Ish haqi to'langan deb belgilash" })
  markSalaryPaid(
    @CurrentUser() user: any,
    @Param('recordId') recordId: string,
  ) {
    return this.employeesService.markSalaryPaid(user.companyId, recordId);
  }

  @Post('salary/bulk-pay')
  @ApiOperation({ summary: "Ommaviy ish haqi to'lash" })
  bulkMarkSalaryPaid(
    @CurrentUser() user: any,
    @Body('recordIds') recordIds: string[],
  ) {
    return this.employeesService.bulkMarkSalaryPaid(user.companyId, recordIds);
  }

  // ===== Daily work =====

  @Post('daily-work')
  @ApiOperation({ summary: 'Kunlik ish yozuvi' })
  addDailyWork(@CurrentUser() user: any, @Body() dto: CreateDailyWorkDto) {
    return this.employeesService.addDailyWork(user.companyId, dto);
  }

  // ============================================
  // BITTA XODIM — :id dan keyin
  // ============================================
  @Get(':id')
  @ApiOperation({ summary: "Xodim ma'lumotlari" })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.employeesService.findOne(user.companyId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Xodimni yangilash' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateEmployeeDto>,
  ) {
    return this.employeesService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Xodimni arxivlash" })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.employeesService.update(user.companyId, id, { isActive: false });
  }

  @Post(':id/advance')
  @ApiOperation({ summary: 'Avans berish' })
  giveAdvance(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { amount: number; month: number; year: number; note?: string },
  ) {
    return this.employeesService.giveAdvance(
      user.companyId, id,
      body.amount, body.month, body.year, body.note,
    );
  }

  @Get(':id/weekly-report')
  @ApiOperation({ summary: 'Haftalik hisobot' })
  getWeeklyReport(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('weekStart') weekStart: string,
  ) {
    return this.employeesService.getWeeklyReport(user.companyId, id, weekStart);
  }

  @Put(':id/weekly-pay')
  @ApiOperation({ summary: "Haftalik to'lovni tasdiqlash" })
  markWeeklyPaid(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('weekStart') weekStart: string,
  ) {
    return this.employeesService.markWeeklyPaid(user.companyId, id, weekStart);
  }
}
