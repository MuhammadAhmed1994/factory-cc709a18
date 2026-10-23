import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrors } from '../common/api-errors.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('categories')
@ApiCookieAuth('session')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOkResponse({ description: 'The fixed categories', schema: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } } } })
  @ApiErrors(401)
  async list(): Promise<{ id: string; name: string }[]> {
    const rows = await this.prisma.category.findMany({ orderBy: { name: 'asc' } });
    return rows.map((c) => ({ id: c.id, name: c.name }));
  }
}