import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private bucket: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'erp-uploads');
    this.client = new Minio.Client({
      endPoint:  this.config.get<string>('MINIO_ENDPOINT', 'localhost'),
      port:      parseInt(this.config.get<string>('MINIO_PORT', '9000')),
      useSSL:    this.config.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin123'),
    });

    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        this.logger.log(`Bucket "${this.bucket}" yaratildi`);
      }
    } catch (err) {
      this.logger.warn(`MinIO ulanmadi: ${err.message}. Local storage ishlatiladi.`);
    }
  }

  async uploadBuffer(
    objectName: string,
    buffer: Buffer,
    contentType = 'application/octet-stream',
  ): Promise<string> {
    await this.client.putObject(this.bucket, objectName, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    return this.getUrl(objectName);
  }

  async uploadString(
    objectName: string,
    content: string,
    contentType = 'text/html; charset=utf-8',
  ): Promise<string> {
    const buffer = Buffer.from(content, 'utf-8');
    return this.uploadBuffer(objectName, buffer, contentType);
  }

  getUrl(objectName: string): string {
    const ssl     = this.config.get<string>('MINIO_USE_SSL') === 'true';
    const scheme  = ssl ? 'https' : 'http';
    const host    = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    const port    = this.config.get<string>('MINIO_PORT', '9000');
    return `${scheme}://${host}:${port}/${this.bucket}/${objectName}`;
  }

  async getPresignedUrl(objectName: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, objectName, expirySeconds);
  }

  async deleteObject(objectName: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectName);
  }

  isAvailable(): boolean {
    return !!this.client;
  }
}
