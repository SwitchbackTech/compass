import EmailService from "../../email/email.service";
import { Answers_v0 } from "../types/waitlist.types";
import WaitlistService from "./waitlist.service";

jest.mock("axios", () => ({
  post: jest.fn().mockResolvedValue({ data: {} }),
}));

describe("WaitlistService.addToWaitlist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call addToWaitlist and return subscriber", async () => {
    // Arrange
    const answers: Answers_v0 = {
      firstName: "Jo",
      lastName: "Schmo",
      source: "other",
      email: "test@example.com",
      currentlyPayingFor: undefined,
      howClearAboutValues: "not-clear",
      workingTowardsMainGoal: "yes",
      isWillingToShare: false,
    };
    jest.spyOn(EmailService.prototype, "upsertSubscriber").mockResolvedValue({
      subscriber: {
        id: 1,
        first_name: answers.firstName,
        email_address: answers.email,
        state: "active",
        created_at: new Date().toISOString(),
        fields: {
          "Last name": answers.lastName,
          Birthday: "1970-01-01",
          Source: answers.source,
        },
      },
    });
    jest.spyOn(EmailService.prototype, "addTagToSubscriber").mockResolvedValue({
      subscriber: {
        id: 1,
        first_name: answers.firstName,
        email_address: answers.email,
        state: "active",
        created_at: new Date().toISOString(),
        tagged_at: new Date().toISOString(),
        fields: {
          "Last name": answers.lastName,
          Birthday: "1970-01-01",
          Source: answers.source,
        },
      },
    });

    // Act
    const result = await WaitlistService.addToWaitlist(answers.email, answers);

    // Assert
    expect(result).toEqual({
      email_address: answers.email,
      first_name: answers.firstName,
      state: "active",
      id: 1,
      created_at: expect.any(String),
      tagged_at: expect.any(String),
      fields: {
        "Last name": answers.lastName,
        Birthday: "1970-01-01",
        Source: answers.source,
      },
    });
  });
});
