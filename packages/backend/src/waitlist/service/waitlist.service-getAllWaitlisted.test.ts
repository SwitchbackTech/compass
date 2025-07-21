import { faker } from "@faker-js/faker";
import {
  cleanupCollections,
  cleanupTestMongo,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import WaitlistService from "@backend/waitlist/service/waitlist.service";
import { EmailDriver } from "../../__tests__/drivers/email.driver";
import { WaitListDriver } from "../../__tests__/drivers/waitlist.driver";

describe("getAllWaitlisted", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestMongo);

  it("should return all waitlisted records", async () => {
    const emailSpies = EmailDriver.mockEmailServiceResponse();

    const record = WaitListDriver.createWaitListRecord({
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    });

    await WaitlistService.addToWaitlist(record.email, record);

    const records = await WaitlistService.getAllWaitlisted();

    expect(records.length).toBeGreaterThanOrEqual(1);
    const allWaitlisted = records.every((r) => r.status === "waitlisted");
    expect(allWaitlisted).toBe(true);

    emailSpies.addTagToSubscriber.mockClear();
    emailSpies.upsertSubscriber.mockClear();
  });
});
