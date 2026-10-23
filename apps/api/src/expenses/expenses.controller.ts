import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import {
  CreateExpenseDto,
  ExpensePageDto,
  ExpenseResponseDto,
  ListExpensesQueryDto,
  UpdateExpenseDto,
} from './expenses.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('expenses')
@ApiCookieAuth('session')
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post()
  @ApiOkResponse({ type: ExpenseResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto): Promise<ExpenseResponseDto> {
    return this.expenses.create(user.id, dto);
  }

  @Get()
  @ApiOkResponse({ type: ExpensePageDto })
  list(@CurrentUser() user: AuthUser, @Query() query: ListExpensesQueryDto): Promise<ExpensePageDto> {
    return this.expenses.list(user.id, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ExpenseResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<ExpenseResponseDto> {
    return this.expenses.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ExpenseResponseDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    return this.expenses.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.expenses.remove(user.id, id);
  }
}