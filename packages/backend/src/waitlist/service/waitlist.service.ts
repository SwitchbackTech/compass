import { Logger } from "@core/logger/winston.logger";
import { Subscriber } from "@core/types/email/email.types";
import {
  Result_Waitlist,
  Schema_Answers,
} from "@core/types/waitlist/waitlist.types";
import { ENV } from "@backend/common/constants/env.constants";
import EmailService from "../../email/email.service";
import { WaitlistRepository } from "../repo/waitlist.repo";

const logger = Logger("app:waitlist.service");
class WaitlistService {
  static async addToWaitlist(
    email: string,
    answer: Schema_Answers,
  ): Promise<Result_Waitlist> {
    if (ENV.EMAILER_SECRET && ENV.EMAILER_WAITLIST_TAG_ID) {
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
      await EmailService.addTagToSubscriber(
        subscriber,
        ENV.EMAILER_WAITLIST_TAG_ID,
      );
    } else {
      logger.warn("Did not tag subscriber due to missing EMAILER env values");
    }

    // Save to DB
    const isAlreadyWaitlisted =
      await WaitlistRepository.isAlreadyOnWaitlist(email);
    if (isAlreadyWaitlisted) {
      return {
        status: "ignored",
      };
    }

    await WaitlistRepository.addToWaitlist({
      ...answer,
      waitlistedAt: new Date().toISOString(),
    });

    return {
      status: "waitlisted",
    };
  }
}

export default WaitlistService;
