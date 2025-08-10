import {
  Result_InviteToWaitlist,
  Schema_Waitlist,
} from "@core/types/waitlist/waitlist.types";
import { error } from "@backend/common/errors/handlers/error.handler";
import { WaitlistError } from "@backend/common/errors/waitlist/waitlist.errors";
import mongoService from "@backend/common/services/mongo.service";
import { getNormalizedEmail } from "../service/waitlist.service.util";

export class WaitlistRepository {
  static async addToWaitlist(record: Schema_Waitlist) {
    const normalizedEmail = getNormalizedEmail(record.email);
    return mongoService.waitlist.insertOne({
      ...record,
      email: normalizedEmail,
    });
  }

  static async invite(email: string): Promise<Result_InviteToWaitlist> {
    const normalizedEmail = getNormalizedEmail(email);
    const isOnWaitlist = await this.isAlreadyOnWaitlist(normalizedEmail);
    if (!isOnWaitlist) {
      throw error(WaitlistError.NotOnWaitlist, "Email is not on waitlist");
    }

    const result = await mongoService.waitlist.updateOne(
      { email: { $eq: normalizedEmail } },
      { $set: { status: "invited" } },
    );

    const invited = result.modifiedCount === 1;
    return {
      status: invited ? "invited" : "ignored",
    };
  }

  static async getAllWaitlisted() {
    return mongoService.waitlist
      .find({ status: { $eq: "waitlisted" } })
      .toArray();
  }

  static async getWaitlistRecord(email: string) {
    const normalizedEmail = getNormalizedEmail(email);
    return this._getWaitlistRecord(normalizedEmail);
  }

  static async isAlreadyOnWaitlist(email: string) {
    const normalizedEmail = getNormalizedEmail(email);
    const match = await mongoService.waitlist
      .find({ email: { $eq: normalizedEmail } })
      .toArray();
    return match.length > 0;
  }

  static async isInvited(email: string) {
    const normalizedEmail = getNormalizedEmail(email);
    const record = await this._getWaitlistRecord(normalizedEmail);

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
