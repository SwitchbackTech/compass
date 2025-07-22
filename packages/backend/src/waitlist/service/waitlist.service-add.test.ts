import { Result_Waitlist } from "@core/types/waitlist/waitlist.types";
import {
  getEmailsOnWaitlist,
  isEmailOnWaitlist,
} from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import WaitlistService from "@backend/waitlist/service/waitlist.service";
import { answer } from "@backend/waitlist/service/waitlist.service.test-setup";

describe("addToWaitlist", () => {
  let setup: Awaited<ReturnType<typeof setupTestDb>>;

  beforeAll(async () => {
    setup = await setupTestDb();
  });

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should add to waitlist", async () => {
    // Act
    const result = await WaitlistService.addToWaitlist(answer.email, answer);

    // Assert
    const expected: Result_Waitlist = {
      status: "waitlisted",
    };
    expect(result).toEqual(expected);
    expect(await isEmailOnWaitlist(answer.email)).toBe(true);
  });

  it("should ignore if email is already on waitlist", async () => {
    // Arrange
    const _answer = { ...answer, email: setup.email }; // same email as what's already in DB
    await WaitlistService.addToWaitlist(_answer.email, _answer);

    // Act
    const result = await WaitlistService.addToWaitlist(_answer.email, _answer);

    // Assert
    const expected: Result_Waitlist = {
      status: "ignored",
    };
    expect(result).toEqual(expected);

    const emailsOnList = await getEmailsOnWaitlist();
    const noDuplicate =
      emailsOnList.filter((email) => email === setup.email).length === 1;
    expect(noDuplicate).toBe(true);
  });

  it("should skip emailer steps if missing EMAILER_ variables", async () => {
    // Arrange
    jest.resetModules();
    jest.doMock("@backend/common/constants/env.constants", () => ({
      ENV: {},
    }));
    const EmailService = require("../../email/email.service").default;
    const addTagSpy = jest.spyOn(EmailService, "addTagToSubscriber");
    const answers: any = {
      firstName: "Jo",
      lastName: "Schmo",
      source: "other",
      email: setup.email,
      currentlyPayingFor: undefined,
      howClearAboutValues: "not-clear",
      workingTowardsMainGoal: "yes",
      isWillingToShare: false,
      waitlistedAt: new Date().toISOString(),
      schemaVersion: "0",
    };

    // Act
    await WaitlistService.addToWaitlist(answers.email, answers);

    // Assert
    expect(addTagSpy).not.toHaveBeenCalled();
  });
});
