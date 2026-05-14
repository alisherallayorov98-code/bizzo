import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AutomationService } from './automation.service'
import { CreateAutomationRuleDto } from './dto/create-automation-rule.dto'
import { UpdateAutomationRuleDto } from './dto/update-automation-rule.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Role } from '@prisma/client'

@ApiTags('Automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('automation')
export class AutomationController {
  constructor(private readonly svc: AutomationService) {}

  @Get('triggers')
  @ApiOperation({ summary: 'Mavjud triggerlar ro\'yxati' })
  getTriggers() {
    return this.svc.getTriggerList()
  }

  @Get('actions')
  @ApiOperation({ summary: 'Mavjud harakatlar ro\'yxati' })
  getActions() {
    return this.svc.getActionList()
  }

  @Get('stats')
  @ApiOperation({ summary: 'Umumiy statistika' })
  getStats(@CurrentUser() user: any) {
    return this.svc.getStats(user.companyId)
  }

  @Get()
  @ApiOperation({ summary: 'Barcha qoidalar' })
  findAll(@CurrentUser() user: any) {
    return this.svc.findAll(user.companyId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta qoida' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.findOne(id, user.companyId)
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Yangi qoida yaratish' })
  create(@CurrentUser() user: any, @Body() dto: CreateAutomationRuleDto) {
    return this.svc.create(user.companyId, user.id, dto)
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Qoidani yangilash' })
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: UpdateAutomationRuleDto) {
    return this.svc.update(id, user.companyId, dto)
  }

  @Patch(':id/toggle')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Qoidani yoqish/o\'chirish' })
  toggle(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.toggleActive(id, user.companyId)
  }

  @Post(':id/run')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Qoidani qo\'lda ishga tushirish' })
  runManually(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.runManually(id, user.companyId)
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Qoidani o\'chirish' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.remove(id, user.companyId)
  }

  // ─── Blueprintlar ────────────────────────────────────────────────────────

  @Get('blueprints')
  @ApiOperation({ summary: 'Tayyor shablonlar ro\'yxati' })
  getBlueprints() {
    return this.svc.getBlueprints()
  }

  @Post('blueprints/:key/install')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Shablonni o\'rnatish' })
  installBlueprint(@Param('key') key: string, @CurrentUser() user: any) {
    return this.svc.installBlueprint(key, user.companyId, user.id)
  }

  // ─── Loglar ──────────────────────────────────────────────────────────────

  @Get('logs')
  @ApiOperation({ summary: 'Bajarilish jurnali' })
  getLogs(@CurrentUser() user: any, @Query() query: any) {
    return this.svc.getLogs(user.companyId, query)
  }

  @Post('logs/:id/retry')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Muvaffaqiyatsiz logni qayta ishga tushirish' })
  retryLog(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.retryLog(id, user.companyId)
  }

  // ─── Analytics ───────────────────────────────────────────────────────────

  @Get('analytics')
  @ApiOperation({ summary: 'Avtomatlashtirish analitikasi' })
  getAnalytics(@CurrentUser() user: any) {
    return this.svc.getAnalytics(user.companyId)
  }

  // ─── Inbound Webhooks ────────────────────────────────────────────────────

  @Get('webhooks')
  @ApiOperation({ summary: 'Kiruvchi webhook endpointlar' })
  getWebhooks(@CurrentUser() user: any) {
    return this.svc.getWebhooks(user.companyId)
  }

  @Post('webhooks')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Yangi webhook endpoint yaratish' })
  createWebhook(@CurrentUser() user: any, @Body() dto: { name: string; description?: string; ruleId?: string }) {
    return this.svc.createWebhook(user.companyId, dto)
  }

  @Delete('webhooks/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Webhook endpointni o\'chirish' })
  deleteWebhook(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.deleteWebhook(id, user.companyId)
  }
}
