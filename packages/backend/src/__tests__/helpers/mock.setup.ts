import { type NextFunction, type Response } from "express";
import { type SessionRequest } from "supertokens-node/framework/express";
import {
  type SessionContainerInterface,
  type VerifySessionOptions,
} from "supertokens-node/lib/build/recipe/session/types";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";
import { type UserMetadata } from "@core/types/user.types";
import {
  LoggerFactory,
  registerLoggerFactory,
  resetLoggerFactory,
  type LoggerFactoryFn,
} from "@core/logger/logger.factory";
import { type SupertokensAccessTokenPayload } from "@backend/common/types/supertokens.types";
import { getCurrentTestFileUrl } from "@backend/__tests__/helpers/test-file-context";
import { getTestGcalFixture } from "@backend/__tests__/helpers/test-gcal-fixture";
import { enterTestGcalClient } from "@backend/common/services/gcal/gcal.test-context";
import { CONFIG } from "@backend/common/constants/config.constants";
import {
  createInMemoryUserIdMappingStore,
  createInMemoryUserMetadataStore,
  type UserIdMappingStore,
  type UserMetadataStore,
} from "@backend/auth/ports/supertokens.stores";
import {
  registerUserIdMappingStore,
  registerUserMetadataStore,
  resetSupertokensStores,
} from "@backend/auth/ports/supertokens.registry";
import {
  registerTestVerifySession,
  resetVerifySession,
} from "@backend/auth/session/session.middleware";
import { beforeEach, mock } from "bun:test";
import { randomUUID } from "node:crypto";

const fixturesByFile = new Map<
  string,
  { metadata: UserMetadataStore; mappings: UserIdMappingStore }
>();

function getFileSupertokensStores(): {
  metadata: UserMetadataStore;
  mappings: UserIdMappingStore;
} {
  const key = getCurrentTestFileUrl();
  let stores = fixturesByFile.get(key);
  if (!stores) {
    stores = {
      metadata: createInMemoryUserMetadataStore(),
      mappings: createInMemoryUserIdMappingStore(),
    };
    fixturesByFile.set(key, stores);
  }
  return stores;
}

/** Stands in for SessionContainer.revokeSession in tests. */
export const revokeSessionMock = mock(async () => {});

function createTestVerifySession(): ReturnType<
  typeof import("supertokens-node/recipe/session/framework/express").verifySession
> {
  return (_options?: VerifySessionOptions) => {
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
  };
}

function registerTestLoggerFactory(): void {
  const loggers = new Map<string, Record<string, ReturnType<typeof mock>>>();

  const factory: LoggerFactoryFn = (name?: string) => {
    const key = name ?? "";
    const existing = loggers.get(key);
    if (existing) return existing as ReturnType<LoggerFactoryFn>;

    const logger = {
      debug: mock(),
      info: mock(),
      warn: mock(),
      error: mock(),
      verbose: mock(),
    };
    loggers.set(key, logger);
    return logger as ReturnType<LoggerFactoryFn>;
  };

  registerLoggerFactory(factory);
}

export function mockEnv(env: Partial<typeof CONFIG>) {
  const entries = Object.entries(env) as Array<
    [keyof typeof env, (typeof env)[keyof typeof env]]
  >;

  const replacements: Array<{ restore: () => void }> = [];

  for (const [key, value] of entries) {
    const descriptor = Object.getOwnPropertyDescriptor(CONFIG, key);
    Object.defineProperty(CONFIG, key, {
      configurable: true,
      enumerable: true,
      value,
    });
    replacements.push({
      restore: () => {
        if (descriptor) {
          Object.defineProperty(CONFIG, key, descriptor);
        } else {
          delete (CONFIG as Record<string, unknown>)[key as string];
        }
      },
    });
  }

  return {
    [Symbol.dispose]: () => {
      for (const r of replacements) r.restore();
    },
  };
}

export function setupBackendTestSeams(): void {
  const fixture = getTestGcalFixture();
  const { metadata, mappings } = getFileSupertokensStores();

  fixture.reset();
  metadata.reset();
  mappings.reset();
  revokeSessionMock.mockClear();

  enterTestGcalClient(fixture.createGcalClient());
  registerUserMetadataStore(metadata);
  registerUserIdMappingStore(mappings);
  registerTestVerifySession(createTestVerifySession());
}

export function mockNodeModules() {
  registerTestLoggerFactory();

  beforeEach(() => {
    try {
      getCurrentTestFileUrl();
    } catch {
      return;
    }
    setupBackendTestSeams();
  });
}

export function teardownBackendTestSeams(): void {
  resetLoggerFactory();
  resetSupertokensStores();
  resetVerifySession();
}

// Re-export for tests that mutate gcal fixture data directly.
export { getTestGcalFixture, getTestGcalFixture as compassTestState } from "@backend/__tests__/helpers/test-gcal-fixture";
