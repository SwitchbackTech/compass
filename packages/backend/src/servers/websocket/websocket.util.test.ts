import { Server as SocketIOServer } from "socket.io";
import { CompassSocketServer } from "@core/types/websocket.types";
import { EVENT_CHANGED } from "@core/constants/websocket.constants";
import { SocketError } from "@backend/common/constants/error.constants";

import { connections, notifyClient } from "./websocket.server";

jest.mock("socket.io");

describe("emitEventToUser", () => {
  beforeEach(() => {
    (SocketIOServer as unknown as jest.Mock).mockClear();
  });

  it("emits event to the correct socketId", () => {
    const userId = "existingUser";
    const socketId = "socket123";
    const mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    (SocketIOServer as unknown as jest.Mock).mockImplementation(() => mockIo);

    connections.set(userId, socketId);
    notifyClient(userId, mockIo as unknown as CompassSocketServer);

    expect(mockIo.to).toHaveBeenCalledWith(socketId);
    expect(mockIo.emit).toHaveBeenCalledWith(EVENT_CHANGED);
  });
  it("throws error if socketId not found", () => {
    const userId = "nonexistentUser";

    expect(() => notifyClient(userId)).toThrow(
      SocketError.InvalidSocketId.description
    );
  });
});
