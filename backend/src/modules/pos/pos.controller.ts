import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { PosService } from './pos.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('POS')
@ApiBearerAuth()
@Controller('pos')
export class PosController {
  constructor(private svc: PosService) {}

  @Post('shift/open')
  @ApiOperation({ summary: 'Smenani ochish' })
  openShift(@CurrentUser() user: any, @Body() body: { openingCash?: number }) {
    return this.svc.openShift(user.companyId, user.sub, body.openingCash ?? 0)
  }

  @Get('shift/current')
  @ApiOperation({ summary: 'Joriy smena' })
  getCurrent(@CurrentUser() user: any) {
    return this.svc.getCurrentShift(user.companyId, user.sub)
  }

  @Post('shift/close')
  @ApiOperation({ summary: 'Smenani yopish (Z-hisobot)' })
  closeShift(@CurrentUser() user: any, @Body() body: { closingCash?: number }) {
    return this.svc.closeShift(user.companyId, user.sub, body.closingCash ?? 0)
  }

  @Get('shift/x-report')
  @ApiOperation({ summary: 'X-hisobot (smenani yopmasdan)' })
  xReport(@CurrentUser() user: any) {
    return this.svc.getXReport(user.companyId, user.sub)
  }

  @Get('shift/:id/z-report')
  @ApiOperation({ summary: 'Z-hisobot (yopilgan smena)' })
  zReport(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.getZReport(user.companyId, id)
  }

  @Get('shifts')
  @ApiOperation({ summary: 'Smena tarixi' })
  listShifts(@CurrentUser() user: any, @Query('limit') limit?: string) {
    return this.svc.listShifts(user.companyId, limit ? +limit : 20)
  }
}
