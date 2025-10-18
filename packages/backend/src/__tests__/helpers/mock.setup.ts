import { Handler, Response } from "express";
import { GoogleApis } from "googleapis";
import mergeWith, { default as mockMergeWith } from "lodash.mergewith";
import { randomUUID } from "node:crypto";
import { SessionRequest } from "supertokens-node/framework/express";
import { BaseResponse } from "supertokens-node/lib/build/framework";
import { SessionContainerInterface } from "supertokens-node/lib/build/recipe/session/types";
import { createMockCalendarListEntry as mockCalendarListCreate } from "@core/__tests__/helpers/gcal.factory";
import { gSchema$CalendarListEntry } from "@core/types/gcal";
import { UserMetadata } from "@core/types/user.types";
import { mockAndCategorizeGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.batch";
import { mockGcal } from "@backend/__tests__/mocks.gcal/factories/gcal.factory";
import { ENV } from "@backend/common/constants/env.constants";
import { SupertokensAccessTokenPayload } from "@backend/common/types/supertokens.types";

export interface CompassTestState {
  events: ReturnType<typeof mockAndCategorizeGcalEvents>;
  calendarlist: gSchema$CalendarListEntry[];
}

function mockCompassTestState() {
  jest.mock(
    "compass-test-state",
    (): CompassTestState => ({
      events: { ...mockAndCategorizeGcalEvents() },
      calendarlist: [mockCalendarListCreate()],
    }),
    { virtual: true },
  );
}

export function compassTestState(): CompassTestState {
  return jest.requireMock<CompassTestState>("compass-test-state");
}

function mockGoogleapis() {
  mockModule("googleapis", (googleapis: { google: GoogleApis }) => {
    return {
      google: {
        ...googleapis.google,
        calendar: mockGcal({
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
      req: SessionRequest,
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

  mockModule(
    "supertokens-node/recipe/session/framework/express",
    (
      frameworkExpress: typeof import("supertokens-node/recipe/session/framework/express"),
    ) => {
      const frameworkExpressModule = mergeWith(frameworkExpress, {
        verifySession: jest.fn(verifySession),
      });

      return mergeWith(frameworkExpressModule, {
        default: frameworkExpressModule,
      });
    },
  );

  mockModule(
    "supertokens-node/recipe/usermetadata",
    (
      recipeUserMetadata: typeof import("supertokens-node/recipe/usermetadata"),
    ) => {
      const userMetadataModule = mergeWith(recipeUserMetadata, {
        updateUserMetadata: jest.fn(updateUserMetadata),
        getUserMetadata: jest.fn(getUserMetadata),
      });

      return mergeWith(userMetadataModule, { default: userMetadataModule });
    },
  );
}

function mockWinstonLogger() {
  mockModule("@core/logger/winston.logger", () => ({
    Logger: jest.fn().mockImplementation(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      verbose: jest.fn(),
    })),
  }));
}

function mockHttpLoggingMiddleware() {
  mockModule("@backend/common/middleware/http.logger.middleware", () => ({
    httpLoggingMiddleware: jest.fn<void, Parameters<Handler>>((...args) =>
      args[2](),
    ),
  }));
}

function mockConstants() {
  mockModule("@backend/common/constants/backend.constants.ts", () => ({
    MONGO_BATCH_SIZE: 5,
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

export function mockModule<T>(
  mockPath: string,
  mockFactory: (mockedModule: T) => object = () => ({}),
  mockAsEsModule = true,
) {
  const mockedModule = jest.requireActual(mockPath);

  jest.mock(mockPath, () =>
    mockMergeWith(
      { __esModule: mockAsEsModule },
      mockedModule,
      mockFactory(mockedModule),
    ),
  );
}

export function mockNodeModules() {
  beforeEach(mockCompassTestState);
  afterEach(() => jest.unmock("compass-test-state"));
  mockConstants();
  mockWinstonLogger();
  mockHttpLoggingMiddleware();
  mockGoogleapis();
  mockSuperToken();
}
