import { Controller, Get, Post, Body, Req } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { CurrencyService } from './currency.service'

@ApiTags('Currency')
@ApiBearerAuth('access-token')
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currency: CurrencyService) {}

  @Get('rates')
  getRates(@Req() req: any) {
    return this.currency.getCurrentRates(req.user.companyId)
  }

  @Get('rates/cbu')
  getCbuRates() {
    return this.currency.fetchFromCBU()
  }

  @Post('rates')
  saveRates(@Req() req: any, @Body() body: { USD?: number; EUR?: number; RUB?: number }) {
    return this.currency.saveManualRates(req.user.companyId, body)
  }

  @Post('convert')
  convert(
    @Req() req: any,
    @Body() body: { amount: number; from: string; to: string },
  ) {
    return this.currency.convert(body.amount, body.from, body.to, req.user.companyId)
  }
}
