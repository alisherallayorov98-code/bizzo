import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ServiceTicketsService, CreateTicketDto, UpdateTicketDto } from './service-tickets.service'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'

@ApiTags('Service Tickets')
@ApiBearerAuth('access-token')
@Controller('service/tickets')
export class ServiceTicketsController {
  constructor(private readonly svc: ServiceTicketsService) {}

  @Get('stats')
  getStats(@CurrentUser() user: any) {
    return this.svc.getStats(user.companyId)
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query() query: any) {
    return this.svc.findAll(user.companyId, query)
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.findOne(user.companyId, id)
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateTicketDto) {
    return this.svc.create(user.companyId, dto)
  }

  @Put(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.svc.update(user.companyId, id, dto)
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.remove(user.companyId, id)
  }
}
