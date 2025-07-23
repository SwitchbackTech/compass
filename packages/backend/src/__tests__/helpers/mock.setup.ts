import { Handler, Request, Response } from "express";
import { GoogleApis } from "googleapis";
import { randomUUID } from "node:crypto";
import type SuperTokens from "supertokens-node";
import {
  BaseRequest,
  BaseResponse,
} from "supertokens-node/lib/build/framework";
import { SessionContainerInterface } from "supertokens-node/lib/build/recipe/session/types";
import { UserMetadata } from "@core/types/user.types";
import { mockAndCategorizeGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.batch";
import { mockGcal } from "@backend/__tests__/mocks.gcal/factories/gcal.factory";
import { ENV } from "@backend/common/constants/env.constants";
import { SupertokensAccessTokenPayload } from "@backend/common/types/supertokens.types";

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

function mockSuperToken() {
  const userMetadata = new Map<string, UserMetadata>();

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
        const now = new Date();
        const tId = randomUUID();
        const sessionHandle = randomUUID();

        const session: { userId: string; sessionId?: string } | undefined =
          typeof sessionString === "string"
            ? JSON.parse(sessionString)
            : undefined;

        if (typeof session?.userId === "string") {
          req.session = {
            getUserId() {
              return session.userId;
            },
            getAccessTokenPayload(): SupertokensAccessTokenPayload {
              return {
                iat: now.getMilliseconds(),
                exp: now.getMilliseconds() + 5000,
                iss: req.headers.origin ?? "http://localhost",
                sub: session.userId,
                rsub: session.userId,
                tId,
                sessionHandle: session.sessionId ?? sessionHandle,
                refreshTokenHash1: null,
                parentRefreshTokenHash1: null,
                antiCsrfToken: null,
              };
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

  async function getUserMetadata(
    userId: string,
  ): Promise<{ status: "OK"; metadata: UserMetadata }> {
    return Promise.resolve({
      status: "OK",
      metadata: userMetadata.get(userId) ?? {},
    });
  }

  async function updateUserMetadata(
    userId: string,
    data: Partial<UserMetadata>,
  ): Promise<{ status: "OK"; metadata: UserMetadata }> {
    const existingMetadata = userMetadata.get(userId) ?? {};

    return Promise.resolve({
      status: "OK",
      metadata: userMetadata
        .set(userId, { ...existingMetadata, ...data })
        .get(userId)!,
    });
  }

  mockModule("supertokens-node/recipe/session/framework/express", () => {
    const frameworkExpress = jest.requireActual<typeof SuperTokens>(
      "supertokens-node/recipe/session/framework/express",
    );
    return { ...frameworkExpress, verifySession: jest.fn(verifySession) };
  });

  mockModule("supertokens-node/recipe/usermetadata", () => {
    const recipeUserMetadata = jest.requireActual<typeof SuperTokens>(
      "supertokens-node/recipe/usermetadata",
    );

    const userMetadataModule = {
      ...recipeUserMetadata,
      updateUserMetadata: jest.fn(updateUserMetadata),
      getUserMetadata: jest.fn(getUserMetadata),
    };

    return { ...userMetadataModule, default: userMetadataModule };
  });
}

function mockWinstonLogger() {
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
}

function mockHttpLoggingMiddleware() {
  mockModule("@backend/common/middleware/http.logger.middleware", () => ({
    httpLoggingMiddleware: jest.fn<void, Parameters<Handler>>((...args) =>
      args[2](),
    ),
  }));
}

export function mockEnv(env: Partial<typeof ENV>) {
  const entries = Object.entries(env) as Array<
    [keyof typeof env, (typeof env)[keyof typeof env]]
  >;

  return entries.reduce(
    (newEnv, [key, value]) => ({
      ...newEnv,
      [key]: jest.replaceProperty(ENV, key, value),
    }),
    {} as Record<keyof typeof env, jest.ReplaceProperty<keyof typeof env>>,
  );
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
  mockWinstonLogger();
  mockHttpLoggingMiddleware();
  mockGoogleapis();
  mockSuperToken();
}
