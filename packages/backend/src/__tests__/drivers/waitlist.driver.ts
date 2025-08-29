import { WithId } from "mongodb";
import { Schema_User } from "@core/types/user.types";
import { Schema_Waitlist } from "@core/types/waitlist/waitlist.types";
import mongoService from "@backend/common/services/mongo.service";

export class WaitListDriver {
  static createWaitListRecord(
    user: Pick<WithId<Schema_User>, "email" | "firstName" | "lastName">,
  ): Schema_Waitlist {
    return {
      email: user.email,
      schemaVersion: "1",
      source: "other",
      firstName: user.firstName,
      lastName: user.lastName,
      profession: "Software Engineer",
      currentlyPayingFor: ["superhuman", "notion"],
      anythingElse: "I'm a test",
      status: "waitlisted",
      waitlistedAt: new Date().toISOString(),
    };
  }

  static async saveWaitListRecord(
    waitListRecord: Schema_Waitlist,
  ): Promise<WithId<Schema_Waitlist>> {
    const created = await mongoService.waitlist.insertOne(waitListRecord);

    return { _id: created.insertedId, ...waitListRecord };
  }
}
