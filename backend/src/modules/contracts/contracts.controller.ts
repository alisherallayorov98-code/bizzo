import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiCommonErrors } from '../../common/decorators/api-errors.decorator';
import {
  CreateTemplateDto, UpdateTemplateDto,
  CreateContractDto, UpdateContractDto, ContractFiltersDto,
} from './dto/contract.dto';

@ApiTags('Contracts')
@ApiBearerAuth('access-token')
@ApiCommonErrors()
@Controller('contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  // Templates
  @Get('templates')
  @ApiOperation({ summary: 'Shartnoma shablonlari' })
  getTemplates(@CurrentUser() u: any) {
    return this.service.getTemplates(u.companyId);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Yangi shablon' })
  createTemplate(@CurrentUser() u: any, @Body() dto: CreateTemplateDto) {
    return this.service.createTemplate(u.companyId, dto);
  }

  @Patch('templates/:id')
  @ApiOperation({ summary: 'Shablonni yangilash' })
  updateTemplate(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.service.updateTemplate(u.companyId, id, dto);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Shablonni o\'chirish (soft)' })
  deleteTemplate(@CurrentUser() u: any, @Param('id') id: string) {
    return this.service.deleteTemplate(u.companyId, id);
  }

  // Expiring
  @Get('expiring')
  @ApiOperation({ summary: 'Muddati tugaydiganlar' })
  getExpiring(@CurrentUser() u: any, @Query('days') days?: string) {
    return this.service.getExpiring(u.companyId, days ? Number(days) : 30);
  }

  // Contracts
  @Get()
  @ApiOperation({ summary: 'Shartnomalar ro\'yxati' })
  list(@CurrentUser() u: any, @Query() f: ContractFiltersDto) {
    return this.service.getContracts(u.companyId, f);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Shartnoma ma\'lumoti' })
  get(@CurrentUser() u: any, @Param('id') id: string) {
    return this.service.getContract(u.companyId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Yangi shartnoma' })
  create(@CurrentUser() u: any, @Body() dto: CreateContractDto) {
    return this.service.createContract(u.companyId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Shartnomani yangilash' })
  update(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.service.updateContract(u.companyId, id, dto);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Shartnomani imzolash (DRAFT → ACTIVE)' })
  sign(@CurrentUser() u: any, @Param('id') id: string) {
    return this.service.signContract(u.companyId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Shartnomani bekor qilish' })
  cancel(@CurrentUser() u: any, @Param('id') id: string) {
    return this.service.cancelContract(u.companyId, id);
  }

  @Post(':id/pdf')
  @ApiOperation({ summary: 'PDF (hozircha HTML) generatsiya' })
  pdf(@CurrentUser() u: any, @Param('id') id: string) {
    return this.service.generatePdf(u.companyId, id);
  }
}
