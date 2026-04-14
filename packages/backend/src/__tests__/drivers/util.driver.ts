import { SyncDriver } from "@backend/__tests__/drivers/sync.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { type Schema_User } from "@core/types/user.types";
import { type WithId } from "mongodb";

export class UtilDriver {
  static async setupTestUser(): Promise<{ user: WithId<Schema_User> }> {
    const user = await UserDriver.createUser();

    await SyncDriver.createSync(user, true);

    return { user };
  }
}
