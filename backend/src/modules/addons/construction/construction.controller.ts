import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  ConstructionService, CreateProjectDto, CreateBudgetItemDto, CreateExpenseDto,
} from './construction.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Construction')
@ApiBearerAuth()
@Controller('construction')
export class ConstructionController {
  constructor(private readonly svc: ConstructionService) {}

  @Post('projects')
  @ApiOperation({ summary: 'Yangi loyiha' })
  createProject(@CurrentUser() user: any, @Body() dto: CreateProjectDto) {
    return this.svc.createProject(user.companyId, dto, user.id);
  }

  @Get('projects')
  getProjects(@CurrentUser() user: any, @Query() query: any) {
    return this.svc.getProjects(user.companyId, query);
  }

  @Get('stats')
  getStats(@CurrentUser() user: any) {
    return this.svc.getStats(user.companyId);
  }

  @Get('projects/:id')
  getProject(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.getProject(user.companyId, id);
  }

  @Put('projects/:id')
  updateProject(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: Partial<CreateProjectDto>) {
    return this.svc.updateProject(user.companyId, id, dto);
  }

  @Delete('projects/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeProject(@CurrentUser() user: any, @Param('id') id: string) {
    await this.svc.removeProject(user.companyId, id);
  }

  @Post('budget-items')
  addBudgetItem(@CurrentUser() user: any, @Body() dto: CreateBudgetItemDto) {
    return this.svc.addBudgetItem(user.companyId, dto);
  }

  @Delete('budget-items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeBudgetItem(@CurrentUser() user: any, @Param('id') id: string) {
    await this.svc.removeBudgetItem(user.companyId, id);
  }

  @Post('expenses')
  addExpense(@CurrentUser() user: any, @Body() dto: CreateExpenseDto) {
    return this.svc.addExpense(user.companyId, dto, user.id);
  }

  @Post('work-logs')
  addWorkLog(@CurrentUser() user: any, @Body() dto: any) {
    return this.svc.addWorkLog(user.companyId, dto, user.id);
  }

  @Put('projects/:id/status')
  updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: { status: string },
  ) {
    return this.svc.updateStatus(user.companyId, id, dto.status);
  }

  @Post('tasks')
  addTask(@CurrentUser() user: any, @Body() dto: any) {
    return this.svc.addTask(user.companyId, dto);
  }

  @Put('tasks/:id')
  updateTask(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.svc.updateTask(user.companyId, id, dto);
  }

  @Delete('tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTask(@CurrentUser() user: any, @Param('id') id: string) {
    await this.svc.deleteTask(user.companyId, id);
  }

  @Patch('expenses/:id')
  updateExpense(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: { isPaid: boolean }) {
    return this.svc.updateExpense(user.companyId, id, dto);
  }
}
