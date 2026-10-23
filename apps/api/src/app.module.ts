import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';

// Feature modules are registered here.
@Module({
  imports: [PrismaModule],
})
export class AppModule {}
