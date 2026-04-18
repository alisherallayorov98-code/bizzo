import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Redis } from 'ioredis';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private redis?: Redis;

  constructor(private readonly prisma: PrismaService) {
    try {
      if (process.env.REDIS_HOST) {
        this.redis = new Redis({
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT || 6379),
          password: process.env.REDIS_PASSWORD || undefined,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        });
      }
    } catch {
      this.redis = undefined;
    }
  }

  private async pingDb(): Promise<{ ok: boolean; ms: number }> {
    const t = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, ms: Date.now() - t };
    } catch {
      return { ok: false, ms: Date.now() - t };
    }
  }

  private async pingRedis(): Promise<{ ok: boolean; ms: number }> {
    if (!this.redis) return { ok: false, ms: 0 };
    const t = Date.now();
    try {
      await this.redis.ping();
      return { ok: true, ms: Date.now() - t };
    } catch {
      return { ok: false, ms: Date.now() - t };
    }
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Tizim holati (ommaviy)' })
  async check() {
    const [db, redis] = await Promise.all([this.pingDb(), this.pingRedis()]);
    const ok = db.ok && (!this.redis || redis.ok);
    return {
      status: ok ? 'ok' : 'error',
      database: db.ok ? 'connected' : 'disconnected',
      redis: this.redis ? (redis.ok ? 'connected' : 'disconnected') : 'not_configured',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('detailed')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Batafsil tizim holati (admin)' })
  async detailed() {
    const [db, redis] = await Promise.all([this.pingDb(), this.pingRedis()]);
    const mem = process.memoryUsage();
    return {
      status: db.ok ? 'ok' : 'error',
      database: { connected: db.ok, responseMs: db.ms },
      redis: this.redis
        ? { connected: redis.ok, responseMs: redis.ms }
        : { connected: false, note: 'not_configured' },
      uptime: process.uptime(),
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        external: Math.round(mem.external / 1024 / 1024),
      },
      node: process.version,
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };
  }
}
