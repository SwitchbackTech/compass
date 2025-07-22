import { faker } from "@faker-js/faker";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import WaitlistService from "@backend/waitlist/service/waitlist.service";
import { EmailDriver } from "../../__tests__/drivers/email.driver";
import { WaitListDriver } from "../../__tests__/drivers/waitlist.driver";

describe("isOnWaitlist", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should return false if email is not waitlisted", async () => {
    const result = await WaitlistService.isOnWaitlist(faker.internet.email());
    expect(result).toBe(false);
  });

  it("should return true if email is waitlisted", async () => {
    const emailSpies = EmailDriver.mockEmailServiceResponse();

    const record = WaitListDriver.createWaitListRecord({
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    });

    await WaitlistService.addToWaitlist(record.email, record);

    const result = await WaitlistService.isOnWaitlist(record.email);

    expect(result).toBe(true);

    emailSpies.addTagToSubscriber.mockClear();
    emailSpies.upsertSubscriber.mockClear();
  });
});
