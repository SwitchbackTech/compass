import { faker } from "@faker-js/faker";
import { EmailDriver } from "@backend/__tests__/drivers/email.driver";
import { WaitListDriver } from "@backend/__tests__/drivers/waitlist.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { mockEnv } from "@backend/__tests__/helpers/mock.setup";
import WaitlistService from "@backend/waitlist/service/waitlist.service";

describe("isInvited", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should return false if email is not invited", async () => {
    // simulates when user was waitlisted but not invited
    const result = await WaitlistService.isInvited(faker.internet.email());
    expect(result).toBe(false);
  });

  it("should return true if email is invited", async () => {
    // Arrange
    const emailSpies = EmailDriver.mockEmailServiceResponse();

    const record = WaitListDriver.createWaitListRecord({
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    });

    await WaitlistService.addToWaitlist(record.email, record);
    await WaitlistService.invite(record.email);

    // Act
    const result = await WaitlistService.isInvited(record.email);

    // Assert
    expect(result).toBe(true);

    emailSpies.addTagToSubscriber.mockClear();
    emailSpies.upsertSubscriber.mockClear();
  });
});

describe("invite", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should invite email to waitlist", async () => {
    // Arrange
    const emailSpies = EmailDriver.mockEmailServiceResponse();

    const record = WaitListDriver.createWaitListRecord({
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    });

    await WaitlistService.addToWaitlist(record.email, record);

    // Act
    const result = await WaitlistService.invite(record.email);

    // Assert
    expect(result.status).toBe("invited");

    emailSpies.addTagToSubscriber.mockClear();
    emailSpies.upsertSubscriber.mockClear();
  });

  it("should ignore if email is not on waitlist", async () => {
    // Act
    const result = await WaitlistService.invite(faker.internet.email());

    // Assert
    expect(result.status).toBe("ignored");
  });

  it("should add tag to subscriber when inviting", async () => {
    const emailSpies = EmailDriver.mockEmailServiceResponse();

    const record = WaitListDriver.createWaitListRecord({
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    });

    await WaitlistService.addToWaitlist(record.email, record);

    const result = await WaitlistService.invite(record.email);

    expect(emailSpies.addTagToSubscriber).toHaveBeenCalled();
    expect(result.tagResponse).toBeDefined();

    emailSpies.addTagToSubscriber.mockClear();
    emailSpies.upsertSubscriber.mockClear();
  });

  it("should skip tagging if EMAILER env vars missing", async () => {
    const emailSpies = EmailDriver.mockEmailServiceResponse();

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

    await WaitlistService.addToWaitlist(record.email, record);

    const result = await WaitlistService.invite(record.email);

    expect(emailSpies.addTagToSubscriber).not.toHaveBeenCalled();
    expect(result.tagResponse).toBeUndefined();

    Object.values(emailSpies).forEach((mock) => mock.mockClear());
    Object.values(envSpies).forEach((mock) => mock.restore());
  });
});
