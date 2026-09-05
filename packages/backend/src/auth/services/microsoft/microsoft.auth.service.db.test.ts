import { faker } from "@faker-js/faker";
import { MICROSOFT_SCOPES } from "@core/providers/microsoft.scopes";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { authErrorCopy } from "@backend/common/errors/auth/auth.errors";
import mongoService from "@backend/common/services/mongo.service";
import * as syncServiceFactory from "@backend/common/services/sync-service/sync-service.factory";
import { type MicrosoftSignInSuccess } from "./microsoft.auth.types";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  spyOn,
} from "bun:test";

let microsoftAuthService: Awaited<
  typeof import("./microsoft.auth.service")
>["microsoftAuthService"];

describe("microsoftAuthService", () => {
  let adoptCalls: unknown[];

  beforeAll(async () => {
    spyOn(syncServiceFactory, "getSyncServiceClient").mockImplementation(
      () =>
        ({
          adoptProviderAuthorization: async (...args: unknown[]) => {
            adoptCalls.push(args);
            return {
              ok: true,
              value: {},
              correlationId: "corr-1",
            };
          },
          listConnections: async () => ({
            ok: true,
            value: { connections: [] },
            correlationId: "corr-1",
          }),
        }) as ReturnType<typeof syncServiceFactory.getSyncServiceClient>,
    );
    ({ microsoftAuthService } = await import("./microsoft.auth.service"));
  });
  beforeEach(() => setupTestDb(import.meta.url));
  beforeEach(cleanupCollections);
  beforeEach(() => {
    adoptCalls = [];
  });
  afterAll(cleanupTestDb);

  const makeSuccess = (
    overrides?: Partial<MicrosoftSignInSuccess>,
  ): MicrosoftSignInSuccess => ({
    providerUser: {
      oid: faker.string.uuid(),
      email: faker.internet.email().toLowerCase(),
      name: faker.person.fullName(),
    },
    oAuthTokens: {
      refresh_token: faker.string.uuid(),
      access_token: faker.internet.jwt(),
      scope: MICROSOFT_SCOPES.join(" "),
    },
    createdNewRecipeUser: true,
    recipeUserId: faker.database.mongodbObjectId(),
    loginMethodsLength: 1,
    ...overrides,
  });

  it("creates a microsoft identity and adopts the calendar grant on signup", async () => {
    const success = makeSuccess();

    await microsoftAuthService.handleMicrosoftAuth(success);

    const stored = await mongoService.user.findOne({
      email: success.providerUser.email,
    });
    expect(stored?.identities).toEqual([
      expect.objectContaining({
        provider: "microsoft",
        subjectId: success.providerUser.oid,
        email: success.providerUser.email,
      }),
    ]);
    expect(stored?.google).toBeUndefined();
    expect(adoptCalls).toHaveLength(1);
    const [, request] = adoptCalls[0] as [
      unknown,
      { provider: string; refreshToken: string },
    ];
    expect(request.provider).toBe("microsoft");
    expect(request.refreshToken).toBe(success.oAuthTokens.refresh_token);
  });

  it("treats a second sign-in of the same microsoft subject as SIGNIN", async () => {
    const success = makeSuccess();
    await microsoftAuthService.handleMicrosoftAuth(success);

    await microsoftAuthService.handleMicrosoftAuth({
      ...success,
      createdNewRecipeUser: false,
      recipeUserId: faker.database.mongodbObjectId(),
    });

    const storedUsers = await mongoService.user
      .find({ email: success.providerUser.email })
      .toArray();
    expect(storedUsers).toHaveLength(1);
    expect(storedUsers[0]?.identities).toEqual([
      expect.objectContaining({
        provider: "microsoft",
        subjectId: success.providerUser.oid,
      }),
    ]);
  });

  it("fails closed when the email already belongs to a Google user", async () => {
    const existing = await UserDriver.createUser();
    const success = makeSuccess({
      providerUser: {
        oid: faker.string.uuid(),
        email: existing.email,
        name: "Microsoft Person",
      },
    });

    await expect(
      microsoftAuthService.handleMicrosoftAuth(success),
    ).rejects.toMatchObject({
      result: authErrorCopy.signInWhileAuthenticated("microsoft"),
      code: "GOOGLE_SIGNIN_WHILE_AUTHENTICATED",
    });

    const stored = await mongoService.user.findOne({ _id: existing._id });
    expect(stored?.identities?.some((i) => i.provider === "microsoft")).toBe(
      false,
    );
    expect(adoptCalls).toHaveLength(0);
  });
});
