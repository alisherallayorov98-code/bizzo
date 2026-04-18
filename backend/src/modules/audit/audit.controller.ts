import { Controller, Get, Query } from '@nestjs/common'
import { AuditService } from './audit.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  getLogs(@CurrentUser() user: any, @Query() query: any) {
    return this.auditService.getLogs(user.companyId, {
      ...query,
      page:  query.page  ? parseInt(query.page)  : 1,
      limit: query.limit ? parseInt(query.limit) : 50,
    })
  }

  @Get('activity')
  getUserActivity(
    @CurrentUser() user: any,
    @Query('days') days?: string,
  ) {
    return this.auditService.getUserActivity(
      user.companyId,
      days ? parseInt(days) : 30,
    )
  }

  @Get('suspicious')
  getSuspicious(@CurrentUser() user: any) {
    return this.auditService.detectSuspiciousActivity(user.companyId)
  }
}
