import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

// ============================================
// DTOlar
// ============================================
export interface CreateEmployeeDto {
  firstName:    string;
  lastName:     string;
  phone?:       string;
  position?:    string;
  department?:  string;
  employeeType: 'PERMANENT' | 'DAILY' | 'CONTRACT';
  baseSalary?:  number;
  dailyRate?:   number;
  hireDate?:    string;
  notes?:       string;
  isActive?:    boolean;
}

export interface CreateSalaryRecordDto {
  employeeId:  string;
  month:       number;
  year:        number;
  bonus?:      number;
  deduction?:  number;
  advance?:    number;
  notes?:      string;
}

export interface CreateDailyWorkDto {
  employeeId:   string;
  workDate:     string;
  hoursWorked?: number;
  dailyRate?:   number;
  notes?:       string;
}

export interface QueryEmployeeDto {
  search?:       string;
  employeeType?: string;
  department?:   string;
  isActive?:     boolean;
  page?:         number;
  limit?:        number;
}

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // XODIM YARATISH
  // ============================================
  async create(companyId: string, dto: CreateEmployeeDto) {
    if (dto.phone) {
      const existing = await this.prisma.employee.findFirst({
        where: { companyId, phone: dto.phone, isActive: true },
      });
      if (existing) {
        throw new ConflictException(
          `Bu telefon raqam allaqachon ro'yxatda: ${existing.firstName} ${existing.lastName}`,
        );
      }
    }

    return this.prisma.employee.create({
      data: {
        ...dto,
        companyId,
        baseSalary: dto.baseSalary ?? 0,
        dailyRate:  dto.dailyRate  ?? 0,
        hireDate:   dto.hireDate ? new Date(dto.hireDate) : null,
      },
    });
  }

  // ============================================
  // RO'YXAT
  // ============================================
  async findAll(companyId: string, query: QueryEmployeeDto) {
    const {
      search, employeeType, department,
      isActive = true,
    } = query;
    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;

    const where: Prisma.EmployeeWhereInput = {
      companyId,
      isActive,
      ...(employeeType && { employeeType: employeeType as any }),
      ...(department   && { department }),
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName:  { contains: search, mode: 'insensitive' } },
        { phone:     { contains: search } },
        { position:  { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, employees] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
    ]);

    const data = employees.map(e => ({
      ...e,
      baseSalary: Number(e.baseSalary),
      dailyRate:  Number(e.dailyRate),
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ============================================
  // BITTA XODIM
  // ============================================
  async findOne(companyId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where:   { id, companyId, isActive: true },
      include: {
        salaryRecords: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 12,
        },
        dailyWorkRecords: {
          orderBy: { workDate: 'desc' },
          take: 30,
        },
      },
    });

    if (!employee) throw new NotFoundException('Xodim topilmadi');

    const currentDate  = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear  = currentDate.getFullYear();

    const unpaidSalary = employee.salaryRecords.find(
      r => r.month === currentMonth && r.year === currentYear && !r.isPaid,
    );

    const monthlyHours = employee.dailyWorkRecords
      .filter(r => {
        const d = new Date(r.workDate);
        return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, r) => sum + Number(r.hoursWorked), 0);

    return {
      ...employee,
      baseSalary: Number(employee.baseSalary),
      dailyRate:  Number(employee.dailyRate),
      salaryRecords: employee.salaryRecords.map(r => ({
        ...r,
        baseSalary:  Number(r.baseSalary),
        bonus:       Number(r.bonus),
        deduction:   Number(r.deduction),
        advance:     Number(r.advance),
        totalAmount: Number(r.totalAmount),
      })),
      dailyWorkRecords: employee.dailyWorkRecords.map(r => ({
        ...r,
        hoursWorked: Number(r.hoursWorked),
        dailyRate:   Number(r.dailyRate),
        amount:      Number(r.amount),
      })),
      unpaidSalary: unpaidSalary ? {
        ...unpaidSalary,
        baseSalary:  Number(unpaidSalary.baseSalary),
        bonus:       Number(unpaidSalary.bonus),
        deduction:   Number(unpaidSalary.deduction),
        advance:     Number(unpaidSalary.advance),
        totalAmount: Number(unpaidSalary.totalAmount),
      } : null,
      monthlyHours,
    };
  }

  // ============================================
  // YANGILASH
  // ============================================
  async update(companyId: string, id: string, dto: Partial<CreateEmployeeDto>) {
    const result = await this.prisma.employee.updateMany({
      where: { id, companyId },
      data: {
        ...dto,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        updatedAt: new Date(),
      },
    });
    if (result.count === 0) throw new NotFoundException('Xodim topilmadi');
    return this.prisma.employee.findUnique({ where: { id } });
  }

  // ============================================
  // ISH HAQI YOZUVI — DOIMIY XODIM
  // ============================================
  async createSalaryRecord(companyId: string, dto: CreateSalaryRecordDto) {
    const employee = await this.findOne(companyId, dto.employeeId);

    if (employee.employeeType === 'DAILY') {
      throw new BadRequestException(
        'Kunlik xodim uchun bu funksiya ishlamaydi. Kunlik ish yozuvidan foydalaning.',
      );
    }

    const existing = await this.prisma.salaryRecord.findUnique({
      where: {
        employeeId_month_year: {
          employeeId: dto.employeeId,
          month:      dto.month,
          year:       dto.year,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `${dto.year}-yil ${dto.month}-oy uchun hisob-kitob allaqachon mavjud`,
      );
    }

    // ============================================
    // ISH HAQI HISOBLASH ALGORITMI
    // FORMULA: totalAmount = baseSalary + bonus - deduction - advance
    // ============================================
    const baseSalary  = employee.baseSalary;
    const bonus       = dto.bonus     ?? 0;
    const deduction   = dto.deduction ?? 0;
    const advance     = dto.advance   ?? 0;
    const totalAmount = baseSalary + bonus - deduction - advance;

    if (totalAmount < 0) {
      throw new BadRequestException(
        `Ish haqi manfiy bo'lib qolmoqda: ${totalAmount} so'm. ` +
        'Ushlab qolish va avans miqdorini tekshiring.',
      );
    }

    return this.prisma.salaryRecord.create({
      data: {
        employeeId:  dto.employeeId,
        month:       dto.month,
        year:        dto.year,
        baseSalary,
        bonus,
        deduction,
        advance,
        totalAmount,
        notes:       dto.notes,
      },
    });
  }

  // ============================================
  // ISH HAQI TO'LASH
  // ============================================
  async markSalaryPaid(companyId: string, recordId: string) {
    const record = await this.prisma.salaryRecord.findFirst({
      where: { id: recordId, employee: { companyId } },
    });

    if (!record) throw new NotFoundException('Ish haqi yozuvi topilmadi');
    if (record.isPaid) throw new BadRequestException("Bu ish haqi allaqachon to'langan");

    return this.prisma.salaryRecord.update({
      where: { id: recordId },
      data:  { isPaid: true, paidAt: new Date() },
    });
  }

  // ============================================
  // OMMAVIY ISH HAQI TO'LASH
  // ============================================
  async bulkMarkSalaryPaid(companyId: string, recordIds: string[]) {
    const now = new Date()
    const result = await this.prisma.salaryRecord.updateMany({
      where: {
        id:       { in: recordIds },
        employee: { companyId },
        isPaid:   false,
      },
      data: { isPaid: true, paidAt: now },
    })

    const total = await this.prisma.salaryRecord.aggregate({
      where: { id: { in: recordIds }, employee: { companyId }, isPaid: true, paidAt: now },
      _sum:  { totalAmount: true },
    })

    return {
      count: result.count,
      total: Number(total._sum.totalAmount ?? 0),
    }
  }

  // ============================================
  // KUNLIK ISH YOZUVI
  // ============================================
  async addDailyWork(companyId: string, dto: CreateDailyWorkDto) {
    const employee = await this.findOne(companyId, dto.employeeId);

    const existing = await this.prisma.dailyWorkRecord.findUnique({
      where: {
        employeeId_workDate: {
          employeeId: dto.employeeId,
          workDate:   new Date(dto.workDate),
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `${dto.workDate} sanasi uchun yozuv allaqachon mavjud`,
      );
    }

    const hoursWorked = dto.hoursWorked ?? 8;
    const dailyRate   = dto.dailyRate   ?? employee.dailyRate;

    // ============================================
    // KUNLIK HISOB ALGORITMI
    // FORMULA: amount = (hoursWorked / 8) × dailyRate
    // ============================================
    const amount = (hoursWorked / 8) * dailyRate;

    return this.prisma.dailyWorkRecord.create({
      data: {
        employeeId:  dto.employeeId,
        workDate:    new Date(dto.workDate),
        hoursWorked,
        dailyRate,
        amount,
        notes:       dto.notes,
      },
    });
  }

  // ============================================
  // HAFTALIK HISOBOT
  // ============================================
  async getWeeklyReport(companyId: string, employeeId: string, weekStart: string) {
    const employee = await this.findOne(companyId, employeeId);

    const startDate = new Date(weekStart);
    const endDate   = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const records = await this.prisma.dailyWorkRecord.findMany({
      where: {
        employeeId,
        workDate: { gte: startDate, lte: endDate },
      },
      orderBy: { workDate: 'asc' },
    });

    const totalDays    = records.length;
    const totalHours   = records.reduce((s, r) => s + Number(r.hoursWorked), 0);
    const totalAmount  = records.reduce((s, r) => s + Number(r.amount), 0);
    const unpaidAmount = records
      .filter(r => !r.isPaid)
      .reduce((s, r) => s + Number(r.amount), 0);

    return {
      employee: {
        id:        employee.id,
        firstName: employee.firstName,
        lastName:  employee.lastName,
        dailyRate: employee.dailyRate,
      },
      period:  { start: startDate, end: endDate },
      records: records.map(r => ({
        id:          r.id,
        workDate:    r.workDate,
        hoursWorked: Number(r.hoursWorked),
        dailyRate:   Number(r.dailyRate),
        amount:      Number(r.amount),
        isPaid:      r.isPaid,
        notes:       r.notes,
      })),
      summary: { totalDays, totalHours, totalAmount, unpaidAmount },
    };
  }

  // ============================================
  // HAFTALIK TO'LOV
  // ============================================
  async markWeeklyPaid(companyId: string, employeeId: string, weekStart: string) {
    await this.findOne(companyId, employeeId);

    const startDate = new Date(weekStart);
    const endDate   = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const result = await this.prisma.dailyWorkRecord.updateMany({
      where: {
        employeeId,
        workDate: { gte: startDate, lte: endDate },
        isPaid:   false,
      },
      data: { isPaid: true },
    });

    return {
      message: `${result.count} ta yozuv to'langan deb belgilandi`,
      count:   result.count,
    };
  }

  // ============================================
  // AVANS BERISH
  // ============================================
  async giveAdvance(
    companyId: string,
    employeeId: string,
    amount: number,
    month: number,
    year: number,
    note?: string,
  ) {
    await this.findOne(companyId, employeeId);

    if (amount <= 0) {
      throw new BadRequestException("Avans miqdori musbat bo'lishi kerak");
    }

    const existing = await this.prisma.salaryRecord.findUnique({
      where: { employeeId_month_year: { employeeId, month, year } },
    });

    if (existing) {
      const newAdvance     = Number(existing.advance) + amount;
      const newTotalAmount = Number(existing.baseSalary) +
                            Number(existing.bonus) -
                            Number(existing.deduction) - newAdvance;

      return this.prisma.salaryRecord.update({
        where: { id: existing.id },
        data:  {
          advance:     newAdvance,
          totalAmount: Math.max(0, newTotalAmount),
          notes:       note ? `${existing.notes ?? ''}\nAvans: ${note}`.trim() : existing.notes,
        },
      });
    } else {
      const employee    = await this.findOne(companyId, employeeId);
      const baseSalary  = employee.baseSalary;
      const totalAmount = Math.max(0, baseSalary - amount);

      return this.prisma.salaryRecord.create({
        data: {
          employeeId,
          month,
          year,
          baseSalary,
          bonus:       0,
          deduction:   0,
          advance:     amount,
          totalAmount,
          notes:       note ?? 'Avans berildi',
        },
      });
    }
  }

  // ============================================
  // BO'LIMLAR RO'YXATI
  // ============================================
  async getDepartments(companyId: string): Promise<string[]> {
    const result = await this.prisma.employee.findMany({
      where:    { companyId, isActive: true, department: { not: null } },
      select:   { department: true },
      distinct: ['department'],
      orderBy:  { department: 'asc' },
    });
    return result.map(r => r.department!).filter(Boolean);
  }

  // ============================================
  // STATISTIKA
  // ============================================
  async getStats(companyId: string) {
    const currentDate  = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear  = currentDate.getFullYear();

    const [total, permanent, daily, contract] = await Promise.all([
      this.prisma.employee.count({ where: { companyId, isActive: true } }),
      this.prisma.employee.count({ where: { companyId, isActive: true, employeeType: 'PERMANENT' } }),
      this.prisma.employee.count({ where: { companyId, isActive: true, employeeType: 'DAILY' } }),
      this.prisma.employee.count({ where: { companyId, isActive: true, employeeType: 'CONTRACT' } }),
    ]);

    const unpaidRecords = await this.prisma.salaryRecord.findMany({
      where: {
        employee: { companyId },
        month:    currentMonth,
        year:     currentYear,
        isPaid:   false,
      },
      include: { employee: { select: { firstName: true, lastName: true } } },
    });

    const unpaidTotal = unpaidRecords.reduce(
      (sum, r) => sum + Number(r.totalAmount),
      0,
    );

    const weekStart = new Date();
    const day = weekStart.getDay(); // 0=Sun..6=Sat
    weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
    weekStart.setHours(0, 0, 0, 0);

    const weeklyUnpaid = await this.prisma.dailyWorkRecord.aggregate({
      where: {
        employee: { companyId },
        workDate: { gte: weekStart },
        isPaid:   false,
      },
      _sum: { amount: true },
    });

    return {
      total, permanent, daily, contract,
      unpaidCount:  unpaidRecords.length,
      unpaidTotal,
      weeklyUnpaid: Number(weeklyUnpaid._sum.amount ?? 0),
      unpaidRecords: unpaidRecords.slice(0, 5).map(r => ({
        id:     r.id,
        name:   `${r.employee.firstName} ${r.employee.lastName}`,
        amount: Number(r.totalAmount),
        month:  r.month,
        year:   r.year,
      })),
    };
  }

  // ============================================
  // ISH HAQI TARIXI
  // ============================================
  async getSalaryHistory(companyId: string, month: number, year: number) {
    const employees = await this.prisma.employee.findMany({
      where:   {
        companyId,
        isActive:     true,
        employeeType: { not: 'DAILY' },
      },
      include: {
        salaryRecords: { where: { month, year } },
      },
      orderBy: [{ lastName: 'asc' }],
    });

    return employees.map(emp => {
      const record = emp.salaryRecords[0] ?? null;
      return {
        id:           emp.id,
        name:         `${emp.firstName} ${emp.lastName}`,
        position:     emp.position,
        department:   emp.department,
        employeeType: emp.employeeType,
        baseSalary:   Number(emp.baseSalary),
        record: record ? {
          id:          record.id,
          baseSalary:  Number(record.baseSalary),
          bonus:       Number(record.bonus),
          deduction:   Number(record.deduction),
          advance:     Number(record.advance),
          totalAmount: Number(record.totalAmount),
          isPaid:      record.isPaid,
          paidAt:      record.paidAt,
          notes:       record.notes,
        } : null,
      };
    });
  }
}
