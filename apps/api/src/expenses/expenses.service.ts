import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, ExpensePageDto, ExpenseResponseDto, ListExpensesQueryDto, UpdateExpenseDto } from './expenses.dto';

type ExpenseRow = Prisma.ExpenseGetPayload<{ include: { category: true } }>;

export function toExpenseResponse(row: ExpenseRow): ExpenseResponseDto {
  return {
    id: row.id,
    title: row.title,
    amount: row.amount.toFixed(2),
    date: row.date.toISOString().slice(0, 10),
    category: row.category.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const toDbDate = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateExpenseDto): Promise<ExpenseResponseDto> {
    const category = await this.prisma.category.findUniqueOrThrow({ where: { name: dto.category } });
    const row = await this.prisma.expense.create({
      data: {
        userId,
        categoryId: category.id,
        title: dto.title,
        amount: new Prisma.Decimal(dto.amount),
        date: toDbDate(dto.date),
      },
      include: { category: true },
    });
    return toExpenseResponse(row);
  }

  async list(userId: string, query: ListExpensesQueryDto): Promise<ExpensePageDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.ExpenseWhereInput = { userId };
    if (query.search) where.title = { contains: query.search, mode: 'insensitive' };
    if (query.category) where.category = { name: query.category };
    if (query.from || query.to) {
      where.date = {
        ...(query.from ? { gte: toDbDate(query.from) } : {}),
        ...(query.to ? { lte: toDbDate(query.to) } : {}),
      };
    }
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { items: rows.map(toExpenseResponse), page, limit, total };
  }

  async findOne(userId: string, id: string): Promise<ExpenseResponseDto> {
    const row = await this.prisma.expense.findFirst({ where: { id, userId }, include: { category: true } });
    if (!row) throw new NotFoundException('Expense not found');
    return toExpenseResponse(row);
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto): Promise<ExpenseResponseDto> {
    await this.findOne(userId, id);
    const data: Prisma.ExpenseUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.amount !== undefined) data.amount = new Prisma.Decimal(dto.amount);
    if (dto.date !== undefined) data.date = toDbDate(dto.date);
    if (dto.category !== undefined) {
      data.categoryId = (await this.prisma.category.findUniqueOrThrow({ where: { name: dto.category } })).id;
    }
    const result = await this.prisma.expense.updateMany({ where: { id, userId }, data });
    if (result.count === 0) throw new NotFoundException('Expense not found');
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.prisma.expense.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new NotFoundException('Expense not found');
  }
}