import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CampaignsService } from './campaigns.service'

@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly svc: CampaignsService) {}

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.svc.create(req.user.companyId, req.user.id, body)
  }

  @Get()
  list(@Req() req: any, @Query() q: any) {
    return this.svc.list(req.user.companyId, {
      status: q.status,
      type:   q.type,
      page:   q.page  ? Number(q.page)  : 1,
      limit:  q.limit ? Number(q.limit) : 20,
    })
  }

  @Get('preview-count')
  previewCount(@Req() req: any, @Query() q: any) {
    return this.svc.previewCount(req.user.companyId, {
      contactType: q.contactType,
      region:      q.region,
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

  @Post(':id/send')
  send(@Req() req: any, @Param('id') id: string) {
    return this.svc.send(req.user.companyId, id)
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.svc.remove(req.user.companyId, id)
  }
}
