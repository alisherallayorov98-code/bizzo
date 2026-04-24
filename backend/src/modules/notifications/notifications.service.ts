import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { NotificationsGateway } from './notifications.gateway';

export type NotificationType = 'info' | 'success' | 'warning' | 'danger';
export type NotificationCategory = 'stock' | 'debt' | 'salary' | 'contract' | 'system';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    @Optional() private gateway?: NotificationsGateway,
  ) {}

  async getForCompany(companyId: string, limit = 20) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where:   { companyId },
        orderBy: { createdAt: 'desc' },
        take:    limit,
      }),
      this.prisma.notification.count({
        where: { companyId, isRead: false },
      }),
    ]);
    return { items, unreadCount };
  }

  async markRead(id: string, companyId: string) {
    return this.prisma.notification.updateMany({
      where: { id, companyId },
      data:  { isRead: true },
    });
  }

  async markAllRead(companyId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { companyId, isRead: false },
      data:  { isRead: true },
    });
    this.gateway?.pushUnreadCount(companyId, 0);
    return result;
  }

  async create(data: {
    companyId: string;
    title:     string;
    message:   string;
    type:      NotificationType;
    category:  NotificationCategory;
    link?:     string;
    userId?:   string;
  }) {
    const notification = await this.prisma.notification.create({ data });
    // Push via WebSocket
    this.gateway?.pushToCompany(data.companyId, notification);
    return notification;
  }

  // Biznes ma'lumotlaridan avtomatik bildirishnomalar yaratish
  async refreshSmartNotifications(companyId: string): Promise<number> {
    const alerts: Array<{
      title: string; message: string;
      type: NotificationType; category: NotificationCategory; link?: string;
    }> = [];

    // 1. Kam qolgan mahsulotlar (minStock chegarasiga yetgan)
    try {
      const products = await this.prisma.product.findMany({
        where:   { companyId, isActive: true, isService: false },
        include: { stockItems: { select: { quantity: true } } },
      });

      for (const p of products) {
        const minStock = Number(p.minStock ?? 0);
        if (minStock <= 0) continue;
        const totalQty = p.stockItems.reduce((s, si) => s + Number(si.quantity), 0);
        if (totalQty <= minStock) {
          alerts.push({
            title:    'Ombor kam qoldi',
            message:  `${p.name} — ${totalQty.toFixed(1)} ${p.unit} qoldi (min: ${minStock})`,
            type:     'warning',
            category: 'stock',
            link:     '/warehouse',
          });
        }
      }
    } catch {}

    // 2. Muddati o'tgan qarzlar
    try {
      const overdueDebts = await this.prisma.debtRecord.findMany({
        where:   { companyId, isOverdue: true },
        include: { contact: { select: { name: true } } },
        take:    5,
      });

      for (const d of overdueDebts) {
        alerts.push({
          title:    "Qarz muddati o'tdi",
          message:  `${d.contact.name} — ${Number(d.remainAmount).toLocaleString()} so'm`,
          type:     'danger',
          category: 'debt',
          link:     '/debts',
        });
      }
    } catch {}

    // 3. To'lanmagan maoshlar (oy boshidan 5 kun o'tib hali to'lanmagan)
    try {
      const now        = new Date();
      const dayOfMonth = now.getDate();
      if (dayOfMonth >= 5) {
        const unpaidCount = await this.prisma.salaryRecord.count({
          where: {
            employee: { companyId },
            month:    now.getMonth() + 1,
            year:     now.getFullYear(),
            isPaid:   false,
          },
        });
        if (unpaidCount > 0) {
          alerts.push({
            title:    "Maosh to'lanmadi",
            message:  `${unpaidCount} ta xodimga bu oygi maosh hali to'lanmagan`,
            type:     'warning',
            category: 'salary',
            link:     '/salary',
          });
        }
      }
    } catch {}

    // 4. Muddati yaqinlashgan shartnomalar (7 kun ichida tugaydi)
    try {
      const week = new Date(Date.now() + 7 * 86400000);
      const expiringContracts = await this.prisma.contract.findMany({
        where: { companyId, status: 'ACTIVE', endDate: { gte: new Date(), lte: week } },
        take:  3,
      });
      for (const c of expiringContracts) {
        const days = Math.ceil((c.endDate!.getTime() - Date.now()) / 86400000);
        alerts.push({
          title:    'Shartnoma tugayapti',
          message:  `"${c.title}" — ${days} kun qoldi`,
          type:     'warning',
          category: 'contract',
          link:     `/contracts/${c.id}`,
        });
      }
    } catch {}

    // 5. Qurilish muddati yaqinlashgan/o'tgan loyihalar
    try {
      const now7 = new Date(Date.now() + 7 * 86400000);
      const projects = await this.prisma.constructionProject.findMany({
        where: { companyId, isActive: true, status: 'IN_PROGRESS', endDate: { lte: now7 } },
        take:  5,
      });
      for (const p of projects) {
        const overdue = p.endDate! < new Date();
        const days    = Math.abs(Math.ceil((p.endDate!.getTime() - Date.now()) / 86400000));
        alerts.push({
          title:    overdue ? "Loyiha muddati o'tdi" : 'Loyiha muddati yaqin',
          message:  `"${p.name}" — ${overdue ? `${days} kun kechikdi` : `${days} kun qoldi`}`,
          type:     overdue ? 'danger' : 'warning',
          category: 'contract',
          link:     `/construction/${p.id}`,
        });
      }
    } catch {}

    // 6. Obuna muddati yaqinlashgan
    try {
      const in14 = new Date(Date.now() + 14 * 86400000);
      const sub = await this.prisma.subscription.findUnique({
        where:   { companyId },
        include: { plan: { select: { displayName: true } } },
      });
      if (sub && sub.status === 'ACTIVE' && sub.currentPeriodEnd && sub.currentPeriodEnd <= in14) {
        const days = Math.ceil((sub.currentPeriodEnd.getTime() - Date.now()) / 86400000);
        alerts.push({
          title:    'Obuna muddati yaqin',
          message:  `${sub.plan.displayName} tarifi ${days} kunda tugaydi`,
          type:     days <= 3 ? 'danger' : 'warning',
          category: 'system',
          link:     '/billing',
        });
      }
    } catch {}

    if (alerts.length === 0) return 0;

    // Bugun yaratilgan smart bildirishnomalarni o'chirib yangisini yozamiz
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    await this.prisma.notification.deleteMany({
      where: {
        companyId,
        category:  { in: ['stock', 'debt', 'salary', 'contract', 'system'] },
        createdAt: { gte: todayStart },
      },
    });

    await this.prisma.notification.createMany({
      data: alerts.map(a => ({ ...a, companyId })),
    });

    return alerts.length;
  }

  async deleteOld(companyId: string, daysOld = 30) {
    const cutoff = new Date(Date.now() - daysOld * 86400000);
    return this.prisma.notification.deleteMany({
      where: { companyId, createdAt: { lt: cutoff }, isRead: true },
    });
  }
}
