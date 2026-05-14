import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { QuotationsService } from './quotations.service'

@UseGuards(JwtAuthGuard)
@Controller('quotations')
export class QuotationsController {
  constructor(private readonly svc: QuotationsService) {}

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.svc.create(req.user.companyId, req.user.id, body)
  }

  @Get()
  list(@Req() req: any, @Query() q: any) {
    return this.svc.list(req.user.companyId, {
      status:    q.status,
      contactId: q.contactId,
      dateFrom:  q.dateFrom,
      dateTo:    q.dateTo,
      page:      q.page  ? Number(q.page)  : 1,
      limit:     q.limit ? Number(q.limit) : 20,
    })
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.svc.findOne(req.user.companyId, id)
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(req.user.companyId, id, body)
  }

  @Patch(':id/send')
  send(@Req() req: any, @Param('id') id: string) {
    return this.svc.send(req.user.companyId, id)
  }

  @Patch(':id/approve')
  approve(@Req() req: any, @Param('id') id: string) {
    return this.svc.approve(req.user.companyId, id)
  }

  @Patch(':id/reject')
  reject(@Req() req: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.svc.reject(req.user.companyId, id, body.reason)
  }

  @Post(':id/convert')
  convert(@Req() req: any, @Param('id') id: string) {
    return this.svc.convertToInvoice(req.user.companyId, id, req.user.id)
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.svc.remove(req.user.companyId, id)
  }
}
