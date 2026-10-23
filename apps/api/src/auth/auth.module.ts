import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';

import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { OriginGuard } from '../common/origin.guard';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// Brute-force protection (ADR-6): limits per IP and per email on login/register, 429 + Retry-After.
// Read lazily so tests can raise the limit; no account lockout.
const limit = (): number => Number(process.env.AUTH_RATE_LIMIT ?? 20);
const ttl = (): number => Number(process.env.AUTH_RATE_TTL_MS ?? 60_000);

@Module({
  imports: [
    UsersModule,
    JwtModule.register({}),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'ip', ttl, limit, getTracker: (req: Record<string, any>): string => `ip:${req.ip}` },
        {
          name: 'email',
          ttl,
          limit,
          getTracker: (req: Record<string, any>): string => {
            const email = (req.body as { email?: unknown } | undefined)?.email;
            return `email:${typeof email === 'string' ? email.trim().toLowerCase() : req.ip}`;
          },
        },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [JwtModule],
})
export class AuthModule {}