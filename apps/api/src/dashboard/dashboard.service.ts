import { BadRequestException, Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseResponseDto } from '../expenses/expenses.dto';
import { toExpenseResponse } from '../expenses/expenses.service';
import { currentUtcMonth, isMonth, monthRange } from '../summary/month';

export class DashboardDto {
  @ApiProperty({ example: '2026-10' }) month!: string;
  @ApiProperty({ example: '0.00' }) total!: string;
  @ApiProperty() count!: number;
  @ApiProperty({ type: [ExpenseResponseDto] }) recent!: ExpenseResponseDto[];
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string, month?: string): Promise<DashboardDto> {
    if (month !== undefined && !isMonth(month)) throw new BadRequestException('month must be in the format YYYY-MM');
    const m = month ?? currentUtcMonth();
    const { start, end } = monthRange(m);
    const where: Prisma.ExpenseWhereInput = { userId, date: { gte: start, lt: end } };
    const [agg, rows] = await Promise.all([
      this.prisma.expense.aggregate({ where, _sum: { amount: true }, _count: { _all: true } }),
      this.prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 10,
      }),
    ]);
    return {
      month: m,
      total: (agg._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      count: agg._count._all,
      recent: rows.map(toExpenseResponse),
    };
  }
}