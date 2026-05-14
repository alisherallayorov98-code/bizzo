import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateProductDto {
  code?:           string;
  barcode?:        string;
  name:            string;
  description?:    string;
  category?:       string;
  unit?:           string;
  buyPrice?:       number;
  sellPrice?:      number;
  wholesalePrice?: number | null;
  vipPrice?:       number | null;
  minPrice?:       number;
  minStock?:       number;
  isService?:      boolean;
  image?:          string;
}

export interface QueryProductDto {
  search?:     string;
  barcode?:    string;
  category?:   string;
  isService?:  boolean;
  isLow?:      boolean;
  page?:       number;
  limit?:      number;
  sortBy?:     string;
  sortOrder?:  'asc' | 'desc';
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // YARATISH
  // ============================================
  async create(companyId: string, dto: CreateProductDto, userId: string) {
    if (dto.code) {
      const existing = await this.prisma.product.findFirst({
        where: { companyId, code: dto.code, isActive: true },
      });
      if (existing) {
        throw new ConflictException(
          `Bu kod (${dto.code}) allaqachon mavjud: ${existing.name}`,
        );
      }
    }

    return this.prisma.product.create({
      data: {
        ...dto,
        companyId,
        buyPrice:  dto.buyPrice  ?? 0,
        sellPrice: dto.sellPrice ?? 0,
        minPrice:  dto.minPrice  ?? 0,
        minStock:  dto.minStock  ?? 0,
        unit:      dto.unit      ?? 'dona',
        isService: dto.isService ?? false,
      },
    });
  }

  // ============================================
  // RO'YXAT
  // ============================================
  async findAll(companyId: string, query: QueryProductDto) {
    const {
      search,
      barcode,
      category,
      isService,
      sortBy    = 'name',
      sortOrder = 'asc',
    } = query;
    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 50;

    const where: Prisma.ProductWhereInput = {
      companyId,
      isActive: true,
      ...(category  !== undefined && { category }),
      ...(isService !== undefined && { isService }),
      ...(barcode   !== undefined && { barcode }),
    };

    if (search) {
      where.OR = [
        { name:        { contains: search, mode: 'insensitive' } },
        { code:        { contains: search, mode: 'insensitive' } },
        { barcode:     { contains: search } },
        { description: { contains: search, mode: 'insensitive' } },
        { category:    { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          stockItems: {
            select: { quantity: true, avgPrice: true, warehouseId: true },
          },
        },
      }),
    ]);

    const data = products.map(p => {
      const totalStock = p.stockItems.reduce(
        (sum, s) => sum + Number(s.quantity),
        0,
      );
      const avgPrice = p.stockItems.length > 0
        ? p.stockItems.reduce((sum, s) => sum + Number(s.avgPrice), 0) / p.stockItems.length
        : Number(p.buyPrice);

      const isLow = !p.isService && totalStock <= Number(p.minStock);
      const { stockItems: _, ...rest } = p;
      void _;

      return {
        ...rest,
        totalStock,
        avgPrice,
        isLow,
        buyPrice:       Number(p.buyPrice),
        sellPrice:      Number(p.sellPrice),
        minPrice:       Number(p.minPrice),
        minStock:       Number(p.minStock),
        wholesalePrice: p.wholesalePrice != null ? Number(p.wholesalePrice) : null,
        vipPrice:       p.vipPrice       != null ? Number(p.vipPrice)       : null,
      };
    });

    // isLow filter (post-query because it's computed)
    const filtered = query.isLow !== undefined
      ? data.filter(p => p.isLow === query.isLow)
      : data;

