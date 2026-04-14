import { ENV } from "@backend/common/constants/env.constants";
import { isMissingUserTagId } from "@backend/common/constants/env.util";
import { EmailerError } from "@backend/common/errors/emailer/emailer.errors";
import {
  error,
  genericError,
} from "@backend/common/errors/handlers/error.handler";
import { BaseError } from "@core/errors/errors.base";
import { Logger } from "@core/logger/winston.logger";
import { mapCompassUserToEmailSubscriber } from "@core/mappers/subscriber/map.subscriber";
import {
  type Subscriber,
  SubscriberSchema,
} from "@core/types/email/email.types";
import { type Schema_User } from "@core/types/user.types";
import {
  type Response_TagSubscriber,
  type Response_UpsertSubscriber,
} from "./email.types";

const logger = Logger("app:email.service");

/**
 * Internal error class for Kit API failures.
 * Used to pass response details from post() to callers, who then
 * transform it into appropriate domain errors using error().
 */
class KitApiError extends Error {
  constructor(
    message: string,
    public readonly method: string,
    public readonly url: string,
    public readonly status?: number,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = "KitApiError";
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

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
      const upsertedSubscriber =
        await EmailService.upsertSubscriber(subscriber);
      const subId = upsertedSubscriber.subscriber.id;

      // add tag to subscriber
      logger.info(`Tagging subscriber: ${subscriber.email_address}`);
      const url = `${EmailService.baseUrl}/tags/${tagId}/subscribers/${subId}`;
      return await EmailService.post<Response_TagSubscriber>(url, {});
    } catch (err) {
      if (err instanceof BaseError) {
        throw err;
      }

      if (err instanceof KitApiError) {
        logger.error({
          message: err.message,
          status: err.status,
          data: err.data,
          method: err.method,
          url: err.url,
        });

        switch (err.status) {
          case 401:
            throw error(
              EmailerError.InvalidSecret,
              "Subscriber not upserted/tagged",
            );
          case 404:
            throw error(EmailerError.InvalidTagId, "Subscriber was not tagged");
          default:
            throw genericError(err, "Failed to tag subscriber");
        }
      }

      throw genericError(err, "Failed to tag subscriber");
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

    const url = `${EmailService.baseUrl}/subscribers`;
    return await EmailService.post<Response_UpsertSubscriber>(url, data);
  }

  private static async post<T>(url: string, body: object): Promise<T> {
    const response = await fetch(url, {
      body: JSON.stringify(body),
      headers: EmailService.headers.headers,
      method: "POST",
    });
    const data = await getResponseData(response);

    if (!response.ok) {
      throw new KitApiError(
        `Kit request failed with status ${response.status}`,
        "POST",
        url,
        response.status,
        data,
      );
    }

    return data as T;
  }
}

export default EmailService;
