import {
  Controller, Post, UseInterceptors,
  UploadedFile, Req, BadRequestException,
} from '@nestjs/common'
import { FileInterceptor }   from '@nestjs/platform-express'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger'
import { MinioService }      from '../../common/minio/minio.service'
import * as nodePath         from 'path'
import { randomUUID }        from 'crypto'

const ALLOWED_DOC_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

@ApiTags('Upload')
@ApiBearerAuth('access-token')
@Controller('upload')
export class UploadController {
  constructor(private readonly minio: MinioService) {}

  @Post('image')
  @ApiOperation({ summary: 'Rasm yuklash (mahsulot, logo, avatar)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('Fayl topilmadi')
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Faqat rasm yuklash mumkin')
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException("Fayl hajmi 5 MB dan kichik bo'lishi kerak")
    }

    const ext        = nodePath.extname(file.originalname) || '.jpg'
    const objectName = `images/${req.user.companyId}/${randomUUID()}${ext}`

    try {
      const url = await this.minio.uploadBuffer(objectName, file.buffer, file.mimetype)
      return { data: { url, size: file.size, mimetype: file.mimetype } }
    } catch {
      // MinIO ulanmasa — lokal fallback
      const fs   = await import('fs')
      const path = await import('path')
      const dir  = path.resolve(process.cwd(), 'uploads', req.user.companyId)
      fs.mkdirSync(dir, { recursive: true })
      const fname = `${randomUUID()}${ext}`
      fs.writeFileSync(path.join(dir, fname), file.buffer)
      return { data: { url: `/uploads/${req.user.companyId}/${fname}`, size: file.size, mimetype: file.mimetype } }
    }
  }

  @Post('document')
  @ApiOperation({ summary: 'Hujjat yuklash (pdf, word, excel)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('Fayl topilmadi')
    if (!ALLOWED_DOC_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Bu fayl turi ruxsat etilmagan')
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException("Fayl hajmi 10 MB dan kichik bo'lishi kerak")
    }

    const ext        = nodePath.extname(file.originalname) || ''
    const objectName = `documents/${req.user.companyId}/${randomUUID()}${ext}`

    try {
      const url = await this.minio.uploadBuffer(objectName, file.buffer, file.mimetype)
      return { data: { url, name: file.originalname, size: file.size, mimetype: file.mimetype } }
    } catch {
      const fs   = await import('fs')
      const path = await import('path')
      const dir  = path.resolve(process.cwd(), 'uploads', req.user.companyId)
      fs.mkdirSync(dir, { recursive: true })
      const fname = `${randomUUID()}${ext}`
      fs.writeFileSync(path.join(dir, fname), file.buffer)
      return { data: { url: `/uploads/${req.user.companyId}/${fname}`, name: file.originalname, size: file.size, mimetype: file.mimetype } }
    }
  }
}