    return {
      data: filtered,
      meta: {
        total:      query.isLow !== undefined ? filtered.length : total,
        page,
        limit,
        totalPages: Math.ceil((query.isLow !== undefined ? filtered.length : total) / limit),
      },
    };
  }

  // ============================================
  // NARX DARAJASI BO'YICHA NARX QAYTARISH
  // ============================================
  getPriceForContact(product: any, priceLevel: 'RETAIL' | 'WHOLESALE' | 'VIP' = 'RETAIL'): number {
    if (priceLevel === 'VIP'       && product.vipPrice)       return Number(product.vipPrice)
    if (priceLevel === 'WHOLESALE' && product.wholesalePrice) return Number(product.wholesalePrice)
    return Number(product.sellPrice)
  }

  async getContactPriceLevel(contactId: string): Promise<'RETAIL' | 'WHOLESALE' | 'VIP'> {
    const contact = await this.prisma.contact.findUnique({
      where:  { id: contactId },
      select: { priceLevel: true },
    })
    return (contact?.priceLevel as any) || 'RETAIL'
  }

  // ============================================
  // BITTA MAHSULOT
  // ============================================
  async findOne(companyId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where:   { id, companyId, isActive: true },
      include: {
        stockItems: {
          include: { warehouse: { select: { id: true, name: true } } },
        },
        movements: {
          orderBy: { createdAt: 'desc' },
          take:    30,
          include: { warehouse: { select: { id: true, name: true } } },
        },
        dealItems: {
          take:    20,
          orderBy: { deal: { createdAt: 'desc' } },
          include: {
            deal: {
              select: {
                id: true, dealNumber: true, title: true,
                stage: true, finalAmount: true, closedAt: true, createdAt: true,
                contact: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!product) throw new NotFoundException('Mahsulot topilmadi');

    const totalStock = product.stockItems.reduce(
      (sum, s) => sum + Number(s.quantity),
      0,
    );

    return {
      ...product,
      totalStock,
      buyPrice:  Number(product.buyPrice),
      sellPrice: Number(product.sellPrice),
      minPrice:  Number(product.minPrice),
      minStock:  Number(product.minStock),
      isLow:     !product.isService && totalStock <= Number(product.minStock),
    };
  }

  // ============================================
  // YANGILASH
  // ============================================
  async update(companyId: string, id: string, dto: Partial<CreateProductDto>) {
    await this.findOne(companyId, id);

    if (dto.code) {
      const existing = await this.prisma.product.findFirst({
        where: { companyId, code: dto.code, isActive: true, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Bu kod allaqachon mavjud: ${existing.name}`);
      }
    }

    return this.prisma.product.update({
      where: { id },
      data:  { ...dto, updatedAt: new Date() },
    });
  }

  // ============================================
  // O'CHIRISH (SOFT DELETE)
  // ============================================
  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    const hasStock = await this.prisma.stockItem.findFirst({
      where: { productId: id, quantity: { gt: 0 } },
    });

    if (hasStock) {
      throw new ConflictException(
        "Bu mahsulotda omborda qoldiq mavjud. Avval qoldiqni chiqaring.",
      );
    }

    return this.prisma.product.update({
      where: { id },
      data:  { isActive: false },
    });
  }

  async bulkDelete(companyId: string, ids: string[]) {
    const result = await this.prisma.product.updateMany({
      where: { id: { in: ids }, companyId },
      data:  { isActive: false },
    });
    return { deleted: result.count };
  }

  // ============================================
  // KATEGORIYALAR
  // ============================================
  async getCategories(companyId: string): Promise<string[]> {
    const products = await this.prisma.product.findMany({
      where:   { companyId, isActive: true, category: { not: null } },
      select:  { category: true },
      distinct: ['category'],
      orderBy:  { category: 'asc' },
    });

    return products
      .map(p => p.category)
      .filter((c): c is string => c !== null);
  }

  // ============================================
  // MINIMAL QOLDIQ OGOHLANTIRISHLARI
  // ============================================
  async getLowStockAlerts(companyId: string) {
    const products = await this.prisma.product.findMany({
      where:   { companyId, isActive: true, isService: false },
      include: { stockItems: { select: { quantity: true } } },
    });

    return products
      .map(p => ({
        id:         p.id,
        name:       p.name,
        unit:       p.unit,
        minStock:   Number(p.minStock),
        totalStock: p.stockItems.reduce((sum, s) => sum + Number(s.quantity), 0),
        sellPrice:  Number(p.sellPrice),
      }))
      .filter(p => p.totalStock <= p.minStock && p.minStock > 0)
      .sort((a, b) => a.totalStock - b.totalStock);
  }

  // ============================================
  // OXIRGI NARX (auto-fill uchun)
  // ============================================
  async getLastPrice(
    companyId: string,
    productId: string,
    contactId?: string,
    type?: 'IN' | 'OUT',
  ) {
    const product = await this.prisma.product.findFirst({
      where:  { id: productId, companyId, isActive: true },
      select: { id: true, sellPrice: true, buyPrice: true },
    });
    if (!product) return null;

    const where: any = { productId, warehouse: { companyId } };
    if (contactId) where.contactId = contactId;
    if (type)      where.type      = type;

    const last = await this.prisma.stockMovement.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
      select:  { price: true, quantity: true, createdAt: true, type: true, contactId: true },
    }).catch(() => null);

    // Stat: oxirgi 30 kunlik o'rtacha narx (anomaliya tekshirish uchun)
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const recent = await this.prisma.stockMovement.aggregate({
      where: { productId, warehouse: { companyId }, ...(type && { type }), createdAt: { gte: monthAgo } },
      _avg: { price: true },
      _min: { price: true },
      _max: { price: true },
      _count: true,
    }).catch(() => null);

    return {
      last: last ? {
        price:    Number(last.price),
        quantity: Number(last.quantity),
        date:     last.createdAt,
        type:     last.type,
        contactId: last.contactId,
      } : null,
      recent: recent ? {
        avg:   recent._avg.price ? Number(recent._avg.price) : null,
        min:   recent._min.price ? Number(recent._min.price) : null,
        max:   recent._max.price ? Number(recent._max.price) : null,
        count: recent._count,
      } : null,
      defaultPrice: type === 'OUT' ? Number(product.sellPrice) : Number(product.buyPrice),
    };
  }

  // ============================================
  // STATISTIKA
  // ============================================
  async getStats(companyId: string) {
    const [total, services, categories] = await Promise.all([
      this.prisma.product.count({ where: { companyId, isActive: true } }),
      this.prisma.product.count({ where: { companyId, isActive: true, isService: true } }),
      this.prisma.product.findMany({
        where:    { companyId, isActive: true, category: { not: null } },
        select:   { category: true },
        distinct: ['category'],
      }),
    ]);

    const lowStockAlerts = await this.getLowStockAlerts(companyId);

    const totalValueResult = await this.prisma.stockItem.aggregate({
      where: { product: { companyId, isActive: true } },
      _sum:  { quantity: true },
    });

    // Compute total inventory value
    const stockItems = await this.prisma.stockItem.findMany({
      where:  { product: { companyId, isActive: true } },
      select: { quantity: true, avgPrice: true },
    });
    const totalValue = stockItems.reduce(
      (sum, s) => sum + Number(s.quantity) * Number(s.avgPrice),
      0,
    );

    return {
      total,
      services,
      goods:      total - services,
      categories: categories.length,
      lowStock:   lowStockAlerts.length,
      totalValue,
      totalQty:   Number(totalValueResult._sum.quantity ?? 0),
    };
  }

  async findByBarcode(companyId: string, code: string) {
    const product = await this.prisma.product.findFirst({
      where: { companyId, barcode: code, isActive: true },
      include: {
        stockItems: {
          include: { warehouse: { select: { id: true, name: true } } },
        },
      },
    })
    if (!product) throw new NotFoundException(`Barcode ${code} bo'yicha mahsulot topilmadi`)
    return product
  }
}
