import { randomBytes } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { configureApp } from './app.config';
import { PrismaService } from './prisma/prisma.service';

// Tests share one real database; keep the throttler out of the way unless a test lowers it.
process.env.AUTH_RATE_LIMIT = process.env.AUTH_RATE_LIMIT ?? '10000';

export async function createTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

let counter = 0;
export function uniqueEmail(prefix = 'user'): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

// Generated per test run so no credential is committed to the repository (8-72 characters).
export const PASSWORD = `Pw-${randomBytes(16).toString('hex')}`;