import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma';
import { UsersQueryDto } from './dto';
import { PaginatedUsers, UserResponse } from './types/user-response.type';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  isEmailVerified: true,
  isTwoFactorEnabled: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: UsersQueryDto): Promise<PaginatedUsers> {
    const { limit, cursor, search } = query;

    // Resolve cursor UUID to createdAt for compound pagination
    let cursorCreatedAt: Date | undefined;
    if (cursor) {
      const cursorUser = await this.prisma.user.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });
      if (cursorUser) {
        cursorCreatedAt = cursorUser.createdAt;
      }
    }

    const conditions: Prisma.UserWhereInput[] = [{ deletedAt: null }];

    if (search) {
      conditions.push({
        OR: [{ name: { contains: search } }, { email: { contains: search } }],
      });
    }

    if (cursorCreatedAt) {
      conditions.push({
        OR: [
          { createdAt: { lt: cursorCreatedAt } },
          { createdAt: cursorCreatedAt, id: { lt: cursor } },
        ],
      });
    }

    const where: Prisma.UserWhereInput = { AND: conditions };

    const countWhere: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(search && {
        OR: [{ name: { contains: search } }, { email: { contains: search } }],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        take: limit + 1,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.user.count({ where: countWhere }),
    ]);

    const hasNextPage = items.length > limit;
    const page = hasNextPage ? items.slice(0, limit) : items;

    return {
      items: page,
      nextCursor: hasNextPage ? (page.at(-1)?.id ?? null) : null,
      total,
    };
  }

  async findById(id: string): Promise<UserResponse | null> {
    return this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: USER_SELECT,
    });
  }

  async findByIdIncludingDeleted(id: string): Promise<UserResponse | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<UserResponse> {
    return this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      }),
      this.prisma.token.deleteMany({ where: { userId: id } }),
    ]);
  }
}
