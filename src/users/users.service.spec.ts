import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { Role } from '../generated/prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtPayload } from '../auth/types/jwt-payload.type';

describe('UsersService', () => {
  let service: UsersService;

  const mockUsersRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: UsersRepository, useValue: mockUsersRepository }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const query = { limit: 10 };
      const expectedResult = { items: [], nextCursor: null, total: 0 };
      mockUsersRepository.findAll.mockResolvedValue(expectedResult);

      const result = await service.findAll(query);

      expect(mockUsersRepository.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    const adminRequester: JwtPayload = {
      sub: 'admin-1',
      email: 'admin@test.com',
      role: Role.ADMIN,
    };
    const userRequester: JwtPayload = {
      sub: 'user-1',
      email: 'user@test.com',
      role: Role.USER,
    };
    const otherRequester: JwtPayload = {
      sub: 'user-2',
      email: 'other@test.com',
      role: Role.USER,
    };

    it('should allow admin to find any user', async () => {
      const targetId = 'user-1';
      const expectedUser = { id: targetId, name: 'Test User' };
      mockUsersRepository.findById.mockResolvedValue(expectedUser);

      const result = await service.findOne(targetId, adminRequester);

      expect(mockUsersRepository.findById).toHaveBeenCalledWith(targetId);
      expect(result).toEqual(expectedUser);
    });

    it('should allow user to find themselves', async () => {
      const targetId = 'user-1';
      const expectedUser = { id: targetId, name: 'Test User' };
      mockUsersRepository.findById.mockResolvedValue(expectedUser);

      const result = await service.findOne(targetId, userRequester);

      expect(mockUsersRepository.findById).toHaveBeenCalledWith(targetId);
      expect(result).toEqual(expectedUser);
    });

    it('should throw ForbiddenException if user tries to find another user', async () => {
      const targetId = 'user-1';
      await expect(service.findOne(targetId, otherRequester)).rejects.toThrow(ForbiddenException);
      expect(mockUsersRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const targetId = 'non-existent';
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(targetId, adminRequester)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const adminRequester: JwtPayload = {
      sub: 'admin-1',
      email: 'admin@test.com',
      role: Role.ADMIN,
    };
    const userRequester: JwtPayload = {
      sub: 'user-1',
      email: 'user@test.com',
      role: Role.USER,
    };
    const otherRequester: JwtPayload = {
      sub: 'user-2',
      email: 'other@test.com',
      role: Role.USER,
    };

    it('should allow admin to update any user', async () => {
      const targetId = 'user-1';
      const dto = { name: 'Updated Name' };
      const expectedUser = { id: targetId, name: 'Updated Name' };
      mockUsersRepository.findById.mockResolvedValue({ id: targetId });
      mockUsersRepository.update.mockResolvedValue(expectedUser);

      const result = await service.update(targetId, dto, adminRequester);

      expect(mockUsersRepository.findById).toHaveBeenCalledWith(targetId);
      expect(mockUsersRepository.update).toHaveBeenCalledWith(targetId, dto);
      expect(result).toEqual(expectedUser);
    });

    it('should allow user to update themselves', async () => {
      const targetId = 'user-1';
      const dto = { name: 'Updated Name' };
      const expectedUser = { id: targetId, name: 'Updated Name' };
      mockUsersRepository.findById.mockResolvedValue({ id: targetId });
      mockUsersRepository.update.mockResolvedValue(expectedUser);

      const result = await service.update(targetId, dto, userRequester);

      expect(mockUsersRepository.update).toHaveBeenCalledWith(targetId, dto);
      expect(result).toEqual(expectedUser);
    });

    it('should throw ForbiddenException if user tries to update another user', async () => {
      const targetId = 'user-1';
      const dto = { name: 'Updated Name' };
      await expect(service.update(targetId, dto, otherRequester)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const targetId = 'non-existent';
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(service.update(targetId, {}, adminRequester)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateRole', () => {
    it('should update role if user exists', async () => {
      const targetId = 'user-1';
      const dto = { role: Role.ADMIN };
      const expectedUser = { id: targetId, role: Role.ADMIN };
      mockUsersRepository.findById.mockResolvedValue({ id: targetId });
      mockUsersRepository.update.mockResolvedValue(expectedUser);

      const result = await service.updateRole(targetId, dto);

      expect(mockUsersRepository.findById).toHaveBeenCalledWith(targetId);
      expect(mockUsersRepository.update).toHaveBeenCalledWith(targetId, { role: dto.role });
      expect(result).toEqual(expectedUser);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const targetId = 'non-existent';
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(service.updateRole(targetId, { role: Role.ADMIN })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete user if they exist', async () => {
      const targetId = 'user-1';
      mockUsersRepository.findById.mockResolvedValue({ id: targetId });
      mockUsersRepository.softDelete.mockResolvedValue(undefined);

      await service.remove(targetId);

      expect(mockUsersRepository.findById).toHaveBeenCalledWith(targetId);
      expect(mockUsersRepository.softDelete).toHaveBeenCalledWith(targetId);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const targetId = 'non-existent';
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(service.remove(targetId)).rejects.toThrow(NotFoundException);
    });
  });
});
