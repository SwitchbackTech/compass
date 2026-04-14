import { Logger } from "@core/logger/winston.logger";
import { mapCompassUserToEmailSubscriber } from "@core/mappers/subscriber/map.subscriber";
import {
  type Subscriber,
  SubscriberSchema,
} from "@core/types/email/email.types";
import { type Schema_User } from "@core/types/user.types";
import { ENV } from "@backend/common/constants/env.constants";
import { isMissingUserTagId } from "@backend/common/constants/env.util";
import { EmailerError } from "@backend/common/errors/emailer/emailer.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import {
  type Response_TagSubscriber,
  type Response_UpsertSubscriber,
} from "./email.types";

const logger = Logger("app:email.service");

interface EmailServiceError extends Error {
  data?: unknown;
  method?: string;
  status?: number;
  url?: string;
}

const createEmailServiceError = (
  method: string,
  url: string,
  status?: number,
  data?: unknown,
): EmailServiceError => {
  const error = new Error(
    `Kit request failed${status ? ` with status ${status}` : ""}`,
  ) as EmailServiceError;
  error.data = data;
  error.method = method;
  error.name = "EmailServiceError";
  error.status = status;
  error.url = url;
  return error;
};

const getResponseData = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

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

  static async tagNewUserIfEnabled(
    user: Schema_User,
    isNewUser: boolean,
  ): Promise<void> {
    if (isMissingUserTagId()) {
      logger.warn(
        "Did not tag subscriber due to missing EMAILER_ ENV value(s)",
      );
      return;
    }
    if (!isNewUser) return;
    const subscriber = mapCompassUserToEmailSubscriber(user);
    await EmailService.addTagToSubscriber(subscriber, ENV.EMAILER_USER_TAG_ID!);
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
      return await this.post<Response_TagSubscriber>(url, {});
    } catch (err) {
      if (err instanceof Error && err.name === "EmailServiceError") {
        const emailerError = err as EmailServiceError;
        logger.error({
          message: emailerError.message,
          status: emailerError.status,
          data: emailerError.data,
          method: emailerError.method,
          url: emailerError.url,
        });
        switch (emailerError.status) {
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
    return await this.post<Response_UpsertSubscriber>(url, data);
  }

  private static async post<T>(url: string, body: object): Promise<T> {
    const response = await fetch(url, {
      body: JSON.stringify(body),
      headers: this.headers.headers,
      method: "POST",
    });
    const data = await getResponseData(response);

    if (!response.ok) {
      throw createEmailServiceError("POST", url, response.status, data);
    }

    return data as T;
  }
}

export default EmailService;
