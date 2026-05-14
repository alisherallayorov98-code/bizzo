import { Controller, Get, Patch, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard }       from '../../common/guards/jwt-auth.guard';
import { CurrentUser }        from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { PushService }          from './push.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private svc:  NotificationsService,
    private push: PushService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Barcha bildirishnomalar' })
  getAll(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getForCompany(user.companyId, limit ? +limit : 20);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Bitta bildirishnomani o\'qilgan deb belgilash' })
  markRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.markRead(id, user.companyId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Hammasini o\'qilgan deb belgilash' })
  markAllRead(@CurrentUser() user: any) {
    return this.svc.markAllRead(user.companyId);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Smart bildirishnomalarni yangilash' })
  async refresh(@CurrentUser() user: any) {
    const count = await this.svc.refreshSmartNotifications(user.companyId);
    return { count };
  }

  @Get('push/vapid-key')
  @ApiOperation({ summary: 'VAPID public key' })
  getVapidKey() {
    return { publicKey: this.push.getVapidPublicKey() }
  }

  @Post('push/subscribe')
  @ApiOperation({ summary: 'Push obuna qo\'shish' })
  subscribe(@CurrentUser() user: any, @Body() body: any) {
    return this.push.subscribe(user.companyId, user.sub, body)
  }

  @Delete('push/unsubscribe')
  @ApiOperation({ summary: 'Push obunadan chiqish' })
  unsubscribe(@CurrentUser() user: any, @Body() body: { endpoint: string }) {
    return this.push.unsubscribe(user.companyId, user.sub, body.endpoint)
  }

  @Post('push/test')
  @ApiOperation({ summary: 'Test push yuborish' })
  testPush(@CurrentUser() user: any) {
    return this.push.sendToCompany(user.companyId, {
      title: 'BIZZO Test',
      body:  'Push bildirishnomalar ishlayapti!',
      url:   '/dashboard',
      tag:   'test',
    })
  }
}
