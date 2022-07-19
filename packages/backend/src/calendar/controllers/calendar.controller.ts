import express from "express";
import { Res, ReqBody } from "@core/types/express.types";
import { Schema_CalendarList } from "@core/types/calendar.types";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { getGcalOLD } from "@backend/auth/services/OLDgoogle.auth.service";
import calendarService from "@backend/calendar/services/calendar.service";

class CalendarController {
  create = async (req: ReqBody<Schema_CalendarList>, res: Res) => {
    const userId = res.locals.user.id;
    const response = await calendarService.create(userId, req.body);
    //@ts-ignore
    res.promise(Promise.resolve(response));
  };

  //@ts-ignore
  list = async (req: express.Request, res: Res) => {
    const userId = res.locals.user.id;
    const gcal = await getGcalOLD(userId);
    //@ts-ignore
    const response = await gcalService.listCalendars(gcal);
    //@ts-ignore
    res.promise(Promise.resolve(response));
  };
}

export default new CalendarController();
