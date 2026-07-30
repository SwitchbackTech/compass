import { type WithId } from "mongodb";
import { type Schema_User } from "@core/types/user.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";

export class UtilDriver {
  static async setupTestUser(): Promise<{ user: WithId<Schema_User> }> {
    const user = await UserDriver.createUser();

    return { user };
  }
}
