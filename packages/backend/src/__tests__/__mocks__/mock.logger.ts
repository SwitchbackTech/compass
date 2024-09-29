jest.mock("@core/logger/winston.logger", () => {
  return {
    Logger: jest.fn().mockImplementation(() => {
      return {
        debug: jest.fn(),
        warn: jest.fn(),
      };
    }),
  };
});
