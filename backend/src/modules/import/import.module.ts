import { Module }          from '@nestjs/common'
import { ImportController } from './import.controller'
import { ImportService }    from './import.service'
import { TemplateService }  from './template.service'
import { DedupService }     from './dedup.service'
import { SnapshotService }  from './snapshot.service'
import { PrismaModule }     from '../../prisma/prisma.module'

@Module({
  imports:     [PrismaModule],
  controllers: [ImportController],
  providers:   [ImportService, TemplateService, DedupService, SnapshotService],
  exports:     [ImportService],
})
export class ImportModule {}
