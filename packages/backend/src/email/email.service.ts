import axios from "axios";
import { EmailerError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import {
  RequestBody_CreateSubscriber,
  RequestBody_CreateSubscriberSchema,
  Response_TagSubscriber,
  Response_UpsertSubscriber,
} from "./email.types";

class EmailService {
  private readonly apiKey: string;
  private readonly listId: string;

  constructor(apiKey: string, listId: string) {
    this.apiKey = apiKey;
    this.listId = listId;
  }

  async addTagToSubscriber(
    subscriber: RequestBody_CreateSubscriber,
    tag: string,
  ): Promise<Response_TagSubscriber> {
    console.log("adding:", subscriber);
    const upsertResult = await this.upsertSubscriber(subscriber);
    console.log("upserted:", upsertResult);

    const url = `https://api.kit.com/v4/tags/${
      this.listId
    }/subscribe?api_secret=${
      this.apiKey
    }&email=${subscriber.email_address}&first_name=${subscriber.first_name}`;

    const data = {
      email: subscriber.email_address,
      tags: [tag],
      list_id: this.listId,
    };
    const result = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    return result.data;
  }

  async upsertSubscriber(
    subscriber: RequestBody_CreateSubscriber,
  ): Promise<Response_UpsertSubscriber> {
    const { data, success } =
      RequestBody_CreateSubscriberSchema.safeParse(subscriber);
    if (!success) {
      throw error(
        EmailerError.InvalidSubscriberData,
        "Subscriber not upserted",
      );
    }

    const url = "https://api.kit.com/v4/subscribers";
    const result = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    return result.data;
  }
}

export default EmailService;
