import { faker } from "@faker-js/faker";
import { Resource_Sync } from "@core/types/sync.types";
import { Schema_User } from "@core/types/user.types";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";
import { SyncControllerDriver } from "@backend/__tests__/drivers/sync.controller.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import mongoService from "@backend/common/services/mongo.service";
import syncService from "@backend/sync/services/sync.service";
import { updateSync } from "@backend/sync/util/sync.queries";
import userService from "@backend/user/services/user.service";

describe("AuthController", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  async function validateUserLogin(): Promise<Schema_User> {
    const newUser = await AuthDriver.googleSignup();
    const user = await AuthDriver.googleLogin(newUser._id);

    return user;
  }

  describe("signup", () => {
    it(
      "should return user id and email on successful signup",
      AuthDriver.googleSignup,
    );

    it("should initialize user's data", async () => {
      // this method has been tested in user.service.test.ts
      const initUserDataSpy = jest.spyOn(userService, "initUserData");
      const user = await AuthDriver.googleSignup();

      expect(initUserDataSpy).toHaveBeenCalledWith(
        expect.objectContaining({ sub: user.google.googleId }),
        user.google.gRefreshToken,
      );
    });
  });

  describe("login", () => {
    it(
      "should return user id and email on successful login",
      validateUserLogin,
    );

    it("should update user's last login time on successful login", async () => {
      const newUser = await AuthDriver.googleSignup();
      const user = await mongoService.user.findOne({ _id: newUser._id });

      expect(user).not.toBeNull();
      expect(user).toBeDefined();
      expect(user?.lastLoggedInAt).toBeUndefined();

      const authenticatedUser = await validateUserLogin();

      expect(authenticatedUser.lastLoggedInAt).toBeInstanceOf(Date);
    });

    it("should perform incremental sync on login", async () => {
      const importIncrementalSpy = jest.spyOn(syncService, "importIncremental");

      const newUser = await AuthDriver.googleSignup();
      const calendar = await CalendarDriver.getRandomUserCalendar(newUser._id);

      await updateSync(
        Resource_Sync.EVENTS,
        calendar.user.toString(),
        calendar.metadata.id,
        {
          nextSyncToken: undefined,
        },
      );

      const user = await AuthDriver.googleLogin(newUser._id);

      expect(user._id.equals(newUser._id)).toBe(true);
      expect(user.email).toEqual(newUser.email);

      expect(importIncrementalSpy).toHaveBeenCalledWith(
        newUser._id,
        expect.any(Object),
      );
      expect(importIncrementalSpy).toHaveBeenCalledTimes(1);
    });

    it("should resync google data when the event sync token is absent", async () => {
      const baseDriver = new BaseDriver();
      const syncDriver = new SyncControllerDriver(baseDriver);
      const importIncrementalSpy = jest.spyOn(syncService, "importIncremental");
      const resyncSpy = jest.spyOn(userService, "restartGoogleCalendarSync");

      const user = await AuthDriver.googleSignup();
      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

      await updateSync(
        Resource_Sync.EVENTS,
        calendar.user.toString(),
        calendar.metadata.id,
        {
          nextSyncToken: undefined,
        },
      );

      baseDriver.initWebsocketServer();

      await baseDriver.listen();

      const websocketClient = baseDriver.createWebsocketClient(
        { userId: user._id.toString(), sessionId: faker.string.uuid() },
        { autoConnect: false },
      );

      websocketClient.connect();

      await expect(
        syncDriver.waitUntilImportGCalEnd(
          websocketClient,
          () =>
            AuthDriver.googleLogin(user._id).then(({ _id, email }) => {
              expect(user._id.equals(_id)).toBe(true);
              expect(user.email).toEqual(email);
            }),
          async (reason) => {
            websocketClient.disconnect();
            await baseDriver.teardown();
            return Promise.resolve(reason);
          },
        ),
      ).resolves.toBeNull();

      expect(importIncrementalSpy.mock.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining(new Error(SyncError.NoSyncToken.description)),
        ]),
      );

      expect(resyncSpy).toHaveBeenCalledWith(user._id);
      expect(resyncSpy).toHaveBeenCalledTimes(1);
    });
  });
});
