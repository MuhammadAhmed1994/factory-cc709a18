import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { CATEGORY_NAMES } from '../common/categories';

const AMOUNT_RE = /^\d{1,7}(\.\d{1,2})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isCalendarDate(value: unknown): boolean {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function IsCalendarDate(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyKey) =>
    registerDecorator({
      name: 'isCalendarDate',
      target: target.constructor,
      propertyName: propertyKey as string,
      options: { message: `${String(propertyKey)} must be a valid date (YYYY-MM-DD)`, ...options },
      validator: { validate: isCalendarDate },
    });
}

function IsAmount(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyKey) =>
    registerDecorator({
      name: 'isAmount',
      target: target.constructor,
      propertyName: propertyKey as string,
      options: { message: 'amount must be greater than 0 and at most 9999999.99 with up to 2 decimals', ...options },
      validator: {
        validate: (value: unknown) => {
          if (typeof value !== 'string' || !AMOUNT_RE.test(value)) return false;
          const n = Number(value);
          return n > 0 && n <= 9999999.99;
        },
      },
    });
}

// Numbers are accepted and turned into strings; anything else stays as is and fails validation.
const amountToString = ({ value }: { value: unknown }): unknown => (typeof value === 'number' ? String(value) : value);
const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class CreateExpenseDto {
  @ApiProperty({ example: 'Lunch' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: '12.50', description: 'Decimal string, > 0, max 9999999.99' })
  @Transform(amountToString)
  @IsAmount()
  amount!: string;

  @ApiProperty({ example: '2026-10-23' })
  @IsCalendarDate()
  date!: string;

  @ApiProperty({ enum: CATEGORY_NAMES })
  @IsIn(CATEGORY_NAMES as readonly string[])
  category!: string;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}

export class ListExpensesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: CATEGORY_NAMES })
  @IsOptional()
  @IsIn(CATEGORY_NAMES as readonly string[])
  category?: string;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsCalendarDate()
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @IsCalendarDate()
  to?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ExpenseResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ example: '12.50' }) amount!: string;
  @ApiProperty({ example: '2026-10-23' }) date!: string;
  @ApiProperty({ enum: CATEGORY_NAMES }) category!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ExpensePageDto {
  @ApiProperty({ type: [ExpenseResponseDto] }) items!: ExpenseResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}

export { Matches };