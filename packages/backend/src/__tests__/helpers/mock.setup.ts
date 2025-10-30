import axios, { AxiosHeaders, AxiosRequestConfig, AxiosResponse } from "axios";
import { Handler, NextFunction, Response } from "express";
import mergeWith, { default as mockMergeWith } from "lodash.mergewith";
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
import { faker } from "@faker-js/faker";
import {
  CalendarProvider as MockCalendarProvider,
  Schema_Calendar,
} from "@core/types/calendar.types";
import {
  gSchema$CalendarListEntry,
  gSchema$Channel,
  gSchema$Event,
} from "@core/types/gcal";
import { UserMetadata } from "@core/types/user.types";
import { MockOAuth2Client } from "@backend/__tests__/helpers/mock.google-oauth2";
import { mockGcal } from "@backend/__tests__/mocks.gcal/factories/gcal.factory";
import { ENV } from "@backend/common/constants/env.constants";
import { SupertokensAccessTokenPayload } from "@backend/common/types/supertokens.types";
import EmailService from "@backend/email/email.service";
import {
  Response_TagSubscriber,
  Response_UpsertSubscriber,
} from "@backend/email/email.types";

export interface CompassGCalCalendarTestState {
  events: gSchema$Event[];
  calendar: gSchema$CalendarListEntry;
}

export interface CompassGCalUserTestState {
  calendars: Map<
    Schema_Calendar["metadata"]["id"],
    CompassGCalCalendarTestState
  >;
  channels: gSchema$Channel[];
}

export type CompassTestState = Map<
  MockCalendarProvider,
  Map<
    string, // google user sub = user.googleId
    CompassGCalUserTestState
  >
>;

function mockCompassTestState() {
  jest.mock(
    "compass-test-state",
    (): CompassTestState => new Map([[MockCalendarProvider.GOOGLE, new Map()]]),
    { virtual: true },
  );
}

export function compassTestState(): CompassTestState {
  return jest.requireMock<CompassTestState>("compass-test-state");
}

function mockGoogleapis() {
  mockModule("googleapis", (googleapis: typeof import("googleapis")) => ({
    google: {
      ...googleapis.google,
      auth: { ...googleapis.google.auth, OAuth2: MockOAuth2Client },
      calendar: mockGcal(googleapis.google),
    },
  }));

  beforeAll(() => import("googleapis")); // force mock to take effect always
}

function mockAxios() {
  const upsertSubscriberURL = `${EmailService.baseUrl}/subscribers`;
  const tagSubscriberURL = `${EmailService.baseUrl}/tags`;
  const mockURLs: string[] = [upsertSubscriberURL, tagSubscriberURL];

  const post = axios.post;

  function mockTagSubscriberResponse(
    config: AxiosRequestConfig<unknown>,
  ): AxiosResponse<Response_TagSubscriber> {
    return {
      data: {
        subscriber: {
          id: faker.number.int({ min: 1 }),
          email_address: faker.internet.email(),
          first_name: faker.person.firstName(),
          created_at: new Date().toISOString(),
          tagged_at: new Date().toISOString(),
          state: "active",
          fields: { url: config.url, data: config.data },
        },
      },
      status: axios.HttpStatusCode.Ok,
      statusText: "OK",
      headers: config.headers as AxiosHeaders,
      config: { ...config, headers: config.headers as AxiosHeaders },
    };
  }

  function mockUpsertSubscriberResponse(
    config: AxiosRequestConfig<unknown>,
  ): AxiosResponse<Response_UpsertSubscriber> {
    return {
      data: {
        subscriber: mergeWith(
          {
            id: faker.number.int({ min: 1 }),
            email_address: faker.internet.email(),
            first_name: faker.person.firstName(),
            created_at: new Date().toISOString(),
            state: "active",
            fields: { url: config.url, data: config.data },
          },
          config.data,
        ),
      },
      status: axios.HttpStatusCode.Ok,
      statusText: "OK",
      headers: config.headers as AxiosHeaders,
      config: { ...config, headers: config.headers as AxiosHeaders },
    };
  }

  jest.spyOn(axios, "post").mockImplementation(async (url, data, config) => {
    const mockURL = mockURLs.some((value) => url.includes(value));

    if (!mockURL) return post(url, data, config);

    const mockTagSubscriber = url?.includes(tagSubscriberURL);
    const mockUpsertSubscriber = url?.includes(upsertSubscriberURL);

    if (mockTagSubscriber) {
      return mockTagSubscriberResponse({ ...config, url, data });
    } else if (mockUpsertSubscriber) {
      return mockUpsertSubscriberResponse({ ...config, url, data });
    }

    return Promise.resolve({
      data: {},
      status: axios.HttpStatusCode.Ok,
      statusText: "OK",
      headers: config?.headers,
      config,
    });
  });
}

function mockSuperToken() {
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

          return next?.();
        }

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

  beforeAll(() => import("supertokens-node/recipe/session/framework/express"));
  beforeAll(() => import("supertokens-node/recipe/usermetadata"));
  beforeAll(() => import("supertokens-node/lib/build/recipe/session/recipe"));
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

  beforeAll(() => import("@core/logger/winston.logger")); // force mock to take effect always
}

function mockHttpLoggingMiddleware() {
  mockModule("@backend/common/middleware/http.logger.middleware", () => ({
    httpLoggingMiddleware: jest.fn<void, Parameters<Handler>>((...args) =>
      args[2](),
    ),
  }));

  beforeAll(() => import("@backend/common/middleware/http.logger.middleware")); // force mock to take effect always
}

function mockConstants() {
  mockModule("@backend/common/constants/backend.constants", () => ({
    MONGO_BATCH_SIZE: 5,
    GCAL_LIST_PAGE_SIZE: 3,
  }));

  beforeAll(() => import("@backend/common/constants/backend.constants")); // force mock to take effect always
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
  mockConstants();
  mockWinstonLogger();
  mockHttpLoggingMiddleware();
  mockAxios();
  mockGoogleapis();
  mockSuperToken();

  beforeEach(() => jest.clearAllMocks());
  beforeEach(mockCompassTestState);
  afterEach(() => jest.unmock("compass-test-state"));
  afterAll(() => jest.restoreAllMocks());
}
