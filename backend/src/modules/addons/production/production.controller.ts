import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import {
  ProductionService,
  CreateFormulaDto, UpdateFormulaDto,
  CreateBatchDto,  UpdateBatchDto,
  CompleteBatchDto,
} from './production.service'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'

@ApiTags('Production')
@ApiBearerAuth()
@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Post('formulas')
  createFormula(@CurrentUser() user: any, @Body() dto: CreateFormulaDto) {
    return this.productionService.createFormula(user.companyId, dto)
  }

  @Get('formulas')
  getFormulas(@CurrentUser() user: any) {
    return this.productionService.getFormulas(user.companyId)
  }

  @Put('formulas/:id')
  updateFormula(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateFormulaDto,
  ) {
    return this.productionService.updateFormula(user.companyId, id, dto)
  }

  @Delete('formulas/:id')
  deleteFormula(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productionService.deleteFormula(user.companyId, id)
  }

  @Get('formulas/:id/cost-estimate')
  getCostEstimate(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('multiplier') multiplier: string,
  ) {
    return this.productionService.getCostEstimate(user.companyId, id, parseFloat(multiplier) || 1)
  }

  @Post('batches')
  createBatch(@CurrentUser() user: any, @Body() dto: CreateBatchDto) {
    return this.productionService.createBatch(user.companyId, dto, user.id)
  }

  @Get('batches')
  getBatches(@CurrentUser() user: any, @Query() query: any) {
    return this.productionService.getBatches(user.companyId, query)
  }

  @Get('batches/:id')
  getBatch(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productionService.getBatch(user.companyId, id)
  }

  @Put('batches/:id')
  updateBatch(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateBatchDto,
  ) {
    return this.productionService.updateBatch(user.companyId, id, dto)
  }

  @Post('batches/:id/overhead')
  addOverhead(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: { amount: number; description: string },
  ) {
    return this.productionService.addOverhead(user.companyId, id, dto)
  }

  @Get('batches/:id/availability')
  checkBatchAvailability(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productionService.checkBatchAvailability(user.companyId, id)
  }

  @Post('batches/:id/start')
  startBatch(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productionService.startBatch(user.companyId, id, user.id)
  }

  @Post('batches/complete')
  completeBatch(@CurrentUser() user: any, @Body() dto: CompleteBatchDto) {
    return this.productionService.completeBatch(user.companyId, dto, user.id)
  }

  @Get('stats')
  getStats(@CurrentUser() user: any) {
    return this.productionService.getStats(user.companyId)
  }

  @Get('analytics')
  getAnalytics(@CurrentUser() user: any, @Query('formulaId') formulaId?: string) {
    return this.productionService.getAnalytics(user.companyId, formulaId)
  }
}
