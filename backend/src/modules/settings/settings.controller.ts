import {
  Controller, Get, Put, Post, Delete,
  Body, Param,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { SettingsService, UpdateCompanyDto, CreateUserDto } from './settings.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ===== KOMPANIYA =====
  @Get('company')
  getCompany(@CurrentUser() user: any) {
    return this.settingsService.getCompany(user.companyId)
  }

  @Put('company')
  updateCompany(@CurrentUser() user: any, @Body() dto: UpdateCompanyDto) {
    return this.settingsService.updateCompany(user.companyId, dto)
  }

  // ===== FOYDALANUVCHILAR =====
  @Get('users')
  getUsers(@CurrentUser() user: any) {
    return this.settingsService.getUsers(user.companyId)
  }

  @Post('users')
  createUser(@CurrentUser() user: any, @Body() dto: CreateUserDto) {
    return this.settingsService.createUser(user.companyId, dto)
  }

  @Put('users/:id/role')
  updateRole(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('role') role: string,
  ) {
    return this.settingsService.updateUserRole(user.companyId, id, role)
  }

  @Put('users/:id/toggle')
  toggleActive(@CurrentUser() user: any, @Param('id') id: string) {
    return this.settingsService.toggleUserActive(user.companyId, id)
  }

  // ===== PAROL =====
  @Put('password')
  changePassword(
    @CurrentUser() user: any,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.settingsService.changePassword(user.id, body.oldPassword, body.newPassword)
  }

  // ===== MODULLAR =====
  @Get('modules')
  getModules(@CurrentUser() user: any) {
    return this.settingsService.getModules(user.companyId)
  }

  @Post('modules/:type/activate')
  activateModule(
    @CurrentUser() user: any,
    @Param('type') type: string,
    @Body('months') months?: number,
  ) {
    return this.settingsService.activateModule(user.companyId, type, months)
  }

  @Delete('modules/:type')
  deactivateModule(@CurrentUser() user: any, @Param('type') type: string) {
    return this.settingsService.deactivateModule(user.companyId, type)
  }

  // ===== TARIF =====
  @Get('plan')
  getPlan(@CurrentUser() user: any) {
    return this.settingsService.getPlanInfo(user.companyId)
  }

  @Put('plan')
  updatePlan(@CurrentUser() user: any, @Body('plan') plan: string) {
    return this.settingsService.updatePlan(user.companyId, plan)
  }
}
