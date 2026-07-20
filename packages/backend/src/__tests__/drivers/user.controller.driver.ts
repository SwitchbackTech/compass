import type request from "supertest";
import { Status } from "@core/errors/status.codes";
import { type EmailUpdatesResponse } from "@core/types/email/email.types";
import { type UserProfile } from "@core/types/user.types";
import { type BaseDriver } from "@backend/__tests__/drivers/base.driver";
import { type Summary_Delete } from "@backend/user/types/user.types";

export class UserControllerDriver {
  constructor(private readonly baseDriver: BaseDriver) {}

  async deleteAccount(
    session?: { userId: string },
    status: Status = Status.OK,
  ): Promise<Omit<request.Response, "body"> & { body: Summary_Delete }> {
    return this.baseDriver
      .getServer()
      .delete("/api/user")
      .use(this.baseDriver.setSessionPlugin(session))
      .expect(status);
  }

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

  async getEmailUpdates(
    session?: { userId: string },
    status: Status = Status.OK,
  ): Promise<Omit<request.Response, "body"> & { body: EmailUpdatesResponse }> {
    return this.baseDriver
      .getServer()
      .get("/api/user/email-updates")
      .use(this.baseDriver.setSessionPlugin(session))
      .expect(status);
  }

  async subscribeToEmailUpdates(
    session?: { userId: string },
    status: Status = Status.OK,
  ): Promise<Omit<request.Response, "body"> & { body: EmailUpdatesResponse }> {
    return this.baseDriver
      .getServer()
      .put("/api/user/email-updates")
      .use(this.baseDriver.setSessionPlugin(session))
      .expect(status);
  }
}
