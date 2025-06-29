import { Request, Response } from "express";
import { GoogleApis } from "googleapis";
import SocketIO from "socket.io";
import type SuperTokens from "supertokens-node";
import {
  BaseRequest,
  BaseResponse,
} from "supertokens-node/lib/build/framework";
import { SessionContainerInterface } from "supertokens-node/lib/build/recipe/session/types";
import { mockAndCategorizeGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.batch";
import { mockGcal } from "@backend/__tests__/mocks.gcal/factories/gcal.factory";
import { mockEventEmitter } from "./event-emitter";

function mockGoogleapis() {
  mockModule("googleapis", () => {
    const googleapis = jest.requireActual<{ google: GoogleApis }>("googleapis");
    const { gcalEvents } = mockAndCategorizeGcalEvents();

    return {
      google: {
        ...googleapis.google,
        calendar: mockGcal({
          events: gcalEvents.all,
          googleapis: googleapis.google,
        }),
      },
    };
  });
}

function mockSocketIO() {
  jest.mock("socket.io", () => {
    const socketIO = jest.requireActual<typeof SocketIO>("socket.io");

    socketIO.Server = class Server extends socketIO.Server {
      to = jest.fn(function (
        this: Server,
        room: string | string[],
      ): ReturnType<SocketIO.Server["to"]> {
        const result = socketIO.Server.prototype.to.apply(this, [room]);

        result.emit = (ev, ...args) => this.emit(ev, ...args, room);

        return result;
      });

      emit = jest.fn((ev, ...args): boolean =>
        mockEventEmitter.emit(ev, ...args),
      );
    };

    return socketIO;
  });
}

function mockSuperToken() {
  mockModule("supertokens-node", () => {
    const superTokens =
      jest.requireActual<typeof SuperTokens>("supertokens-node");

    return { default: superTokens.default };
  });

  function verifySession() {
    return (
      req: Request & BaseRequest,
      _res: Response & BaseResponse,
      next?: (err?: unknown) => void,
    ) => {
      try {
        const cookies = (req.headers.cookie?.split(";") ?? [])?.reduce(
          (items, item) => {
            const [key, value] = item.split("=");

            if (typeof key === "string") items[key] = value;

            return items;
          },
          {} as Record<string, string | undefined>,
        );

        const sessionString = cookies["session"];

        const session: { userId: string } | undefined =
          typeof sessionString === "string"
            ? JSON.parse(sessionString)
            : undefined;

        if (typeof session?.userId === "string") {
          req.session = {
            getUserId() {
              return session.userId;
            },
          } as SessionContainerInterface;

          return next ? next() : undefined;
        }

        throw new Error("invalid superToken session");
      } catch (error) {
        if (next) {
          next(error);
        } else {
          throw error;
        }
      }
    };
  }

  mockModule("supertokens-node/recipe/session/framework/express", () => {
    const frameworkExpress = jest.requireActual<typeof SuperTokens>(
      "supertokens-node/recipe/session/framework/express",
    );
    return { ...frameworkExpress, verifySession };
  });
}

export function mockModule(
  mockPath: string,
  mockFactory?: (...args: unknown[]) => object,
  mockAsEsModule = true,
) {
  if (!mockFactory) {
    jest.mock(mockPath);
  } else {
    jest.mock(mockPath, (...args: unknown[]) => ({
      __esModule: mockAsEsModule,
      ...jest.requireActual(mockPath),
      ...mockFactory(...args),
    }));
  }
}

export function mockNodeModules() {
  mockGoogleapis();
  mockSocketIO();
  mockSuperToken();
}
