import { Answers } from "@core/types/waitlist/waitlist.answer.types";
import EmailService from "@backend/email/email.service";

/**
 * Create mocks for waitlist service tests
 */

export const answer: Answers = {
  firstName: "Jo",
  lastName: "Schmo",
  source: "other",
  email: "joe@schmo.com",
  currentlyPayingFor: undefined,
  howClearAboutValues: "not-clear",
  workingTowardsMainGoal: "yes",
  isWillingToShare: false,
  schemaVersion: "0",
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
