export function buildMailServiceMock() {
  return {
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    sendWelcome: jest.fn().mockResolvedValue(undefined),
  };
}
