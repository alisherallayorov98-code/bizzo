import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { RecurringService, CreateRecurringDto } from './recurring.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('Recurring')
@ApiBearerAuth('access-token')
@Controller('recurring')
export class RecurringController {
  constructor(private readonly service: RecurringService) {}

  @Get()
  @ApiOperation({ summary: "Takroriy operatsiyalar ro'yxati" })
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.companyId)
  }

  @Post()
  @ApiOperation({ summary: 'Yangi takroriy operatsiya' })
  create(@CurrentUser() user: any, @Body() dto: CreateRecurringDto) {
    return this.service.create(user.companyId, dto, user.id)
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne(user.companyId, id)
  }

  @Put(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: Partial<CreateRecurringDto>) {
    return this.service.update(user.companyId, id, dto)
  }

  @Patch(':id/toggle')
  toggle(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.toggle(user.companyId, id)
  }

  @Delete(':id')
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.delete(user.companyId, id)
  }
}
