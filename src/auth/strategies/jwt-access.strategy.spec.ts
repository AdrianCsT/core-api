import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAccessStrategy } from './jwt-access.strategy';
import { PrismaService } from '@/prisma';
import { Role } from '@/generated/prisma/enums';

describe('JwtAccessStrategy', () => {
  let strategy: JwtAccessStrategy;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('access-secret'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAccessStrategy,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtAccessStrategy>(JwtAccessStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const payload = { sub: 'user-1', email: 'test@example.com', role: Role.USER };

    it('should return payload if user is found and active', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1', isActive: true });

      const result = await strategy.validate(payload);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: payload.sub },
        select: { id: true, isActive: true },
      });
      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1', isActive: false });

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
