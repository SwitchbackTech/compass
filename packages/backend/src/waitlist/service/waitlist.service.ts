import { ENV } from "@backend/common/constants/env.constants";
import {
  RequestBody_CreateSubscriber,
  Response_TagSubscriber,
} from "@backend/email/email.types";
import EmailService from "../../email/email.service";
import { Answers_v0 } from "../types/waitlist.types";

class WaitlistService {
  static async addToWaitlist(
    email: string,
    answer: Answers_v0,
  ): Promise<Response_TagSubscriber["subscriber"]> {
    console.log("Saving to waitlist:", email, answer.firstName);
    const emailService = new EmailService(
      ENV.EMAILER_SECRET as string,
      ENV.EMAILER_LIST_ID as string,
    );
    const subscriber: RequestBody_CreateSubscriber = {
      email_address: email,
      first_name: answer.firstName,
      state: "active",
      fields: {
        "Last name": answer.lastName,
        Birthday: "1970-01-01",
        Source: answer.source,
      },
    };

    const result = await emailService.addTagToSubscriber(
      subscriber,
      answer.firstName,
    );
    return result.subscriber;
  }
}

export default WaitlistService;
