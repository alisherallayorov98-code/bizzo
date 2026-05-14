import {
  Controller, Get, Post, Body, Query,
  Req, UnauthorizedException, Headers,
} from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
import { PortalService } from './portal.service'
import { CurrentUser }   from '../../common/decorators/current-user.decorator'

@ApiTags('Portal')
@Controller('portal')
export class PortalController {
  constructor(private svc: PortalService) {}

  // Admin: generate magic link for a contact
  @Post('magic-link')
  @ApiOperation({ summary: 'Kontakt uchun magic link yaratish' })
  generateLink(
    @CurrentUser() user: any,
    @Body() body: { contactId: string },
  ) {
    return this.svc.generateMagicLink(user.companyId, body.contactId)
  }

  // Public: verify token and get portal data
  @Public()
  @Get('verify')
  @ApiOperation({ summary: 'Token tekshirish va portal ma\'lumotlari' })
  async verify(@Query('token') token: string) {
    if (!token) throw new UnauthorizedException()
    const payload = await this.svc.verifyToken(token)
    const data    = await this.svc.getPortalData(payload.contactId, payload.companyId)
    return { ...data, token }
  }

  // Public: get specific invoice via portal token
  @Public()
  @Get('invoice')
  @ApiOperation({ summary: 'Invoice ko\'rish (portal)' })
  async getInvoice(
    @Query('token')     token:     string,
    @Query('invoiceId') invoiceId: string,
  ) {
    if (!token || !invoiceId) throw new UnauthorizedException()
    const payload = await this.svc.verifyToken(token)
    return this.svc.getPortalInvoice(invoiceId, payload.contactId, payload.companyId)
  }

  // Admin: generate supplier magic link
  @Post('supplier-magic-link')
  @ApiOperation({ summary: 'Yetkazib beruvchi uchun magic link yaratish' })
  generateSupplierLink(
    @CurrentUser() user: any,
    @Body() body: { supplierId: string },
  ) {
    return this.svc.generateSupplierMagicLink(user.companyId, body.supplierId)
  }

  // Public: supplier portal data
  @Public()
  @Get('supplier')
  @ApiOperation({ summary: 'Supplier portal ma\'lumotlari' })
  async getSupplierPortal(@Query('token') token: string) {
    if (!token) throw new UnauthorizedException()
    const payload = await this.svc.verifySupplierToken(token)
    const data    = await this.svc.getSupplierPortalData(payload.contactId, payload.companyId)
    return { ...data, token }
  }
}
