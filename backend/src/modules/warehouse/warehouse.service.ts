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

export interface ReturnLineDto {
  productId: string;
  quantity:  number;
  price:     number;
}

export interface CreateReturnDto {
  type:        'RETURN_IN' | 'RETURN_OUT'; // RETURN_IN = xaridordan, RETURN_OUT = yetkazib beruvchiga
  warehouseId: string;
  contactId?:  string;
  lines:       ReturnLineDto[];
  notes?:      string;
  refundDebt?: boolean; // qarzni kamaytirish
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
            reason:        `Ko'chirildi: ${warehouse.name} в†’ ${toWarehouse!.name}`,
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
          message:  `${product.name} вЂ” ${Number(afterStock.quantity).toFixed(1)} ${product.unit} qoldi (min: ${product.minStock})`,
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
            warehouseId:   dto.warehouseId,
            productId:     line.productId,
            contactId:     dto.contactId ?? null,
            type:          'IN' as any,
            quantity:      line.quantity,
            price:         line.price,
            totalAmount:   line.quantity * line.price,
            reason:        'Kirim',
            referenceType: 'INCOMING',
            notes:         dto.notes,
            createdById:   userId,
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
            message:  `${product.name} вЂ” ${Number(afterStock.quantity).toFixed(1)} ${product.unit} qoldi`,
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
            remaining: totalAmount,
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
  // QAYTA TO'LDIRISH TAVSIYALARI
  // (qoldiq < min bo'lgan mahsulotlar + tavsiya etilgan yetkazib beruvchi)
  // ============================================
  async getRestockSuggestions(companyId: string) {
    // Min stock'dan kam bo'lgan mahsulotlar
    const products = await this.prisma.product.findMany({
      where: {
        companyId,
        isActive:  true,
        isService: false,
        minStock:  { gt: 0 },
      },
      include: {
        stockItems: {
          where:  { warehouse: { companyId } },
          select: { quantity: true, warehouseId: true },
        },
      },
    });

    const lowStock = products
      .map(p => {
        const totalQty = p.stockItems.reduce((s, si) => s + Number(si.quantity), 0);
        return { product: p, totalQty };
      })
      .filter(x => x.totalQty < Number(x.product.minStock))
      // Performance: eng kritik 50 tasini olamiz (eng katta yetishmaslik birinchi)
      .sort((a, b) =>
        (Number(b.product.minStock) - b.totalQty) -
        (Number(a.product.minStock) - a.totalQty)
      )
      .slice(0, 50);

    if (lowStock.length === 0) return [];

    // 90 kunlik chegara
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Har bir mahsulot uchun: lastIn + sales вЂ” parallel (Promise.all 2 query)
    const suggestions = await Promise.all(
      lowStock.map(async ({ product, totalQty }) => {
        const [lastIn, sales] = await Promise.all([
          this.prisma.stockMovement.findFirst({
            where:   { productId: product.id, type: 'IN', warehouse: { companyId } },
            orderBy: { createdAt: 'desc' },
            include: {
              contact: { select: { id: true, name: true, phone: true } },
            },
          }),
          this.prisma.stockMovement.aggregate({
            where: {
              productId: product.id,
              type:      'OUT',
              warehouse: { companyId },
              createdAt: { gte: ninetyDaysAgo },
            },
            _sum: { quantity: true },
          }),
        ]);
        const soldPerDay = Number(sales._sum.quantity ?? 0) / 90;
        // 30 kun zaxira + minStock buffer
        const suggestedQty = Math.max(
          Number(product.minStock) - totalQty + Math.ceil(soldPerDay * 30),
          Number(product.minStock),
        );

        return {
          product: {
            id:        product.id,
            name:      product.name,
            code:      product.code,
            unit:      product.unit,
            buyPrice:  Number(product.buyPrice),
            minStock:  Number(product.minStock),
          },
          currentQty:    totalQty,
          shortageQty:   Math.max(0, Number(product.minStock) - totalQty),
          suggestedQty:  Math.ceil(suggestedQty),
          suggestedPrice: lastIn ? Number(lastIn.price) : Number(product.buyPrice),
          lastSupplier:  lastIn?.contact ?? null,
          lastInDate:    lastIn?.createdAt ?? null,
          soldPerDay:    Math.round(soldPerDay * 10) / 10,
        };
      })
    );

    return suggestions.sort((a, b) => b.shortageQty - a.shortageQty);
  }

