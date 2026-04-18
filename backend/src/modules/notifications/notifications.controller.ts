import { Controller, Get, Patch, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard }       from '../../common/guards/jwt-auth.guard';
import { CurrentUser }        from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

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
}
