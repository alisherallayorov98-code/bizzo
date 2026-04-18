import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'

@Injectable()
export class ClickService {
  private readonly logger = new Logger(ClickService.name)
  private readonly merchantId: string
  private readonly serviceId: string
  private readonly secretKey: string
  private readonly testMode: boolean

  constructor(private config: ConfigService) {
    this.merchantId = config.get<string>('CLICK_MERCHANT_ID') || ''
    this.serviceId = config.get<string>('CLICK_SERVICE_ID') || ''
    this.secretKey = config.get<string>('CLICK_SECRET_KEY') || ''
    this.testMode = config.get<string>('CLICK_TEST_MODE') === 'true'
  }

  createCheckoutUrl(params: { invoiceId: string; amount: number; returnUrl?: string }): string {
    const base = 'https://my.click.uz/services/pay'
    const qs = new URLSearchParams({
      service_id: this.serviceId,
      merchant_id: this.merchantId,
      amount: String(params.amount),
      transaction_param: params.invoiceId,
      ...(params.returnUrl ? { return_url: params.returnUrl } : {}),
    })
    return `${base}?${qs.toString()}`
  }

  verifySignature(params: {
    click_trans_id: string | number
    service_id: string | number
    merchant_trans_id: string
    amount: string | number
    action: string | number
    sign_time: string
    sign_string: string
    merchant_prepare_id?: string | number
  }): boolean {
    const prepareId = params.merchant_prepare_id ?? ''
    const raw = `${params.click_trans_id}${params.service_id}${this.secretKey}${params.merchant_trans_id}${prepareId}${params.amount}${params.action}${params.sign_time}`
    const expected = crypto.createHash('md5').update(raw).digest('hex')
    return expected === params.sign_string
  }
}