  // ============================================
  // OXIRGI HUJJAT вЂ” qator-qator nusxa olish uchun
  // ============================================
  async getLastDocument(
    companyId: string,
    type: 'IN' | 'OUT',
    contactId?: string,
  ) {
    const where: any = {
      type,
      warehouse: { companyId },
      ...(contactId && { contactId }),
    };

    // Eng oxirgi tranzaksiya sanasi
    const lastMovement = await this.prisma.stockMovement.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
      select:  { createdAt: true, warehouseId: true, contactId: true },
    });
    if (!lastMovement) return null;

    // Shu daqiqada (5 sek ichida) yaratilgan barcha movements вЂ” bitta hujjat
    const docTime = lastMovement.createdAt;
    const windowStart = new Date(docTime.getTime() - 5_000);
    const windowEnd   = new Date(docTime.getTime() + 5_000);

    const lines = await this.prisma.stockMovement.findMany({
      where: {
        ...where,
        warehouseId: lastMovement.warehouseId,
        contactId:   lastMovement.contactId,
        createdAt:   { gte: windowStart, lte: windowEnd },
      },
      include: {
        product: { select: { id: true, name: true, code: true, unit: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      date:        lastMovement.createdAt,
      warehouseId: lastMovement.warehouseId,
      contactId:   lastMovement.contactId,
      lines: lines.map(l => ({
        productId: l.productId,
        product:   l.product,
        quantity:  Number(l.quantity),
        price:     Number(l.price),
      })),
    };
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
            warehouseId:   dto.warehouseId,
            productId:     line.productId,
            contactId:     dto.contactId ?? null,
            type:          'OUT' as any,
            quantity:      line.quantity,
            price:         line.price,
            totalAmount:   line.quantity * line.price,
            reason:        'Chiqim',
            referenceType: 'OUTGOING',
            notes:         dto.notes,
            createdById:   userId,
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
            message:  `${product.name} вЂ” ${Number(afterStock.quantity).toFixed(1)} ${product.unit} qoldi`,
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
            remaining: totalAmount,
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
  // TOVAR QAYTARISH
  // ============================================
  async createReturn(companyId: string, dto: CreateReturnDto, userId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, companyId, isActive: true },
    });
    if (!warehouse) throw new NotFoundException('Ombor topilmadi');
    if (!dto.lines.length) throw new BadRequestException('Kamida bitta qator kerak');

    const productIds = dto.lines.map(l => l.productId);
    const products   = await this.prisma.product.findMany({
      where: { id: { in: productIds }, companyId, isActive: true },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('Bir yoki bir nechta mahsulot topilmadi');
    }
    const productMap = new Map(products.map(p => [p.id, p]));

    // RETURN_OUT = ombor kamayadi → qoldiqni tekshirish kerak
    if (dto.type === 'RETURN_OUT') {
      const stockItems = await this.prisma.stockItem.findMany({
        where: { warehouseId: dto.warehouseId, productId: { in: productIds } },
      });
      const stockMap = new Map(stockItems.map(s => [s.productId, Number(s.quantity)]));
      for (const line of dto.lines) {
        const product = productMap.get(line.productId)!;
        const avail   = stockMap.get(line.productId) ?? 0;
        if (avail < line.quantity) {
          throw new BadRequestException(
            `${product.name}: yetarli qoldiq yo'q. Mavjud: ${avail} ${product.unit}, so'ralgan: ${line.quantity}`,
          );
        }
      }
    }

    const totalAmount = dto.lines.reduce((s, l) => s + l.quantity * l.price, 0);
    const isIn        = dto.type === 'RETURN_IN';

    return this.prisma.$transaction(async tx => {
      const movements = [];
      for (const line of dto.lines) {
        const movement = await tx.stockMovement.create({
          data: {
            warehouseId:   dto.warehouseId,
            productId:     line.productId,
            contactId:     dto.contactId ?? null,
            type:          dto.type as any,
            quantity:      line.quantity,
            price:         line.price,
            totalAmount:   line.quantity * line.price,
            reason:        isIn ? "Xaridordan qaytarildi" : "Yetkazib beruvchiga qaytarildi",
            referenceType: 'RETURN',
            notes:         dto.notes,
            createdById:   userId,
          },
        });
        movements.push(movement);
        // RETURN_IN → stock oshadi, RETURN_OUT → stock kamayadi
        await this._upsertStock(tx, dto.warehouseId, line.productId,
          isIn ? line.quantity : -line.quantity,
          line.price,
          isIn ? 'in' : 'out',
        );
      }

      // Qarz muvozanatini o'zgartirish
      let debtNote = null;
      if (dto.refundDebt && dto.contactId && totalAmount > 0) {
        debtNote = await tx.debtRecord.create({
          data: {
            companyId,
            contactId:    dto.contactId,
            // RETURN_IN → biz mijozga qaytaramiz (PAYABLE), RETURN_OUT → yetkazib beruvchi bizga (RECEIVABLE)
            type:         isIn ? 'PAYABLE' : 'RECEIVABLE' as any,
            amount:       totalAmount,
            paidAmount:   0,
            remaining:    totalAmount,
            currency:     'UZS',
            notes:        dto.notes ?? (isIn ? 'Qaytarish — mijozga' : 'Qaytarish — yetkazib beruvchiga'),
            referenceType: 'RETURN',
          },
        });
      }

      return { movements, debtNote, totalAmount };
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

  // ============================================================
  // OMBOR O'TKAZMALARI (STOCK TRANSFERS)
  // ============================================================

  private async nextTransferNumber(companyId: string): Promise<string> {
    const ym    = new Date().toISOString().slice(0, 7).replace('-', '')
    const count = await this.prisma.stockTransfer.count({ where: { companyId } })
    return `TR-${ym}-${String(count + 1).padStart(4, '0')}`
  }

  async createTransfer(companyId: string, userId: string, dto: {
    fromWarehouseId: string
    toWarehouseId:   string
    notes?:          string
    items: { productId: string; quantity: number }[]
  }) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('Manba va manzil ombor bir xil bo\'lishi mumkin emas')
    }
    const transferNumber = await this.nextTransferNumber(companyId)
    return this.prisma.stockTransfer.create({
      data: {
        companyId,
        transferNumber,
        fromWarehouseId: dto.fromWarehouseId,
        toWarehouseId:   dto.toWarehouseId,
        notes:           dto.notes,
        createdById:     userId,
        items: {
          create: dto.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        },
      },
      include: {
        items:         { include: { product: { select: { id: true, name: true, unit: true } } } },
        fromWarehouse: { select: { id: true, name: true } },
        toWarehouse:   { select: { id: true, name: true } },
      },
    })
  }

  async confirmTransfer(companyId: string, transferId: string, userId: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where:   { id: transferId, companyId },
      include: { items: true },
    })
    if (!transfer) throw new NotFoundException('O\'tkazma topilmadi')
    if (transfer.status !== 'DRAFT') throw new BadRequestException('Faqat DRAFT holatdagi o\'tkazmani tasdiqlash mumkin')

    await this.prisma.$transaction(async tx => {
      for (const item of transfer.items) {
        const qty = Number(item.quantity)

        // Check source stock
        const srcStock = await tx.stockItem.findUnique({
          where: { warehouseId_productId: { warehouseId: transfer.fromWarehouseId, productId: item.productId } },
        })
        if (!srcStock || Number(srcStock.quantity) < qty) {
          throw new BadRequestException(`Mahsulot miqdori yetarli emas: ${item.productId}`)
        }

        // OUT from source
        await tx.stockMovement.create({
          data: {
            warehouseId:   transfer.fromWarehouseId,
            productId:     item.productId,
            type:          'TRANSFER',
            quantity:      qty,
            price:         srcStock.avgPrice,
            totalAmount:   Number(srcStock.avgPrice) * qty,
            reason:        `O'tkazma #${transfer.transferNumber}`,
            referenceId:   transfer.id,
            referenceType: 'STOCK_TRANSFER',
            createdById:   userId,
          },
        })
        await tx.stockItem.update({
          where: { warehouseId_productId: { warehouseId: transfer.fromWarehouseId, productId: item.productId } },
          data:  { quantity: { decrement: qty } },
        })

        // IN to destination
        await tx.stockMovement.create({
          data: {
            warehouseId:   transfer.toWarehouseId,
            productId:     item.productId,
            type:          'IN',
            quantity:      qty,
            price:         srcStock.avgPrice,
            totalAmount:   Number(srcStock.avgPrice) * qty,
            reason:        `O'tkazma #${transfer.transferNumber}`,
            referenceId:   transfer.id,
            referenceType: 'STOCK_TRANSFER',
            createdById:   userId,
          },
        })
        const dstStock = await tx.stockItem.findUnique({
          where: { warehouseId_productId: { warehouseId: transfer.toWarehouseId, productId: item.productId } },
        })
        if (dstStock) {
          const newQty      = Number(dstStock.quantity) + qty
          const newAvgPrice = (Number(dstStock.quantity) * Number(dstStock.avgPrice) + qty * Number(srcStock.avgPrice)) / newQty
          await tx.stockItem.update({
            where: { warehouseId_productId: { warehouseId: transfer.toWarehouseId, productId: item.productId } },
            data:  { quantity: newQty, avgPrice: newAvgPrice },
          })
        } else {
          await tx.stockItem.create({
            data: { warehouseId: transfer.toWarehouseId, productId: item.productId, quantity: qty, avgPrice: srcStock.avgPrice },
          })
        }
      }

      await tx.stockTransfer.update({ where: { id: transferId }, data: { status: 'COMPLETED' } })
    })

    return this.getTransfer(companyId, transferId)
  }

  async listTransfers(companyId: string, filters: { status?: string; page?: number; limit?: number }) {
    const page  = filters.page  || 1
    const limit = filters.limit || 20
    const where: any = { companyId }
    if (filters.status) where.status = filters.status

    const [data, total] = await Promise.all([
      this.prisma.stockTransfer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
        include: {
          fromWarehouse: { select: { id: true, name: true } },
          toWarehouse:   { select: { id: true, name: true } },
          _count:        { select: { items: true } },
        },
      }),
      this.prisma.stockTransfer.count({ where }),
    ])
    return { data, total, page, limit }
  }

  async getTransfer(companyId: string, transferId: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where:   { id: transferId, companyId },
      include: {
        items:         { include: { product: { select: { id: true, name: true, unit: true, code: true } } } },
        fromWarehouse: { select: { id: true, name: true } },
        toWarehouse:   { select: { id: true, name: true } },
        createdBy:     { select: { id: true, firstName: true, lastName: true } },
      },
    })
    if (!transfer) throw new NotFoundException('O\'tkazma topilmadi')
    return transfer
  }

  async cancelTransfer(companyId: string, transferId: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({ where: { id: transferId, companyId } })
    if (!transfer) throw new NotFoundException()
    if (transfer.status !== 'DRAFT') throw new BadRequestException('Faqat DRAFT holatdagi o\'tkazmani bekor qilish mumkin')
    await this.prisma.stockTransfer.delete({ where: { id: transferId } })
    return { ok: true }
  }
}

