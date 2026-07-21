import { BaseError } from "@core/errors/errors.base";
import { Logger } from "@core/logger/winston.logger";
import { mapCompassUserToEmailSubscriber } from "@core/mappers/subscriber/map.subscriber";
import {
  type EmailUpdatesStatus,
  type Subscriber,
  SubscriberSchema,
} from "@core/types/email/email.types";
import { type Schema_User } from "@core/types/user.types";
import { CONFIG } from "@backend/common/constants/config.constants";
import { EmailerError } from "@backend/common/errors/emailer/emailer.errors";
import {
  error,
  genericError,
} from "@backend/common/errors/handlers/error.handler";
import {
  type Response_ListSubscribers,
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
      if (!CONFIG.EMAILER_SECRET) {
        throw error(EmailerError.InvalidSecret, "Did not instantiate Emailer");
      }
      EmailService.headers = {
        headers: {
          "X-Kit-Api-Key": CONFIG.EMAILER_SECRET,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      };
    }
  }

  static async getEmailUpdatesStatus(
    email: string,
  ): Promise<EmailUpdatesStatus> {
    if (!CONFIG.EMAILER_SECRET) return "unavailable";

    try {
      EmailService.initialize();
      const query = new URLSearchParams({
        email_address: email,
        per_page: "1",
        status: "all",
      });
      const response = await EmailService.get<Response_ListSubscribers>(
        `${EmailService.baseUrl}/subscribers?${query.toString()}`,
      );

      const subscriber = response.subscribers.find(
        (subscriber) =>
          subscriber.email_address.toLowerCase() === email.toLowerCase(),
      );

      if (!subscriber) return "not_subscribed";

      return subscriber.state === "active" ? "subscribed" : "unsubscribed";
    } catch (err) {
      EmailService.throwKitError(err, "Failed to retrieve email updates");
    }
  }

  static async subscribeToEmailUpdates(
    user: Schema_User,
  ): Promise<EmailUpdatesStatus> {
    if (!CONFIG.EMAILER_SECRET) return "unavailable";

    try {
      const subscriber = mapCompassUserToEmailSubscriber(user);
      const response = await EmailService.upsertSubscriber(subscriber);
      return response.subscriber.state === "active"
        ? "subscribed"
        : "unsubscribed";
    } catch (err) {
      EmailService.throwKitError(err, "Failed to subscribe to email updates");
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

    EmailService.initialize();
    logger.debug(`Adding subscriber: ${subscriber.email_address}`);
    const url = `${EmailService.baseUrl}/subscribers`;
    return await EmailService.post<Response_UpsertSubscriber>(url, data);
  }

  private static throwKitError(err: unknown, message: string): never {
    if (err instanceof BaseError) throw err;

    if (err instanceof KitApiError) {
      logger.error({
        message: err.message,
        status: err.status,
        data: err.data,
        method: err.method,
        url: err.url,
      });

      if (err.status === 401) {
        throw error(EmailerError.InvalidSecret, message);
      }
    }

    throw genericError(err, message);
  }

  private static async get<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: EmailService.headers.headers,
      method: "GET",
    });
    const data = await getResponseData(response);

    if (!response.ok) {
      throw new KitApiError(
        `Kit request failed with status ${response.status}`,
        "GET",
        url,
        response.status,
        data,
      );
    }

    return data as T;
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
