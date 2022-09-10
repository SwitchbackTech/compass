import { SessionRequest } from "supertokens-node/framework/express";
import { Res, SReqBody } from "@core/types/express.types";
import { Schema_CalendarList } from "@core/types/calendar.types";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import calendarService from "@backend/calendar/services/calendar.service";
import { AuthError, error } from "@backend/common/errors/types/backend.errors";

class CalendarController {
  create = async (req: SReqBody<Schema_CalendarList>, res: Res) => {
    try {
      const userId = req.session?.getUserId() as string;
      if (userId !== req.body.user) {
        //@ts-ignore
        res.promise(
          Promise.resolve({
            error: error(AuthError.InadequatePermissions, "Create Failed"),
          })
        );
      }
      const response = await calendarService.create(req.body);
      //@ts-ignore
      res.promise(Promise.resolve(response));
    } catch (e) {
      //@ts-ignore
      res.promise(Promise.resolve({ error: e }));
    }
  };

  list = async (req: SessionRequest, res: Res) => {
    const userId = req.session?.getUserId() as string;
    const gcal = await getGcalClient(userId);
    const response = await gcalService.getCalendarlist(gcal);

    //@ts-ignore
    res.promise(Promise.resolve(response));
  };
}

export default new CalendarController();
