import { type NextFunction, type Response } from "express";
import mergeWith from "lodash.mergewith";
import { type SessionRequest } from "supertokens-node/framework/express";
import {
  type ExpressRequest,
  type ExpressResponse,
} from "supertokens-node/lib/build/framework/express/framework";
import {
  type APIOptions,
  type SessionContainerInterface,
  type VerifySessionOptions,
} from "supertokens-node/lib/build/recipe/session/types";
import { type UserContext } from "supertokens-node/lib/build/types";
import { createMockCalendarListEntry as mockCalendarListCreate } from "@core/__tests__/helpers/gcal.factory";
import { mockModule } from "@core/__tests__/mock.setup";
import { type gSchema$CalendarListEntry } from "@core/types/gcal";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";
import { type UserMetadata } from "@core/types/user.types";
import { mockAndCategorizeGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.batch";
import { mockGcal } from "@backend/__tests__/mocks.gcal/factories/gcal.factory";
import { CONFIG } from "@backend/common/constants/config.constants";
import { type SupertokensAccessTokenPayload } from "@backend/common/types/supertokens.types";
import { beforeEach } from "bun:test";
import { randomUUID } from "node:crypto";

export interface CompassTestState {
  events: ReturnType<typeof mockAndCategorizeGcalEvents>;
  calendarlist: gSchema$CalendarListEntry[];
}

// The per-test gcal fixture state. Tests read it (via the gcal mock) and
// freely mutate it (e.g. `compassTestState().calendarlist = [...]`). It is a
// plain mutable singleton rather than a virtual jest module: Bun exposes mocked
// modules as read-only namespaces, so assigning to a property of a virtual mock
// throws "assign to readonly property".
let currentTestState: CompassTestState = freshTestState();

function freshTestState(): CompassTestState {
  return {
    events: { ...mockAndCategorizeGcalEvents() },
    calendarlist: [mockCalendarListCreate()],
  };
}

function mockCompassTestState() {
  currentTestState = freshTestState();
}

export function compassTestState(): CompassTestState {
  return currentTestState;
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

/**
 * Stands in for SessionContainer.revokeSession, which clears the response's
 * cookies. Exported so a test can assert a handler signed its caller out.
 */
export const revokeSessionMock = jest.fn(async () => {});

function mockSuperTokens() {
  const userMetadata = new Map<string, UserMetadata>();

  function verifySession(_input: {
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
          // The real SessionContainer clears the response's cookies here;
          // without a stand-in, a handler that signs its caller out would
          // throw in tests but work in production.
          revokeSession: revokeSessionMock,
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
    const metadata = { ...existingMetadata, ...data };
    userMetadata.set(userId, metadata);

    return Promise.resolve({
      status: "OK",
      metadata,
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
  // One stable logger instance per name. A subject module captures its logger
  // once at import time (`const logger = Logger("app:x")`); returning the same
  // instance for that name lets an observability test grab the very logger the
  // subject uses via `Logger("app:x")` and assert on it -- without the test
  // registering its own winston mock, which cannot take effect before the
  // statically-imported subject already loaded.
  const loggers = new Map<string, Record<string, jest.Mock>>();

  mockModule("@core/logger/winston.logger", () => ({
    Logger: jest.fn((name?: string) => {
      const key = name ?? "";
      const existing = loggers.get(key);
      if (existing) return existing;

      const logger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        verbose: jest.fn(),
      };
      loggers.set(key, logger);
      return logger;
    }),
  }));
}

function mockConstants() {
  // Small enough that modest fixtures still exercise multi-batch code paths,
  // but not so small that a scale test (e.g. the ~20k-event backfill memory
  // check) pays thousands of tiny round-trips. The real value is 1000.
  mockModule("@backend/common/constants/backend.constants.ts", () => ({
    MONGO_BATCH_SIZE: 250,
  }));
}

export function mockEnv(env: Partial<typeof CONFIG>) {
  const entries = Object.entries(env) as Array<
    [keyof typeof env, (typeof env)[keyof typeof env]]
  >;

  const newEnv = {} as Record<
    keyof typeof env,
    jest.ReplaceProperty<keyof typeof env>
  >;

  for (const [key, value] of entries) {
    newEnv[key] = jest.replaceProperty(CONFIG, key, value);
  }

  return newEnv;
}

export function mockNodeModules() {
  // Applied once at preload time so mocks are in place before test files load.
  // Mongo-backed packages run each file in its own process (see test-with-mongo.ts)
  // so preload mocks are not cleared by Bun's --isolate.
  beforeEach(mockCompassTestState);
  mockConstants();
  mockWinstonLogger();
  mockGoogleapis();
  mockSuperTokens();
}
