import { Subscriber } from "@core/types/email/email.types";
import { Answers_v2 } from "@core/types/waitlist/waitlist.answer.types";
import { Answers_v1 } from "@core/types/waitlist/waitlist.answer.types";
import { EmailSchema } from "../types/waitlist.types";

export const getNormalizedEmail = (email: string) => EmailSchema.parse(email);

export const mapWaitlistAnswerToSubscriber = (
  email: string,
  answer: Answers_v1 | Answers_v2,
): Subscriber => {
  const DEFAULT_BIRTHDAY = "1970-01-01";

  const isV1 = "firstName" in answer && "lastName" in answer;

  const subscriber: Subscriber = {
    email_address: email,
    first_name: isV1 ? answer.firstName : null,
    state: "active",
    fields: isV1
      ? {
          "Last name": (answer as Answers_v1).lastName,
          Birthday: DEFAULT_BIRTHDAY,
          Source: answer.source,
        }
      : null,
  };

  return subscriber;
};
