import { WithId } from "mongodb";
import { Schema_User } from "@core/types/user.types";
import { SyncDriver } from "@backend/__tests__/drivers/sync.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { WaitListDriver } from "@backend/__tests__/drivers/waitlist.driver";

export class UtilDriver {
  static async setupTestUser(): Promise<{ user: WithId<Schema_User> }> {
    const user = await UserDriver.createUser();

    await Promise.all([
      SyncDriver.createSync(user, true),
      WaitListDriver.saveWaitListRecord(
        WaitListDriver.createWaitListRecord(user),
      ),
    ]);

    return { user };
  }
}
