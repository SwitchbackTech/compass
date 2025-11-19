import { ObjectId } from "mongodb";
import { Status } from "@core/errors/status.codes";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import { UserControllerDriver } from "@backend/__tests__/drivers/user.controller.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { UserError } from "@backend/common/errors/user/user.errors";

describe("UserController", () => {
  const baseDriver = new BaseDriver();
  const userDriver = new UserControllerDriver(baseDriver);

  beforeAll(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  describe("getProfile", () => {
    it("should get a user's profile", async () => {
      const { user } = await UtilDriver.setupTestUser();
      const response = await userDriver.getProfile(
        { userId: user._id.toString() },
        Status.OK,
      );

      expect(response.body).toEqual(
        expect.objectContaining({
          firstName: user.firstName,
          lastName: user.lastName,
          name: user.name,
          email: user.email,
          locale: user.locale,
          picture: user.google?.picture,
        }),
      );
    });

    it("should throw a not-found error when no matching user record is found", async () => {
      const response = await userDriver.getProfile(
        { userId: new ObjectId().toString() },
        Status.NOT_FOUND,
      );

      expect(response.error).toEqual(UserError.UserNotFound);
    });
  });
});
