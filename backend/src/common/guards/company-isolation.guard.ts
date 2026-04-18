import {
  Injectable, CanActivate,
  ExecutionContext, ForbiddenException,
} from '@nestjs/common'

@Injectable()
export class CompanyIsolationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user    = request.user

    if (!user?.companyId) {
      throw new ForbiddenException("Kompaniya ma'lumoti topilmadi")
    }

    const queryCompanyId  = request.query?.companyId
    const bodyCompanyId   = request.body?.companyId
    const paramsCompanyId = request.params?.companyId

    const providedCompanyId = queryCompanyId || bodyCompanyId || paramsCompanyId

    if (
      providedCompanyId &&
      providedCompanyId !== user.companyId &&
      user.role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException("Boshqa kompaniya ma'lumotlariga kirish taqiqlangan")
    }

    return true
  }
}
