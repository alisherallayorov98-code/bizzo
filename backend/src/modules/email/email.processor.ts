import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService, SendEmailJob } from './email.service';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);
  private transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: Number(this.config.get<string>('SMTP_PORT') || 587),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
    this.from = this.config.get<string>('SMTP_FROM') || 'BIZZO <no-reply@bizzo.uz>';
  }

  @Process('send')
  async handleSend(job: Job<SendEmailJob>) {
    const { to, subject, template, context, emailLogId } = job.data;
    try {
      const lang = (context as any)?.lang === 'ru' ? 'ru' : 'uz';
      const html = this.emailService.render(template, context, lang);
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      await this.prisma.emailLog.update({
        where: { id: emailLogId },
        data: { status: 'SENT', sentAt: new Date() },
      });
      this.logger.log(`Email sent: ${template} → ${to}`);
    } catch (err: any) {
      this.logger.error(`Email send failed (${template} → ${to}): ${err.message}`);
      if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) {
        await this.prisma.emailLog.update({
          where: { id: emailLogId },
          data: { status: 'FAILED', errorMessage: err.message?.slice(0, 500) },
        });
      }
      throw err;
    }
  }
}
