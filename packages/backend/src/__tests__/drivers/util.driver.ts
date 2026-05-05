import { type WithId } from "mongodb";
import { type Schema_User } from "@core/types/user.types";
import { GoogleSyncDriver } from "@backend/__tests__/drivers/google-sync.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";

export class UtilDriver {
  static async setupTestUser(): Promise<{ user: WithId<Schema_User> }> {
    const user = await UserDriver.createUser();

    await GoogleSyncDriver.createHealthyGoogleSync(user, true);

    return { user };
  }
}
