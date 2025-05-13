import axios from "axios";
import { Subscriber, SubscriberSchema } from "@core/types/email/email.types";
import { ENV } from "@backend/common/constants/env.constants";
import { EmailerError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import {
  Response_TagSubscriber,
  Response_UpsertSubscriber,
} from "./email.types";

class EmailService {
  private static headers: { headers: Record<string, string> };
  private static readonly baseUrl = "https://api.kit.com/v4";

  private static initialize() {
    if (!EmailService.headers) {
      if (!ENV.EMAILER_SECRET) {
        throw error(EmailerError.MissingSecret, "Did not instantiate Emailer");
      }
      EmailService.headers = {
        headers: {
          "X-Kit-Api-Key": ENV.EMAILER_SECRET,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      };
    }
  }

  static async addTagToSubscriber(
    subscriber: Subscriber,
    tagId: string,
  ): Promise<Response_TagSubscriber> {
    EmailService.initialize();
    console.log("adding subscriber:", subscriber.email_address);
    // upsert subscriber
    const upsertedSubscriber = await this.upsertSubscriber(subscriber);
    console.log(upsertedSubscriber.subscriber.id);
    const subId = upsertedSubscriber.subscriber.id;

    // add tag to subscriber
    const url = `${this.baseUrl}/tags/${tagId}/subscribers/${subId}`;
    const result = await axios.post(url, {}, this.headers);
    console.log("result.data:", result.data);
    return result.data;
  }

  static async upsertSubscriber(
    subscriber: Subscriber,
  ): Promise<Response_UpsertSubscriber> {
    EmailService.initialize();
    const { data, success } = SubscriberSchema.safeParse(subscriber);
    if (!success) {
      throw error(
        EmailerError.InvalidSubscriberData,
        "Subscriber not upserted",
      );
    }

    const url = `${this.baseUrl}/subscribers`;
    const result = await axios.post(url, data, this.headers);
    return result.data;
  }
}

export default EmailService;
