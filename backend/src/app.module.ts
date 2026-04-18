import {
  Module, MiddlewareConsumer, NestModule, RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

// Biznes modullar
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ProductsModule } from './modules/products/products.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DebtsModule } from './modules/debts/debts.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiModule } from './modules/ai/ai.module';
import { WasteModule }    from './modules/addons/waste/waste.module';
import { SalesModule }    from './modules/addons/sales/sales.module';
import { SettingsModule } from './modules/settings/settings.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { AuditModule }    from './modules/audit/audit.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { ConstructionModule } from './modules/addons/construction/construction.module';
import { ProductionModule } from './modules/addons/production/production.module';
import { BillingModule } from './modules/billing/billing.module';
import { EmailModule } from './modules/email/email.module';
import { HealthModule } from './modules/health/health.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { MonitoringModule } from './common/monitoring/monitoring.module';
import { MinioModule }      from './common/minio/minio.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { SmartAnalyticsModule } from './modules/smart-analytics/smart-analytics.module';
import { ImportModule }         from './modules/import/import.module';

// Xavfsizlik middleware
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { RateLimitMiddleware, RATE_LIMITS } from './common/middleware/rate-limit.middleware';

@Module({
  imports: [
    // Global konfiguratsiya
    ConfigModule.forRoot({
      isGlobal:    true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting (100 so'rov/daqiqa)
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 100 },
    ]),

    // Prisma ORM
    PrismaModule,

    // Biznes modullar
    AuthModule,
    UsersModule,
    ContactsModule,
    ProductsModule,
    WarehouseModule,
    EmployeesModule,
    DebtsModule,
    ReportsModule,
    NotificationsModule,
    AiModule,
    WasteModule,
    SalesModule,
    SettingsModule,
    IntegrationsModule,
    AuditModule,
    OnboardingModule,
    ConstructionModule,
    ProductionModule,
    BillingModule,
    EmailModule,
    HealthModule,
    ContractsModule,
    MonitoringModule,
    MinioModule,
    SuperAdminModule,
    SmartAnalyticsModule,
    ImportModule,
  ],
  controllers: [AppController],
  providers: [
    // Barcha route larni JWT bilan himoyalash
    {
      provide:  APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Rate limiting guard
    {
      provide:  APP_GUARD,
      useClass: ThrottlerGuard,
    },
    RateLimitMiddleware,
  ],
})
export class AppModule implements NestModule {
  constructor(private readonly rateLimiter: RateLimitMiddleware) {}

  configure(consumer: MiddlewareConsumer) {
    // Xavfsizlik headerlari — barcha route
    consumer
      .apply(SecurityMiddleware)
      .forRoutes('*');

    // Auth endpointlari uchun qattiq rate limit
    consumer
      .apply(this.rateLimiter.createLimiter(RATE_LIMITS.auth))
      .forRoutes(
        { path: 'auth/login',   method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
      );

    // Eksport uchun limit
    consumer
      .apply(this.rateLimiter.createLimiter(RATE_LIMITS.export))
      .forRoutes(
        { path: 'reports/*', method: RequestMethod.GET },
      );

    // AI uchun limit
    consumer
      .apply(this.rateLimiter.createLimiter(RATE_LIMITS.ai))
      .forRoutes(
        { path: 'ai/*', method: RequestMethod.ALL },
      );
  }
}
