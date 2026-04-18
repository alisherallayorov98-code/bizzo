import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface CreateProjectDto {
  name: string;
  address?: string;
  clientId?: string;
  managerId?: string;
  contractAmount?: number;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface CreateBudgetItemDto {
  projectId: string;
  category: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface CreateExpenseDto {
  projectId: string;
  category: string;
  description: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
  contactId?: string;
  warehouseId?: string;
  productId?: string;
  isPaid?: boolean;
  expenseDate?: string;
  notes?: string;
}

@Injectable()
export class ConstructionService {
  constructor(private prisma: PrismaService) {}

  private async generateProjectNumber(companyId: string): Promise<string> {
    const year  = new Date().getFullYear();
    const count = await this.prisma.constructionProject.count({
      where: { companyId, createdAt: { gte: new Date(`${year}-01-01`) } },
    });
    return `PROJ-${year}-${String(count + 1).padStart(3, '0')}`;
  }

  async createProject(companyId: string, dto: CreateProjectDto, userId: string) {
    const projectNumber = await this.generateProjectNumber(companyId);
    return this.prisma.constructionProject.create({
      data: {
        companyId,
        projectNumber,
        name:           dto.name,
        address:        dto.address,
        clientId:       dto.clientId,
        managerId:      dto.managerId,
        contractAmount: dto.contractAmount || 0,
        startDate:      dto.startDate ? new Date(dto.startDate) : null,
        endDate:        dto.endDate   ? new Date(dto.endDate)   : null,
        description:    dto.description,
        createdById:    userId,
      },
      include: {
        client:  { select: { id: true, name: true, phone: true } },
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getProjects(companyId: string, query: { status?: string; search?: string; page?: number; limit?: number }) {
    const page  = Number(query.page)  || 1;
    const limit = Number(query.limit) || 20;
    const where: any = { companyId, isActive: true, ...(query.status && { status: query.status }) };

    if (query.search) {
      where.OR = [
        { name:          { contains: query.search, mode: 'insensitive' } },
        { address:       { contains: query.search, mode: 'insensitive' } },
        { projectNumber: { contains: query.search } },
      ];
    }

    const [total, projects] = await Promise.all([
      this.prisma.constructionProject.count({ where }),
      this.prisma.constructionProject.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client:  { select: { id: true, name: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
          _count:  { select: { budgetItems: true, expenses: true, tasks: true } },
        },
      }),
    ]);

    const withFinance = await Promise.all(
      projects.map(async (p) => {
        const [budgetAgg, expenseAgg, lastLog] = await Promise.all([
          this.prisma.budgetItem.aggregate({ where: { projectId: p.id }, _sum: { totalAmount: true } }),
          this.prisma.projectExpense.aggregate({ where: { projectId: p.id }, _sum: { amount: true } }),
          this.prisma.workLog.findFirst({ where: { projectId: p.id }, orderBy: { workDate: 'desc' } }),
        ]);

        const budget   = Number(budgetAgg._sum.totalAmount   || 0);
        const expenses = Number(expenseAgg._sum.amount       || 0);
        const profit   = Number(p.contractAmount) - expenses;
        const budgetUsed = budget > 0 ? (expenses / budget) * 100 : 0;
        const today    = new Date();
        const isLate   = !!(p.endDate && today > p.endDate && p.status !== 'COMPLETED');
        const daysLeft = p.endDate ? Math.ceil((p.endDate.getTime() - today.getTime()) / 86400000) : null;

        return {
          ...p,
          budgetTotal:  budget,
          expenseTotal: expenses,
          profit,
          budgetUsed:   Number(budgetUsed.toFixed(1)),
          isOverBudget: expenses > budget * 1.1 && budget > 0,
          progress:     lastLog?.progress || 0,
          daysLeft,
          isLate,
        };
      }),
    );

    return { data: withFinance, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getProject(companyId: string, id: string) {
    const project = await this.prisma.constructionProject.findFirst({
      where:   { id, companyId, isActive: true },
      include: {
        client:      { select: { id: true, name: true, phone: true, email: true } },
        manager:     { select: { id: true, firstName: true, lastName: true } },
        budgetItems: { orderBy: { createdAt: 'asc' } },
        expenses:    { orderBy: { expenseDate: 'desc' }, take: 50 },
        workLogs:    { orderBy: { workDate: 'desc' }, take: 20 },
        tasks:       { where: { status: { not: 'CANCELLED' } }, orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }] },
      },
    });

    if (!project) throw new NotFoundException('Loyiha topilmadi');

    const budgetByCategory: Record<string, number> = {};
    project.budgetItems.forEach((i: any) => {
      budgetByCategory[i.category] = (budgetByCategory[i.category] || 0) + Number(i.totalAmount);
    });

    const expGrouped = await this.prisma.projectExpense.groupBy({
      by: ['category'], where: { projectId: id }, _sum: { amount: true },
    });
    const expByCat: Record<string, number> = {};
    expGrouped.forEach((e: any) => { expByCat[e.category] = Number(e._sum.amount || 0); });

    const totalBudget  = Object.values(budgetByCategory).reduce((s, v) => s + v, 0);
    const totalExpense = Object.values(expByCat).reduce((s, v) => s + v, 0);
    const profit       = Number(project.contractAmount) - totalExpense;
    const profitMargin = Number(project.contractAmount) > 0 ? (profit / Number(project.contractAmount)) * 100 : 0;

    const lastLog = project.workLogs[0];
    const currentProgress = lastLog?.progress || 0;

    const today    = new Date();
    const isLate   = !!(project.endDate && today > project.endDate && project.status !== 'COMPLETED');
    const daysLeft = project.endDate ? Math.ceil((project.endDate.getTime() - today.getTime()) / 86400000) : null;

    const taskStats = {
      total:      project.tasks.length,
      done:       project.tasks.filter((t: any) => t.status === 'DONE').length,
      inProgress: project.tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
      todo:       project.tasks.filter((t: any) => t.status === 'TODO').length,
    };

    const categories = ['LABOR', 'MATERIALS', 'EQUIPMENT', 'SUBCONTRACT', 'OTHER'];
    const categoryAnalysis = categories.map((cat) => {
      const budget = budgetByCategory[cat] || 0;
      const actual = expByCat[cat]         || 0;
      return {
        category:   cat,
        budget,
        actual,
        difference: budget - actual,
        percent:    budget > 0 ? (actual / budget) * 100 : 0,
        isOver:     actual > budget * 1.1 && budget > 0,
      };
    });

    return {
      ...project,
      finance: {
        contractAmount: Number(project.contractAmount),
        totalBudget,
        totalExpense,
        profit,
        profitMargin: Number(profitMargin.toFixed(1)),
        budgetUsed:   totalBudget > 0 ? Number(((totalExpense / totalBudget) * 100).toFixed(1)) : 0,
        isOverBudget: totalExpense > totalBudget * 1.1 && totalBudget > 0,
        categoryAnalysis,
      },
      progress: currentProgress,
      daysLeft,
      isLate,
      taskStats,
    };
  }

  async addBudgetItem(companyId: string, dto: CreateBudgetItemDto) {
    await this.getProject(companyId, dto.projectId);
    const totalAmount = dto.quantity * dto.unitPrice;
    return this.prisma.budgetItem.create({
      data: {
        projectId: dto.projectId,
        category:  dto.category as any,
        name:      dto.name,
        unit:      dto.unit,
        quantity:  dto.quantity,
        unitPrice: dto.unitPrice,
        totalAmount,
        notes:     dto.notes,
      },
    });
  }

  async removeBudgetItem(companyId: string, id: string) {
    const item = await this.prisma.budgetItem.findUnique({
      where: { id }, include: { project: { select: { companyId: true } } },
    });
    if (!item || item.project.companyId !== companyId) throw new NotFoundException();
    await this.prisma.budgetItem.delete({ where: { id } });
    return { success: true };
  }

  async addExpense(companyId: string, dto: CreateExpenseDto, userId: string) {
    await this.getProject(companyId, dto.projectId);

    const quantity  = dto.quantity  || 1;
    const unitPrice = dto.unitPrice || dto.amount;
    const amount    = dto.amount;

    return this.prisma.$transaction(async (tx) => {
      const exp = await tx.projectExpense.create({
        data: {
          projectId:   dto.projectId,
          category:    dto.category as any,
          description: dto.description,
          amount, quantity, unitPrice,
          contactId:   dto.contactId,
          warehouseId: dto.warehouseId,
          productId:   dto.productId,
          isPaid:      dto.isPaid || false,
          paidAt:      dto.isPaid ? new Date() : null,
          expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
          notes:       dto.notes,
          createdById: userId,
        },
      });

      if (dto.category === 'MATERIALS' && dto.warehouseId && dto.productId) {
        await tx.stockMovement.create({
          data: {
            warehouseId:   dto.warehouseId,
            productId:     dto.productId,
            type:          'OUT',
            quantity,
            price:         unitPrice,
            totalAmount:   amount,
            reason:        `Qurilish: ${dto.description}`,
            referenceId:   dto.projectId,
            referenceType: 'CONSTRUCTION',
            createdById:   userId,
          },
        });

        await tx.stockItem.update({
          where: { warehouseId_productId: { warehouseId: dto.warehouseId, productId: dto.productId } },
          data:  { quantity: { decrement: quantity } },
        }).catch(() => {});
      }

      if (dto.category === 'SUBCONTRACT' && dto.contactId && !dto.isPaid) {
        await tx.debtRecord.create({
          data: {
            companyId,
            contactId:     dto.contactId,
            type:          'PAYABLE',
            amount,
            remainAmount:  amount,
            paidAmount:    0,
            referenceId:   dto.projectId,
            referenceType: 'CONSTRUCTION',
            notes:         dto.description,
          },
        });
      }

      return exp;
    });
  }

  async addWorkLog(
    companyId: string,
    dto: { projectId: string; workDate: string; progress: number; description?: string; workersCount?: number; issues?: string },
    userId: string,
  ) {
    await this.getProject(companyId, dto.projectId);

    if (dto.progress < 0 || dto.progress > 100) {
      throw new BadRequestException("Progress 0-100 oraliqda bo'lishi kerak");
    }

    const workDate = new Date(dto.workDate);

    const log = await this.prisma.workLog.upsert({
      where:  { projectId_workDate: { projectId: dto.projectId, workDate } },
      update: { progress: dto.progress, description: dto.description, workersCount: dto.workersCount || 0, issues: dto.issues },
      create: {
        projectId:    dto.projectId,
        workDate,
        progress:     dto.progress,
        description:  dto.description,
        workersCount: dto.workersCount || 0,
        issues:       dto.issues,
        createdById:  userId,
      },
    });

    if (dto.progress === 100) {
      await this.prisma.constructionProject.update({
        where: { id: dto.projectId }, data: { status: 'COMPLETED', actualEndDate: new Date() },
      });
    } else if (dto.progress > 0) {
      await this.prisma.constructionProject.update({
        where: { id: dto.projectId }, data: { status: 'IN_PROGRESS' },
      });
    }

    return log;
  }

  async removeProject(companyId: string, id: string) {
    await this.getProject(companyId, id);
    await this.prisma.constructionProject.update({ where: { id }, data: { isActive: false } });
    return { success: true };
  }

  async updateProject(companyId: string, id: string, dto: Partial<CreateProjectDto>) {
    await this.getProject(companyId, id);
    return this.prisma.constructionProject.update({
      where: { id },
      data: {
        name:           dto.name,
        address:        dto.address,
        clientId:       dto.clientId,
        managerId:      dto.managerId,
        contractAmount: dto.contractAmount,
        startDate:      dto.startDate ? new Date(dto.startDate) : undefined,
        endDate:        dto.endDate   ? new Date(dto.endDate)   : undefined,
        description:    dto.description,
      },
    });
  }

  async updateStatus(companyId: string, id: string, status: string) {
    await this.getProject(companyId, id);
    return this.prisma.constructionProject.update({
      where: { id },
      data:  { status: status as any, ...(status === 'COMPLETED' ? { actualEndDate: new Date() } : {}) },
    });
  }

  async addTask(companyId: string, dto: {
    projectId: string; title: string; description?: string
    priority?: string; assignedToId?: string; dueDate?: string
  }) {
    await this.getProject(companyId, dto.projectId);
    return this.prisma.projectTask.create({
      data: {
        projectId:    dto.projectId,
        title:        dto.title,
        description:  dto.description,
        priority:     (dto.priority as any) || 'MEDIUM',
        assignedToId: dto.assignedToId || null,
        dueDate:      dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });
  }

  async updateTask(companyId: string, taskId: string, dto: {
    title?: string; description?: string; status?: string
    priority?: string; assignedToId?: string; dueDate?: string
  }) {
    const task = await this.prisma.projectTask.findUnique({
      where: { id: taskId }, include: { project: { select: { companyId: true } } },
    });
    if (!task || task.project.companyId !== companyId) throw new NotFoundException();
    return this.prisma.projectTask.update({
      where: { id: taskId },
      data:  {
        title:        dto.title,
        description:  dto.description,
        status:       (dto.status as any),
        priority:     (dto.priority as any),
        assignedToId: dto.assignedToId,
        dueDate:      dto.dueDate ? new Date(dto.dueDate) : undefined,
        completedAt:  dto.status === 'DONE' ? new Date() : dto.status ? null : undefined,
      },
    });
  }

  async deleteTask(companyId: string, taskId: string) {
    const task = await this.prisma.projectTask.findUnique({
      where: { id: taskId }, include: { project: { select: { companyId: true } } },
    });
    if (!task || task.project.companyId !== companyId) throw new NotFoundException();
    await this.prisma.projectTask.delete({ where: { id: taskId } });
    return { success: true };
  }

  async updateExpense(companyId: string, expenseId: string, dto: { isPaid: boolean }) {
    const exp = await this.prisma.projectExpense.findUnique({
      where: { id: expenseId }, include: { project: { select: { companyId: true } } },
    });
    if (!exp || exp.project.companyId !== companyId) throw new NotFoundException();
    return this.prisma.projectExpense.update({
      where: { id: expenseId },
      data:  { isPaid: dto.isPaid, paidAt: dto.isPaid ? new Date() : null },
    });
  }

  async getStats(companyId: string) {
    const [total, active, completed, projects, totalExpAgg, overdue] = await Promise.all([
      this.prisma.constructionProject.count({ where: { companyId, isActive: true } }),
      this.prisma.constructionProject.count({ where: { companyId, isActive: true, status: 'IN_PROGRESS' } }),
      this.prisma.constructionProject.count({ where: { companyId, isActive: true, status: 'COMPLETED' } }),
      this.prisma.constructionProject.findMany({ where: { companyId, isActive: true }, select: { contractAmount: true } }),
      this.prisma.projectExpense.aggregate({ where: { project: { companyId } }, _sum: { amount: true } }),
      this.prisma.constructionProject.count({
        where: { companyId, isActive: true, status: { notIn: ['COMPLETED', 'CANCELLED'] }, endDate: { lt: new Date() } },
      }),
    ]);

    const totalContractAmount = projects.reduce((s, p) => s + Number(p.contractAmount), 0);
    const totalExpenses = Number(totalExpAgg._sum.amount || 0);

    return {
      total, active, completed, overdue,
      totalContractAmount,
      totalExpenses,
      estimatedProfit: totalContractAmount - totalExpenses,
    };
  }
}
