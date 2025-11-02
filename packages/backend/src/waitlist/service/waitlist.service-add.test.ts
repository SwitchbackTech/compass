import { faker } from "@faker-js/faker";
import { Result_Waitlist } from "@core/types/waitlist/waitlist.types";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import { WaitListDriver } from "@backend/__tests__/drivers/waitlist.driver";
import {
  getEmailsOnWaitlist,
  isEmailOnWaitlist,
} from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { mockEnv } from "@backend/__tests__/helpers/mock.setup";
import EmailService from "@backend/email/email.service";
import WaitlistService from "@backend/waitlist/service/waitlist.service";

describe("addToWaitlist", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should add to waitlist", async () => {
    // Act
    const record = WaitListDriver.createWaitListRecord({
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    });

    const result = await WaitlistService.addToWaitlist(record.email, record);

    // Assert
    const expected: Result_Waitlist = {
      status: "waitlisted",
    };
    expect(result).toEqual(expected);
    expect(await isEmailOnWaitlist(record.email)).toBe(true);
  });

  it("should ignore if email is already on waitlist", async () => {
    // Arrange
    const user = await AuthDriver.googleSignup();
    const waitlist = WaitListDriver.createWaitListRecord(user);

    await WaitListDriver.saveWaitListRecord(waitlist);

    const record = WaitListDriver.createWaitListRecord({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    await WaitlistService.addToWaitlist(record.email, record);

    // Act
    const result = await WaitlistService.addToWaitlist(record.email, record);

    // Assert
    const expected: Result_Waitlist = { status: "ignored" };

    expect(result).toEqual(expected);

    const emailsOnList = await getEmailsOnWaitlist();

    const noDuplicate =
      emailsOnList.filter((email) => email === user.email).length === 1;

    expect(noDuplicate).toBe(true);
  });

  it("should skip emailer steps if missing EMAILER_ variables", async () => {
    // Arrange
    const addTagToSubscriberSpy = jest.spyOn(
      EmailService,
      "addTagToSubscriber",
    );

    const envSpies = mockEnv({
      EMAILER_SECRET: undefined,
      EMAILER_USER_TAG_ID: undefined,
      EMAILER_WAITLIST_INVITE_TAG_ID: undefined,
    });

    const record = WaitListDriver.createWaitListRecord({
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    });

    // Act
    await WaitlistService.addToWaitlist(record.email, record);

    // Assert
    expect(addTagToSubscriberSpy).not.toHaveBeenCalled();

    Object.values(envSpies).forEach((mock) => mock.restore());
  });
});
