import { Handler, NextFunction, Response } from "express";
import mergeWith from "lodash.mergewith";
import { randomUUID } from "node:crypto";
import { SessionRequest } from "supertokens-node/framework/express";
import {
  ExpressRequest,
  ExpressResponse,
} from "supertokens-node/lib/build/framework/express/framework";
import {
  APIOptions,
  SessionContainerInterface,
  VerifySessionOptions,
} from "supertokens-node/lib/build/recipe/session/types";
import { UserContext } from "supertokens-node/lib/build/types";
import { createMockCalendarListEntry as mockCalendarListCreate } from "@core/__tests__/helpers/gcal.factory";
import { mockModule } from "@core/__tests__/mock.setup";
import { gSchema$CalendarListEntry } from "@core/types/gcal";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";
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
  mockModule(
    "@googleapis/calendar",
    (calendarModule: typeof import("@googleapis/calendar")) => {
      return {
        ...calendarModule,
        calendar: mockGcal({}),
      };
    },
  );
}

function mockSuperTokens() {
  const userMetadata = new Map<string, UserMetadata>();

  function verifySession(input: {
    verifySessionOptions?: VerifySessionOptions;
    options: APIOptions;
    userContext: UserContext;
  }) {
    return (req: SessionRequest, _res: Response, next?: NextFunction) => {
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

        const userId = zObjectId.parse(session?.userId, {
          error: () => "invalid superToken session",
        });

        const sessionId = StringV4Schema.parse(
          session?.sessionId ?? sessionHandle,
          { error: () => "invalid superToken session" },
        );

        req.session = {
          getUserId() {
            return userId.toString();
          },
          getHandle() {
            return sessionId;
          },
          getAccessTokenPayload(): SupertokensAccessTokenPayload {
            return {
              iat: now.getMilliseconds(),
              exp: now.getMilliseconds() + 5000,
              iss: req.headers.origin ?? "http://localhost",
              sub: userId.toString(),
              rsub: userId.toString(),
              tId,
              sessionHandle: sessionId,
              refreshTokenHash1: null,
              parentRefreshTokenHash1: null,
              antiCsrfToken: null,
            };
          },
        } as SessionContainerInterface;

        return next?.();

        if (input?.verifySessionOptions?.sessionRequired) {
          throw new Error("invalid superToken session");
        }
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

  const mappings = new Map<string, string>();

  async function getUserIdMapping(input: {
    userId: string;
    userIdType?: "SUPERTOKENS" | "EXTERNAL" | "ANY";
    userContext?: Record<string, unknown>;
  }): Promise<
    | {
        status: "OK";
        superTokensUserId: string;
        externalUserId: string;
      }
    | { status: "UNKNOWN_MAPPING_ERROR" }
  > {
    const superTokensUserId = mappings.get(input.userId);

    if (!superTokensUserId) {
      return { status: "UNKNOWN_MAPPING_ERROR" };
    }

    return { status: "OK", superTokensUserId, externalUserId: input.userId };
  }

  async function createUserIdMapping(input: {
    superTokensUserId: string;
    externalUserId: string;
    externalUserIdInfo?: string;
    userContext?: Record<string, unknown>;
    force?: boolean;
  }): Promise<
    | { status: "OK" | "UNKNOWN_SUPERTOKENS_USER_ID_ERROR" }
    | {
        status: "USER_ID_MAPPING_ALREADY_EXISTS_ERROR";
        doesSuperTokensUserIdExist: boolean;
        doesExternalUserIdExist: boolean;
      }
  > {
    const superTokensUserId = mappings.get(input.externalUserId);
    const exists = superTokensUserId === input.superTokensUserId;

    if (superTokensUserId && !input.force) {
      return {
        status: "USER_ID_MAPPING_ALREADY_EXISTS_ERROR",
        doesSuperTokensUserIdExist: exists,
        doesExternalUserIdExist: true,
      };
    }

    mappings.set(input.externalUserId, input.superTokensUserId);

    return { status: "OK" };
  }

  mockModule(
    "supertokens-node",
    (superTokens: typeof import("supertokens-node")) => {
      const superTokensModule = mergeWith(superTokens, {
        getUserIdMapping: jest.fn(getUserIdMapping),
        createUserIdMapping: jest.fn(createUserIdMapping),
      });

      return mergeWith(superTokensModule, { default: superTokensModule });
    },
  );

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

  mockModule(
    "supertokens-node/lib/build/recipe/session/recipe",
    (
      session: typeof import("supertokens-node/lib/build/recipe/session/recipe"),
    ) => {
      const getInstanceOrThrowError =
        session.default.getInstanceOrThrowError.bind(session.default);

      const sessionModule = mergeWith(session, {
        default: mergeWith(session.default, {
          getInstanceOrThrowError: jest.fn(() => {
            const instance = getInstanceOrThrowError();

            return mergeWith(instance, {
              apiImpl: mergeWith(instance.apiImpl, {
                verifySession: jest.fn(
                  async (input: {
                    verifySessionOptions: VerifySessionOptions | undefined;
                    options: APIOptions;
                    userContext: UserContext;
                  }) => {
                    const req = input.options.req as ExpressRequest;
                    const res = input.options.res as ExpressResponse;

                    verifySession(input)(req.original, res.original);

                    return Promise.resolve(req.original.session);
                  },
                ),
              }),
            });
          }),
        }),
      });

      return sessionModule;
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

export function mockNodeModules() {
  beforeEach(mockCompassTestState);
  afterEach(() => jest.unmock("compass-test-state"));
  mockConstants();
  mockWinstonLogger();
  mockHttpLoggingMiddleware();
  mockGoogleapis();
  mockSuperTokens();
}
