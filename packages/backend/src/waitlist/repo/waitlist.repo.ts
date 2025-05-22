import {
  Result_InviteToWaitlist,
  Schema_Waitlist,
} from "@core/types/waitlist/waitlist.types";
import { error } from "@backend/common/errors/handlers/error.handler";
import { WaitlistError } from "@backend/common/errors/waitlist/waitlist.errors";
import mongoService from "@backend/common/services/mongo.service";

export class WaitlistRepository {
  static async addToWaitlist(record: Schema_Waitlist) {
    return mongoService.waitlist.insertOne(record);
  }

  static async invite(email: string): Promise<Result_InviteToWaitlist> {
    const isOnWaitlist = await this.isAlreadyOnWaitlist(email);
    if (!isOnWaitlist) {
      throw error(WaitlistError.NotOnWaitlist, "Email is not on waitlist");
    }

    const result = await mongoService.waitlist.updateOne(
      { email: { $eq: email } },
      { $set: { status: "invited" } },
    );

    const invited = result.modifiedCount === 1;
    return {
      status: invited ? "invited" : "ignored",
    };
  }

  static async isAlreadyOnWaitlist(email: string) {
    const match = await mongoService.waitlist
      .find({ email: { $eq: email } })
      .toArray();
    return match.length > 0;
  }

  static async isInvited(email: string) {
    const record = await this._getWaitlistRecord(email);

    if (!record) {
      return false;
    }

    return record.status === "invited";
  }

  private static async _getWaitlistRecord(
    email: string,
  ): Promise<Schema_Waitlist | null> {
    // Fetch up to 2 records to efficiently check for duplicates.
    const matches = await mongoService.waitlist
      .find({ email: { $eq: email } })
      .limit(2)
      .toArray();

    if (matches.length > 1) {
      throw error(WaitlistError.DuplicateEmail, "Unique email not returned");
    }

    if (matches.length === 0) {
      return null; // No waitlist entry found for this email
    }

    // Exactly one match found
    return matches[0] as Schema_Waitlist;
  }
}
