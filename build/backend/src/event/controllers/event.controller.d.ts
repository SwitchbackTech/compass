import express from "express";
import { ReqBody, Res } from "@core/types/express.types";
import { Schema_Event, Params_DeleteMany } from "@core/types/event.types";
declare class EventController {
  create: (req: ReqBody<Schema_Event>, res: Res) => Promise<void>;
  delete: (req: express.Request, res: Res) => Promise<void>;
  deleteMany: (req: ReqBody<Params_DeleteMany>, res: Res) => Promise<void>;
  import: (req: express.Request, res: Res) => Promise<void>;
  readById: (req: express.Request, res: Res) => Promise<void>;
  readAll: (req: express.Request, res: Res) => Promise<void>;
  update: (req: ReqBody<Schema_Event>, res: Res) => Promise<void>;
  updateMany: (req: ReqBody<Schema_Event[]>, res: Res) => Promise<void>;
}
declare const _default: EventController;
export default _default;
//# sourceMappingURL=event.controller.d.ts.map
