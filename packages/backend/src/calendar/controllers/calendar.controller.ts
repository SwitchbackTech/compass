import express from "express";

import { Logger } from "@common/logger/common.logger";
import { Res, ReqBody } from "@core/types/express.types";
import { Schema_CalendarList } from "@compass/core/src/types/calendar.types";
import gcalService from "@common/services/gcal/gcal.service";
import { getGcal } from "@auth/services/google.auth.service";
import calendarService from "@calendar/services/calendar.service";

const logger = Logger("app:calendar.controller");

class CalendarController {
  create = async (req: ReqBody<Schema_CalendarList>, res: Res) => {
    const userId = res.locals.user.id;
    const response = await calendarService.create(userId, req.body);
    res.promise(Promise.resolve(response));
  };

  list = async (req: express.Request, res: Res) => {
    const userId = res.locals.user.id;
    const gcal = await getGcal(userId);
    const response = await gcalService.listCalendars(gcal);
    res.promise(Promise.resolve(response));
  };
}

export default new CalendarController();
