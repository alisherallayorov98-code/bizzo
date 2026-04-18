import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class PaymeService {
  private readonly logger = new Logger(PaymeService.name)
  private readonly merchantId: string
  private readonly merchantKey: string
  private readonly testMode: boolean

  constructor(private config: ConfigService) {
    this.merchantId = config.get<string>('PAYME_MERCHANT_ID') || ''
    this.merchantKey = config.get<string>('PAYME_MERCHANT_KEY') || ''
    this.testMode = config.get<string>('PAYME_TEST_MODE') === 'true'
  }

  createCheckoutUrl(params: { invoiceId: string; amount: number; returnUrl?: string }): string {
    const amountTiyin = params.amount * 100
    const payload = [
      `m=${this.merchantId}`,
      `ac.invoice_id=${params.invoiceId}`,
      `a=${amountTiyin}`,
      params.returnUrl ? `c=${params.returnUrl}` : '',
      `l=uz`,
    ].filter(Boolean).join(';')

    const encoded = Buffer.from(payload).toString('base64')
    const base = this.testMode ? 'https://test.paycom.uz' : 'https://checkout.paycom.uz'
    return `${base}/${encoded}`
  }

  verifyAuth(authHeader?: string): boolean {
    if (!authHeader || !authHeader.startsWith('Basic ')) return false
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8')
    const [login, password] = decoded.split(':')
    return login === 'Paycom' && password === this.merchantKey
  }
}
