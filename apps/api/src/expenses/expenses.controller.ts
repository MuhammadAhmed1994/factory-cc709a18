import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrors } from '../common/api-errors.decorator';
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
  @ApiCreatedResponse({ type: ExpenseResponseDto })
  @ApiErrors(400, 401)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto): Promise<ExpenseResponseDto> {
    return this.expenses.create(user.id, dto);
  }

  @Get()
  @ApiOkResponse({ type: ExpensePageDto })
  @ApiErrors(400, 401)
  list(@CurrentUser() user: AuthUser, @Query() query: ListExpensesQueryDto): Promise<ExpensePageDto> {
    return this.expenses.list(user.id, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ExpenseResponseDto })
  @ApiErrors(401, 404)
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<ExpenseResponseDto> {
    return this.expenses.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ExpenseResponseDto })
  @ApiErrors(400, 401, 404)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    return this.expenses.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Expense deleted' })
  @ApiErrors(401, 404)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.expenses.remove(user.id, id);
  }
}