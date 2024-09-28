import { Server as SocketIOServer } from "socket.io";
import { Schema_Event } from "@core/types/event.types";
import { CompassSocketServer } from "@core/types/websocket.types";
import { EVENT_CHANGED } from "@core/constants/websocket.constants";
import { SocketError } from "@backend/common/constants/error.constants";

import { connections, emitEventToUser } from "./websocket.server";

jest.mock("socket.io");
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

describe("emitEventToUser", () => {
  let logger: { warn: jest.Mock };

  beforeEach(() => {
    (SocketIOServer as unknown as jest.Mock).mockClear();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-var-requires
    logger = require("@core/logger/winston.logger").Logger();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    logger.warn.mockClear();
  });

  it("emits event to the correct socketId", () => {
    const userId = "existingUser";
    const socketId = "socket123";
    const event: Schema_Event = { _id: "2", title: "Test Event" };
    const mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    (SocketIOServer as unknown as jest.Mock).mockImplementation(() => mockIo);

    connections.set(userId, socketId);
    emitEventToUser(userId, event, mockIo as unknown as CompassSocketServer);

    expect(mockIo.to).toHaveBeenCalledWith(socketId);
    expect(mockIo.emit).toHaveBeenCalledWith(EVENT_CHANGED, event);
  });
  it("throws error if socketId not found", () => {
    const userId = "nonexistentUser";
    const event: Schema_Event = { _id: "1", title: "Test Event" };

    expect(() => emitEventToUser(userId, event)).toThrow(
      SocketError.InvalidSocketId.description
    );
  });
});
