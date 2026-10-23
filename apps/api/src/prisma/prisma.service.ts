import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CATEGORY_NAMES } from '../common/categories';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
    // The fixed default categories are reference data: make sure they exist (idempotent).
    for (const name of CATEGORY_NAMES) {
      await this.category.upsert({ where: { name }, update: {}, create: { name } });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}