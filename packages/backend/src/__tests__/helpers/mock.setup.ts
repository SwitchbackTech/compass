import { Request, Response } from "express";
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
  mockSuperToken();
}
