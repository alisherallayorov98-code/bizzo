import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { WinstonLoggerService } from './common/logger/winston.logger';
import { initSentry } from './common/monitoring/sentry';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  initSentry();

  const app = await NestFactory.create(AppModule, {
    logger: new WinstonLoggerService(),
  });

  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Server-to-server yoki curl (origin yo'q) — ruxsat
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: "${origin}" ruxsat etilmagan`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Xavfsizlik middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
  }));
  app.use(compression());
  app.use(cookieParser());              // httpOnly cookie uchun

  // Global API prefix
  app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:              true,
      forbidNonWhitelisted:   true,
      transform:              true,
      transformOptions:       { enableImplicitConversion: true },
    }),
  );

  // Global response interceptor
  app.useGlobalInterceptors(new TransformInterceptor(), new PerformanceInterceptor());

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger — dev da ochiq, prod da ENABLE_SWAGGER=true bo'lsa ochiq
  const swaggerEnabled =
    process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true';

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('BIZZO ERP API')
      .setDescription(
        "O'zbekiston ERP/CRM Platformasi — REST API.\n\n" +
        "**Auth:** Bearer token (access token). Refresh token httpOnly cookie da.\n" +
        "**Prefix:** /api/v1\n" +
        "**Rate limit:** 100 req/min (auth endpointlari qat'iyroq)",
      )
      .setVersion('1.0')
      .setContact('BIZZO Support', 'https://bizzo.uz', 'support@bizzo.uz')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addCookieAuth('refresh_token')
      .addServer(process.env.API_PUBLIC_URL || 'http://localhost:4000', 'Current')
      .addTag('Auth',          'Autentifikatsiya, parol tiklash, email tasdiqlash')
      .addTag('Users',         'Foydalanuvchilar va rollar')
      .addTag('Contacts',      'Kontragentlar (mijozlar, yetkazib beruvchilar)')
      .addTag('Products',      'Mahsulotlar va kategoriyalar')
      .addTag('Warehouse',     'Ombor va stok harakati')
      .addTag('Employees',     'Xodimlar va ish haqi')
      .addTag('Debts',         'Qarzlar va to\'lovlar')
      .addTag('Sales',         'Savdo va POS')
      .addTag('Reports',       'Hisobotlar va eksport')
      .addTag('Billing',       'Obuna, tariflar, promokodlar')
      .addTag('Notifications', 'Bildirishnomalar')
      .addTag('AI',            'AI tahlil va tavsiyalar')
      .addTag('Settings',      'Kompaniya sozlamalari')
      .addTag('Integrations',  'Payme, Click, Telegram, Didox')
      .addTag('Onboarding',    'Yangi foydalanuvchi sozlash')
      .addTag('Audit',         'Audit log')
      .addTag('Waste',         'Chiqindilar moduli')
      .addTag('Construction',  'Qurilish moduli')
      .addTag('Production',    'Ishlab chiqarish moduli')
      .addTag('Health',        'Sog\'liq va monitoring')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'none',
      },
      customSiteTitle: 'BIZZO ERP API',
    });

    // Postman-import uchun ochiq JSON
    const httpAdapter = app.getHttpAdapter();
    httpAdapter.get('/api/docs-json', (_req: any, res: any) => res.json(document));

    logger.log('📖 Swagger UI:  /api/docs');
    logger.log('📦 OpenAPI JSON: /api/docs-json (Postman → Import → Link)');
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`🚀 Backend ishlamoqda: http://localhost:${port}/api/v1`);
}

bootstrap();
