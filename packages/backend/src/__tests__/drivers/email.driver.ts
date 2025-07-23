import { faker } from "@faker-js/faker/.";
import { Subscriber } from "@core/types/email/email.types";
import dayjs from "@core/util/date/dayjs";
import EmailService from "@backend/email/email.service";
import {
  Response_TagSubscriber,
  Response_UpsertSubscriber,
} from "@backend/email/email.types";

export class EmailDriver {
  static mockEmailServiceResponse() {
    const id = faker.number.int();
    const created_at = dayjs().toISOString();
    const tagged_at = dayjs().toISOString();

    // Mock emailer API calls
    const upsertSubscriber = jest
      .spyOn(EmailService, "upsertSubscriber")
      .mockImplementation((subscriber) =>
        EmailDriver.upsertSubscriber({ ...subscriber, id, created_at }),
      );

    const addTagToSubscriber = jest
      .spyOn(EmailService, "addTagToSubscriber")
      .mockImplementation((subscriber, tagId) =>
        EmailDriver.addTagToSubscriber(
          { ...subscriber, id, created_at, tagged_at },
          tagId,
        ),
      );

    return { upsertSubscriber, addTagToSubscriber };
  }

  private static async addTagToSubscriber(
    subscriber: Subscriber & {
      id: number;
      created_at: string;
      tagged_at: string;
    },
    tagId: string,
  ): Promise<Response_TagSubscriber> {
    return Promise.resolve({
      subscriber: {
        tagId,
        ...subscriber,
        tagged_at: new Date().toISOString(),
        first_name: subscriber.first_name!,
      },
    });
  }

  private static async upsertSubscriber(
    subscriber: Subscriber & { id: number; created_at: string },
  ): Promise<Response_UpsertSubscriber> {
    return Promise.resolve({
      subscriber: {
        ...subscriber,
        first_name: subscriber.first_name!,
      },
    });
  }
}
