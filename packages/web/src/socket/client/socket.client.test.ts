import { FETCH_USER_METADATA } from "@core/constants/websocket.constants";
import { ENV_WEB } from "@web/common/constants/env.constants";

// Mock socket.io-client
jest.mock("socket.io-client", () => {
  const mSocket = {
    disconnect: jest.fn(),
    connect: jest.fn(),
    emit: jest.fn(),
    once: jest.fn(),
    on: jest.fn(),
    // Add properties that might be checked
    connected: false,
  };
  return {
    io: jest.fn(() => mSocket),
  };
});

describe("socket.client", () => {
  let socketClientModule: typeof import("./socket.client");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.useFakeTimers();

    // Re-import module to trigger top-level code
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    socketClientModule = require("./socket.client");
    mockSocket = socketClientModule.socket;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("initializes socket with correct config", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ioMock = require("socket.io-client").io;
    expect(ioMock).toHaveBeenCalledWith(ENV_WEB.BACKEND_BASEURL, {
      withCredentials: true,
      autoConnect: false,
      reconnection: false,
      closeOnBeforeunload: true,
      transports: ["websocket", "polling"],
    });
  });

  it("sets up default listeners", () => {
    expect(mockSocket.once).toHaveBeenCalledWith(
      "connect",
      socketClientModule.onceConnected,
    );
    expect(mockSocket.on).toHaveBeenCalledWith("error", expect.any(Function));
  });

  describe("disconnect", () => {
    it("calls socket.disconnect", () => {
      socketClientModule.disconnect();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe("reconnect", () => {
    it("disconnects and then connects immediately", () => {
      socketClientModule.reconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.connect).toHaveBeenCalled();
    });
  });

  describe("onceConnected", () => {
    it("emits FETCH_USER_METADATA", () => {
      socketClientModule.onceConnected();
      expect(mockSocket.emit).toHaveBeenCalledWith(FETCH_USER_METADATA);
    });
  });

  describe("onError", () => {
    it("logs error to console", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Get the error handler registered in the module
      const errorHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === "error",
      )[1];

      expect(errorHandler).toBeDefined();

      const testError = new Error("Test socket error");
      errorHandler(testError);

      expect(consoleSpy).toHaveBeenCalledWith("Socket error:", testError);

      consoleSpy.mockRestore();
    });
  });
});
