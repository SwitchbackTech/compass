import request from "supertest";
import { GCAL_NOTIFICATION_ENDPOINT } from "@core/constants/core.constants";
import { Status } from "@core/errors/status.codes";
import { type Payload_Sync_Notif } from "@core/types/sync.types";
import { type BaseDriver } from "@backend/__tests__/drivers/base.driver";
import { encodeChannelToken } from "@backend/sync/util/watch.util";

export class SyncControllerDriver {
  constructor(private readonly baseDriver: BaseDriver) {}

  async handleGoogleNotification(
    {
      token,
      resource,
      channelId,
      resourceId,
      resourceState,
      expiration,
    }: Payload_Sync_Notif & { token?: string },
    status: Status = Status.OK,
  ): Promise<
    Omit<request.Response, "body"> & { body: { id: string; status: string } }
  > {
    return request(this.baseDriver.getServerUri())
      .post(`/api${GCAL_NOTIFICATION_ENDPOINT}`)
      .set("x-goog-channel-token", encodeChannelToken({ token, resource }))
      .set("x-goog-channel-id", channelId.toString())
      .set("x-goog-resource-id", resourceId)
      .set("x-goog-resource-state", resourceState)
      .set("x-goog-channel-expiration", expiration.toISOString())
      .expect(status);
  }

  async importGCal(
    session?: { userId: string },
    body?: { force?: boolean },
    status: Status = Status.NO_CONTENT,
  ): Promise<
    Omit<request.Response, "body"> & { body: { id: string; status: string } }
  > {
    return request(this.baseDriver.getServerUri())
      .post("/api/sync/import-gcal")
      .send(body)
      .use(this.baseDriver.setSessionPlugin(session))
      .expect(status);
  }
}
