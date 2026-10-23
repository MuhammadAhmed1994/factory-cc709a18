import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { config } from '../app.config';
import { IS_PUBLIC } from './public.decorator';

export const SESSION_COOKIE = 'session';

/** Global guard: every route needs a valid signed session cookie unless marked @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    const req = context.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    if (!token) throw new UnauthorizedException('Not authenticated');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, { secret: config.jwtSecret });
      if (!payload.sub) throw new Error('no subject');
      req.user = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('Not authenticated');
    }
  }
}