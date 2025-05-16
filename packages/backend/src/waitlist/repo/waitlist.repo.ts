import { Schema_Waitlist } from "@core/types/waitlist/waitlist.types";
import mongoService from "@backend/common/services/mongo.service";

export class WaitlistRepository {
  static async addToWaitlist(record: Schema_Waitlist) {
    return mongoService.waitlist.insertOne(record);
  }

  static async isAlreadyOnWaitlist(email: string) {
    const match = await mongoService.waitlist.find({ email }).toArray();
    return match.length > 0;
  }
}
