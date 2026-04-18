import { Injectable, Logger } from '@nestjs/common';

/**
 * Telegram orqali tizim alert yuborish (server down, error spike, DB lost).
 * Agar TELEGRAM_ALERT_BOT_TOKEN va CHAT_ID sozlanmagan bo'lsa — no-op.
 */
@Injectable()
export class TelegramAlerter {
  private readonly logger = new Logger(TelegramAlerter.name);
  private readonly token = process.env.TELEGRAM_ALERT_BOT_TOKEN;
  private readonly chatId = process.env.TELEGRAM_ALERT_CHAT_ID;

  private lastSentAt = new Map<string, number>();
  private readonly COOLDOWN_MS = 5 * 60 * 1000;

  async alert(level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL', title: string, details?: string) {
    if (!this.token || !this.chatId) return;

    const key = `${level}:${title}`;
    const last = this.lastSentAt.get(key) || 0;
    if (Date.now() - last < this.COOLDOWN_MS) return;
    this.lastSentAt.set(key, Date.now());

    const icon = { INFO: 'ℹ️', WARN: '⚠️', ERROR: '🔴', CRITICAL: '🚨' }[level];
    const text = `${icon} *BIZZO ${level}*\n*${title}*\n${details || ''}\n_${new Date().toISOString()}_`;

    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: this.chatId, text, parse_mode: 'Markdown' }),
      });
      if (!res.ok) this.logger.warn(`Telegram alert failed: ${res.status}`);
    } catch (err: any) {
      this.logger.warn(`Telegram alert error: ${err.message}`);
    }
  }
}
