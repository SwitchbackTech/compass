import { faker } from "@faker-js/faker";
import { Status } from "@core/errors/status.codes";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import { WaitlistControllerDriver } from "@backend/__tests__/drivers/waitlist.controller.driver";
import { WaitListDriver } from "@backend/__tests__/drivers/waitlist.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "../../common/services/mongo.service";
import WaitlistService from "../service/waitlist.service";

describe("WaitlistController", () => {
  const baseDriver = new BaseDriver();
  const waitlistDriver = new WaitlistControllerDriver(baseDriver);

  beforeAll(async () => {
    await setupTestDb();

    baseDriver.initWebsocketServer();

    await baseDriver.listen();
  });

  beforeEach(cleanupCollections);

  afterAll(async () => {
    await baseDriver.teardown();
    await cleanupTestDb();
  });

  describe("Routes", () => {
    describe("GET /api/waitlist", () => {
      it("should return 400 if email is invalid", async () => {
        // Act
        const res = await waitlistDriver.status("", Status.BAD_REQUEST);

        // Assert
        expect(res.body).toEqual({
          isOnWaitlist: false,
          isInvited: false,
          isActive: false,
        });
      });

      it("should return true if email was invited to the waitlist", async () => {
        // Arrange
        const email = faker.internet.email();
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();

        const {
          body: { status },
        } = await waitlistDriver.addToWaitlist(
          WaitListDriver.createWaitListRecord({
            email,
            firstName,
            lastName,
          }),
        );

        expect(status).toBe("waitlisted");

        // Act
        const res = await waitlistDriver.status(email);

        // Assert
        expect(res.body.isOnWaitlist).toBeDefined();
        expect(res.body.isOnWaitlist).toBe(true);
      });

      it("should return true if email was invited", async () => {
        // Arrange
        const email = faker.internet.email();
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();

        const {
          body: { status },
        } = await waitlistDriver.addToWaitlist(
          WaitListDriver.createWaitListRecord({
            email,
            firstName,
            lastName,
          }),
        );

        expect(status).toBe("waitlisted");

        await WaitlistService.invite(email);

        // Act
        const res = await waitlistDriver.status(email);

        // Assert
        expect(res.body.isInvited).toBeDefined();
        expect(res.body.isInvited).toBe(true);
      });

      it("should return false if email was not invited", async () => {
        // Arrange
        const email = faker.internet.email();

        // Act
        const res = await waitlistDriver.status(email);

        // Assert
        expect(res.body.isInvited).toBeDefined();
        expect(res.body.isInvited).toBe(false);
        expect(res.body.isOnWaitlist).toBe(false);
        expect(res.body.isActive).toBe(false);
      });

      it("should handle case-insensitive email matching for invited users", async () => {
        // Arrange
        const email = "foobar@gmail.com";
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const isOnWaitlistSpy = jest.spyOn(WaitlistService, "isOnWaitlist");
        const isInvitedSpy = jest.spyOn(WaitlistService, "isInvited");
        const getRecordSpy = jest.spyOn(WaitlistService, "getWaitlistRecord");
        const mongoUserSpy = jest.spyOn(mongoService.user, "findOne");

        const {
          body: { status },
        } = await waitlistDriver.addToWaitlist(
          WaitListDriver.createWaitListRecord({
            email: email.toUpperCase(),
            firstName,
            lastName,
          }),
        );

        expect(status).toBe("waitlisted");

        await WaitlistService.invite(email);

        // Act
        // Test different case variations of the same email
        const testCases = [
          email,
          "FooBar@gmail.com",
          "foobar@gmail.com",
          "FOOBAR@GMAIL.COM",
          "FooBar@Gmail.com",
        ];

        for (const emailCase of testCases) {
          // Act
          const res = await waitlistDriver.status(emailCase);

          // Assert
          expect(res.body.isInvited).toBe(true);
          expect(res.body.isOnWaitlist).toBe(true);

          // Verify that the service methods were called with lowercase email
          expect(isOnWaitlistSpy).toHaveBeenLastCalledWith(email);
          expect(isInvitedSpy).toHaveBeenLastCalledWith(email);
          expect(getRecordSpy).toHaveBeenLastCalledWith(email);
          expect(mongoUserSpy).toHaveBeenLastCalledWith({ email });
        }
      });

      it("should handle case-insensitive email matching for non-invited users", async () => {
        // Arrange
        const email = "notinvited@gmail.com";
        const isOnWaitlistSpy = jest.spyOn(WaitlistService, "isOnWaitlist");
        const isInvitedSpy = jest.spyOn(WaitlistService, "isInvited");
        const getRecordSpy = jest.spyOn(WaitlistService, "getWaitlistRecord");
        const mongoUserSpy = jest.spyOn(mongoService.user, "findOne");

        // Test different case variations of the same email
        const testCases = [
          email,
          "NotInvited@gmail.com",
          "notinvited@gmail.com",
          "NOTINVITED@GMAIL.COM",
          "NotInvited@Gmail.com",
        ];

        for (const emailCase of testCases) {
          // Act
          const res = await waitlistDriver.status(emailCase);

          // Assert
          expect(res.body.isInvited).toBe(false);
          expect(res.body.isOnWaitlist).toBe(false);
          expect(res.body.isActive).toBe(false);

          // Verify that the service methods were called with lowercase email
          expect(isOnWaitlistSpy).toHaveBeenLastCalledWith(email);
          expect(isInvitedSpy).toHaveBeenLastCalledWith(email);
          expect(getRecordSpy).toHaveBeenLastCalledWith(email);
          expect(mongoUserSpy).toHaveBeenLastCalledWith({ email });
        }
      });
    });
  });
});
