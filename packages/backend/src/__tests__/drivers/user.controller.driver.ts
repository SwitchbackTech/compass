import request from "supertest";
import { Status } from "@core/errors/status.codes";
import { UserProfile } from "@core/types/user.types";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";

export class UserControllerDriver {
  constructor(private readonly baseDriver: BaseDriver) {}

  async getProfile(
    session?: { userId: string },
    status: Status = Status.OK,
  ): Promise<Omit<request.Response, "body"> & { body: UserProfile }> {
    return this.baseDriver
      .getServer()
      .get("/api/user/profile")
      .use(this.baseDriver.setSessionPlugin(session))
      .expect(status);
  }
}
