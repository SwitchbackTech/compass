import express from "express";

import { Logger } from "@common/logger/common.logger";
import { Res } from "@compass/core/src/types/express.types";
import gcalService from "@common/services/gcal/gcal.service";
import { getGcal } from "@auth/services/google.auth.service";

const logger = Logger("app:calendar.controller");

class CalendarController {
  list = async (req: express.Request, res: Res) => {
    const userId = res.locals.user.id;
    const gcal = await getGcal(userId);
    const response = await gcalService.listCalendars(gcal);
    res.promise(Promise.resolve(response));
  };
}

export default new CalendarController();
