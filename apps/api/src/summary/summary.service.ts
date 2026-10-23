import { BadRequestException, Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { CATEGORY_NAMES } from '../common/categories';
import { PrismaService } from '../prisma/prisma.service';
import { isMonth, monthRange } from './month';

export class CategoryBreakdownDto {
  @ApiProperty({ enum: CATEGORY_NAMES }) category!: string;
  @ApiProperty({ example: '0.00' }) total!: string;
  @ApiProperty() count!: number;
}

export class SummaryDto {
  @ApiProperty({ example: '2026-10' }) month!: string;
  @ApiProperty({ example: '0.00' }) total!: string;
  @ApiProperty() count!: number;
  @ApiProperty({ type: [CategoryBreakdownDto] }) breakdown!: CategoryBreakdownDto[];
}

@Injectable()
export class SummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async summarize(userId: string, month: unknown): Promise<SummaryDto> {
    if (!isMonth(month)) throw new BadRequestException('month must be in the format YYYY-MM');
    const { start, end } = monthRange(month);
    const groups = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: { userId, date: { gte: start, lt: end } },
      _sum: { amount: true },
      _count: { _all: true },
    });
    const categories = await this.prisma.category.findMany();
    const byId = new Map(groups.map((g) => [g.categoryId, g]));
    const breakdown = CATEGORY_NAMES.map((name) => {
      const cat = categories.find((c) => c.name === name);
      const g = cat ? byId.get(cat.id) : undefined;
      return {
        category: name as string,
        total: (g?._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
        count: g?._count._all ?? 0,
      };
    });
    const total = breakdown.reduce((acc, b) => acc.plus(b.total), new Prisma.Decimal(0));
    const count = breakdown.reduce((acc, b) => acc + b.count, 0);
    return { month, total: total.toFixed(2), count, breakdown };
  }
}