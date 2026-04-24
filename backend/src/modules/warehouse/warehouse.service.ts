import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService }        from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Prisma } from '@prisma/client';

export interface CreateWarehouseDto {
  name:      string;
  address?:  string;
  isDefault?: boolean;
}

export interface CreateMovementDto {
  warehouseId:   string;
  productId:     string;
  type:          'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
  quantity:      number;
  price?:        number;
  reason?:       string;
  referenceId?:  string;
  notes?:        string;
  // For TRANSFER: destination warehouse
  toWarehouseId?: string;
}

export interface QueryMovementDto {
  warehouseId?:  string;
  productId?:    string;
  type?:         string;
  dateFrom?:     string;
  dateTo?:       string;
  page?:         number;
  limit?:        number;
}

export interface AdjustStockDto {
  warehouseId: string;
  productId:   string;
  quantity:    number;
  reason?:     string;
}

export interface IncomingLineDto {
  productId: string;
  quantity:  number;
  price:     number;
}

export interface CreateIncomingDto {
  warehouseId: string;
  contactId?:  string;
  lines:       IncomingLineDto[];
  notes?:      string;
  createDebt?: boolean;
  dueDate?:    string;
}

export interface OutgoingLineDto {
  productId: string;
  quantity:  number;
  price:     number;
}

export interface CreateOutgoingDto {
  warehouseId: string;
  contactId?:  string;
  lines:       OutgoingLineDto[];
  notes?:      string;
  createDebt?: boolean;
  dueDate?:    string;
}

@Injectable()
export class WarehouseService {
  constructor(
    private readonly prisma:         PrismaService,
    private readonly notifications:  NotificationsService,
  ) {}

  // ============================================
  // OMBORLAR RO'YXATI
  // ============================================
  async getWarehouses(companyId: string) {
    const warehouses = await this.prisma.warehouse.findMany({
      where:   { companyId, isActive: true },
      orderBy: { isDefault: 'desc' },
      include: {
        stockItems: {
          select: { quantity: true, avgPrice: true },
        },
        _count: { select: { movements: true } },
      },
    });

    return warehouses.map(w => ({
      id:            w.id,
      name:          w.name,
      address:       w.address,
      isDefault:     w.isDefault,
      createdAt:     w.createdAt,
      itemCount:     w.stockItems.filter(s => Number(s.quantity) > 0).length,
      totalValue:    w.stockItems.reduce(
        (sum, s) => sum + Number(s.quantity) * Number(s.avgPrice),
        0,
      ),
      movementsCount: w._count.movements,
    }));
  }

