import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { DashboardDto, DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiCookieAuth('session')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @ApiQuery({ name: 'month', required: false, example: '2026-10' })
  @ApiOkResponse({ type: DashboardDto })
  get(@CurrentUser() user: AuthUser, @Query('month') month?: string): Promise<DashboardDto> {
    return this.dashboard.get(user.id, month);
  }
}