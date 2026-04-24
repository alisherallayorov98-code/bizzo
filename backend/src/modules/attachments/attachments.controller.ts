import {
  Controller, Get, Post, Delete, Body, Param, Query, Req, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard }       from '../../common/guards/jwt-auth.guard'
import { AttachmentsService } from './attachments.service'

@ApiTags('Attachments')
@ApiBearerAuth('access-token')
@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Fayl biriktirish' })
  async create(@Req() req: any, @Body() dto: any) {
    const data = await this.service.create(req.user.companyId, req.user.id, dto)
    return { data }
  }

  @Get()
  @ApiOperation({ summary: "Entity ga biriktirilgan fayllar ro'yxati" })
  async find(
    @Req() req: any,
    @Query('entityType') entityType: string,
    @Query('entityId')   entityId:   string,
  ) {
    const data = await this.service.findByEntity(req.user.companyId, entityType, entityId)
    return { data }
  }

  @Delete(':id')
  @ApiOperation({ summary: "Biriktirilgan faylni o'chirish" })
  async delete(@Req() req: any, @Param('id') id: string) {
    const data = await this.service.delete(req.user.companyId, id)
    return { data }
  }
}
