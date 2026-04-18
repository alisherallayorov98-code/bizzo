import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { PrismaService } from '../../prisma/prisma.service';

type TemplateName =
  | 'verification'
  | 'password-reset'
  | 'welcome'
  | 'invoice'
  | 'debt-reminder'
  | 'subscription-trial-ending'
  | 'subscription-payment-success'
  | 'subscription-payment-failed';

export type SubscriptionEmailType =
  | 'TRIAL_ENDING'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'SUBSCRIPTION_CANCELED';

export interface SendEmailJob {
  to: string;
  subject: string;
  template: TemplateName;
  context: Record<string, any>;
  companyId?: string | null;
  emailLogId: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly templatesDir = path.join(__dirname, 'templates');
  private readonly cache = new Map<string, HandlebarsTemplateDelegate>();
  private baseTpl?: HandlebarsTemplateDelegate;

  constructor(
    @InjectQueue('email') private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  render(template: TemplateName, context: Record<string, any>, lang: 'uz' | 'ru' = 'uz'): string {
    if (!this.baseTpl) {
      const raw = fs.readFileSync(path.join(this.templatesDir, 'base.hbs'), 'utf8');
      this.baseTpl = Handlebars.compile(raw);
    }
    const cacheKey = `${template}:${lang}`;
    let tpl = this.cache.get(cacheKey);
    if (!tpl) {
      const ruPath = path.join(this.templatesDir, `${template}_ru.hbs`);
      const defaultPath = path.join(this.templatesDir, `${template}.hbs`);
      const file = lang === 'ru' && fs.existsSync(ruPath) ? ruPath : defaultPath;
      const raw = fs.readFileSync(file, 'utf8');
      tpl = Handlebars.compile(raw);
      this.cache.set(cacheKey, tpl);
    }
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'https://app.bizzo.uz';
    const body = tpl({ ...context, frontendUrl });
    return this.baseTpl({ body, year: new Date().getFullYear() });
  }

  private async enqueue(params: {
    to: string;
    subject: string;
    template: TemplateName;
    context: Record<string, any>;
    companyId?: string | null;
  }) {
    const log = await this.prisma.emailLog.create({
      data: {
        companyId: params.companyId ?? null,
        to: params.to,
        subject: params.subject,
        template: params.template,
        status: 'PENDING',
        metadata: params.context,
      },
    });
    await this.queue.add(
      'send',
      {
        to: params.to,
        subject: params.subject,
        template: params.template,
        context: params.context,
        companyId: params.companyId ?? null,
        emailLogId: log.id,
      } as SendEmailJob,
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
    return log;
  }

  sendVerificationEmail(to: string, name: string, token: string, companyId?: string) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'https://app.bizzo.uz';
    return this.enqueue({
      to,
      subject: 'BIZZO — Email tasdiqlash',
      template: 'verification',
      companyId,
      context: { name, verifyUrl: `${frontendUrl}/verify-email?token=${token}` },
    });
  }

  sendPasswordResetEmail(to: string, name: string, token: string, companyId?: string) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'https://app.bizzo.uz';
    return this.enqueue({
      to,
      subject: 'BIZZO — Parolni tiklash',
      template: 'password-reset',
      companyId,
      context: { name, resetUrl: `${frontendUrl}/reset-password?token=${token}` },
    });
  }

  sendWelcomeEmail(to: string, name: string, companyId?: string) {
    return this.enqueue({
      to,
      subject: 'BIZZOga xush kelibsiz!',
      template: 'welcome',
      companyId,
      context: { name },
    });
  }

  sendInvoiceEmail(params: {
    to: string;
    customerName: string;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    total: string;
    link: string;
    companyId?: string;
  }) {
    return this.enqueue({
      to: params.to,
      subject: `Hisob-faktura ${params.invoiceNumber}`,
      template: 'invoice',
      companyId: params.companyId,
      context: {
        customerName: params.customerName,
        invoiceNumber: params.invoiceNumber,
        issueDate: params.issueDate,
        dueDate: params.dueDate,
        total: params.total,
        link: params.link,
      },
    });
  }

  sendDebtReminderEmail(params: {
    to: string;
    debtorName: string;
    companyName: string;
    amount: string;
    overdueDays: number;
    dueDate?: string;
    companyId?: string;
  }) {
    return this.enqueue({
      to: params.to,
      subject: 'Qarz eslatmasi',
      template: 'debt-reminder',
      companyId: params.companyId,
      context: {
        debtorName: params.debtorName,
        companyName: params.companyName,
        amount: params.amount,
        overdueDays: params.overdueDays,
        dueDate: params.dueDate,
      },
    });
  }

  sendSubscriptionEmail(params: {
    to: string;
    type: SubscriptionEmailType;
    name?: string;
    daysLeft?: number;
    planName?: string;
    amount?: string;
    nextBillingDate?: string;
    companyId?: string;
  }) {
    const map: Record<SubscriptionEmailType, { template: TemplateName; subject: string }> = {
      TRIAL_ENDING: { template: 'subscription-trial-ending', subject: 'Sinov muddati tugaydi' },
      PAYMENT_SUCCESS: { template: 'subscription-payment-success', subject: 'Toʻlov qabul qilindi' },
      PAYMENT_FAILED: { template: 'subscription-payment-failed', subject: 'Toʻlov amalga oshmadi' },
      SUBSCRIPTION_CANCELED: { template: 'subscription-payment-failed', subject: 'Obuna bekor qilindi' },
    };
    const { template, subject } = map[params.type];
    return this.enqueue({
      to: params.to,
      subject,
      template,
      companyId: params.companyId,
      context: {
        name: params.name,
        daysLeft: params.daysLeft,
        planName: params.planName,
        amount: params.amount,
        nextBillingDate: params.nextBillingDate,
      },
    });
  }
}
