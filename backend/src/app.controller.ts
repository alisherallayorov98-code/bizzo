import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Tizim holati tekshiruvi' })
  async healthCheck() {
    const checks: Record<string, any> = {};
    let healthy = true;

    // Database
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok', latencyMs: Date.now() - start };
    } catch (err: any) {
      healthy = false;
      checks.database = { status: 'error', message: err?.message ?? 'unknown' };
    }

    // Memory
    const mem = process.memoryUsage();
    const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024);
    checks.memory = { heapUsedMb, heapTotalMb, rssMb: Math.round(mem.rss / 1024 / 1024) };

    return {
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSec: Math.round(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
    };
  }
}
