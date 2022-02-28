import express from "express";
import { Res, ReqBody } from "@core/types/express.types";
import { Schema_CalendarList } from "@core/types/calendar.types";
import { Logger } from "@core/logger/winston.logger";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { getGcal } from "@backend/auth/services/google.auth.service";
import calendarService from "@backend/calendar/services/calendar.service";

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
