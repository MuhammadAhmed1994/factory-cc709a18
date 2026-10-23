import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { config } from '../app.config';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** CSRF defence in depth (ADR-1): state-changing browser requests must come from an allowed Origin. */
@Injectable()
export class OriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;
    const origin = req.headers.origin;
    if (!origin) return true; // not a browser cross-site request
    const allowed = config.allowedOrigins;
    if (allowed === true || allowed.includes(origin)) return true;
    throw new ForbiddenException('Origin not allowed');
  }
}