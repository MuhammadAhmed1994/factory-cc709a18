import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { SummaryDto, SummaryService } from './summary.service';

@ApiTags('summary')
@ApiCookieAuth('session')
@Controller('summary')
export class SummaryController {
  constructor(private readonly summary: SummaryService) {}

  @Get()
  @ApiQuery({ name: 'month', example: '2026-10' })
  @ApiOkResponse({ type: SummaryDto })
  get(@CurrentUser() user: AuthUser, @Query('month') month?: string): Promise<SummaryDto> {
    return this.summary.summarize(user.id, month);
  }
}