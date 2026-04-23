export function buildJwtServiceMock() {
  return {
    sign: jest.fn().mockReturnValue('signed-jwt-token'),
    verify: jest.fn(),
    decode: jest.fn(),
  };
}
