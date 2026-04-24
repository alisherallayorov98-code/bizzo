import {
  Controller, Get, Post, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard }   from '../../common/guards/jwt-auth.guard'
import { CurrentUser }    from '../../common/decorators/current-user.decorator'
import { ImportService }  from './import.service'
import { TemplateService } from './template.service'
import { SnapshotService } from './snapshot.service'
import { ImportEntity, ColumnMapping, RawRow } from './import.types'

@ApiTags('Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('import')
export class ImportController {
  constructor(
    private svc:       ImportService,
    private templates: TemplateService,
    private snapshots: SnapshotService,
  ) {}

  // ── TEMPLATES ──────────────────────────────────
  @Get('templates')
  @ApiOperation({ summary: 'Barcha shablon ma\'lumotlari' })
  getAllTemplates() { return this.templates.getAllTemplates() }

  @Get('templates/:entity')
  @ApiOperation({ summary: 'Entity uchun shablon' })
  getTemplate(@Param('entity') entity: ImportEntity) {
    return this.templates.getTemplate(entity)
  }

  // ── SESSIONS ───────────────────────────────────
  @Get('sessions')
  getSessions(@CurrentUser() user: any) {
    return this.svc.getSessions(user.companyId)
  }

  @Get('sessions/:id')
  getSession(@Param('id') id: string) {
    return this.svc.getSession(id)
  }

  @Post('sessions')
  createSession(
    @CurrentUser() user: any,
    @Body() dto: { name: string; source?: string },
  ) {
    return this.svc.createSession(user.companyId, dto.name, dto.source)
  }

  @Get('progress')
  getProgress(@CurrentUser() user: any) {
    return this.svc.getMigrationProgress(user.companyId)
  }

  // ── 1C XML PARSER ──────────────────────────────
  @Post('parse-1c')
  @ApiOperation({ summary: '1C CommerceML XML ni tahlil qilish' })
  parse1C(@Body() dto: { xml: string }) {
    return this.svc.parse1CXml(dto.xml)
  }

  // ── COLUMN DETECTION ───────────────────────────
  @Post('detect-columns')
  @ApiOperation({ summary: 'Ustunlarni avtomatik aniqlash' })
  detectColumns(@Body() dto: { headers: string[] }) {
    return { mapping: this.svc.detectColumns(dto.headers) }
  }

  // ── PREVIEW ────────────────────────────────────
  @Post('preview')
  @ApiOperation({ summary: 'Import preview (tekshirish)' })
  preview(
    @CurrentUser() user: any,
    @Body() dto: { entity: ImportEntity; rows: RawRow[]; mapping: ColumnMapping },
  ) {
    return this.svc.previewImport(user.companyId, dto.entity, dto.rows, dto.mapping)
  }

  // ── IMPORT ENDPOINTS ───────────────────────────
  @Post('contacts')
  importContacts(
    @CurrentUser() user: any,
    @Body() dto: { sessionId: string; rows: any[]; dupStrategy?: 'skip' | 'update' | 'merge' },
  ) {
    return this.svc.importContacts(user.companyId, dto.sessionId, dto.rows, dto.dupStrategy)
  }

  @Post('products')
  importProducts(
    @CurrentUser() user: any,
    @Body() dto: { sessionId: string; rows: any[]; dupStrategy?: 'skip' | 'update' },
  ) {
    return this.svc.importProducts(user.companyId, dto.sessionId, dto.rows, dto.dupStrategy)
  }

  @Post('debts')
  importDebts(
    @CurrentUser() user: any,
    @Body() dto: { sessionId: string; rows: any[] },
  ) {
    return this.svc.importDebts(user.companyId, dto.sessionId, dto.rows)
  }

  @Post('stock')
  importStock(
    @CurrentUser() user: any,
    @Body() dto: { sessionId: string; rows: any[] },
  ) {
    return this.svc.importStock(user.companyId, dto.sessionId, dto.rows)
  }

  @Post('employees')
  importEmployees(
    @CurrentUser() user: any,
    @Body() dto: { sessionId: string; rows: any[] },
  ) {
    return this.svc.importEmployees(user.companyId, dto.sessionId, dto.rows)
  }

  @Post('deals')
  importDeals(
    @CurrentUser() user: any,
    @Body() dto: { sessionId: string; rows: any[] },
  ) {
    return this.svc.importDeals(user.companyId, dto.sessionId, dto.rows)
  }

  // ── RECONCILIATION ─────────────────────────────
  @Get('reconciliation/:sessionId')
  getReconciliation(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.svc.getReconciliationReport(user.companyId, sessionId)
  }

  // ── ROLLBACK ───────────────────────────────────
  @Delete('sessions/:id/rollback')
  @HttpCode(HttpStatus.OK)
  rollback(@Param('id') id: string, @CurrentUser() user: any) {
    return this.snapshots.rollback(id, user.companyId)
  }
}
