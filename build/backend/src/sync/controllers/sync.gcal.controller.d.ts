import express from "express";
import {
  Body_Watch_Gcal_Start,
  Body_Watch_Gcal_Stop,
} from "@core/types/sync.types";
import { ReqBody, Res } from "@core/types/express.types";
declare class GcalSyncController {
  handleNotification: (
    req: express.Request,
    res: express.Response
  ) => Promise<void>;
  startWatching: (
    req: ReqBody<Body_Watch_Gcal_Start>,
    res: Res
  ) => Promise<void>;
  stopWatching: (req: ReqBody<Body_Watch_Gcal_Stop>, res: Res) => Promise<void>;
}
declare const _default: GcalSyncController;
export default _default;
//# sourceMappingURL=sync.gcal.controller.d.ts.map
