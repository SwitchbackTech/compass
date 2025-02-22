import { Server as HttpServer, createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { EVENT_CHANGED } from "@core/constants/websocket.constants";
import { CompassSocketServer } from "@core/types/websocket.types";
import { WebSocketServer } from "./websocket.server";

jest.mock("socket.io");

describe("handleBackgroundCalendarChange", () => {
  let mockHttpServer: jest.Mocked<HttpServer>;
  let mockIo: jest.Mocked<CompassSocketServer>;
  let webSocketServer: WebSocketServer;

  beforeAll(() => {
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      use: jest.fn(),
      on: jest.fn(),
      engine: { on: jest.fn() },
    } as unknown as jest.Mocked<CompassSocketServer>;
    (SocketIOServer as unknown as jest.Mock).mockImplementation(() => mockIo);

    webSocketServer = new WebSocketServer();

    mockHttpServer = createServer() as jest.Mocked<HttpServer>;
    webSocketServer.init(mockHttpServer);
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it("emits event to the correct socketId", (): void => {
    const httpServer = createServer();
    webSocketServer.init(httpServer);

    const userId = "existingUser";
    const socketId = "socket123";
    webSocketServer.addConnection(userId, socketId);
    webSocketServer.handleBackgroundCalendarChange(userId);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockIo.to).toHaveBeenCalledWith(socketId);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockIo.emit).toHaveBeenCalledWith(EVENT_CHANGED);
  });
  it("ignores change if no connection between client and ws server", () => {
    const userId = "nonexistentUser";

    const result = webSocketServer.handleBackgroundCalendarChange(userId);

    expect(result).toEqual("IGNORED");
  });
});
