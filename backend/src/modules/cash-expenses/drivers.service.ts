import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface CreateDriverDto {
  name:        string
  phone?:      string
  carPlate?:   string
  isPermanent?: boolean
  notes?:      string
}

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, search?: string, permanentOnly?: boolean) {
    return this.prisma.driver.findMany({
      where: {
        companyId,
        isActive: true,
        ...(permanentOnly && { isPermanent: true }),
        ...(search && {
          OR: [
            { name:  { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { carPlate: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ isPermanent: 'desc' }, { lastPaidAt: 'desc' }, { name: 'asc' }],
      take:    100,
    })
  }

  async findOne(companyId: string, id: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id, companyId },
    })
    if (!driver) throw new NotFoundException('Haydovchi topilmadi')
    return driver
  }

  async create(companyId: string, dto: CreateDriverDto) {
    return this.prisma.driver.create({
      data: {
        companyId,
        name:        dto.name.trim(),
        phone:       dto.phone?.trim(),
        carPlate:    dto.carPlate?.trim(),
        isPermanent: !!dto.isPermanent,
        notes:       dto.notes,
      },
    })
  }

  async update(companyId: string, id: string, dto: Partial<CreateDriverDto>) {
    await this.findOne(companyId, id)
    return this.prisma.driver.update({
      where: { id },
      data:  {
        ...(dto.name        && { name:        dto.name.trim() }),
        ...(dto.phone       !== undefined && { phone:       dto.phone?.trim() }),
        ...(dto.carPlate    !== undefined && { carPlate:    dto.carPlate?.trim() }),
        ...(dto.isPermanent !== undefined && { isPermanent: dto.isPermanent }),
        ...(dto.notes       !== undefined && { notes:       dto.notes }),
      },
    })
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id)
    // Soft delete — agar to'lovlar bo'lsa, faqat isActive=false qilamiz
    const expenseCount = await this.prisma.cashExpense.count({
      where: { driverId: id },
    })
    if (expenseCount > 0) {
      return this.prisma.driver.update({
        where: { id },
        data:  { isActive: false },
      })
    }
    await this.prisma.driver.delete({ where: { id } })
    return { success: true }
  }
}
