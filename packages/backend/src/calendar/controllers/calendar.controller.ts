import { SessionRequest } from "supertokens-node/framework/express";
import { Schema_Calendar } from "@core/types/calendar.types";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import calendarService from "@backend/calendar/services/calendar.service";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { Res_Promise } from "@backend/common/types/express.types";
import { SReqBody } from "@backend/common/types/express.types";

class CalendarController {
  create = async (req: SReqBody<Schema_Calendar>, res: Res_Promise) => {
    try {
      const userId = req.session?.getUserId() as string;
      if (userId !== req.body.user) {
        res.promise({
          error: error(AuthError.InadequatePermissions, "Create Failed"),
        });
        return;
      }
      const response = await calendarService.create(req.body);
      res.promise(response);
    } catch (e) {
      res.promise({ error: e });
    }
  };

  list = async (req: SessionRequest, res: Res_Promise) => {
    try {
      const userId = req.session?.getUserId() as string;

      // Get calendars from our database first
      const userCalendars = await calendarService.getByUser(userId);

      if (userCalendars.length > 0) {
        // Return stored calendars
        res.promise({ calendars: userCalendars });
      } else {
        // Fallback: fetch from Google Calendar API and store
        const gcal = await getGcalClient(userId);
        const response = await gcalService.getCalendarlist(gcal);

        if (response.data?.items) {
          // Store calendars in our database for future use
          await calendarService.add("google", response.data.items, userId);

          // Return the fresh calendars from our database
          const newCalendars = await calendarService.getByUser(userId);
          res.promise({ calendars: newCalendars });
        } else {
          res.promise({ calendars: [] });
        }
      }
    } catch (e) {
      res.promise({ error: e });
    }
  };

  updateSelection = async (
    req: SReqBody<{ calendarId: string; selected: boolean }>,
    res: Res_Promise,
  ) => {
    try {
      const userId = req.session?.getUserId() as string;
      const { calendarId, selected } = req.body;

      const response = await calendarService.updateSelection(
        userId,
        calendarId,
        selected,
      );

      res.promise(response);
    } catch (e) {
      res.promise({ error: e });
    }
  };
}

export default new CalendarController();
