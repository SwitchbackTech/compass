jest.mock("@core/logger/winston.logger", () => {
  const mockLogger = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  return {
    Logger: jest.fn().mockImplementation(() => mockLogger),
  };
});

afterAll(() => {
  jest.clearAllMocks();
});
