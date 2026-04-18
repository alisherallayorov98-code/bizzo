import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ PostgreSQL ulanishi o\'rnatildi');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('PostgreSQL ulanishi yopildi');
  }

  // Soft delete uchun middleware
  async enableShutdownHooks(app: { close: () => Promise<void> }) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
