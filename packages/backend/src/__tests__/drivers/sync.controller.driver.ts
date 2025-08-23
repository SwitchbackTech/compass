import request from "supertest";
import { GCAL_NOTIFICATION_ENDPOINT } from "@core/constants/core.constants";
import {
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
} from "@core/constants/websocket.constants";
import { Status } from "@core/errors/status.codes";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import { ENV } from "@backend/common/constants/env.constants";

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

  async handleGoogleNotification(
    {
      channelToken = ENV.TOKEN_GCAL_NOTIFICATION,
      channelId,
      resourceId,
      resourceState,
      expiration,
    }: {
      channelToken?: string;
      channelId: string;
      resourceId: string;
      resourceState: string;
      expiration: string;
    },
    status: Status = Status.OK,
  ): Promise<
    Omit<request.Response, "body"> & { body: { id: string; status: string } }
  > {
    return request(this.baseDriver.getServerUri())
      .post(`/api${GCAL_NOTIFICATION_ENDPOINT}`)
      .set("x-goog-channel-token", channelToken)
      .set("x-goog-channel-id", channelId)
      .set("x-goog-resource-id", resourceId)
      .set("x-goog-resource-state", resourceState)
      .set("x-goog-channel-expiration", expiration)
      .expect(status);
  }

  async importGCal(
    session?: { userId: string },
    status: Status = Status.NO_CONTENT,
  ): Promise<
    Omit<request.Response, "body"> & { body: { id: string; status: string } }
  > {
    return request(this.baseDriver.getServerUri())
      .post("/api/sync/import-gcal")
      .use(this.baseDriver.setSessionPlugin(session))
      .expect(status);
  }
}
