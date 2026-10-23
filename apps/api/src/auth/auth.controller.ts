import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { config } from '../app.config';
import { ApiErrors } from '../common/api-errors.decorator';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { SESSION_COOKIE } from '../common/jwt-auth.guard';
import { Public } from '../common/public.decorator';
import { LoginDto, RegisterDto, UserResponseDto } from './auth.dto';
import { AuthService, SESSION_MAX_AGE_MS } from './auth.service';

function setSession(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS,
  });
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('register')
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiErrors(400, 409, 429)
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response): Promise<UserResponseDto> {
    const { user, token } = await this.auth.register(dto);
    setSession(res, token);
    return user;
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: UserResponseDto })
  @ApiErrors(400, 401, 429)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<UserResponseDto> {
    const { user, token } = await this.auth.login(dto);
    setSession(res, token);
    return user;
  }

  @Post('logout')
  @HttpCode(204)
  @ApiCookieAuth('session')
  @ApiNoContentResponse({ description: 'Session cookie cleared' })
  @ApiErrors(401)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: config.cookieSecure, sameSite: 'lax', path: '/' });
  }

  @Get('me')
  @ApiCookieAuth('session')
  @ApiOkResponse({ type: UserResponseDto })
  @ApiErrors(401)
  me(@CurrentUser() user: AuthUser): Promise<UserResponseDto> {
    return this.auth.me(user.id);
  }
}