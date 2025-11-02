import request from "supertest";
import { Status } from "@core/errors/status.codes";
import {
  Answers_v1,
  Answers_v2,
} from "@core/types/waitlist/waitlist.answer.types";
import { Result_Waitlist } from "@core/types/waitlist/waitlist.types";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";

export class WaitlistControllerDriver {
  constructor(private readonly baseDriver: BaseDriver) {}

  async status(
    email: string,
    status: Status = Status.OK,
  ): Promise<
    Omit<request.Response, "body"> & {
      body: {
        isOnWaitlist: boolean;
        isInvited: boolean;
        isActive: boolean;
        firstName?: string;
        lastName?: string;
      };
    }
  > {
    return request(this.baseDriver.getServerUri())
      .get("/api/waitlist")
      .query({ email })
      .expect(status);
  }

  async addToWaitlist(
    answer: Answers_v1 | Answers_v2,
    status: Status = Status.OK,
  ): Promise<Omit<request.Response, "body"> & { body: Result_Waitlist }> {
    return request(this.baseDriver.getServerUri())
      .post("/api/waitlist")
      .send(answer)
      .expect(status);
  }
}
