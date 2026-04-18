import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Kirish taqiqlangan');
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Faqat super admin uchun');
    }
    return true;
  }
}
