import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Role } from '../generated/prisma/client';
import { JwtPayload } from '../auth/types/jwt-payload.type';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateRole: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const query = { limit: 10 };
      const expectedResult = { items: [], nextCursor: null, total: 0 };
      mockUsersService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query);

      expect(mockUsersService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: expectedResult });
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const id = 'user-1';
      const requester: JwtPayload = {
        sub: 'admin-1',
        email: 'admin@example.com',
        role: Role.ADMIN,
      };
      const expectedUser = { id: 'user-1', name: 'Test User' };
      mockUsersService.findOne.mockResolvedValue(expectedUser);

      const result = await controller.findOne(id, requester);

      expect(mockUsersService.findOne).toHaveBeenCalledWith(id, requester);
      expect(result).toEqual({ data: expectedUser });
    });
  });

  describe('update', () => {
    it('should update and return user', async () => {
      const id = 'user-1';
      const dto = { name: 'Updated Name' };
      const requester: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: Role.USER,
      };
      const expectedUser = { id: 'user-1', name: 'Updated Name' };
      mockUsersService.update.mockResolvedValue(expectedUser);

      const result = await controller.update(id, dto, requester);

      expect(mockUsersService.update).toHaveBeenCalledWith(id, dto, requester);
      expect(result).toEqual({ data: expectedUser, message: 'User updated successfully' });
    });
  });

  describe('updateRole', () => {
    it('should update user role', async () => {
      const id = 'user-1';
      const dto = { role: Role.ADMIN };
      const expectedUser = { id: 'user-1', role: Role.ADMIN };
      mockUsersService.updateRole.mockResolvedValue(expectedUser);

      const result = await controller.updateRole(id, dto);

      expect(mockUsersService.updateRole).toHaveBeenCalledWith(id, dto);
      expect(result).toEqual({ data: expectedUser, message: 'Role updated successfully' });
    });
  });

  describe('remove', () => {
    it('should remove user', async () => {
      const id = 'user-1';
      mockUsersService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(mockUsersService.remove).toHaveBeenCalledWith(id);
    });
  });
});
