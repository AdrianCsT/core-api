import { Global, Module } from '@nestjs/common';
import { createAdapter } from '../config';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      useFactory: async (): Promise<PrismaService> => {
        const adapter = await createAdapter();
        return new PrismaService(adapter);
      },
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
