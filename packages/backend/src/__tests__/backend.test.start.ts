import { mockNodeModules } from "@backend/__tests__/helpers/mock.setup";

jest.mock("@core/logger/winston.logger", () => {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    verbose: jest.fn(),
  };

  return {
    Logger: jest.fn().mockImplementation(() => mockLogger),
  };
});

mockNodeModules();

afterAll(() => jest.clearAllMocks());
