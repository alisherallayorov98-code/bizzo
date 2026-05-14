import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { PurchaseService } from './purchase.service'

@UseGuards(JwtAuthGuard)
@Controller('purchase')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post('orders')
  create(@Req() req: any, @Body() body: any) {
    return this.purchaseService.create(req.user.companyId, req.user.id, body)
  }

  @Get('orders')
  list(@Req() req: any, @Query() query: any) {
    return this.purchaseService.list(req.user.companyId, {
      status:     query.status,
      supplierId: query.supplierId,
      dateFrom:   query.dateFrom,
      dateTo:     query.dateTo,
      page:       query.page  ? Number(query.page)  : 1,
      limit:      query.limit ? Number(query.limit) : 20,
    })
  }

  @Get('orders/:id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.purchaseService.findOne(req.user.companyId, id)
  }

  @Patch('orders/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.purchaseService.update(req.user.companyId, id, body)
  }

  @Patch('orders/:id/send')
  send(@Req() req: any, @Param('id') id: string) {
    return this.purchaseService.send(req.user.companyId, id)
  }

  @Post('orders/:id/receive')
  receive(@Req() req: any, @Param('id') id: string, @Body() body: { items: any[]; createDebt?: boolean }) {
    return this.purchaseService.receive(req.user.companyId, id, req.user.id, body.items, body.createDebt)
  }

  @Delete('orders/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.purchaseService.remove(req.user.companyId, id)
  }
}
