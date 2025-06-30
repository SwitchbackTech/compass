import { EVENT_CHANGED } from "@core/constants/websocket.constants";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";

describe("handleBackgroundCalendarChange", () => {
  const baseDriver = new BaseDriver();

  beforeAll(() => {
    baseDriver.initWebsocketServer();
  });

  afterAll(async () => {
    await baseDriver.teardown();
    jest.clearAllMocks();
  });

  it("emits event to the correct socketId", (): void => {
    const userId = "existingUser";
    const socketId = "socket123";
    const compassWebsocketServer = baseDriver.getWebsocketServer();

    webSocketServer.addConnection(userId, socketId);
    webSocketServer.handleBackgroundCalendarChange(userId);

    expect(compassWebsocketServer).toBeDefined();

    expect(compassWebsocketServer?.to).toHaveBeenCalledWith(socketId);

    expect(compassWebsocketServer?.emit).toHaveBeenCalledWith(
      EVENT_CHANGED,
      socketId,
    );
  });

  it("ignores change if no connection between client and ws server", () => {
    const userId = "nonexistentUser";

    const result = webSocketServer.handleBackgroundCalendarChange(userId);

    expect(result).toEqual("IGNORED");
  });
});
