import axios from "axios";
import { Logger } from "@core/logger/winston.logger";
import { Subscriber, SubscriberSchema } from "@core/types/email/email.types";
import { ENV } from "@backend/common/constants/env.constants";
import { EmailerError } from "@backend/common/errors/emailer/emailer.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import {
  Response_TagSubscriber,
  Response_UpsertSubscriber,
} from "./email.types";

const logger = Logger("app:email.service");
class EmailService {
  private static headers: { headers: Record<string, string> };
  private static readonly baseUrl = "https://api.kit.com/v4";

  private static initialize() {
    if (!EmailService.headers) {
      if (!ENV.EMAILER_SECRET) {
        throw error(EmailerError.InvalidSecret, "Did not instantiate Emailer");
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
    try {
      // upsert subscriber
      logger.debug(`Adding subscriber: ${subscriber.email_address}`);
      const upsertedSubscriber = await this.upsertSubscriber(subscriber);
      const subId = upsertedSubscriber.subscriber.id;

      // add tag to subscriber
      logger.info(`Tagging subscriber: ${subscriber.email_address}`);
      const url = `${this.baseUrl}/tags/${tagId}/subscribers/${subId}`;
      const result = await axios.post(url, {}, this.headers);
      return result.data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        logger.error({
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
          url: err.config?.url,
          method: err.config?.method,
        });
        switch (err.response?.status) {
          case 401:
            throw error(
              EmailerError.InvalidSecret,
              "Subscriber not upserted/tagged",
            );
          case 404:
            throw error(EmailerError.InvalidTagId, "Subscriber was not tagged");
          default:
            throw err;
        }
      } else {
        throw err;
      }
    }
  }

  static async upsertSubscriber(
    subscriber: Subscriber,
  ): Promise<Response_UpsertSubscriber> {
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
