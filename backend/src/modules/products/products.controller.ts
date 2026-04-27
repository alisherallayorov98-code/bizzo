import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductsService, CreateProductDto, QueryProductDto } from './products.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Products')
@ApiBearerAuth('access-token')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ============================================
  // YARATISH
  // ============================================
  @Post()
  @ApiOperation({ summary: 'Yangi mahsulot yaratish' })
  create(
    @CurrentUser() user: any,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(user.companyId, dto, user.id);
  }

  // ============================================
  // RO'YXAT
  // ============================================
  @Get()
  @ApiOperation({ summary: "Mahsulotlar ro'yxati" })
  findAll(
    @CurrentUser() user: any,
    @Query() query: QueryProductDto,
  ) {
    return this.productsService.findAll(user.companyId, query);
  }

  // ============================================
  // STATISTIKA — :id dan oldin!
  // ============================================
  @Get('stats')
  @ApiOperation({ summary: 'Mahsulotlar statistikasi' })
  getStats(@CurrentUser() user: any) {
    return this.productsService.getStats(user.companyId);
  }

  // ============================================
  // OXIRGI NARX — auto-fill uchun
  // ============================================
  @Get(':id/last-price')
  @ApiOperation({ summary: 'Mahsulotning oxirgi tranzaksiya narxi' })
  getLastPrice(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('contactId') contactId?: string,
    @Query('type') type?: 'IN' | 'OUT',
  ) {
    return this.productsService.getLastPrice(user.companyId, id, contactId, type);
  }

  // ============================================
  // KATEGORIYALAR — :id dan oldin!
  // ============================================
  @Get('categories')
  @ApiOperation({ summary: 'Kategoriyalar ro\'yxati' })
  getCategories(@CurrentUser() user: any) {
    return this.productsService.getCategories(user.companyId);
  }

  // ============================================
  // MINIMAL QOLDIQ — :id dan oldin!
  // ============================================
  @Get('low-stock')
  @ApiOperation({ summary: 'Minimal qoldiq ogohlantirishlari' })
  getLowStock(@CurrentUser() user: any) {
    return this.productsService.getLowStockAlerts(user.companyId);
  }

  // ============================================
  // BITTA MAHSULOT
  // ============================================
  @Get(':id')
  @ApiOperation({ summary: "Mahsulot ma'lumotlari" })
  findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.productsService.findOne(user.companyId, id);
  }

  // ============================================
  // YANGILASH
  // ============================================
  @Put(':id')
  @ApiOperation({ summary: 'Mahsulotni yangilash' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateProductDto>,
  ) {
    return this.productsService.update(user.companyId, id, dto);
  }

  // ============================================
  // O'CHIRISH
  // ============================================
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Mahsulotni o'chirish (soft)" })
  remove(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.productsService.remove(user.companyId, id);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mahsulotlarni ommaviy o'chirish" })
  bulkDelete(
    @CurrentUser() user: any,
    @Body() body: { ids: string[] },
  ) {
    return this.productsService.bulkDelete(user.companyId, body.ids);
  }
}
