import { getGcalClient } from "@backend/auth/services/google.auth.service";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { Res_Promise } from "@backend/common/types/express.types";
import { SessionRequest } from "supertokens-node/framework/express";
import { SReqBody } from "@backend/common/types/express.types";
import { Schema_CalendarList } from "@core/types/calendar.types";
import { error } from "@backend/common/errors/handlers/error.handler";
import calendarService from "@backend/calendar/services/calendar.service";
import { AuthError } from "@backend/common/constants/error.constants";

class CalendarController {
  create = async (req: SReqBody<Schema_CalendarList>, res: Res_Promise) => {
    try {
      const userId = req.session?.getUserId() as string;
      if (userId !== req.body.user) {
        res.promise({
          error: error(AuthError.InadequatePermissions, "Create Failed"),
        });
      }
      const response = await calendarService.create(req.body);
      res.promise(response);
    } catch (e) {
      res.promise({ error: e });
    }
  };

  list = async (req: SessionRequest, res: Res_Promise) => {
    const userId = req.session?.getUserId() as string;
    const gcal = await getGcalClient(userId);
    const response = await gcalService.getCalendarlist(gcal);

    res.promise(response);
  };
}

export default new CalendarController();
