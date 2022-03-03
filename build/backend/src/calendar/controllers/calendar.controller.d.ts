import express from "express";
import { Res, ReqBody } from "@core/types/express.types";
import { Schema_CalendarList } from "@core/types/calendar.types";
declare class CalendarController {
  create: (req: ReqBody<Schema_CalendarList>, res: Res) => Promise<void>;
  list: (req: express.Request, res: Res) => Promise<void>;
}
declare const _default: CalendarController;
export default _default;
//# sourceMappingURL=calendar.controller.d.ts.map
