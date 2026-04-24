import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService }  from '../../prisma/prisma.service'
import { MinioService }   from '../../common/minio/minio.service'

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio:  MinioService,
  ) {}

  async create(companyId: string, userId: string, dto: {
    entityType: string
    entityId:   string
    fileName:   string
    fileUrl:    string
    fileSize:   number
    mimeType:   string
  }) {
    return this.prisma.attachment.create({
      data: { ...dto, companyId, uploadedById: userId },
      include: {
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    })
  }

  async findByEntity(companyId: string, entityType: string, entityId: string) {
    return this.prisma.attachment.findMany({
      where:   { companyId, entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    })
  }

  async delete(companyId: string, id: string) {
    const att = await this.prisma.attachment.findFirst({ where: { id, companyId } })
    if (!att) throw new NotFoundException('Biriktirilgan fayl topilmadi')

    try {
      const objectName = att.fileUrl.split('/').slice(-3).join('/')
      await this.minio.deleteObject(objectName)
    } catch {}

    return this.prisma.attachment.delete({ where: { id } })
  }
}