  // ============================================
  // OMBOR YARATISH
  // ============================================
  async createWarehouse(companyId: string, dto: CreateWarehouseDto) {
    if (dto.isDefault) {
      // Oldingi default ni olib tashlash
      await this.prisma.warehouse.updateMany({
        where: { companyId, isDefault: true },
        data:  { isDefault: false },
      });
    }

    return this.prisma.warehouse.create({
      data: {
        ...dto,
        companyId,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  // ============================================
  // HARAKATNI YARATISH (KIRIM/CHIQIM/KO'CHIRISH)
  // ============================================
  async createMovement(
    companyId: string,
    dto: CreateMovementDto,
    userId: string,
  ) {
    // Ombor va mahsulot mavjudligini tekshirish
    const [warehouse, product] = await Promise.all([
      this.prisma.warehouse.findFirst({
        where: { id: dto.warehouseId, companyId, isActive: true },
      }),
      this.prisma.product.findFirst({
        where: { id: dto.productId, companyId, isActive: true },
      }),
    ]);

    if (!warehouse) throw new NotFoundException('Ombor topilmadi');
    if (!product)   throw new NotFoundException('Mahsulot topilmadi');

    // Yetarli qoldiq borligini tekshirish (OUT/TRANSFER)
    if (dto.type === 'OUT' || dto.type === 'TRANSFER') {
      const stockItem = await this.prisma.stockItem.findUnique({
        where: { warehouseId_productId: { warehouseId: dto.warehouseId, productId: dto.productId } },
      });
      const current = Number(stockItem?.quantity ?? 0);
      if (current < dto.quantity) {
        throw new BadRequestException(
          `Yetarli qoldiq yo'q. Mavjud: ${current} ${product.unit}, so'ralgan: ${dto.quantity} ${product.unit}`,
        );
      }
    }

    // Ko'chirish uchun maqsad ombor tekshiruvi
    let toWarehouse: { id: string; name: string } | null = null;
    if (dto.type === 'TRANSFER') {
      if (!dto.toWarehouseId) {
        throw new BadRequestException("Ko'chirish uchun maqsad omborni ko'rsating");
      }
      toWarehouse = await this.prisma.warehouse.findFirst({
        where: { id: dto.toWarehouseId, companyId, isActive: true },
      });
      if (!toWarehouse) throw new NotFoundException('Maqsad ombor topilmadi');
    }

    const price       = dto.price ?? Number(product.buyPrice);
    const totalAmount = price * dto.quantity;

    return this.prisma.$transaction(async tx => {
      // 1. Harakat yozuvi
      const movement = await tx.stockMovement.create({
        data: {
          warehouseId:   dto.warehouseId,
          productId:     dto.productId,
          type:          dto.type as any,
          quantity:      dto.quantity,
          price,
          totalAmount,
          reason:        dto.reason,
          referenceId:   dto.referenceId,
          notes:         dto.notes,
          createdById:   userId,
        },
      });

      // 2. Qoldiqni yangilash
      if (dto.type === 'IN') {
        await this._upsertStock(tx, dto.warehouseId, dto.productId, dto.quantity, price, 'in');
      } else if (dto.type === 'OUT') {
        await this._upsertStock(tx, dto.warehouseId, dto.productId, -dto.quantity, price, 'out');
      } else if (dto.type === 'TRANSFER') {
        await this._upsertStock(tx, dto.warehouseId, dto.productId, -dto.quantity, price, 'out');
        await this._upsertStock(tx, dto.toWarehouseId!, dto.productId, dto.quantity, price, 'in');

        // Maqsad omborda ham harakat yozuvi
        await tx.stockMovement.create({
          data: {
            warehouseId:   dto.toWarehouseId!,
            productId:     dto.productId,
            type:          'TRANSFER' as any,
            quantity:      dto.quantity,
            price,
            totalAmount,
            reason:        `Ko'chirildi: ${warehouse.name} → ${toWarehouse!.name}`,
            referenceId:   movement.id,
            notes:         dto.notes,
            createdById:   userId,
          },
        });
      } else if (dto.type === 'ADJUSTMENT') {
        // Adjustment: absolute quantity set
        await tx.stockItem.upsert({
          where: { warehouseId_productId: { warehouseId: dto.warehouseId, productId: dto.productId } },
          update: { quantity: dto.quantity, updatedAt: new Date() },
          create: {
            warehouseId: dto.warehouseId,
            productId:   dto.productId,
            quantity:    dto.quantity,
            avgPrice:    price,
          },
        });
      }

      // 3. Minimal qoldiq tekshiruvi
      const afterStock = await tx.stockItem.findUnique({
        where: { warehouseId_productId: { warehouseId: dto.warehouseId, productId: dto.productId } },
      });
      if (
        afterStock &&
        Number(afterStock.quantity) <= Number(product.minStock) &&
        Number(product.minStock) > 0
      ) {
        this.notifications.create({
          companyId,
          title:    'Ombor kam qoldi',
          message:  `${product.name} — ${Number(afterStock.quantity).toFixed(1)} ${product.unit} qoldi (min: ${product.minStock})`,
          type:     'warning',
          category: 'stock',
          link:     '/warehouse',
        }).catch(() => {})
      }

      return movement;
    });
  }

  // Helper: avg price calculation + upsert
  private async _upsertStock(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    productId:   string,
    delta:       number,
    price:       number,
    direction:   'in' | 'out',
  ) {
    const existing = await tx.stockItem.findUnique({
      where: { warehouseId_productId: { warehouseId, productId } },
    });

    if (!existing) {
      if (direction === 'in') {
        await tx.stockItem.create({
          data: { warehouseId, productId, quantity: delta, avgPrice: price },
        });
      }
      return;
    }

    let newAvgPrice = Number(existing.avgPrice);
    let newQty      = Number(existing.quantity) + delta;

    if (direction === 'in' && price > 0) {
      const totalCost = Number(existing.quantity) * Number(existing.avgPrice) + delta * price;
      newAvgPrice     = newQty > 0 ? totalCost / newQty : price;
    }

    if (newQty < 0) newQty = 0;

    await tx.stockItem.update({
      where: { warehouseId_productId: { warehouseId, productId } },
      data:  { quantity: newQty, avgPrice: newAvgPrice, updatedAt: new Date() },
    });
  }

  // ============================================
  // HARAKATLAR RO'YXATI
  // ============================================
  async getMovements(companyId: string, query: QueryMovementDto) {
    const {
      warehouseId,
      productId,
      type,
      dateFrom,
      dateTo,
      page  = 1,
      limit = 50,
    } = query;

    const where: Prisma.StockMovementWhereInput = {
      warehouse: { companyId },
      ...(warehouseId && { warehouseId }),
      ...(productId   && { productId }),
      ...(type        && { type: type as any }),
    };

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo   && { lte: new Date(dateTo) }),
      };
    }

    const [total, movements] = await Promise.all([
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product:   { select: { id: true, name: true, unit: true, code: true } },
          warehouse: { select: { id: true, name: true } },
        },
      }),
    ]);

    const data = movements.map(m => ({
      ...m,
      quantity:    Number(m.quantity),
      price:       Number(m.price),
      totalAmount: Number(m.totalAmount),
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // OMBOR KO'RINISHI (BARCHA MAHSULOTLAR + QOLDIQ)
  // ============================================
  async getOverview(companyId: string, warehouseId?: string) {
    const where: Prisma.StockItemWhereInput = {
      warehouse:  { companyId, isActive: true },
      product:    { isActive: true },
      quantity:   { gt: 0 },
      ...(warehouseId && { warehouseId }),
    };

    const items = await this.prisma.stockItem.findMany({
      where,
      include: {
        product:   {
          select: {
            id: true, name: true, code: true, unit: true,
            sellPrice: true, minStock: true, isService: true,
          },
        },
        warehouse: { select: { id: true, name: true } },
      },
      orderBy:  { product: { name: 'asc' } },
    });

    return items.map(item => ({
      id:          item.id,
      productId:   item.productId,
      productName: item.product.name,
      productCode: item.product.code,
      unit:        item.product.unit,
      warehouseId: item.warehouseId,
      warehouseName: item.warehouse.name,
      quantity:    Number(item.quantity),
      avgPrice:    Number(item.avgPrice),
      sellPrice:   Number(item.product.sellPrice),
      totalValue:  Number(item.quantity) * Number(item.avgPrice),
      minStock:    Number(item.product.minStock),
      isLow:       Number(item.quantity) <= Number(item.product.minStock) && Number(item.product.minStock) > 0,
    }));
  }

  // ============================================
  // KIRIM HUJJATI (MULTI-LINE)
  // ============================================
  async createIncoming(
    companyId: string,
    dto: CreateIncomingDto,
    userId: string,
  ) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, companyId, isActive: true },
    });
    if (!warehouse) throw new NotFoundException('Ombor topilmadi');

    if (dto.lines.length === 0) {
      throw new BadRequestException('Kamida bitta qator kerak');
    }

    const productIds = dto.lines.map(l => l.productId);
    const products   = await this.prisma.product.findMany({
      where: { id: { in: productIds }, companyId, isActive: true },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('Bir yoki bir nechta mahsulot topilmadi');
    }
    const productMap = new Map(products.map(p => [p.id, p]));

    const totalAmount = dto.lines.reduce((s, l) => s + l.quantity * l.price, 0);

    return this.prisma.$transaction(async tx => {
      const movements = [];
      for (const line of dto.lines) {
        const product = productMap.get(line.productId)!;
        const movement = await tx.stockMovement.create({
          data: {
            warehouseId:  dto.warehouseId,
            productId:    line.productId,
            type:         'IN' as any,
            quantity:     line.quantity,
            price:        line.price,
            totalAmount:  line.quantity * line.price,
            reason:       dto.contactId ? `Yetkazuvchi: ${dto.contactId}` : 'Kirim',
            notes:        dto.notes,
            createdById:  userId,
          },
        });
        movements.push(movement);
        await this._upsertStock(tx, dto.warehouseId, line.productId, line.quantity, line.price, 'in');

        // Low stock check
        const afterStock = await tx.stockItem.findUnique({
          where: { warehouseId_productId: { warehouseId: dto.warehouseId, productId: line.productId } },
        });
        if (
          afterStock &&
          Number(afterStock.quantity) <= Number(product.minStock) &&
          Number(product.minStock) > 0
        ) {
          this.notifications.create({
            companyId,
            title:    'Ombor kam qoldi',
            message:  `${product.name} — ${Number(afterStock.quantity).toFixed(1)} ${product.unit} qoldi`,
            type:     'warning',
            category: 'stock',
            link:     '/warehouse',
          }).catch(() => {});
        }
      }

      let debt = null;
      if (dto.createDebt && dto.contactId && totalAmount > 0) {
        debt = await tx.debtRecord.create({
          data: {
            companyId,
            contactId:    dto.contactId,
            type:         'PAYABLE' as any,
            amount:       totalAmount,
            paidAmount:   0,
            remainAmount: totalAmount,
            currency:     'UZS',
            dueDate:      dto.dueDate ? new Date(dto.dueDate) : null,
            notes:        dto.notes,
            referenceType: 'INCOMING',
          },
        });
      }

      return { movements, debt, totalAmount };
    });
  }

  // ============================================
  // CHIQIM HUJJATI (MULTI-LINE)
  // ============================================
  async createOutgoing(
    companyId: string,
    dto: CreateOutgoingDto,
    userId: string,
  ) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, companyId, isActive: true },
    });
    if (!warehouse) throw new NotFoundException('Ombor topilmadi');

    if (dto.lines.length === 0) {
      throw new BadRequestException('Kamida bitta qator kerak');
    }

    const productIds = dto.lines.map(l => l.productId);
    const products   = await this.prisma.product.findMany({
      where: { id: { in: productIds }, companyId, isActive: true },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('Bir yoki bir nechta mahsulot topilmadi');
    }

    // Check stock availability for all lines upfront
    const stockItems = await this.prisma.stockItem.findMany({
      where: {
        warehouseId: dto.warehouseId,
        productId:   { in: productIds },
      },
    });
    const stockMap = new Map(stockItems.map(s => [s.productId, Number(s.quantity)]));
    const productMap = new Map(products.map(p => [p.id, p]));

    for (const line of dto.lines) {
      const product  = productMap.get(line.productId)!;
      const avail    = stockMap.get(line.productId) ?? 0;
      if (avail < line.quantity) {
        throw new BadRequestException(
          `${product.name}: yetarli qoldiq yo'q. Mavjud: ${avail} ${product.unit}, so'ralgan: ${line.quantity}`,
        );
      }
    }

    const totalAmount = dto.lines.reduce((s, l) => s + l.quantity * l.price, 0);

    return this.prisma.$transaction(async tx => {
      const movements = [];
      for (const line of dto.lines) {
        const product = productMap.get(line.productId)!;
        const movement = await tx.stockMovement.create({
          data: {
            warehouseId:  dto.warehouseId,
            productId:    line.productId,
            type:         'OUT' as any,
            quantity:     line.quantity,
            price:        line.price,
            totalAmount:  line.quantity * line.price,
            reason:       dto.contactId ? `Mijoz: ${dto.contactId}` : 'Chiqim',
            notes:        dto.notes,
            createdById:  userId,
          },
        });
        movements.push(movement);
        await this._upsertStock(tx, dto.warehouseId, line.productId, -line.quantity, line.price, 'out');

        // Low stock notification
        const afterStock = await tx.stockItem.findUnique({
          where: { warehouseId_productId: { warehouseId: dto.warehouseId, productId: line.productId } },
        });
        if (
          afterStock &&
          Number(afterStock.quantity) <= Number(product.minStock) &&
          Number(product.minStock) > 0
        ) {
          this.notifications.create({
            companyId,
            title:    'Ombor kam qoldi',
            message:  `${product.name} — ${Number(afterStock.quantity).toFixed(1)} ${product.unit} qoldi`,
            type:     'warning',
            category: 'stock',
            link:     '/warehouse',
          }).catch(() => {});
        }
      }

      let debt = null;
      if (dto.createDebt && dto.contactId && totalAmount > 0) {
        debt = await tx.debtRecord.create({
          data: {
            companyId,
            contactId:    dto.contactId,
            type:         'RECEIVABLE' as any,
            amount:       totalAmount,
            paidAmount:   0,
            remainAmount: totalAmount,
            currency:     'UZS',
            dueDate:      dto.dueDate ? new Date(dto.dueDate) : null,
            notes:        dto.notes,
            referenceType: 'OUTGOING',
          },
        });
      }

      return { movements, debt, totalAmount };
    });
  }

  // ============================================
  // QOLDIQNI SOZLASH (INVENTARIZATSIYA)
  // ============================================
  async adjustStock(
    companyId: string,
    dto: AdjustStockDto,
    userId: string,
  ) {
    return this.createMovement(
      companyId,
      {
        warehouseId: dto.warehouseId,
        productId:   dto.productId,
        type:        'ADJUSTMENT',
        quantity:    dto.quantity,
        reason:      dto.reason ?? 'Inventarizatsiya',
      },
      userId,
    );
  }
}
