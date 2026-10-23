import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExpensesModule } from './expenses/expenses.module';
import { PrismaModule } from './prisma/prisma.module';
import { SummaryModule } from './summary/summary.module';
import { UsersModule } from './users/users.module';

// Feature modules are registered here.
@Module({
  imports: [PrismaModule, UsersModule, AuthModule, CategoriesModule, ExpensesModule, DashboardModule, SummaryModule],
})
export class AppModule {}