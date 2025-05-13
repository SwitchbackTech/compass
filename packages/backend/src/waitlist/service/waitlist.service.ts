import { Subscriber } from "@core/types/email/email.types";
import { ENV } from "@backend/common/constants/env.constants";
import { Response_TagSubscriber } from "@backend/email/email.types";
import EmailService from "../../email/email.service";
import { Answers_v0 } from "../types/waitlist.types";

class WaitlistService {
  static async addToWaitlist(
    email: string,
    answer: Answers_v0,
  ): Promise<Response_TagSubscriber["subscriber"]> {
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

    if (!ENV.EMAILER_SECRET || !ENV.EMAILER_TAG_ID) {
      throw new Error(
        "Missing one or more of the required email environment variables: EMAILER_SECRET, EMAILER_TAG_ID",
      );
    }
    const result = await EmailService.addTagToSubscriber(
      subscriber,
      ENV.EMAILER_TAG_ID,
    );
    return result.subscriber;
  }
}

export default WaitlistService;
