export type PrismaModelMock = {
  findUnique: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
  delete: jest.Mock;
  deleteMany: jest.Mock;
  count: jest.Mock;
};

export type PrismaMock = {
  user: PrismaModelMock;
  token: PrismaModelMock;
  $transaction: jest.Mock;
};

export function buildPrismaMock(): PrismaMock {
  const modelMock = (): PrismaModelMock => ({
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  });

  return {
    user: modelMock(),
    token: modelMock(),
    $transaction: jest.fn(),
  };
}
