import { Subscriber } from "@core/types/email/email.types";
import {
  Answers_v1,
  Answers_v2,
} from "@core/types/waitlist/waitlist.answer.types";
import { EmailSchema } from "../types/waitlist.types";

export const getNormalizedEmail = (email: string) => EmailSchema.parse(email);

const DEFAULT_BIRTHDAY = "1970-01-01";

const isV1Answer = (
  candidate: Answers_v1 | Answers_v2,
): candidate is Answers_v1 => candidate.schemaVersion === "1";

export const mapWaitlistAnswerToSubscriber = (
  email: string,
  answer: Answers_v1 | Answers_v2,
): Subscriber => {
  if (isV1Answer(answer)) {
    return {
      email_address: email,
      first_name: answer.firstName,
      state: "active",
      fields: {
        "Last name": answer.lastName,
        Birthday: DEFAULT_BIRTHDAY,
        Source: answer.source,
      },
    };
  }

  return {
    email_address: email,
    first_name: null,
    state: "active",
    fields: null,
  };
};
