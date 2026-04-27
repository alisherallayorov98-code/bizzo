import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
} from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { QueryContactDto } from './dto/query-contact.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Contacts')
@ApiBearerAuth('access-token')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  // ============================================
  // YARATISH
  // ============================================
  @Post()
  @ApiOperation({ summary: 'Yangi kontakt yaratish' })
  create(
    @CurrentUser() user: any,
    @Body() dto: CreateContactDto,
  ) {
    return this.contactsService.create(user.companyId, dto, user.id);
  }

  // ============================================
  // RO'YXAT
  // ============================================
  @Get()
  @ApiOperation({ summary: "Kontaktlar ro'yxati" })
  findAll(
    @CurrentUser() user: any,
    @Query() query: QueryContactDto,
  ) {
    return this.contactsService.findAll(user.companyId, query);
  }

  // ============================================
  // STATISTIKA — /stats dan oldin bo'lishi kerak
  // ============================================
  @Get('stats')
  @ApiOperation({ summary: 'Kontaktlar statistikasi' })
  getStats(@CurrentUser() user: any) {
    return this.contactsService.getStats(user.companyId);
  }

  // ============================================
  // EKSPORT
  // ============================================
  @Get('export')
  @ApiOperation({ summary: 'Excel eksport uchun ma\'lumot' })
  export(
    @CurrentUser() user: any,
    @Query() query: QueryContactDto,
  ) {
    return this.contactsService.exportData(user.companyId, query);
  }

  // ============================================
  // TO'LIQ 360° — :id/full oldin bo'lishi kerak
  // ============================================
  @Get(':id/full')
  @ApiOperation({ summary: "Kontakt 360° — qarz, harakatlar, bitimlar" })
  getContactFull(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.contactsService.getContactFull(user.companyId, id);
  }

  // ============================================
  // KONTAKTNING ENG KO'P ISHLATILGAN MAHSULOTLARI
  // ============================================
  @Get(':id/frequent-products')
  @ApiOperation({ summary: "Auto-fill uchun: oxirgi narx + miqdor" })
  getFrequentProducts(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('type') type?: 'IN' | 'OUT',
    @Query('limit') limit?: string,
  ) {
    return this.contactsService.getFrequentProducts(
      user.companyId, id, type, limit ? Number(limit) : 20,
    );
  }

  // ============================================
  // TO'LIQ TRANZAKSIYALAR HISOBOTI
  // ============================================
  @Get(':id/transactions')
  @ApiOperation({ summary: "Kontakt tranzaksiyalari (sana, mahsulot, narx, miqdor)" })
  getContactTransactions(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query() query: {
      type?:  'IN' | 'OUT'
      from?:  string
      to?:    string
      page?:  number
      limit?: number
    },
  ) {
    return this.contactsService.getContactTransactions(user.companyId, id, query);
  }

  // ============================================
  // BITTA — :id dan keyin bo'lishi kerak
  // ============================================
  @Get(':id')
  @ApiOperation({ summary: "Kontakt ma'lumotlari" })
  findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.contactsService.findOne(user.companyId, id);
  }

  // ============================================
  // YANGILASH
  // ============================================
  @Put(':id')
  @ApiOperation({ summary: 'Kontaktni yangilash' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateContactDto>,
  ) {
    return this.contactsService.update(user.companyId, id, dto);
  }

  // ============================================
  // O'CHIRISH
  // ============================================
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Kontaktni o'chirish (soft)" })
  remove(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.contactsService.remove(user.companyId, id);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Kontaktlarni ommaviy o'chirish" })
  bulkDelete(
    @CurrentUser() user: any,
    @Body() body: { ids: string[] },
  ) {
    return this.contactsService.bulkDelete(user.companyId, body.ids);
  }

  // ============================================
  // IZOH QO'SHISH
  // ============================================
  @Post(':id/notes')
  @ApiOperation({ summary: "Izoh qo'shish" })
  addNote(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('note') note: string,
  ) {
    return this.contactsService.addNote(user.companyId, id, note, user.id);
  }
}
