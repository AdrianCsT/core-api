import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/prisma';

export async function cleanDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.token.deleteMany();
  await prisma.user.deleteMany();
}
