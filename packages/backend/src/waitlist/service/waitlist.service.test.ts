import {
  Result_Waitlist,
  Schema_Waitlist,
} from "@core/types/waitlist/waitlist.types";
import {
  getEmailsOnWaitlist,
  isEmailOnWaitlist,
} from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestMongo,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import EmailService from "../../email/email.service";
import WaitlistService from "./waitlist.service";

const answer: Schema_Waitlist = {
  firstName: "Jo",
  lastName: "Schmo",
  source: "other",
  email: "joe@schmo.com",
  currentlyPayingFor: undefined,
  howClearAboutValues: "not-clear",
  workingTowardsMainGoal: "yes",
  isWillingToShare: false,
  waitlistedAt: new Date().toISOString(),
  schemaVersion: "v0",
};

// Mock emailer API calls
jest.spyOn(EmailService, "upsertSubscriber").mockResolvedValue({
  subscriber: {
    id: 1,
    first_name: answer.firstName,
    email_address: answer.email,
    state: "active",
    created_at: new Date().toISOString(),
    fields: {
      "Last name": answer.lastName,
      Birthday: "1970-01-01",
      Source: answer.source,
    },
  },
});
jest.spyOn(EmailService, "addTagToSubscriber").mockResolvedValue({
  subscriber: {
    id: 1,
    first_name: answer.firstName,
    email_address: answer.email,
    state: "active",
    created_at: new Date().toISOString(),
    tagged_at: new Date().toISOString(),
    fields: {
      "Last name": answer.lastName,
      Birthday: "1970-01-01",
      Source: answer.source,
    },
  },
});

describe("addToWaitlist", () => {
  let setup: Awaited<ReturnType<typeof setupTestDb>>;

  beforeAll(async () => {
    setup = await setupTestDb();
  });

  beforeEach(async () => {
    await cleanupCollections(setup.db);
  });

  afterAll(async () => {
    await cleanupTestMongo(setup);
  });

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
      schemaVersion: "v0",
    };

    // Act
    await WaitlistService.addToWaitlist(answers.email, answers);

    // Assert
    expect(addTagSpy).not.toHaveBeenCalled();
  });
});
