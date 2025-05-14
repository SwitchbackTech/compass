import { Subscriber } from "@core/types/email/email.types";
import { ENV } from "@backend/common/constants/env.constants";
import { EmailerError } from "@backend/common/errors/emailer/emailer.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { Response_TagSubscriber } from "@backend/email/email.types";
import EmailService from "../../email/email.service";
import { Answers_v0 } from "../types/waitlist.types";

class WaitlistService {
  static async addToWaitlist(
    email: string,
    answer: Answers_v0,
  ): Promise<Response_TagSubscriber["subscriber"]> {
    if (!ENV.EMAILER_SECRET) {
      throw error(EmailerError.InvalidSecret, "Subscriber was not tagged");
    }
    if (!ENV.EMAILER_TAG_ID) {
      throw error(EmailerError.InvalidTagId, "Subscriber was not tagged");
    }

    const subscriber: Subscriber = {
      email_address: email,
      first_name: answer.firstName,
      state: "active",
      fields: {
        "Last name": answer.lastName,
        Birthday: "1970-01-01",
        Source: answer.source,
      },
    };

    const result = await EmailService.addTagToSubscriber(
      subscriber,
      ENV.EMAILER_TAG_ID,
    );
    return result.subscriber;
  }
}

export default WaitlistService;
