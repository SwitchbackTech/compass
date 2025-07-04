import request from "supertest";
import {
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
} from "@core/constants/websocket.constants";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";

export class SyncControllerDriver {
  constructor(private readonly baseDriver: BaseDriver) {}

  async waitUntilImportGCalStart<Result = unknown[]>(
    websocketClient: ReturnType<BaseDriver["createWebsocketClient"]>,
    beforeEvent: () => Promise<unknown> = () => Promise.resolve(),
    afterEvent: (...args: void[]) => Promise<Result> = (...args) =>
      Promise.resolve(args as Result),
  ): Promise<Result> {
    return this.baseDriver.waitUntilWebsocketEvent<void[], Result>(
      websocketClient,
      IMPORT_GCAL_START,
      beforeEvent,
      afterEvent,
    );
  }

  async waitUntilImportGCalEnd<Result = unknown[]>(
    websocketClient: ReturnType<BaseDriver["createWebsocketClient"]>,
    beforeEvent: () => Promise<unknown> = () => Promise.resolve(),
    afterEvent: (...args: [string | undefined]) => Promise<Result> = (
      ...args
    ) => Promise.resolve(args as Result),
  ): Promise<Result> {
    return this.baseDriver.waitUntilWebsocketEvent<
      [string | undefined],
      Result
    >(websocketClient, IMPORT_GCAL_END, beforeEvent, afterEvent);
  }

  async importGCal(session?: {
    userId: string;
  }): Promise<
    Omit<request.Response, "body"> & { body: { id: string; status: string } }
  > {
    return request(this.baseDriver.getServerUri())
      .post("/api/sync/import-gcal")
      .use(this.baseDriver.setSessionPlugin(session))
      .expect(204)
      .expect("Content-Type", "application/json");
  }
}
