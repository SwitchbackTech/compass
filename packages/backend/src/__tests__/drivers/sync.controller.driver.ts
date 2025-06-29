import type request from "supertest";
import { BaseDriver } from "./base.driver";

export class SyncControllerDriver {
  constructor(private readonly baseDriver: BaseDriver) {}

  async importGCal(session?: {
    userId: string;
  }): Promise<
    Omit<request.Response, "body"> & { body: { id: string; status: string } }
  > {
    return this.baseDriver
      .getServer()
      .post("/api/sync/import-gcal")
      .use(this.baseDriver.setSessionPlugin(session))
      .expect(204)
      .expect("Content-Type", "application/json");
  }
}
